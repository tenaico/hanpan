// 한판 "내 양식": 사용자가 저장하거나 가져온 양식의 보관소(apps/shell/src/main/hanpan/my-forms.ts).
// (Node 24.11의 rmSync는 한글 파일 이름을 조용히 지우지 못한다: 파일은 unlinkSync로 지운다)
// 실제 임시 폴더에 쓰고 읽어서, 다시 켰을 때(새 보관소)와 색인이 없거나 깨졌을 때를 본다.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createMyFormsStore,
  myFormTypeOf,
  sanitizeFormName,
  type MyFormsStore,
} from '../src/main/hanpan/my-forms'

// 형식마다 첫 바이트: docx·hwpx는 zip(PK), hwp는 OLE 복합 문서
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])
const OLE = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 9])

let root: string
let dir: string
let trashed: string[]

const store = (): MyFormsStore =>
  createMyFormsStore({
    dir: () => dir,
    now: () => 1000,
    trash: async (path) => {
      trashed.push(path)
      unlinkSync(path)
    },
  })

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hp-my-forms-'))
  dir = join(root, 'hanpan-forms')
  trashed = []
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('sanitizeFormName', () => {
  it('strips path and Windows-reserved characters', () => {
    expect(sanitizeFormName('..\\..\\a/b:c*d?"e<f>g|h')).toBe('abcdefgh')
  })
  it('trims spaces and trailing dots and caps the length', () => {
    expect(sanitizeFormName('  보고서.  ')).toBe('보고서')
    expect(sanitizeFormName('가'.repeat(200))).toHaveLength(80)
  })
  it('keeps reserved device names off the disk', () => {
    expect(sanitizeFormName('CON')).toBe('_CON')
    expect(sanitizeFormName('nul')).toBe('_nul')
  })
  it('gives an empty name for nothing usable', () => {
    expect(sanitizeFormName('///')).toBe('')
    expect(sanitizeFormName(42)).toBe('')
  })
})

describe('myFormTypeOf', () => {
  it('takes docx, hwpx and hwp whose bytes match the extension', () => {
    expect(myFormTypeOf('a.DOCX', ZIP)).toBe('docx')
    expect(myFormTypeOf('a.hwpx', ZIP)).toBe('hwpx')
    expect(myFormTypeOf('a.hwp', OLE)).toBe('hwp')
  })
  it('rejects other types and renamed files', () => {
    expect(myFormTypeOf('a.xlsx', ZIP)).toBeNull()
    expect(myFormTypeOf('a.pdf', ZIP)).toBeNull()
    expect(myFormTypeOf('a.hwp', ZIP)).toBeNull()
    expect(myFormTypeOf('a.docx', OLE)).toBeNull()
  })
})

describe('createMyFormsStore', () => {
  it('lists nothing before any form is saved, without making the folder', () => {
    expect(store().list()).toEqual([])
  })

  it('saves a form under its name and type, and lists it after a restart', async () => {
    const saved = await store().add('주간 보고', ZIP, 'docx')
    expect(saved).toEqual({
      ok: true,
      form: { id: '주간 보고.docx', name: '주간 보고', type: 'docx', added: 1000 },
    })
    expect(readFileSync(join(dir, '주간 보고.docx'))).toEqual(Buffer.from(ZIP))
    expect(store().list()).toEqual([
      { id: '주간 보고.docx', name: '주간 보고', type: 'docx', added: 1000 },
    ])
  })

  it('numbers a duplicate name instead of overwriting', async () => {
    const s = store()
    await s.add('공문', OLE, 'hwp')
    const second = await s.add('공문', ZIP, 'hwpx')
    const third = await s.add('공문', OLE, 'hwp')
    expect(second.ok && second.form.name).toBe('공문 (2)')
    expect(third.ok && third.form.name).toBe('공문 (3)')
    expect(s.list().map((f) => f.id)).toEqual(['공문.hwp', '공문 (2).hwpx', '공문 (3).hwp'])
  })

  it('refuses an empty name, a type it does not keep, and bytes of another type', async () => {
    const s = store()
    expect(await s.add('  /  ', ZIP, 'docx')).toEqual({ ok: false, error: 'empty-name' })
    expect(await s.add('표', ZIP, 'xlsx' as never)).toEqual({
      ok: false,
      error: 'unsupported-type',
    })
    expect(await s.add('표', OLE, 'docx')).toEqual({ ok: false, error: 'unsupported-type' })
    expect(s.list()).toEqual([])
  })

  it('rebuilds the list from the folder when the index is missing', async () => {
    await store().add('계획서', ZIP, 'docx')
    unlinkSync(join(dir, 'index.json'))
    expect(store().list()).toEqual([{ id: '계획서.docx', name: '계획서', type: 'docx', added: 0 }])
  })

  it('rebuilds the list from the folder when the index is corrupt', async () => {
    await store().add('계획서', ZIP, 'docx')
    writeFileSync(join(dir, 'index.json'), '{ not json')
    expect(
      store()
        .list()
        .map((f) => f.id),
    ).toEqual(['계획서.docx'])
  })

  it('drops index entries whose file is gone and picks up files the index lacks', async () => {
    const s = store()
    await s.add('가', ZIP, 'docx')
    await s.add('나', OLE, 'hwp')
    unlinkSync(join(dir, '가.docx'))
    writeFileSync(join(dir, '다.hwpx'), ZIP)
    writeFileSync(join(dir, 'notes.txt'), 'x')
    writeFileSync(join(dir, '가짜.hwp'), ZIP)
    expect(
      store()
        .list()
        .map((f) => f.id),
    ).toEqual(['나.hwp', '다.hwpx'])
  })

  it('ignores index entries that point outside the folder', () => {
    writeFileSync(join(root, 'secret.docx'), ZIP)
    // the folder exists with a hostile index only
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'index.json'),
      JSON.stringify({ version: 1, forms: [{ file: '../secret.docx', added: 1 }] }),
    )
    expect(store().list()).toEqual([])
  })

  it('reads a form only by an id it lists', async () => {
    const s = store()
    await s.add('위임', OLE, 'hwp')
    expect(s.read('위임.hwp')?.bytes).toEqual(new Uint8Array(OLE))
    expect(s.read('../index.json')).toBeNull()
    expect(s.read('없음.hwp')).toBeNull()
    expect(s.read(7)).toBeNull()
  })

  it('removes a listed form to the trash and keeps the others', async () => {
    const s = store()
    await s.add('가', ZIP, 'docx')
    await s.add('나', ZIP, 'docx')
    expect(await s.remove('가.docx')).toBe(true)
    expect(trashed).toEqual([join(dir, '가.docx')])
    expect(
      store()
        .list()
        .map((f) => f.id),
    ).toEqual(['나.docx'])
    expect(await s.remove('../index.json')).toBe(false)
    expect(existsSync(join(dir, 'index.json'))).toBe(true)
  })

  it('imports a file from disk under its own name, refusing other types', async () => {
    const s = store()
    const source = join(root, '출장 신청서.hwpx')
    writeFileSync(source, ZIP)
    const added = await s.addFile(source)
    expect(added.ok && added.form).toEqual({
      id: '출장 신청서.hwpx',
      name: '출장 신청서',
      type: 'hwpx',
      added: 1000,
    })
    const sheet = join(root, '표.xlsx')
    writeFileSync(sheet, ZIP)
    expect(await s.addFile(sheet)).toEqual({ ok: false, error: 'unsupported-type' })
    expect(readdirSync(dir).sort()).toEqual(['index.json', '출장 신청서.hwpx'])
  })
})
