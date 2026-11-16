// @vitest-environment node
/**
 * The main process of the AI Drawing editor: what it hands the renderer on
 * open, what it agrees to write and where. A path becomes a save target only
 * after this side opened the `.ttukcad` with the engine and saw `ok`; DXF,
 * STL and OBJ files are read, never written; bytes that would not reopen are
 * never written.
 */
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  truncateSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeContents, Handler } from './helpers/fake-electron'

const handlers = new Map<string, Handler>()
const showSaveDialog = vi.fn()
const showMessageBox = vi.fn()

vi.mock('electron', async () => {
  const { fakeContents } = await import('./helpers/fake-electron')
  return {
    app: {
      on: vi.fn(),
      whenReady: () => new Promise(() => {}),
      getPath: (name: string) => join(tmpdir(), `cad-test-${name}`),
      getLocale: () => 'en-US',
    },
    dialog: {
      showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
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
  }
})

// spies over the real file functions: what was read and what was written
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, default: actual, readFile: vi.fn(actual.readFile) }
})
vi.mock('../src/main/atomic-write', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/main/atomic-write')>()
  return { atomicWriteFile: vi.fn(actual.atomicWriteFile) }
})

import { readFile } from 'node:fs/promises'
import {
  CAD_FILE_FORMAT,
  MAX_FILE_BYTES,
  createDocument,
  openCadFile,
  saveCadFile,
} from '@genoffice/cad-engine'
import { setUiLang } from '@genoffice/i18n'
import { atomicWriteFile } from '../src/main/atomic-write'
import {
  cadFilePath,
  cadFileRenamed,
  cadIsDirty,
  cadSaveToPath,
  createCadView,
  requestCadClose,
  requestCadSave,
  sendCadMenuCommand,
} from '../src/main/cad-main'
import { AI_CHANNELS, APP_CHANNELS, CAD_CHANNELS } from '../src/shared/ipc'
import type { OpenFileResult, SaveCadResult } from '../src/shared/ipc'

let dir: string
beforeEach(() => {
  setUiLang('en')
  dir = mkdtempSync(join(tmpdir(), 'genoffice-cad-main-'))
  showSaveDialog.mockReset()
  showMessageBox.mockReset()
  vi.mocked(readFile).mockClear()
  vi.mocked(atomicWriteFile).mockClear()
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

/** A `.ttukcad` file as the engine writes it; the title tells copies apart. */
function cadBytes(name = 'Bracket'): Uint8Array {
  const doc = createDocument()
  return saveCadFile({ ...doc, title: { ...doc.title, name } })
}

function titleOf(bytes: Uint8Array | Buffer): string {
  const opened = openCadFile(new Uint8Array(bytes))
  if (opened.status !== 'ok') throw new Error(opened.status)
  return opened.document.title.name
}

/** A small ASCII STL with one triangle. */
const STL =
  'solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid t\n'

function view(openPath?: string | null): FakeContents {
  return createCadView(openPath).webContents as unknown as FakeContents
}

const call = <T>(channel: string, contents: FakeContents, ...args: unknown[]): T =>
  handlers.get(channel)!({ sender: contents }, ...args) as T

const open = (contents: FakeContents, path: string) =>
  call<Promise<OpenFileResult>>(CAD_CHANNELS.openFile, contents, path)

const save = (contents: FakeContents, request: unknown) =>
  call<Promise<SaveCadResult>>(CAD_CHANNELS.save, contents, request)

const savedPath = (): string => vi.mocked(atomicWriteFile).mock.calls.at(-1)![0] as string

describe('channels', () => {
  it('registers only cad: channels, plus the language getter every editor answers', () => {
    view(null)
    for (const channel of handlers.keys()) {
      expect(Object.values(AI_CHANNELS)).not.toContain(channel)
      if (!channel.startsWith('cad:')) expect(channel).toBe(APP_CHANNELS.getLanguage)
    }
    for (const name of [
      'consumePending',
      'openFile',
      'save',
      'dirtyChanged',
      'saveRequestAck',
      'closeSaveResult',
      'recoveryCopy',
      'recoveryCopyNowDone',
    ] as const) {
      expect(handlers.has(CAD_CHANNELS[name])).toBe(true)
    }
    // later stages add these
    for (const name of ['exportFile', 'copyImage', 'sendToDocument'] as const) {
      expect(handlers.has(CAD_CHANNELS[name])).toBe(false)
    }
  })

  it('a path that was not granted to the view is not read', async () => {
    const path = join(dir, 'other.ttukcad')
    writeFileSync(path, cadBytes())
    await expect(open(view(null), path)).rejects.toThrow(/not granted/)
  })

  it('the view opens no window and does not navigate away', () => {
    const contents = view(null)
    expect(contents.windowOpenHandler!({ url: 'https://example.com/' })).toEqual({
      action: 'deny',
    })
    const event = { preventDefault: vi.fn() }
    contents.listeners.get('will-navigate')!(event, 'https://example.com/elsewhere')
    expect(event.preventDefault).toHaveBeenCalled()
  })
})

describe('opening', () => {
  it('open .ttukcad that opens ok grants the path; a later save writes there', async () => {
    const path = join(dir, 'part.ttukcad')
    const bytes = cadBytes('On disk')
    writeFileSync(path, bytes)
    const contents = view(path)
    expect(call(CAD_CHANNELS.consumePending, contents)).toBe(path)
    // no save target before the main process has seen the file open
    expect(cadFilePath(contents.id)).toBeUndefined()
    const result = await open(contents, path)
    expect(result.status).toBe('ok')
    expect(result.status === 'ok' && Buffer.from(result.bytes).equals(Buffer.from(bytes))).toBe(
      true,
    )
    expect(cadFilePath(contents.id)).toBe(path)

    const edited = cadBytes('Edited')
    expect(await save(contents, { bytes: edited, mode: 'save' })).toEqual({ ok: true, path })
    expect(showSaveDialog).not.toHaveBeenCalled()
    expect(titleOf(readFileSync(path))).toBe('Edited')
    // nothing is left beside the file: the temporary file was renamed over it
    expect(readdirSync(dir)).toEqual(['part.ttukcad'])
  })

  it.each([
    ['broken', () => Buffer.from('{ not json')],
    ['empty', () => Buffer.alloc(0)],
    ['unsupported', () => Buffer.from(JSON.stringify({ format: 'something-else', version: 1 }))],
    ['unsupported', () => Buffer.from(JSON.stringify({ format: CAD_FILE_FORMAT, version: 2 }))],
  ])(
    'open .ttukcad that does not open ok (%s) grants nothing; save asks for a new path',
    async (status, make) => {
      const path = join(dir, 'broken.ttukcad')
      const original = make()
      writeFileSync(path, original)
      const contents = view(path)
      const result = await open(contents, path)
      expect(result).toEqual({ status })
      expect(result).not.toHaveProperty('bytes')
      expect(cadFilePath(contents.id)).toBeUndefined()

      const target = join(dir, 'new.ttukcad')
      showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
      expect(await save(contents, { bytes: cadBytes(), mode: 'save' })).toEqual({
        ok: true,
        path: target,
      })
      expect(showSaveDialog).toHaveBeenCalledTimes(1)
      expect(readFileSync(path).equals(original)).toBe(true)
    },
  )

  it('open .stl returns import with the file name and grants nothing', async () => {
    const path = join(dir, 'Gear Wheel.STL')
    writeFileSync(path, STL)
    const contents = view(path)
    const result = await open(contents, path)
    expect(result).toMatchObject({ status: 'import', name: 'Gear Wheel', ext: 'stl' })
    expect(result.status === 'import' && Buffer.from(result.bytes).toString()).toBe(STL)
    expect(cadFilePath(contents.id)).toBeUndefined()

    // the first save asks where, and never lands on the STL
    const target = join(dir, 'Gear Wheel')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    expect(
      await save(contents, { bytes: cadBytes(), mode: 'save', defaultName: 'Gear Wheel' }),
    ).toEqual({ ok: true, path: `${target}.ttukcad` })
    const options = showSaveDialog.mock.calls[0]!.at(-1) as { defaultPath: string }
    expect(options.defaultPath.endsWith('Gear Wheel.ttukcad')).toBe(true)
    expect(readFileSync(path, 'utf8')).toBe(STL)
  })

  it.each([
    ['plan.dxf', 'dxf'],
    ['mesh.obj', 'obj'],
  ])('open %s returns import as %s', async (name, ext) => {
    const path = join(dir, name)
    writeFileSync(path, 'x')
    const result = await open(view(path), path)
    expect(result).toMatchObject({ status: 'import', ext, name: name.replace(/\.\w+$/, '') })
  })

  it('a file of another type is not read', async () => {
    const path = join(dir, 'notes.txt')
    writeFileSync(path, 'hello')
    expect(await open(view(path), path)).toEqual({ status: 'unknown-type' })
    expect(readFile).not.toHaveBeenCalled()
  })

  it.each(['big.ttukcad', 'big.stl'])(
    'a file over MAX_FILE_BYTES is refused before it is read (%s)',
    async (name) => {
      const path = join(dir, name)
      writeFileSync(path, '')
      truncateSync(path, MAX_FILE_BYTES + 1)
      const contents = view(path)
      expect(await open(contents, path)).toEqual({ status: 'too-large' })
      expect(readFile).not.toHaveBeenCalled()
      expect(cadFilePath(contents.id)).toBeUndefined()
    },
  )

  it('a file that is gone by the time it is opened is not-found', async () => {
    const path = join(dir, 'gone.ttukcad')
    writeFileSync(path, cadBytes())
    const contents = view(path)
    rmSync(path)
    expect(await open(contents, path)).toEqual({ status: 'not-found' })
  })
})

describe('a view made for a file writes nothing before its file has opened', () => {
  it('refuses saves, menu saves and the close prompt until then', async () => {
    const path = join(dir, 'part.ttukcad')
    const bytes = cadBytes('On disk')
    writeFileSync(path, bytes)
    const contents = view(path)
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join(dir, 'x.ttukcad') })
    expect(await save(contents, { bytes: cadBytes('Edited'), mode: 'save' })).toEqual({
      ok: false,
      error: 'no-target',
    })
    expect(await requestCadSave(contents as never, 'save')).toBe(false)
    await expect(cadSaveToPath(contents as never, join(dir, 'y.ttukcad'))).rejects.toThrow()
    call(CAD_CHANNELS.dirtyChanged, contents, true)
    expect(cadIsDirty(contents.id)).toBe(false)
    expect(await requestCadClose(contents as never)).toBe(true)
    expect(showSaveDialog).not.toHaveBeenCalled()
    expect(showMessageBox).not.toHaveBeenCalled()
    expect(atomicWriteFile).not.toHaveBeenCalled()
    expect(readFileSync(path).equals(Buffer.from(bytes))).toBe(true)
  })
})

describe('saving', () => {
  it('save refuses bytes that do not reopen', async () => {
    const path = join(dir, 'part.ttukcad')
    const bytes = cadBytes()
    writeFileSync(path, bytes)
    const contents = view(path)
    await open(contents, path)
    const notAFile = new TextEncoder().encode(
      JSON.stringify({ format: CAD_FILE_FORMAT, version: 1 }),
    )
    for (const bad of [notAFile, new Uint8Array(0), 'text', undefined, null]) {
      expect(await save(contents, { bytes: bad, mode: 'save' })).toEqual({
        ok: false,
        error: 'not-reopenable',
      })
    }
    expect(atomicWriteFile).not.toHaveBeenCalled()
    expect(showSaveDialog).not.toHaveBeenCalled()
    expect(readFileSync(path).equals(Buffer.from(bytes))).toBe(true)
  })

  it('save as adds .ttukcad when the picked name has none', async () => {
    const contents = view(null)
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join(dir, 'no-extension') })
    const result = await save(contents, { bytes: cadBytes(), mode: 'saveAs' })
    expect(result).toEqual({ ok: true, path: join(dir, 'no-extension.ttukcad') })
    expect(savedPath()).toBe(join(dir, 'no-extension.ttukcad'))
    const options = showSaveDialog.mock.calls[0]!.at(-1) as {
      filters: { extensions: string[] }[]
    }
    expect(options.filters[0]!.extensions).toEqual(['ttukcad'])
  })

  it('a name picked with another drawing extension still ends in .ttukcad', async () => {
    const contents = view(null)
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join(dir, 'part.stl') })
    expect(await save(contents, { bytes: cadBytes(), mode: 'save' })).toEqual({
      ok: true,
      path: join(dir, 'part.stl.ttukcad'),
    })
  })

  it('an untitled drawing asks once, offers its name, and remembers the answer', async () => {
    const contents = view(null)
    const target = join(dir, 'chosen.ttukcad')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    expect(await save(contents, { bytes: cadBytes(), mode: 'save', defaultName: 'A: b?' })).toEqual(
      { ok: true, path: target },
    )
    const options = showSaveDialog.mock.calls[0]!.at(-1) as { defaultPath: string }
    expect(options.defaultPath.endsWith('A_ b_.ttukcad')).toBe(true)
    expect(cadFilePath(contents.id)).toBe(target)
    await save(contents, { bytes: cadBytes('Again'), mode: 'save' })
    expect(showSaveDialog).toHaveBeenCalledTimes(1)
    expect(titleOf(readFileSync(target))).toBe('Again')
  })

  it('a cancelled dialog writes nothing', async () => {
    const contents = view(null)
    showSaveDialog.mockResolvedValue({ canceled: true })
    expect(await save(contents, { bytes: cadBytes(), mode: 'save' })).toEqual({
      ok: true,
      canceled: true,
    })
    expect(atomicWriteFile).not.toHaveBeenCalled()
    expect(cadFilePath(contents.id)).toBeUndefined()
  })

  it('after fileRenamed a save goes to the new path', async () => {
    const path = join(dir, 'part.ttukcad')
    writeFileSync(path, cadBytes())
    const contents = view(path)
    await open(contents, path)
    const renamed = join(dir, 'renamed.ttukcad')
    rmSync(path)
    writeFileSync(renamed, cadBytes())
    cadFileRenamed(contents as never, path, renamed)
    expect(contents.sent).toContainEqual([CAD_CHANNELS.fileRenamed, renamed])
    expect(cadFilePath(contents.id)).toBe(renamed)
    expect(call(CAD_CHANNELS.consumePending, contents)).toBe(renamed)
    expect(await save(contents, { bytes: cadBytes('After rename'), mode: 'save' })).toEqual({
      ok: true,
      path: renamed,
    })
    expect(titleOf(readFileSync(renamed))).toBe('After rename')
    expect(readdirSync(dir)).toEqual(['renamed.ttukcad'])
  })

  it('a save to a given path runs the normal save without a dialog', async () => {
    const contents = view(null)
    const target = join(dir, 'given.ttukcad')
    const saving = cadSaveToPath(contents as never, target)
    expect(contents.sent).toEqual([[CAD_CHANNELS.saveRequest, 'save']])
    await save(contents, { bytes: cadBytes('Given'), mode: 'save' })
    await saving
    expect(showSaveDialog).not.toHaveBeenCalled()
    expect(titleOf(readFileSync(target))).toBe('Given')
  })

  it('a save to a given path is refused for anything but a .ttukcad', async () => {
    const contents = view(null)
    await expect(cadSaveToPath(contents as never, join(dir, 'out.stl'))).rejects.toThrow()
    expect(contents.sent).toEqual([])
  })
})

describe('the menu and closing', () => {
  it('a menu save of a clean, saved drawing is done at once; a dirty one asks the renderer', async () => {
    const path = join(dir, 'part.ttukcad')
    writeFileSync(path, cadBytes())
    const contents = view(path)
    await open(contents, path)
    expect(await requestCadSave(contents as never, 'save')).toBe(true)
    expect(contents.sent).toEqual([])

    call(CAD_CHANNELS.dirtyChanged, contents, true)
    expect(cadIsDirty(contents.id)).toBe(true)
    const pending = requestCadSave(contents as never, 'save')
    expect(contents.sent).toEqual([[CAD_CHANNELS.saveRequest, 'save']])
    await save(contents, { bytes: cadBytes(), mode: 'save' })
    expect(await pending).toBe(true)
    expect(cadIsDirty(contents.id)).toBe(false)
  })

  it('a menu save the renderer declined ends with its answer', async () => {
    const contents = view(null)
    call(CAD_CHANNELS.dirtyChanged, contents, true)
    const pending = requestCadSave(contents as never, 'saveAs')
    call(CAD_CHANNELS.saveRequestAck, contents, false)
    expect(await pending).toBe(false)
  })

  it('a clean drawing closes without a question', async () => {
    expect(await requestCadClose(view(null) as never)).toBe(true)
    expect(showMessageBox).not.toHaveBeenCalled()
  })

  it("close with unsaved changes asks; Don't Save closes; Cancel keeps", async () => {
    const path = join(dir, '브래킷.ttukcad')
    writeFileSync(path, cadBytes())
    const contents = view(path)
    await open(contents, path)
    call(CAD_CHANNELS.dirtyChanged, contents, true)

    showMessageBox.mockResolvedValueOnce({ response: 2 })
    expect(await requestCadClose(contents as never)).toBe(false)
    const options = showMessageBox.mock.calls[0]!.at(-1) as {
      message: string
      buttons: string[]
      cancelId: number
    }
    expect(options.message).toContain('브래킷.ttukcad')
    expect(options.buttons).toEqual(['Save', "Don't Save", 'Cancel'])
    expect(options.cancelId).toBe(2)

    showMessageBox.mockResolvedValueOnce({ response: 1 })
    expect(await requestCadClose(contents as never)).toBe(true)

    showMessageBox.mockResolvedValueOnce({ response: 0 })
    const closing = requestCadClose(contents as never)
    await vi.waitFor(() => expect(contents.sent).toContainEqual([CAD_CHANNELS.closeSaveRequest]))
    call(CAD_CHANNELS.closeSaveResult, contents, true)
    expect(await closing).toBe(true)
  })

  it('an untitled drawing is named in the close prompt as untitled', async () => {
    const contents = view(null)
    call(CAD_CHANNELS.dirtyChanged, contents, true)
    showMessageBox.mockResolvedValueOnce({ response: 2 })
    await requestCadClose(contents as never)
    const options = showMessageBox.mock.calls[0]!.at(-1) as { message: string }
    expect(options.message).toContain('Untitled Drawing')
  })

  it('menu commands go to the renderer', () => {
    const contents = view(null)
    sendCadMenuCommand(contents as never, 'view-fit')
    expect(contents.sent).toEqual([[CAD_CHANNELS.menuCommand, 'view-fit']])
  })
})

describe('questions from the in-app MCP server', () => {
  it('reads the summary and the bytes from the renderer', async () => {
    const { cadReadBytes, cadReadSummary } = await import('../src/main/cad-main')
    const contents = view(null)
    const summary = cadReadSummary(contents as never)
    expect(contents.sent).toContainEqual([CAD_CHANNELS.summaryRequest])
    call(CAD_CHANNELS.summaryResult, contents, { text: 'AI Drawing "x": 0 parts' })
    expect(await summary).toBe('AI Drawing "x": 0 parts')

    const bytes = cadReadBytes(contents as never)
    call(CAD_CHANNELS.bytesResult, contents, { bytes: cadBytes('Read') })
    expect(titleOf(await bytes)).toBe('Read')

    const failing = cadReadSummary(contents as never)
    call(CAD_CHANNELS.summaryResult, contents, { error: 'still loading' })
    await expect(failing).rejects.toThrow('still loading')
  })
})
