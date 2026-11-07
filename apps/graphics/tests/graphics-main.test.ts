// @vitest-environment node
/**
 * The main side: the view it makes, what it hands the page on open, where a
 * save may write, the close question and the keys it takes from the page.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
const showSaveDialog = vi.fn()
const showOpenDialog = vi.fn()
const showMessageBox = vi.fn()

interface FakeContents {
  id: number
  sent: Array<[string, ...unknown[]]>
  destroyed: boolean
  listeners: Map<string, (...args: unknown[]) => void>
  isDestroyed(): boolean
  setWindowOpenHandler(handler: unknown): void
  loadURL(url: string): Promise<void>
  getURL(): string
  send(channel: string, ...args: unknown[]): void
  on(event: string, listener: (...args: unknown[]) => void): void
  once(event: string, listener: (...args: unknown[]) => void): void
}

let nextId = 1
const loaded: string[] = []
const viewOptions: unknown[] = []
function fakeContents(): FakeContents {
  const contents: FakeContents = {
    id: nextId++,
    sent: [],
    destroyed: false,
    listeners: new Map(),
    isDestroyed: () => contents.destroyed,
    setWindowOpenHandler: () => {},
    loadURL: async (url) => {
      loaded.push(url)
    },
    getURL: () => loaded.at(-1) ?? '',
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
    getPath: (name: string) => join(tmpdir(), `graphics-test-${name}`),
    getLocale: () => 'en-US',
  },
  dialog: {
    showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
    showOpenDialog: (...args: unknown[]) => showOpenDialog(...args),
    showMessageBox: (...args: unknown[]) => showMessageBox(...args),
  },
  shell: { openExternal: vi.fn() },
  protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
  net: {},
  BrowserWindow: { fromWebContents: () => null, getFocusedWindow: () => null },
  WebContentsView: class {
    webContents = fakeContents()
    constructor(options: unknown) {
      viewOptions.push(options)
    }
  },
  ipcMain: {
    handle: (channel: string, fn: Handler) => handlers.set(channel, fn),
    on: (channel: string, fn: Handler) => handlers.set(channel, fn),
    removeHandler: vi.fn(),
  },
}))

import {
  configureGraphicsRuntime,
  createGraphicsView,
  graphicsFilePath,
  graphicsIsDirty,
  requestGraphicsClose,
  requestGraphicsSave,
  setGraphicsFileSavedHook,
  shortcutFor,
} from '../src/main/graphics-main'
import { GRAPHICS_CHANNELS } from '../src/shared/ipc'
import type { BeginSaveResult, CommitSaveResult, ExportResult } from '../src/shared/ipc'

let dir: string
const openFileDialog = vi.fn()
const newDocument = vi.fn()
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'graphics-main-'))
  showSaveDialog.mockReset()
  showOpenDialog.mockReset()
  showMessageBox.mockReset()
  openFileDialog.mockReset()
  newDocument.mockReset()
  configureGraphicsRuntime({ preloadPath: '/pre.js', openFileDialog, newDocument })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function call<T>(channel: string, contents: FakeContents, ...args: unknown[]): Promise<T> {
  return Promise.resolve(handlers.get(channel)!({ sender: contents }, ...args) as T)
}
function fire(channel: string, contents: FakeContents, ...args: unknown[]): void {
  handlers.get(channel)!({ sender: contents }, ...args)
}
async function opened(wc: FakeContents, path: string): Promise<void> {
  await call(GRAPHICS_CHANNELS.consumeOpen, wc)
  fire(GRAPHICS_CHANNELS.openConfirmed, wc, path)
}
function viewFor(kind: 'photo' | 'illust', path?: string): FakeContents {
  return createGraphicsView(kind, path ?? null).webContents as unknown as FakeContents
}

describe('the view', () => {
  it('creates a sandboxed view that keeps running in the background', () => {
    viewFor('illust')
    expect(viewOptions.at(-1)).toEqual({
      webPreferences: {
        preload: '/pre.js',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
        // the preload runs in the web app's frame too: there it only installs the agent
        nodeIntegrationInSubFrames: true,
      },
    })
    expect(loaded.at(-1)).toBe('genoffice-app://illust/index.html?kind=illust')
  })

  it('ignores the page veto on unload', () => {
    const wc = viewFor('photo')
    const event = { preventDefault: vi.fn() }
    wc.listeners.get('will-prevent-unload')!(event)
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('hands the opened file to the page once', async () => {
    const path = join(dir, 'cat.png')
    writeFileSync(path, 'png-bytes')
    const wc = viewFor('photo', path)
    const first = await call<{ name: string; path: string; bytes: Uint8Array }>(
      GRAPHICS_CHANNELS.consumeOpen,
      wc,
    )
    expect(first.name).toBe('cat.png')
    expect(first.path).toBe(path)
    expect(Buffer.from(first.bytes).toString()).toBe('png-bytes')
    expect(await call(GRAPHICS_CHANNELS.consumeOpen, wc)).toBeNull()
    // a save target only once the page says the app opened it
    expect(graphicsFilePath(wc.id)).toBeUndefined()
    fire(GRAPHICS_CHANNELS.openConfirmed, wc, path)
    expect(graphicsFilePath(wc.id)).toBe(path)
  })

  it('a file the app did not open is never saved over', async () => {
    const path = join(dir, 'logo.ai')
    writeFileSync(path, 'original')
    const wc = viewFor('illust', path)
    await call(GRAPHICS_CHANNELS.consumeOpen, wc)
    // the app could not open it; the person makes a new drawing and presses Ctrl+S
    showSaveDialog.mockResolvedValue({ canceled: true })
    const begin = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: false,
    })
    expect(showSaveDialog).toHaveBeenCalled()
    expect(begin).toEqual({ ok: true, canceled: true })
    // a confirmation for another path changes nothing
    fire(GRAPHICS_CHANNELS.openConfirmed, wc, join(dir, 'other.ai'))
    expect(graphicsFilePath(wc.id)).toBeUndefined()
  })
})

describe('saving', () => {
  it('begin-save writes in place without a dialog when it can', async () => {
    const path = join(dir, 'logo.svg')
    writeFileSync(path, '<svg/>')
    const wc = viewFor('illust', path)
    await opened(wc, path)
    const begin = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: false,
    })
    expect(begin).toEqual({ ok: true, path, format: 'svg' })
    expect(showSaveDialog).not.toHaveBeenCalled()
  })

  it('an extension the dialog did not add still asks before replacing a file that is there', async () => {
    writeFileSync(join(dir, 'poster.vectorcraft'), 'old')
    const wc = viewFor('illust')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join(dir, 'poster') })
    showMessageBox.mockResolvedValueOnce({ response: 1 })
    const canceled = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: false,
    })
    expect(canceled).toEqual({ ok: true, canceled: true })
    expect(showMessageBox).toHaveBeenCalledTimes(1)
    showMessageBox.mockResolvedValueOnce({ response: 0 })
    const replaced = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: false,
    })
    expect(replaced).toMatchObject({ ok: true, path: join(dir, 'poster.vectorcraft') })
  })

  it('an export whose added extension names a file that is there asks first', async () => {
    writeFileSync(join(dir, 'copy.png'), 'old')
    const wc = viewFor('illust')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join(dir, 'copy') })
    showMessageBox.mockResolvedValueOnce({ response: 1 })
    const result = await call<{ ok: boolean; canceled?: boolean }>(
      GRAPHICS_CHANNELS.exportFile,
      wc,
      {
        bytes: new Uint8Array([1, 2]),
        defaultName: 'copy.png',
        format: 'png',
      },
    )
    expect(result).toEqual({ ok: true, canceled: true })
    expect(readFileSync(join(dir, 'copy.png'), 'utf8')).toBe('old')
  })

  it('a finished write leaves the changed mark to the page (an edit during the save keeps it)', async () => {
    const path = join(dir, 'logo.svg')
    writeFileSync(path, '<svg/>')
    const wc = viewFor('illust', path)
    await opened(wc, path)
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    await call(GRAPHICS_CHANNELS.beginSave, wc, { mode: 'save', layered: false })
    await call(GRAPHICS_CHANNELS.commitSave, wc, {
      bytes: new Uint8Array([1, 2, 3]),
      path,
      format: 'svg',
    })
    expect(graphicsIsDirty(wc.id)).toBe(true)
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, false)
    expect(graphicsIsDirty(wc.id)).toBe(false)
  })

  it('begin-save asks for an untitled document and adds the default extension', async () => {
    const wc = viewFor('illust')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join(dir, 'poster') })
    const begin = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: false,
    })
    expect(begin).toEqual({
      ok: true,
      path: join(dir, 'poster.vectorcraft'),
      format: 'vectorcraft',
    })
    const options = showSaveDialog.mock.calls[0]!.at(-1) as {
      defaultPath: string
      filters: { extensions: string[] }[]
    }
    expect(options.defaultPath).toMatch(/\.vectorcraft$/)
    expect(options.filters[0]!.extensions).toEqual(['vectorcraft'])
  })

  it('begin-save for a layered photo from a png offers psd and says why', async () => {
    const path = join(dir, 'cat.png')
    writeFileSync(path, 'x')
    const wc = viewFor('photo', path)
    await opened(wc, path)
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join(dir, 'cat.psd') })
    const begin = await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
      mode: 'save',
      layered: true,
    })
    expect(begin).toEqual({
      ok: true,
      path: join(dir, 'cat.psd'),
      format: 'psd',
      reason: 'layered',
    })
    const options = showSaveDialog.mock.calls[0]!.at(-1) as { defaultPath: string }
    expect(options.defaultPath).toBe(join(dir, 'cat.psd'))
  })

  it('a canceled dialog is a canceled save', async () => {
    const wc = viewFor('photo')
    showSaveDialog.mockResolvedValue({ canceled: true })
    expect(
      await call<BeginSaveResult>(GRAPHICS_CHANNELS.beginSave, wc, {
        mode: 'save',
        layered: false,
      }),
    ).toEqual({ ok: true, canceled: true })
  })

  it('commit-save writes atomically, records the path and calls the saved hook once', async () => {
    const hook = vi.fn()
    setGraphicsFileSavedHook(hook)
    const wc = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    const target = join(dir, 'art.vectorcraft')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    await call(GRAPHICS_CHANNELS.beginSave, wc, { mode: 'save', layered: false })
    const commit = await call<CommitSaveResult>(GRAPHICS_CHANNELS.commitSave, wc, {
      bytes: new Uint8Array([1, 2, 3]),
      path: target,
      format: 'vectorcraft',
    })
    expect(commit).toEqual({ ok: true, path: target })
    expect([...readFileSync(target)]).toEqual([1, 2, 3])
    expect(graphicsFilePath(wc.id)).toBe(target)
    // the mark is the page's to clear (it reports clean once the app is)
    expect(graphicsIsDirty(wc.id)).toBe(true)
    expect(hook).toHaveBeenCalledTimes(1)
    expect(hook).toHaveBeenCalledWith(wc, target)
  })

  it('commit-save refuses a path main did not choose', async () => {
    const wc = viewFor('illust')
    const commit = await call<CommitSaveResult>(GRAPHICS_CHANNELS.commitSave, wc, {
      bytes: new Uint8Array([1]),
      path: join(dir, 'elsewhere.svg'),
      format: 'svg',
    })
    expect(commit.ok).toBe(false)
    expect(existsSync(join(dir, 'elsewhere.svg'))).toBe(false)
  })

  it('commit-save that fails leaves the tab dirty', async () => {
    const wc = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    const target = join(dir, 'missing-folder', 'x.svg')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    await call(GRAPHICS_CHANNELS.beginSave, wc, { mode: 'saveAs', layered: false })
    const commit = await call<CommitSaveResult>(GRAPHICS_CHANNELS.commitSave, wc, {
      bytes: new Uint8Array([1]),
      path: target,
      format: 'svg',
    })
    expect(commit.ok).toBe(false)
    expect(graphicsIsDirty(wc.id)).toBe(true)
  })

  it('a menu save asks the page and resolves with the outcome', async () => {
    const wc = viewFor('photo')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    const saved = requestGraphicsSave(wc as never, 'saveAs')
    expect(wc.sent.at(-1)).toEqual([GRAPHICS_CHANNELS.saveRequest, 'saveAs'])
    fire(GRAPHICS_CHANNELS.saveRequestAck, wc, true)
    expect(await saved).toBe(true)
  })

  it('export writes the chosen file and leaves the document path alone', async () => {
    const path = join(dir, 'logo.svg')
    writeFileSync(path, '<svg/>')
    const wc = viewFor('illust', path)
    await opened(wc, path)
    const out = join(dir, 'logo.png')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: out })
    const result = await call<ExportResult>(GRAPHICS_CHANNELS.exportFile, wc, {
      bytes: new Uint8Array([9]),
      defaultName: 'logo.png',
      format: 'png',
    })
    expect(result).toEqual({ ok: true, path: out })
    expect([...readFileSync(out)]).toEqual([9])
    expect(graphicsFilePath(wc.id)).toBe(path)
  })

  it('picks an image through the open dialog', async () => {
    const wc = viewFor('illust')
    const pic = join(dir, 'dot.png')
    writeFileSync(pic, 'img')
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [pic] })
    const picked = await call<{ name: string; bytes: Uint8Array }>(GRAPHICS_CHANNELS.pickImage, wc)
    expect(picked.name).toBe('dot.png')
    expect(Buffer.from(picked.bytes).toString()).toBe('img')
  })
})

describe('the web build', () => {
  it('is present when its page beside the renderer is the app own page', async () => {
    const renderer = join(dir, 'renderer')
    mkdirSync(join(renderer, 'web', 'photo'), { recursive: true })
    writeFileSync(join(renderer, 'web', 'photo', 'index.html'), '<canvas id="photocraft_canvas">')
    writeFileSync(join(renderer, 'index.html'), '<html>')
    configureGraphicsRuntime({ preloadPath: '/pre.js', rendererFile: join(renderer, 'index.html') })
    const wc = viewFor('photo')
    expect(await call(GRAPHICS_CHANNELS.webPresent, wc)).toBe(true)
    const other = viewFor('illust')
    expect(await call(GRAPHICS_CHANNELS.webPresent, other)).toBe(false)
  })

  it('every page of the tab gets the preload, so the app frame gets the agent (and nothing else)', () => {
    viewFor('photo')
    const prefs = (viewOptions.at(-1) as { webPreferences: Record<string, unknown> }).webPreferences
    expect(prefs.nodeIntegrationInSubFrames).toBe(true)
    expect(prefs.sandbox).toBe(true)
    expect(prefs.contextIsolation).toBe(true)
  })
})

describe('closing', () => {
  it('a clean tab closes without asking', async () => {
    const wc = viewFor('photo')
    expect(await requestGraphicsClose(wc as never)).toBe(true)
    expect(showMessageBox).not.toHaveBeenCalled()
  })

  it('Cancel keeps the tab, Do not Save closes it', async () => {
    const wc = viewFor('photo')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    showMessageBox.mockResolvedValueOnce({ response: 2 })
    expect(await requestGraphicsClose(wc as never)).toBe(false)
    showMessageBox.mockResolvedValueOnce({ response: 1 })
    expect(await requestGraphicsClose(wc as never)).toBe(true)
  })

  it('Save waits for the page to save', async () => {
    const wc = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    showMessageBox.mockResolvedValueOnce({ response: 0 })
    const closing = requestGraphicsClose(wc as never)
    await vi.waitFor(() => expect(wc.sent.at(-1)).toEqual([GRAPHICS_CHANNELS.closeSaveRequest]))
    fire(GRAPHICS_CHANNELS.closeSaveResult, wc, true)
    expect(await closing).toBe(true)
  })

  it('a second close while one is asking or saving waits for that one (one question, both answered)', async () => {
    const wc = viewFor('illust')
    fire(GRAPHICS_CHANNELS.dirtyChanged, wc, true)
    showMessageBox.mockResolvedValueOnce({ response: 0 })
    const first = requestGraphicsClose(wc as never)
    const second = requestGraphicsClose(wc as never)
    await vi.waitFor(() => expect(wc.sent.at(-1)).toEqual([GRAPHICS_CHANNELS.closeSaveRequest]))
    fire(GRAPHICS_CHANNELS.closeSaveResult, wc, true)
    expect(await first).toBe(true)
    expect(await second).toBe(true)
    expect(showMessageBox).toHaveBeenCalledTimes(1)
  })
})

describe('keys taken from the page', () => {
  const key = (
    k: string,
    mods: Partial<Record<'control' | 'meta' | 'shift' | 'alt', boolean>> = {},
  ) => ({
    type: 'keyDown',
    key: k,
    control: false,
    meta: false,
    shift: false,
    alt: false,
    ...mods,
  })

  it('Ctrl+S, Ctrl+Shift+S, Ctrl+O, Ctrl+N and Ctrl+P are Hanpan commands', () => {
    expect(shortcutFor(key('s', { control: true }), 'win32')).toBe('save')
    expect(shortcutFor(key('S', { control: true, shift: true }), 'win32')).toBe('saveAs')
    expect(shortcutFor(key('o', { control: true }), 'win32')).toBe('open')
    expect(shortcutFor(key('n', { control: true }), 'win32')).toBe('new')
    expect(shortcutFor(key('p', { control: true }), 'win32')).toBe('print')
    expect(shortcutFor(key('s', { meta: true }), 'darwin')).toBe('save')
  })

  it('leaves other keys and key-ups to the page', () => {
    expect(shortcutFor(key('z', { control: true }), 'win32')).toBeNull()
    expect(shortcutFor(key('s'), 'win32')).toBeNull()
    expect(shortcutFor({ ...key('s', { control: true }), type: 'keyUp' }, 'win32')).toBeNull()
    expect(shortcutFor(key('s', { control: true, alt: true }), 'win32')).toBeNull()
  })

  it('the view runs the command and keeps the key from the page', () => {
    const wc = viewFor('photo')
    const event = { preventDefault: vi.fn() }
    wc.listeners.get('before-input-event')!(event, key('o', { control: true }))
    expect(event.preventDefault).toHaveBeenCalled()
    expect(openFileDialog).toHaveBeenCalled()
    wc.listeners.get('before-input-event')!(event, key('n', { control: true }))
    expect(newDocument).toHaveBeenCalledWith('photo')
  })

  it('Ctrl+P asks the page for its print preview', () => {
    const wc = viewFor('illust')
    const event = { preventDefault: vi.fn() }
    wc.listeners.get('before-input-event')!(event, key('p', { control: true }))
    expect(event.preventDefault).toHaveBeenCalled()
    expect(wc.sent).toContainEqual([GRAPHICS_CHANNELS.menuCommand, 'print'])
  })
})

describe('printing the picture', () => {
  // a PNG head that says 3000 × 2000
  const PNG = new Uint8Array(33)
  PNG.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  new DataView(PNG.buffer).setUint32(16, 3000)
  new DataView(PNG.buffer).setUint32(20, 2000)
  const sheet = { widthMm: 297, heightMm: 210, marginMm: 10 }
  const printHtml = vi.fn()
  beforeEach(() => {
    printHtml.mockReset()
    printHtml.mockResolvedValue({ ok: true })
    configureGraphicsRuntime({ preloadPath: '/pre.js', printHtml })
  })

  it('prints the PNG the page sent on the paper it chose, through the shared print page', async () => {
    const wc = viewFor('photo')
    const result = await call(GRAPHICS_CHANNELS.print, wc, { bytes: PNG, sheet })
    expect(result).toEqual({ ok: true })
    const [html, given] = printHtml.mock.calls[0]!
    expect(given).toEqual(sheet)
    expect(html).toContain('@page { size: 297mm 210mm; margin: 0; }')
    // the size comes from the PNG itself: 3:2 inside 277 × 190 mm
    expect(html).toContain('width:277mm;height:184.667mm')
    expect(html).toContain(`src="data:image/png;base64,${Buffer.from(PNG).toString('base64')}"`)
  })

  it('reports a closed print dialog as canceled, not as a failure', async () => {
    printHtml.mockResolvedValue({ ok: true, canceled: true })
    const wc = viewFor('illust')
    expect(await call(GRAPHICS_CHANNELS.print, wc, { bytes: PNG, sheet })).toEqual({
      ok: true,
      canceled: true,
    })
  })

  it('refuses anything but a PNG, a sane paper, or a view that is not a graphics tab', async () => {
    const wc = viewFor('photo')
    const bad = [
      { bytes: new Uint8Array([1, 2, 3]), sheet },
      { bytes: PNG, sheet: { widthMm: 1e6, heightMm: 1, marginMm: 0 } },
      { bytes: PNG },
      null,
    ]
    for (const request of bad)
      expect(await call<{ ok: boolean }>(GRAPHICS_CHANNELS.print, wc, request)).toMatchObject({
        ok: false,
      })
    const stranger = fakeContents()
    expect(
      await call<{ ok: boolean }>(GRAPHICS_CHANNELS.print, stranger, { bytes: PNG, sheet }),
    ).toMatchObject({ ok: false })
    expect(printHtml).not.toHaveBeenCalled()
  })
})
