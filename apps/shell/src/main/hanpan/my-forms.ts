/**
 * 한판 "내 양식": 사용자가 열린 문서에서 저장하거나 파일로 가져온 양식의 보관소.
 * 사용자 데이터 폴더 아래 한 폴더(`dir`)에 `<이름>.<형식>` 파일로 두고, 순서와 넣은
 * 시각은 `index.json`에 적는다. 색인이 없거나 깨졌으면 폴더의 파일로 다시 만든다.
 * 화면이 넘기는 것은 목록에 있는 id(파일 이름)뿐이고, 경로는 여기서만 만든다.
 * Electron을 불러오지 않는다(시험: tests/hanpan-my-forms.test.ts).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { atomicWriteFile } from '../atomic-write'

/** 양식 창이 여는 형식: 워드와 한글(HWP 5, HWPX) */
export type MyFormType = 'docx' | 'hwp' | 'hwpx'

export interface MyForm {
  /** 폴더 안의 파일 이름; 화면과 주고받는 유일한 열쇠 */
  id: string
  name: string
  type: MyFormType
  /** 넣은 시각(ms), 색인 없이 다시 만든 것은 0 */
  added: number
}

export type MyFormError =
  'empty-name' | 'unsupported-type' | 'too-large' | 'not-saved' | 'unsaved-changes' | 'not-found'

export type MyFormResult = { ok: true; form: MyForm } | { ok: false; error: MyFormError }

/** 양식 파일 하나의 상한 */
export const MY_FORM_MAX_BYTES = 50 * 1024 * 1024

const INDEX = 'index.json'
const TYPES: readonly MyFormType[] = ['docx', 'hwp', 'hwpx']
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/** 사람이 적은 이름에서 경로·Windows 금지 글자를 빼고, 끝의 점·공백을 지우고, 80자로 자른다. */
export function sanitizeFormName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  let name = raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ')
  name = name.replace(/^[\s.]+|[\s.]+$/g, '')
  name = [...name]
    .slice(0, 80)
    .join('')
    .replace(/[\s.]+$/, '')
  if (RESERVED.test(name)) name = `_${name}`
  return name
}

const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b
const isOle = (b: Uint8Array) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0

/** 확장자와 첫 바이트가 함께 맞을 때의 형식, 아니면 null */
export function myFormTypeOf(fileName: string, bytes: Uint8Array): MyFormType | null {
  const ext = extname(fileName).slice(1).toLowerCase()
  if (ext === 'docx' || ext === 'hwpx') return isZip(bytes) ? ext : null
  if (ext === 'hwp') return isOle(bytes) ? 'hwp' : null
  return null
}

/** 폴더 안의 양식 파일 이름(경로 없이, 지원 형식만)인지 */
function isFormFileName(file: unknown): file is string {
  return (
    typeof file === 'string' &&
    file === basename(file) &&
    !/[\\/]/.test(file) &&
    file !== INDEX &&
    TYPES.includes(extname(file).slice(1).toLowerCase() as MyFormType) &&
    sanitizeFormName(file.slice(0, -extname(file).length)) === file.slice(0, -extname(file).length)
  )
}

export interface MyFormsDeps {
  /** 양식 폴더(사용자 데이터 아래) */
  dir(): string
  now(): number
  /** 지운 양식은 휴지통으로 */
  trash(path: string): Promise<void>
}

export interface MyFormsStore {
  list(): MyForm[]
  add(name: unknown, bytes: Uint8Array, type: MyFormType): Promise<MyFormResult>
  /** 디스크의 파일 하나를 그 이름으로 가져온다(경로는 메인 프로세스의 열기 창에서만 온다) */
  addFile(path: string): Promise<MyFormResult>
  read(id: unknown): { form: MyForm; bytes: Uint8Array } | null
  remove(id: unknown): Promise<boolean>
}

export function createMyFormsStore(deps: MyFormsDeps): MyFormsStore {
  const formOf = (file: string, added: number): MyForm => {
    const ext = extname(file)
    return {
      id: file,
      name: file.slice(0, -ext.length),
      type: ext.slice(1).toLowerCase() as MyFormType,
      added,
    }
  }

  /** 색인을 읽고 폴더와 맞춘다: 없는 파일은 빼고, 색인에 없는 파일은 뒤에 붙인다. */
  const list = (): MyForm[] => {
    const dir = deps.dir()
    if (!existsSync(dir)) return []
    let files: string[]
    try {
      files = readdirSync(dir).filter((file) => {
        if (!isFormFileName(file)) return false
        try {
          const path = join(dir, file)
          if (!statSync(path).isFile()) return false
          const head = new Uint8Array(4)
          const bytes = readFileSync(path)
          head.set(bytes.subarray(0, 4))
          return myFormTypeOf(file, head) !== null
        } catch {
          return false
        }
      })
    } catch {
      return []
    }
    const present = new Set(files)
    const forms: MyForm[] = []
    const seen = new Set<string>()
    try {
      const index = JSON.parse(readFileSync(join(dir, INDEX), 'utf8')) as {
        forms?: { file?: unknown; added?: unknown }[]
      }
      for (const entry of Array.isArray(index.forms) ? index.forms : []) {
        const file = entry?.file
        if (!isFormFileName(file) || !present.has(file) || seen.has(file)) continue
        seen.add(file)
        forms.push(formOf(file, typeof entry.added === 'number' ? entry.added : 0))
      }
    } catch {
      /* 색인이 없거나 깨졌다: 폴더의 파일로 다시 만든다 */
    }
    for (const file of files.sort((a, b) => a.localeCompare(b)))
      if (!seen.has(file)) forms.push(formOf(file, 0))
    return forms
  }

  const writeIndex = async (forms: MyForm[]) => {
    const text = JSON.stringify(
      { version: 1, forms: forms.map((f) => ({ file: f.id, added: f.added })) },
      null,
      2,
    )
    await atomicWriteFile(join(deps.dir(), INDEX), Buffer.from(text, 'utf8'))
  }

  const find = (id: unknown): MyForm | null =>
    isFormFileName(id) ? (list().find((f) => f.id === id) ?? null) : null

  const add = async (
    rawName: unknown,
    bytes: Uint8Array,
    type: MyFormType,
  ): Promise<MyFormResult> => {
    const name = sanitizeFormName(rawName)
    if (!name) return { ok: false, error: 'empty-name' }
    if (!TYPES.includes(type) || myFormTypeOf(`x.${type}`, bytes) === null)
      return { ok: false, error: 'unsupported-type' }
    if (bytes.byteLength > MY_FORM_MAX_BYTES) return { ok: false, error: 'too-large' }
    const dir = deps.dir()
    mkdirSync(dir, { recursive: true })
    const forms = list()
    // 같은 이름은 형식이 달라도 "이름 (2)"로: 목록에서 둘을 구별할 수 있게
    const taken = new Set(
      [
        ...forms.map((f) => f.name),
        ...readdirSync(dir).map((f) => f.slice(0, -extname(f).length || undefined)),
      ].map((n) => n.toLowerCase()),
    )
    let unique = name
    for (let i = 2; taken.has(unique.toLowerCase()); i++) unique = `${name} (${i})`
    const form: MyForm = { id: `${unique}.${type}`, name: unique, type, added: deps.now() }
    await atomicWriteFile(join(dir, form.id), Buffer.from(bytes))
    await writeIndex([...forms, form])
    return { ok: true, form }
  }

  return {
    list,
    add,
    addFile: async (path) => {
      const fileName = basename(path)
      const ext = extname(fileName).slice(1).toLowerCase()
      if (!TYPES.includes(ext as MyFormType)) return { ok: false, error: 'unsupported-type' }
      let size: number
      try {
        size = statSync(path).size
      } catch {
        return { ok: false, error: 'not-found' }
      }
      if (size > MY_FORM_MAX_BYTES) return { ok: false, error: 'too-large' }
      const bytes = new Uint8Array(await readFile(path))
      if (myFormTypeOf(fileName, bytes) === null) return { ok: false, error: 'unsupported-type' }
      return add(fileName.slice(0, -(ext.length + 1)), bytes, ext as MyFormType)
    },
    read: (id) => {
      const form = find(id)
      if (!form) return null
      try {
        return { form, bytes: new Uint8Array(readFileSync(join(deps.dir(), form.id))) }
      } catch {
        return null
      }
    },
    remove: async (id) => {
      const form = find(id)
      if (!form) return false
      await deps.trash(join(deps.dir(), form.id))
      await writeIndex(list().filter((f) => f.id !== form.id))
      return true
    },
  }
}
