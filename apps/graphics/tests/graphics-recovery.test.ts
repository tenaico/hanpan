// @vitest-environment node
/**
 * 복구 사본(main 쪽): 화면이 넘긴 바이트를 프로필의 복구 폴더에 공용 저장소로 쓰고,
 * 저장·"저장 안 함"·깨끗하게 닫기에서 지우며, 다음 실행에서 새 탭으로 되살린다.
 * 닫기 질문은 문서 이름을 말하고, 제목 없는 문서의 저장 대화상자는 탭 제목을 기본 이름으로 쓴다.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
const showSaveDialog = vi.fn()
const showMessageBox = vi.fn()
let userData = ''

interface FakeContents {
  id: number
  sent: Array<[string, ...unknown[]]>
  destroyed: boolean
  listeners: Map<string, (...args: unknown[]) => void>
  isDestroyed(): boolean
  setWindowOpenHandler(handler: unknown): void
  loadURL(url: string): Promise<void>
  getURL(): string
  reload(): void
  send(channel: string, ...args: unknown[]): void
  on(event: string, listener: (...args: unknown[]) => void): void
  once(event: string, listener: (...args: unknown[]) => void): void
}

let nextId = 500
function fakeContents(): FakeContents {
  const contents: FakeContents = {
    id: nextId++,
    sent: [],
    destroyed: false,
    listeners: new Map(),
    isDestroyed: () => contents.destroyed,
    setWindowOpenHandler: () => {},
    loadURL: async () => {},
    getURL: () => '',
    reload: () => {},
    send: (channel, ...args) => {
      contents.sent.push([channel, ...args])
    },
    on: (event, listener) => {
      contents.listeners.set(event, listener)
    },
    once: (event, listener) => {
      contents.listeners.set(event, listener)
    },
  }
  return contents
}

vi.mock('electron', () => ({
  app: {
    on: vi.fn(),
    whenReady: () => new Promise(() => {}),
    getPath: (name: string) => (name === 'userData' ? userData : join(tmpdir(), name)),
    getLocale: () => 'en-US',
  },
  dialog: {
    showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
    showOpenDialog: vi.fn(),
    showMessageBox: (...args: unknown[]) => showMessageBox(...args),
  },
  shell: { openExternal: vi.fn() },
  protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
  net: {},
  BrowserWindow: { fromWebContents: () => null, getFocusedWindow: () => null },
  WebContentsView: class {
    webContents = fakeContents()
  },
  ipcMain: {
    handle: (channel: string, fn: Handler) => handlers.set(channel, fn),
    on: (channel: string, fn: Handler) => handlers.set(channel, fn),
    removeHandler: vi.fn(),
  },
}))

import { createRecoveryStore, recoveryEditor } from '@genoffice/electron-utils'
import type { RecoveryIdentity, RecoveryUntitledIdentity } from '@genoffice/electron-utils'
import { setUiLang } from '@genoffice/i18n'
import {
  configureGraphicsRuntime,
  createGraphicsView,
  discardGraphicsRecovery,
  graphicsRecoveryIdentity,
  requestGraphicsClose,
  setGraphicsRecoveryTitleSource,
} from '../src/main/graphics-main'
import { GRAPHICS_CHANNELS } from '../src/shared/ipc'
import type { BeginSaveResult, PendingOpen, RecoveryWriteAnswer } from '../src/shared/ipc'

let dir: string
let titles: Map<number, string>
const store = () => createRecoveryStore({ userDataDir: () => userData })

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'graphics-recovery-'))
  userData = join(dir, 'profile')
  showSaveDialog.mockReset()
  showMessageBox.mockReset()
  setUiLang('ko')
  titles = new Map()
  setGraphicsRecoveryTitleSource((contents) => titles.get(contents.id))
  configureGraphicsRuntime({ preloadPath: '/pre.js' })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function call<T>(channel: string, contents: FakeContents, ...args: unknown[]): Promise<T> {
  return Promise.resolve(handlers.get(channel)!({ sender: contents }, ...args) as T)
}
function fire(channel: string, contents: FakeContents, ...args: unknown[]): void {
  handlers.get(channel)!({ sender: contents }, ...args)
}
function viewFor(kind: 'photo' | 'illust', path?: string): FakeContents {
  return createGraphicsView(kind, path ?? null).webContents as unknown as FakeContents
}
const bytes = (text: string) => new TextEncoder().encode(text)
const write = (wc: FakeContents, text: string, ext: string) =>
  call<RecoveryWriteAnswer>(GRAPHICS_CHANNELS.recoveryWrite, wc, { bytes: bytes(text), ext })
/** the page takes what main hands it and says the app opened it */
async function openFile(wc: FakeContents): Promise<PendingOpen | null> {
  const pending = await call<PendingOpen | null>(GRAPHICS_CHANNELS.consumeOpen, wc)
  if (pending) fire(GRAPHICS_CHANNELS.openConfirmed, wc, pending.path)
  return pending
}
function untitledCopies(kind: 'photo' | 'illust'): string[] {
  const folder = join(userData, `${kind}-autosave`, 'untitled')
  return existsSync(folder) ? readdirSync(folder).filter((name) => !name.endsWith('.json')) : []
}
async function saveTo(wc: FakeContents, path: string): Promise<void> {
  showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: path })
  const begin = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
    mode: 'saveAs',
    layered: false,
  })
  expect(begin).toMatchObject({ ok: true, path })
  await call(GRAPHICS_CHANNELS.commitSave, wc, { bytes: bytes('saved'), path, format: 'x' })
}

describe('writing a copy', () => {
  it('keeps an untitled picture in the profile recovery folder, under the tab title', async () => {
    const wc = viewFor('photo')
    titles.set(wc.id, '제목 없는 사진 2')
    expect(await write(wc, 'layers', 'psd')).toBe('written')

    const identity = graphicsRecoveryIdentity(wc.id) as RecoveryUntitledIdentity
    expect(identity).toMatchObject({ kind: 'photo', ext: '.psd' })
    expect(untitledCopies('photo')).toEqual([`${identity.untitledId}.psd`])
    const info = store().copyInfo(identity)!
    expect(info.title).toBe('제목 없는 사진 2')
    expect((await store().readCopy(identity))!.toString()).toBe('layers')
  })

  it('writes the copy of a saved file under the file when the formats match', async () => {
    const path = join(dir, 'logo.vectorcraft')
    writeFileSync(path, 'old')
    const wc = viewFor('illust', path)
    await openFile(wc)
    expect(await write(wc, 'new shapes', 'vectorcraft')).toBe('written')

    const identity: RecoveryIdentity = { kind: 'illust', filePath: path }
    expect(graphicsRecoveryIdentity(wc.id)).toEqual(identity)
    expect((await store().readCopy(identity))!.toString()).toBe('new shapes')
  })

  it('keeps a copy in another format as an untitled copy that names the file', async () => {
    const path = join(dir, 'cat.png')
    writeFileSync(path, 'png')
    const wc = viewFor('photo', path)
    await openFile(wc)
    expect(await write(wc, 'layered', 'psd')).toBe('written')

    expect(store().copyInfo({ kind: 'photo', filePath: path })).toBeNull()
    const [copy] = store().listCopies({ kinds: ['photo'], untitled: true })
    expect(copy).toMatchObject({ originalPath: path, title: 'cat.png' })
    expect(copy!.identity).toMatchObject({ ext: '.psd' })
  })

  it('refuses a format the tab cannot open again', async () => {
    const wc = viewFor('photo')
    expect(await write(wc, 'x', 'exe')).toBe('refused')
    expect(await write(wc, 'x', 'vectorcraft')).toBe('refused')
    expect(untitledCopies('photo')).toEqual([])
  })
})

describe('dropping a copy', () => {
  it('a successful save deletes it and tells the page to copy again from scratch', async () => {
    const wc = viewFor('photo')
    await write(wc, 'draft', 'psd')
    await saveTo(wc, join(dir, 'done.psd'))

    expect(untitledCopies('photo')).toEqual([])
    expect(wc.sent).toContainEqual([GRAPHICS_CHANNELS.recoveryReset])
  })

  it('"Don\'t Save" deletes it and takes no copy while the tab closes', async () => {
    const wc = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    await write(wc, 'draft', 'vectorcraft')
    showMessageBox.mockResolvedValueOnce({ response: 1 })

    expect(await requestGraphicsClose(wc as never)).toBe(true)
    expect(untitledCopies('illust')).toEqual([])
    expect(await write(wc, 'late', 'vectorcraft')).toBe('superseded')
    expect(untitledCopies('illust')).toEqual([])
  })

  it('a tool closing the tab without saving drops it too', async () => {
    const wc = viewFor('photo')
    await write(wc, 'draft', 'png')
    discardGraphicsRecovery(wc as never)
    expect(untitledCopies('photo')).toEqual([])
  })

  it('closing a clean tab deletes it; a tab that goes with unsaved changes keeps it', async () => {
    const clean = viewFor('photo')
    await write(clean, 'a', 'psd')
    clean.listeners.get('destroyed')!()
    expect(untitledCopies('photo')).toEqual([])

    const dirty = viewFor('photo')
    fire(GRAPHICS_CHANNELS.dirtyChanged, dirty, true)
    await write(dirty, 'b', 'psd')
    dirty.listeners.get('destroyed')!()
    expect(untitledCopies('photo')).toHaveLength(1)
  })
})

describe('restoring a copy', () => {
  it('reopens an untitled copy in a new tab as an unsaved, untitled document', async () => {
    const copy: RecoveryUntitledIdentity = { kind: 'photo', untitledId: 'u-restore', ext: '.psd' }
    await store().writeCopy(copy, Buffer.from('psd bytes'), { title: '제목 없는 사진' })
    const wc = viewFor('photo')
    await recoveryEditor('photo')!.openUntitledCopy(wc as never, {
      copy,
      title: '제목 없는 사진',
    })

    const pending = await openFile(wc)
    expect(pending!.name).toBe('제목 없는 사진.psd')
    expect(new TextDecoder().decode(pending!.bytes)).toBe('psd bytes')
    // the page marks it changed once; later asks are false
    expect(await call(GRAPHICS_CHANNELS.recoveryRestored, wc)).toBe(true)
    expect(await call(GRAPHICS_CHANNELS.recoveryRestored, wc)).toBe(false)
    // later copies replace the restored one
    expect(graphicsRecoveryIdentity(wc.id)).toEqual(copy)
    // no file: the first save asks where
    showSaveDialog.mockResolvedValueOnce({ canceled: true })
    expect(await call(GRAPHICS_CHANNELS.beginSave, wc, { mode: 'save', layered: false })).toEqual({
      ok: true,
      canceled: true,
    })
  })

  it('offers the file it came from as the first Save As', async () => {
    const copy: RecoveryUntitledIdentity = { kind: 'photo', untitledId: 'u-orig', ext: '.psd' }
    await store().writeCopy(copy, Buffer.from('x'), { title: 'cat.png' })
    const wc = viewFor('photo')
    const original = join(dir, 'pics', 'cat.png')
    await recoveryEditor('photo')!.openUntitledCopy(wc as never, {
      copy,
      title: 'cat.png',
      saveAsDefaultPath: original,
    })
    await openFile(wc)
    showSaveDialog.mockResolvedValueOnce({ canceled: true })
    await call(GRAPHICS_CHANNELS.beginSave, wc, { mode: 'save', layered: false })
    const options = showSaveDialog.mock.calls[0]!.at(-1) as { defaultPath: string }
    expect(options.defaultPath).toBe(join(dir, 'pics', 'cat.psd'))
  })

  it('opens the copy of a file when "restore" was chosen; the file stays the save target', async () => {
    const path = join(dir, 'poster.psd')
    writeFileSync(path, 'on disk')
    await store().writeCopy({ kind: 'photo', filePath: path }, Buffer.from('copy'))
    store().applyLaunchDecision({ kind: 'photo', filePath: path }, 'restore')
    const wc = viewFor('photo', path)

    const pending = await openFile(wc)
    expect(new TextDecoder().decode(pending!.bytes)).toBe('copy')
    expect(pending!.path).toBe(path)
    expect(await call(GRAPHICS_CHANNELS.recoveryRestored, wc)).toBe(true)
    const begin = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: false,
    })
    expect(begin).toEqual({ ok: true, path, format: 'psd' })
  })

  it('opens a file without a copy as it is', async () => {
    const path = join(dir, 'plain.psd')
    writeFileSync(path, 'disk')
    const wc = viewFor('photo', path)
    const pending = await openFile(wc)
    expect(new TextDecoder().decode(pending!.bytes)).toBe('disk')
    expect(await call(GRAPHICS_CHANNELS.recoveryRestored, wc)).toBe(false)
  })
})

describe('the OS ending the session', () => {
  it('asks every changed tab for a copy now and waits for the answers', async () => {
    const changed = viewFor('illust')
    const clean = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, changed, true)
    let done = false
    const writing = recoveryEditor('illust')!
      .writeCopiesNow()
      .then(() => (done = true))
    await vi.waitFor(() => expect(changed.sent).toContainEqual([GRAPHICS_CHANNELS.recoveryCopyNow]))
    expect(clean.sent).not.toContainEqual([GRAPHICS_CHANNELS.recoveryCopyNow])
    expect(done).toBe(false)
    fire(GRAPHICS_CHANNELS.recoveryCopyNowDone, changed)
    await writing
    expect(done).toBe(true)
  })
})

describe('naming the document', () => {
  const askedMessage = () => (showMessageBox.mock.calls[0]!.at(-1) as { message: string }).message

  it('the close question names an untitled tab by its title', async () => {
    const wc = viewFor('photo')
    titles.set(wc.id, '제목 없는 사진 3')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    showMessageBox.mockResolvedValueOnce({ response: 2 })
    await requestGraphicsClose(wc as never)
    expect(askedMessage()).toBe("'제목 없는 사진 3'에 저장하지 않은 변경 사항이 있습니다.")
  })

  it('the close question names a saved file by its file name', async () => {
    const path = join(dir, 'logo.svg')
    writeFileSync(path, '<svg/>')
    const wc = viewFor('illust', path)
    titles.set(wc.id, 'something else')
    await openFile(wc)
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    showMessageBox.mockResolvedValueOnce({ response: 2 })
    await requestGraphicsClose(wc as never)
    expect(askedMessage()).toBe("'logo.svg'에 저장하지 않은 변경 사항이 있습니다.")
  })

  it('without a tab title the untitled name of the tab kind is used', async () => {
    const wc = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    showMessageBox.mockResolvedValueOnce({ response: 2 })
    await requestGraphicsClose(wc as never)
    expect(askedMessage()).toBe("'제목 없는 일러스트'에 저장하지 않은 변경 사항이 있습니다.")
  })

  it('the save dialog of an untitled document suggests the tab title', async () => {
    const titled = viewFor('photo')
    titles.set(titled.id, '제목 없는 사진 2')
    showSaveDialog.mockResolvedValue({ canceled: true })
    await call(GRAPHICS_CHANNELS.beginSave, titled, { mode: 'save', layered: false })
    const plain = viewFor('photo')
    await call(GRAPHICS_CHANNELS.beginSave, plain, { mode: 'save', layered: false })
    setUiLang('en')
    const english = viewFor('illust')
    await call(GRAPHICS_CHANNELS.beginSave, english, { mode: 'save', layered: false })

    const names = showSaveDialog.mock.calls.map((args) =>
      (args.at(-1) as { defaultPath: string }).defaultPath.split(/[\\/]/).pop(),
    )
    expect(names).toEqual([
      '제목 없는 사진 2.psd',
      '제목 없는 사진.psd',
      'Untitled Illustration.vectorcraft',
    ])
  })
})
