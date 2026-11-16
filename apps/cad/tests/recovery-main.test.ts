// @vitest-environment node
/**
 * Crash-recovery copies on the main-process side: where a copy lands (the app
 * data folder only, never next to the file), when it goes (save, "Don't
 * Save", a clean close; never after a crash or while the app is ending), and
 * what opening a file with a copy left over does (ask first, restore with the
 * file as the save target, or open the file as saved).
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  reloads: number
  listeners: Map<string, (...args: unknown[]) => void>
  isDestroyed(): boolean
  setWindowOpenHandler(): void
  loadURL(url: string): Promise<void>
  reload(): void
  getURL(): string
  send(channel: string, ...args: unknown[]): void
  on(event: string, listener: (...args: unknown[]) => void): void
  once(event: string, listener: (...args: unknown[]) => void): void
}

let nextId = 1000
function fakeContents(): FakeContents {
  const contents: FakeContents = {
    id: nextId++,
    sent: [],
    destroyed: false,
    reloads: 0,
    listeners: new Map(),
    isDestroyed: () => contents.destroyed,
    setWindowOpenHandler: () => {},
    loadURL: async () => {},
    reload: () => {
      contents.reloads++
    },
    getURL: () => 'genoffice-app://cad/index.html',
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
    getPath: (name: string) => (name === 'userData' ? userData : join(tmpdir(), `cad-rec-${name}`)),
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
}))

import { createDocument, openCadFile, saveCadFile } from '@genoffice/cad-engine'
import {
  createRecoveryStore,
  markAppShuttingDown,
  recoveryEditor,
  resetAppShuttingDown,
  resumeDiscardedCopies,
  type RecoveryIdentity,
} from '@genoffice/electron-utils'
import {
  CAD_DONT_SAVE_HOLD_MS,
  createCadView,
  discardCadRecovery,
  cadFilePath,
  cadFileRenamed,
  cadRecoveryIdentity,
  openCadFileWithDecision,
  openCadUntitledCopy,
  requestCadClose,
  setCadRecoveryTitleHook,
  writeCadCopiesNow,
} from '../src/main/cad-main'
import { CAD_CHANNELS } from '../src/shared/ipc'
import type { OpenFileResult, RecoveryCopyResult, SaveCadResult } from '../src/shared/ipc'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'genoffice-cad-recovery-'))
  userData = join(dir, 'userData')
  showSaveDialog.mockReset()
  showMessageBox.mockReset()
  setCadRecoveryTitleHook(null)
})
afterEach(() => {
  resetAppShuttingDown()
  resumeDiscardedCopies()
  // every view of a test goes with it, so later tests see only their own
  for (const contents of made.splice(0)) if (!contents.destroyed) destroy(contents)
  rmSync(dir, { recursive: true, force: true })
})

const store = () => createRecoveryStore({ userDataDir: userData })
const fileId = (filePath: string): RecoveryIdentity => ({ kind: 'cad', filePath })

/** A `.ttukcad` file as the engine writes it; the title tells copies apart. */
async function drawingBytes(title: string): Promise<Uint8Array> {
  const doc = createDocument()
  return saveCadFile({ ...doc, title: { ...doc.title, name: title } })
}

async function titleOf(bytes: Uint8Array): Promise<string> {
  const opened = openCadFile(new Uint8Array(bytes))
  if (opened.status !== 'ok') throw new Error(opened.status)
  return opened.document.title.name
}

const made: FakeContents[] = []
function view(openPath?: string | null): FakeContents {
  const contents = createCadView(openPath).webContents as unknown as FakeContents
  made.push(contents)
  return contents
}

const call = <T>(channel: string, contents: FakeContents, ...args: unknown[]): T =>
  handlers.get(channel)!({ sender: contents }, ...args) as T

const open = (contents: FakeContents, path: string) =>
  call<Promise<OpenFileResult>>(CAD_CHANNELS.openFile, contents, path)
const save = (contents: FakeContents, bytes: Uint8Array, mode = 'save') =>
  call<Promise<SaveCadResult>>(CAD_CHANNELS.save, contents, { bytes, mode })
const setDirty = (contents: FakeContents, dirty: boolean) =>
  call<void>(CAD_CHANNELS.dirtyChanged, contents, dirty)
const copy = (contents: FakeContents, bytes: Uint8Array, name?: string) =>
  call<Promise<RecoveryCopyResult>>(CAD_CHANNELS.recoveryCopy, contents, { bytes, name })
const destroy = (contents: FakeContents) => {
  contents.destroyed = true
  contents.listeners.get('destroyed')?.()
}

/** a drawing file on disk, opened in a view, with unsaved changes */
async function editedFileView(name = 'plan.ttukcad') {
  const path = join(dir, name)
  const original = await drawingBytes('On disk')
  writeFileSync(path, original)
  const contents = view(path)
  expect((await open(contents, path)).status).toBe('ok')
  setDirty(contents, true)
  return { path, original, contents }
}

/** what a crash left behind: a copy of `path` from an earlier run */
async function leftOverCopy(path: string, rootTitle = 'In the copy'): Promise<Uint8Array> {
  const bytes = await drawingBytes(rootTitle)
  await store().writeCopy(fileId(path), Buffer.from(bytes))
  return bytes
}

describe('writing copies', () => {
  it('keeps the unsaved drawing in the app data folder and leaves the file alone', async () => {
    const { path, original, contents } = await editedFileView()
    const edited = await drawingBytes('Edited')
    expect(await copy(contents, edited)).toBe('written')
    const info = store().copyInfo(fileId(path))
    expect(info?.state).toBe('undecided')
    expect(info?.copyPath.startsWith(join(userData, 'cad-autosave'))).toBe(true)
    expect(info?.copyPath.endsWith('.ttukcad')).toBe(true)
    expect(Buffer.from(readFileSync(info!.copyPath)).equals(Buffer.from(edited))).toBe(true)
    expect(Buffer.from(readFileSync(path)).equals(Buffer.from(original))).toBe(true)
  })

  it('writes nothing for a drawing without unsaved changes or one whose file has not opened yet', async () => {
    const { path, contents } = await editedFileView()
    setDirty(contents, false)
    expect(await copy(contents, await drawingBytes('x'))).toBe('skipped')
    expect(store().copyInfo(fileId(path))).toBeNull()

    const waiting = join(dir, 'waiting.ttukcad')
    writeFileSync(waiting, await drawingBytes('On disk'))
    const pending = view(waiting)
    setDirty(pending, true)
    expect(await copy(pending, await drawingBytes('x'))).toBe('skipped')
    expect(store().listCopies({ kinds: ['cad'] })).toHaveLength(0)
  })

  it('a drawing whose file did not open copies as untitled, never under the file', async () => {
    const broken = join(dir, 'broken.ttukcad')
    writeFileSync(broken, 'not a drawing')
    const failed = view(broken)
    expect((await open(failed, broken)).status).toBe('broken')
    setDirty(failed, true)
    expect(await copy(failed, await drawingBytes('x'))).toBe('written')
    expect(store().copyInfo(fileId(broken))).toBeNull()
    expect(cadRecoveryIdentity(failed.id)).toMatchObject({ kind: 'cad', ext: '.ttukcad' })
    expect(readFileSync(broken, 'utf8')).toBe('not a drawing')
  })

  it('keeps an untitled drawing in the app data folder, under the tab title', async () => {
    const contents = view(null)
    setDirty(contents, true)
    setCadRecoveryTitleHook(() => 'Drawing 3')
    expect(await copy(contents, await drawingBytes('New'), 'New')).toBe('written')
    const identity = cadRecoveryIdentity(contents.id)!
    expect(identity).toMatchObject({ kind: 'cad', ext: '.ttukcad' })
    const info = store().copyInfo(identity)
    expect(info?.title).toBe('Drawing 3')
    expect(info?.filePath).toBeNull()
    expect(info?.copyPath.startsWith(join(userData, 'cad-autosave', 'untitled'))).toBe(true)
    // later copies replace the same one
    await copy(contents, await drawingBytes('Newer'))
    expect(store().listCopies({ kinds: ['cad'] })).toHaveLength(1)
  })

  it('names an untitled copy after the name the renderer offers when the shell gives no title', async () => {
    const contents = view(null)
    setDirty(contents, true)
    await copy(contents, await drawingBytes('Trip'), '  Trip   plan ')
    expect(store().copyInfo(cadRecoveryIdentity(contents.id)!)?.title).toBe('Trip plan')
  })

  it('at the OS session end asks every drawing with unsaved changes for a copy now', async () => {
    const dirty = await editedFileView('a.ttukcad')
    const clean = await editedFileView('b.ttukcad')
    setDirty(clean.contents, false)
    const silent = await editedFileView('c.ttukcad')
    const done = writeCadCopiesNow(200)
    expect(dirty.contents.sent.map(([channel]) => channel)).toContain(CAD_CHANNELS.recoveryCopyNow)
    expect(clean.contents.sent.map(([channel]) => channel)).not.toContain(
      CAD_CHANNELS.recoveryCopyNow,
    )
    call(CAD_CHANNELS.recoveryCopyNowDone, dirty.contents)
    // the one that never answers is given up on, and the call still resolves
    await done
    expect(silent.contents.sent.map(([channel]) => channel)).toContain(CAD_CHANNELS.recoveryCopyNow)
  })
})

describe('deleting copies', () => {
  it('a save deletes the copy', async () => {
    const { path, contents } = await editedFileView()
    await copy(contents, await drawingBytes('Edited'))
    expect(await save(contents, await drawingBytes('Edited'))).toEqual({ ok: true, path })
    expect(store().copyInfo(fileId(path))).toBeNull()
    // a copy arriving after the save is not kept: nothing is unsaved any more
    expect(await copy(contents, await drawingBytes('Late'))).toBe('skipped')
    expect(store().copyInfo(fileId(path))).toBeNull()
  })

  it('the first save of an untitled drawing deletes its copy; later copies follow the file', async () => {
    const contents = view(null)
    setDirty(contents, true)
    await copy(contents, await drawingBytes('New'))
    const untitled = cadRecoveryIdentity(contents.id)!
    const target = join(dir, 'saved.ttukcad')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    expect(await save(contents, await drawingBytes('New'))).toEqual({ ok: true, path: target })
    expect(store().copyInfo(untitled)).toBeNull()
    expect(cadRecoveryIdentity(contents.id)).toEqual(fileId(target))
    setDirty(contents, true)
    await copy(contents, await drawingBytes('Changed after'))
    expect(store().copyInfo(fileId(target))).not.toBeNull()
  })

  it('"Don\'t Save" deletes the copy, Cancel keeps it', async () => {
    const { path, contents } = await editedFileView()
    await copy(contents, await drawingBytes('Edited'))
    showMessageBox.mockResolvedValueOnce({ response: 2 })
    expect(await requestCadClose(contents as never)).toBe(false)
    expect(store().copyInfo(fileId(path))).not.toBeNull()
    showMessageBox.mockResolvedValueOnce({ response: 1 })
    expect(await requestCadClose(contents as never)).toBe(true)
    expect(store().copyInfo(fileId(path))).toBeNull()
  })

  it('a tool closing the drawing without saving deletes the copy', async () => {
    const { path, contents } = await editedFileView()
    await copy(contents, await drawingBytes('Edited'))
    discardCadRecovery(contents as never)
    expect(store().copyInfo(fileId(path))).toBeNull()
  })

  it('after "Don\'t Save" a late copy is not kept, and the closing tab takes any that landed', async () => {
    const { path, contents } = await editedFileView()
    await copy(contents, await drawingBytes('Edited'))
    showMessageBox.mockResolvedValueOnce({ response: 1 })
    expect(await requestCadClose(contents as never)).toBe(true)
    // a big drawing's copy was still being made when the user answered
    expect(await copy(contents, await drawingBytes('Late'))).toBe('superseded')
    expect(store().copyInfo(fileId(path))).toBeNull()
    // one that got onto the disk anyway goes with the tab, unsaved mark or not
    await store().writeCopy(fileId(path), Buffer.from(await drawingBytes('Landed')))
    destroy(contents)
    expect(store().copyInfo(fileId(path))).toBeNull()
  })

  it('after a tool discarded the drawing a late copy is not kept either', async () => {
    const contents = view(null)
    setDirty(contents, true)
    await copy(contents, await drawingBytes('New'))
    const identity = cadRecoveryIdentity(contents.id)!
    discardCadRecovery(contents as never)
    expect(await copy(contents, await drawingBytes('Late'))).toBe('superseded')
    expect(store().copyInfo(identity)).toBeNull()
    destroy(contents)
    expect(store().listCopies({ kinds: ['cad'] })).toHaveLength(0)
  })

  it('a tab that stays open after "Don\'t Save" copies again once the close is cancelled, without a new edit', async () => {
    const { path, contents } = await editedFileView()
    await copy(contents, await drawingBytes('Edited'))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      showMessageBox.mockResolvedValueOnce({ response: 1 })
      expect(await requestCadClose(contents as never)).toBe(true)
      // the window's close goes on to another tab: this one is still there, unsaved
      expect(await copy(contents, await drawingBytes('Late'))).toBe('superseded')
      expect(contents.sent.map(([channel]) => channel)).not.toContain(CAD_CHANNELS.recoveryReset)
      vi.advanceTimersByTime(CAD_DONT_SAVE_HOLD_MS)
      // the renderer is told to copy the drawing again even though nothing changed
      expect(contents.sent.map(([channel]) => channel)).toContain(CAD_CHANNELS.recoveryReset)
    } finally {
      vi.useRealTimers()
    }
    // the user still lingers on that other tab's prompt: the store takes no copy
    expect(await copy(contents, await drawingBytes('Lingering'))).toBe('superseded')
    expect(store().copyInfo(fileId(path))).toBeNull()
    // that tab cancelled the window's close
    resumeDiscardedCopies()
    expect(await copy(contents, await drawingBytes('Again'))).toBe('written')
    expect(store().copyInfo(fileId(path))).not.toBeNull()
  })

  it('a clean close deletes the copy this tab wrote; a close with unsaved changes keeps it', async () => {
    const first = await editedFileView('first.ttukcad')
    await copy(first.contents, await drawingBytes('Edited'))
    // the edit was taken back: nothing unsaved when the tab closes
    setDirty(first.contents, false)
    destroy(first.contents)
    expect(store().copyInfo(fileId(first.path))).toBeNull()

    const second = await editedFileView('second.ttukcad')
    await copy(second.contents, await drawingBytes('Edited'))
    destroy(second.contents)
    expect(store().copyInfo(fileId(second.path))).not.toBeNull()
  })

  it('a clean close leaves a copy the tab did not write', async () => {
    const path = join(dir, 'other.ttukcad')
    writeFileSync(path, await drawingBytes('On disk'))
    await leftOverCopy(path)
    const contents = view(path)
    showMessageBox.mockResolvedValueOnce({ response: 1 })
    await open(contents, path)
    // discarded in the question: gone. A copy written by another run is never the tab's own.
    expect(store().copyInfo(fileId(path))).toBeNull()
    await leftOverCopy(path)
    destroy(contents)
    expect(store().copyInfo(fileId(path))).not.toBeNull()
  })

  it('a crashed tab keeps its copies, even an untitled one, and the shell can still name it', async () => {
    const contents = view(null)
    setDirty(contents, true)
    await copy(contents, await drawingBytes('New'))
    const identity = cadRecoveryIdentity(contents.id)!
    contents.listeners.get('render-process-gone')?.()
    setDirty(contents, false)
    destroy(contents)
    expect(store().copyInfo(identity)).not.toBeNull()
  })

  it('nothing is deleted by closing tabs while the app is ending', async () => {
    const { path, contents } = await editedFileView()
    await copy(contents, await drawingBytes('Edited'))
    markAppShuttingDown()
    setDirty(contents, false)
    destroy(contents)
    expect(store().copyInfo(fileId(path))).not.toBeNull()
  })

  it('a renamed file takes its copy along', async () => {
    const { path, contents } = await editedFileView()
    const edited = await drawingBytes('Edited')
    await copy(contents, edited)
    const renamed = join(dir, 'renamed.ttukcad')
    cadFileRenamed(contents as never, path, renamed)
    await vi.waitFor(() => expect(store().copyInfo(fileId(renamed))).not.toBeNull())
    expect(store().copyInfo(fileId(path))).toBeNull()
  })
})

describe('opening a file with a copy left over', () => {
  it('asks first, naming the file; restoring opens the copy unsaved with the file as the target', async () => {
    const path = join(dir, 'plan.ttukcad')
    const original = await drawingBytes('On disk')
    writeFileSync(path, original)
    await leftOverCopy(path)
    const contents = view(path)
    // Esc or closing the box answers the cancel button, which restores
    showMessageBox.mockImplementationOnce(async (options: { cancelId: number }) => ({
      response: options.cancelId,
    }))
    const result = await open(contents, path)
    expect(showMessageBox).toHaveBeenCalledTimes(1)
    const asked = showMessageBox.mock.calls[0]![0] as { message: string }
    expect(asked.message).toContain('plan.ttukcad')
    expect(result.status === 'ok' && result.restored).toBe('file')
    expect(result.status === 'ok' && (await titleOf(result.bytes))).toBe('In the copy')
    expect(cadFilePath(contents.id)).toBe(path)
    // the file is untouched until the user saves; the copy stays until then
    expect(Buffer.from(readFileSync(path)).equals(Buffer.from(original))).toBe(true)
    expect(store().copyInfo(fileId(path))?.state).toBe('undecided')

    setDirty(contents, true)
    const restoredSave = await drawingBytes('In the copy')
    expect(await save(contents, restoredSave)).toEqual({ ok: true, path })
    expect(Buffer.from(readFileSync(path)).equals(Buffer.from(restoredSave))).toBe(true)
    expect(store().copyInfo(fileId(path))).toBeNull()
  })

  it('discarding opens the file as saved and deletes the copy', async () => {
    const path = join(dir, 'plan.ttukcad')
    const original = await drawingBytes('On disk')
    writeFileSync(path, original)
    await leftOverCopy(path)
    const contents = view(path)
    showMessageBox.mockResolvedValueOnce({ response: 1 })
    const result = await open(contents, path)
    expect(result.status === 'ok' && result.restored).toBeFalsy()
    expect(result.status === 'ok' && Buffer.from(result.bytes).equals(Buffer.from(original))).toBe(
      true,
    )
    expect(store().copyInfo(fileId(path))).toBeNull()
  })

  it('opens without asking when there is no copy', async () => {
    const path = join(dir, 'plain.ttukcad')
    writeFileSync(path, await drawingBytes('On disk'))
    const result = await open(view(path), path)
    expect(result.status).toBe('ok')
    expect(showMessageBox).not.toHaveBeenCalled()
  })

  it('restores without asking what the launch list already chose', async () => {
    const path = join(dir, 'plan.ttukcad')
    writeFileSync(path, await drawingBytes('On disk'))
    await leftOverCopy(path)
    store().applyLaunchDecision(fileId(path), 'restore')
    const result = await open(view(path), path)
    expect(showMessageBox).not.toHaveBeenCalled()
    expect(result.status === 'ok' && result.restored).toBe('file')
    // loaded into a tab: undecided again, so a crash now brings it back to the list
    expect(store().copyInfo(fileId(path))?.state).toBe('undecided')
  })

  it("follows the shell's decision: restore or the file as saved, without asking", async () => {
    const path = join(dir, 'plan.ttukcad')
    const original = await drawingBytes('On disk')
    writeFileSync(path, original)
    await leftOverCopy(path)

    const restoring = view(path)
    openCadFileWithDecision(restoring as never, { filePath: path, decision: 'restore' })
    const restored = await open(restoring, path)
    expect(restored.status === 'ok' && restored.restored).toBe('file')

    const plain = view(path)
    openCadFileWithDecision(plain as never, { filePath: path, decision: 'original' })
    const opened = await open(plain, path)
    expect(opened.status === 'ok' && opened.restored).toBeFalsy()
    expect(opened.status === 'ok' && Buffer.from(opened.bytes).equals(Buffer.from(original))).toBe(
      true,
    )
    expect(showMessageBox).not.toHaveBeenCalled()
  })

  it('points a view made without the file at it and loads the page again', async () => {
    const path = join(dir, 'plan.ttukcad')
    writeFileSync(path, await drawingBytes('On disk'))
    await leftOverCopy(path)
    const contents = view(null)
    openCadFileWithDecision(contents as never, { filePath: path, decision: 'restore' })
    expect(contents.reloads).toBe(1)
    expect(call(CAD_CHANNELS.consumePending, contents)).toBe(path)
    const result = await open(contents, path)
    expect(result.status === 'ok' && result.restored).toBe('file')
  })

  it('does not ask about a copy another pane of the same drawing is working on', async () => {
    const { path, contents } = await editedFileView()
    await copy(contents, await drawingBytes('Edited'))
    const second = view(path)
    const result = await open(second, path)
    expect(showMessageBox).not.toHaveBeenCalled()
    expect(result.status === 'ok' && result.restored).toBeFalsy()
  })

  it('restores a drawing whose file no longer opens as untitled, offering the old place', async () => {
    const path = join(dir, 'plan.ttukcad')
    writeFileSync(path, await drawingBytes('On disk'))
    const contents = view(path)
    await leftOverCopy(path)
    // the file was replaced by something that is not a drawing after the copy was written
    writeFileSync(path, 'not a drawing any more')
    showMessageBox.mockResolvedValueOnce({ response: 0 })
    const result = await open(contents, path)
    expect(result.status === 'ok' && result.restored).toBe('untitled')
    expect(cadFilePath(contents.id)).toBeUndefined()
    // the broken file is not written over by a plain save: the save asks where, at the old place
    setDirty(contents, true)
    const target = join(dir, 'kept.ttukcad')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    expect(await save(contents, await drawingBytes('In the copy'))).toEqual({
      ok: true,
      path: target,
    })
    expect((showSaveDialog.mock.calls[0]![0] as { defaultPath: string }).defaultPath).toBe(path)
    expect(readFileSync(path, 'utf8')).toBe('not a drawing any more')
    expect(store().copyInfo(fileId(path))).toBeNull()
  })

  it('keeps one copy for a drawing restored as untitled: later copies replace the restored one', async () => {
    const path = join(dir, 'plan.ttukcad')
    writeFileSync(path, await drawingBytes('On disk'))
    const contents = view(path)
    await leftOverCopy(path)
    writeFileSync(path, 'not a drawing any more')
    showMessageBox.mockResolvedValueOnce({ response: 0 })
    expect((await open(contents, path)).status).toBe('ok')
    setDirty(contents, true)
    expect(await copy(contents, await drawingBytes('More work'))).toBe('written')
    // a crash now leaves one row in the launch list, not two
    const copies = store().listCopies({ kinds: ['cad'] })
    expect(copies).toHaveLength(1)
    expect(await titleOf(readFileSync(copies[0]!.copyPath))).toBe('More work')
  })

  it('opens the file when its copy cannot be settled, and writes no copy over the old one', async () => {
    const path = join(dir, 'plan.ttukcad')
    const original = await drawingBytes('On disk')
    writeFileSync(path, original)
    const left = await leftOverCopy(path)
    const contents = view(path)
    showMessageBox.mockRejectedValueOnce(new Error('no window to ask over'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await open(contents, path)
    warn.mockRestore()
    expect(result.status).toBe('ok')
    expect(result.status === 'ok' && result.restored).toBeFalsy()
    expect(result.status === 'ok' && Buffer.from(result.bytes).equals(Buffer.from(original))).toBe(
      true,
    )
    expect(cadFilePath(contents.id)).toBe(path)
    setDirty(contents, true)
    expect(await copy(contents, await drawingBytes('Edited'))).toBe('superseded')
    const info = store().copyInfo(fileId(path))
    expect(Buffer.from(readFileSync(info!.copyPath)).equals(Buffer.from(left))).toBe(true)
  })
})

describe('opening an untitled copy', () => {
  it('hands the copy to the new drawing and offers the old place on its first save', async () => {
    const identity: RecoveryIdentity = { kind: 'cad', untitledId: 'abc-123', ext: '.ttukcad' }
    const bytes = await drawingBytes('Untitled work')
    await store().writeCopy(identity, Buffer.from(bytes), { title: 'Drawing 2' })
    const contents = view(null)
    const gone = join(dir, 'gone', 'old.ttukcad')
    openCadUntitledCopy(contents as never, {
      copy: identity,
      title: 'Drawing 2',
      saveAsDefaultPath: gone,
    })
    // the renderer asks as for any file: the name it gets is the copy's title, and no path
    const pending = call<string | null>(CAD_CHANNELS.consumePending, contents)
    expect(pending).toBe('Drawing 2.ttukcad')
    const result = await open(contents, pending!)
    expect(result.status === 'ok' && result.restored).toBe('untitled')
    expect(result.status === 'ok' && (await titleOf(result.bytes))).toBe('Untitled work')
    expect(cadFilePath(contents.id)).toBeUndefined()
    expect(cadRecoveryIdentity(contents.id)).toEqual(identity)

    // later copies go to the same place
    setDirty(contents, true)
    await copy(contents, await drawingBytes('More work'))
    expect(store().listCopies({ kinds: ['cad'] })).toHaveLength(1)
    expect(store().copyInfo(identity)?.title).toBe('Drawing 2')

    const target = join(dir, 'kept.ttukcad')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    expect(await save(contents, await drawingBytes('More work'))).toEqual({
      ok: true,
      path: target,
    })
    expect((showSaveDialog.mock.calls[0]![0] as { defaultPath: string }).defaultPath).toBe(gone)
    expect(store().copyInfo(identity)).toBeNull()
    expect(existsSync(gone)).toBe(false)
  })

  it('keeps writing to the copy of a file that is gone, so a crash leaves one copy', async () => {
    const gone = join(dir, 'gone', 'old.ttukcad')
    const identity = fileId(gone)
    await store().writeCopy(identity, Buffer.from(await drawingBytes('Old work')))
    const contents = view(null)
    openCadUntitledCopy(contents as never, {
      copy: identity,
      title: 'old',
      saveAsDefaultPath: gone,
    })
    expect(cadRecoveryIdentity(contents.id)).toEqual(identity)
    setDirty(contents, true)
    expect(await copy(contents, await drawingBytes('More work'))).toBe('written')
    const copies = store().listCopies({ kinds: ['cad'] })
    expect(copies).toHaveLength(1)
    expect(await titleOf(readFileSync(store().copyInfo(identity)!.copyPath))).toBe('More work')

    const target = join(dir, 'kept.ttukcad')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    expect(await save(contents, await drawingBytes('More work'))).toEqual({
      ok: true,
      path: target,
    })
    expect(store().listCopies({ kinds: ['cad'] })).toHaveLength(0)
  })

  it('after the first save a reload opens the saved file, not the copy', async () => {
    const identity: RecoveryIdentity = { kind: 'cad', untitledId: 'def-456', ext: '.ttukcad' }
    await store().writeCopy(identity, Buffer.from(await drawingBytes('Copy')), {
      title: 'Drawing 4',
    })
    const contents = view(null)
    openCadUntitledCopy(contents as never, { copy: identity, title: 'Drawing 4' })
    setDirty(contents, true)
    const target = join(dir, 'kept.ttukcad')
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: target })
    expect(await save(contents, await drawingBytes('Saved'))).toEqual({ ok: true, path: target })
    expect(call(CAD_CHANNELS.consumePending, contents)).toBe(target)
    const result = await open(contents, target)
    expect(result.status === 'ok' && result.restored).toBeFalsy()
    expect(result.status === 'ok' && (await titleOf(result.bytes))).toBe('Saved')
  })
})

describe('the recovery contract', () => {
  it('is registered for AI drawings when the module loads', async () => {
    const contract = recoveryEditor('cad')
    expect(contract).not.toBeNull()
    expect(contract!.isUnprotectable(view(null) as never)).toBe(false)
    // with nothing unsaved there is nothing to wait for
    await contract!.writeCopiesNow()
  })
})
