/**
 * The AI Drawing editor's main process: one view per tab, the files each view
 * may read and write, saving, the close prompt and recovery copies. The shell
 * bundles this file and drives it through the exports below; a standalone
 * window (`startCadStandalone`) uses the same code. It is the same contract
 * as the mind map editor's main module.
 *
 * The drawing itself lives in the renderer: the engine opens the bytes there,
 * every edit goes through its history, and it produces the bytes to save.
 * This side reads and writes files and keeps what each view may touch. Three
 * things are decided here and not left to the renderer:
 *
 * - A path is a save target only after this side has opened the `.ttukcad`
 *   with the engine itself and seen `ok`. A view made for a path writes
 *   nothing until its open has been answered here (`unopenedByWc`); after a
 *   failed open the drawing is untitled, so its first save asks where.
 * - A DXF, STL, OBJ, 3MF, GLB or PLY file is only ever read: it opens as a
 *   new untitled drawing, and no save lands on anything but a `.ttukcad` path.
 *   A STEP, IGES or BREP file is not even read: the screen explains how
 *   to get a DXF or STL file instead.
 * - An export writes the bytes the renderer made to a path picked in the save
 *   dialog, with the format's extension, never onto a file this view opened or
 *   saved. It grants nothing and does not change the save target.
 * - Bytes a save brings are opened with the engine first; bytes that would
 *   not reopen as `ok` are refused and nothing is written.
 *
 * Crash-recovery copies (`recovery-main.ts`): the renderer hands over the
 * bytes a save would write while the drawing has unsaved changes; they are
 * kept in the app data folder, never next to the file. A file with a copy
 * left over asks before its content is loaded. The editor registers its
 * `RecoveryEditorContract` when this module loads.
 */
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import {
  BrowserWindow,
  WebContentsView,
  app,
  clipboard,
  dialog,
  ipcMain,
  nativeImage,
} from 'electron'
import type { WebContents } from 'electron'
import {
  RENDERER_SCHEME,
  configuredDefaultSaveDir,
  confirmOverwriteIfConflicted,
  contextMenuLabels,
  installContextMenu,
  installNavigationGuard,
  installRendererProtocol,
  isPathOpenElsewhere,
  recordDiskState,
  registerRecoveryEditor,
  registerRendererScheme,
  shouldDeferAutoSave,
  showSaveDialogWithMemory,
} from '@genoffice/electron-utils'
import type {
  RecoveryIdentity,
  RecoveryOpenFileRequest,
  RecoveryOpenUntitledRequest,
  SaveDiskState,
} from '@genoffice/electron-utils'
import { MAX_FILE_BYTES, openCadFile } from '@genoffice/cad-engine'
import { getUiLang, normalizeLang, setUiLang } from '@genoffice/i18n'
import { atomicWriteFile } from './atomic-write'
import { tm } from './i18n-main'
import {
  resolveViewOpen,
  setViewOpenDecision,
  takeUntitledCopy,
  viewCrashed,
  viewDropped,
  viewFileRenamed,
  viewGone,
  viewRecoveryIdentity,
  viewRestoredUntitled,
  viewSaveAsDefault,
  viewSaved,
  writeViewCopy,
} from './recovery-main'
import { APP_CHANNELS, CAD_CHANNELS } from '../shared/ipc'
import { registerCadAttachmentIpc } from './ai-attachments'
import type {
  CadMenuCommand,
  ExportFormat,
  ExportResult,
  ImportExt,
  OpenFileResult,
  RecoveryCopyResult,
  SaveCadResult,
  SaveMode,
  SendToDocumentResult,
} from '../shared/ipc'

export { cadReadBytes, cadReadSummary } from './mcp-queries'

/** How long a "Don't Save" keeps the view's recovery copy from coming back. */
export { DONT_SAVE_HOLD_MS as CAD_DONT_SAVE_HOLD_MS } from './recovery-main'

/** The one extension a drawing is saved with. */
const DRAWING_EXTENSION = '.ttukcad'
/** Files that open as a new untitled drawing and are never written. */
const IMPORT_EXTENSIONS: ReadonlySet<string> = new Set<ImportExt>([
  'dxf',
  'dwg',
  'stl',
  'obj',
  '3mf',
  'glb',
  'ply',
])
/**
 * Files of CAD programs this editor cannot read. They are not read at all:
 * the screen says to ask the sender for a DXF or STL file instead.
 */
const GUIDE_EXTENSIONS: ReadonlySet<string> = new Set(['step', 'stp', 'iges', 'igs', 'brep'])
/** Everything a view can be made for, as the standalone window's argv filter. */
const OPENABLE_RE = new RegExp(
  `\\.(${['ttukcad', ...IMPORT_EXTENSIONS, ...GUIDE_EXTENSIONS].join('|')})$`,
  'i',
)
const EXPORT_FORMATS: ReadonlySet<string> = new Set<ExportFormat>(['stl', 'obj', 'png'])
/** The largest picture "Copy as picture" puts on the clipboard. */
const MAX_COPY_IMAGE_BYTES = 10 * 1024 * 1024
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export interface CadRuntimePaths {
  preloadPath: string
  /** the renderer's dev server, when one runs */
  rendererUrl?: string
  rendererFile?: string
}

let runtime: CadRuntimePaths = { preloadPath: '' }

export function configureCadRuntime(paths: CadRuntimePaths): void {
  runtime = paths
}

/** Open path per view, queued at tab creation; the renderer consumes it after mount.
 * Kept until the view is destroyed so a reload consumes it again. */
const openPathByWc = new Map<number, string>()
/** File paths granted to each view: opening and saving only allow these */
const allowedByWc = new Map<number, Set<string>>()
/** Current save target per view; absent = untitled drawing, or a file this side has not seen open */
const savePathByWc = new Map<number, string>()
/**
 * Views made for a file whose open this side has not answered yet. Nothing is
 * ever written for a view in here, to any path. A view for a new drawing is
 * never in; a view leaves once its file has opened, been imported or failed
 * to open (then as an untitled drawing).
 */
const unopenedByWc = new Set<number>()
/**
 * An untitled recovery copy queued for a view (`openCadUntitledCopy`): the
 * renderer is given `name` as its pending path and opens it like a file.
 * Dropped at the first save, so a later reload opens the saved file.
 */
const untitledCopyByWc = new Map<number, { name: string; bytes: Uint8Array }>()

/** Whether anything may be written for this view. */
function mayWrite(wcId: number): boolean {
  return !unopenedByWc.has(wcId)
}
/** Unsaved-changes flags mirrored from the renderer; drives the save prompt before closing a tab/window */
const dirtyByWc = new Set<number>()
const closeSaveWaiters = new Map<number, (ok: boolean) => void>()
/** Resolvers for menu-triggered saves, resolved when the renderer's save invoke completes */
const saveWaiters = new Map<number, (ok: boolean) => void>()
/** Every live drawing view, for the copies the OS session end asks for */
const contentsByWc = new Map<number, WebContents>()
/** Copies asked for at the OS session end, resolved when the renderer reports it wrote one */
const copyNowWaiters = new Map<number, () => void>()
/** How long the OS session end waits for one view's copy */
const COPY_NOW_TIMEOUT_MS = 5000

// ── Split-copy save guard (decision 0036): remember the disk state of every
// read and write per view and path, so that while the same drawing is open in
// two panes a save can see the sibling pane's write. A manual save asks before
// overwriting it; an automatic save defers silently to the next manual one.
const docDiskStates = new Map<number, Map<string, SaveDiskState>>()

async function rememberDiskState(wcId: number, path: string): Promise<void> {
  const state = await recordDiskState(path)
  if (!state) return
  const states = docDiskStates.get(wcId) ?? new Map<string, SaveDiskState>()
  states.set(path, state)
  docDiskStates.set(wcId, states)
}

function forgetDiskState(wcId: number, path: string): void {
  const states = docDiskStates.get(wcId)
  if (!states) return
  states.delete(path)
  if (states.size === 0) docDiskStates.delete(wcId)
}

/** True when this save must stop instead of writing: the sibling copy changed
 *  the disk since this view's last read or write, and either the automatic
 *  save defers or the user chose to keep the disk copy. */
async function conflictStopsSave(
  contents: WebContents,
  path: string,
  auto: boolean,
): Promise<boolean> {
  if (!isPathOpenElsewhere(path)) return false
  const recorded = docDiskStates.get(contents.id)?.get(path)
  if (auto) return shouldDeferAutoSave(path, recorded)
  return (
    (await confirmOverwriteIfConflicted({
      parent: BrowserWindow.fromWebContents(contents),
      path,
      recorded,
      lang: getUiLang(),
    })) === 'cancel'
  )
}

/** Fired after a save lands on a NEW path (untitled first save / Save As): the shell syncs tab title, recents, projects */
let fileSavedHook: ((wc: WebContents, path: string) => void) | null = null

export function setCadFileSavedHook(hook: (wc: WebContents, path: string) => void): void {
  fileSavedHook = hook
}

/**
 * "Send to Hangul / Word", carried out by the shell (`send-drawing.ts`): it
 * checks the request and opens the new tab. Unset in a standalone window.
 */
let sendToDocumentHook:
  ((wc: WebContents, request: unknown) => Promise<SendToDocumentResult>) | null = null

export function setCadSendToDocumentHook(
  hook: ((wc: WebContents, request: unknown) => Promise<SendToDocumentResult>) | null,
): void {
  sendToDocumentHook = hook
}

/** The tab title of an untitled drawing, recorded with its recovery copy: the shell knows it */
let recoveryTitleHook: ((wc: WebContents) => string | null | undefined) | null = null

export function setCadRecoveryTitleHook(
  hook: ((wc: WebContents) => string | null | undefined) | null,
): void {
  recoveryTitleHook = hook
}

/** The copy of this view was dropped and its tab is still open: ask the renderer for a fresh one. */
function copyAgain(contents: WebContents): () => void {
  return () => {
    if (!contents.isDestroyed()) contents.send(CAD_CHANNELS.recoveryReset)
  }
}

export function cadIsDirty(webContentsId: number): boolean {
  return dirtyByWc.has(webContentsId)
}

export function cadFilePath(webContentsId: number): string | undefined {
  return savePathByWc.get(webContentsId)
}

/** The file was renamed on disk: re-grant the new path and tell the renderer */
export function cadFileRenamed(contents: WebContents, oldPath: string, newPath: string): void {
  const wcId = contents.id
  if (savePathByWc.get(wcId) === oldPath) savePathByWc.set(wcId, newPath)
  if (openPathByWc.get(wcId) === oldPath) openPathByWc.set(wcId, newPath)
  const allowed = allowedByWc.get(wcId)
  if (allowed?.has(oldPath)) allowed.add(newPath)
  const states = docDiskStates.get(wcId)
  const recorded = states?.get(oldPath)
  if (states && recorded) {
    states.delete(oldPath)
    states.set(newPath, recorded)
  }
  void viewFileRenamed(wcId, oldPath, newPath)
  if (!contents.isDestroyed()) contents.send(CAD_CHANNELS.fileRenamed, newPath)
}

/**
 * Close guard: true means proceed with closing. Clean → true; dirty →
 * Save / Don't Save / Cancel. On Save, ask the renderer to produce the bytes
 * and write them, and await the result; a canceled untitled-save dialog keeps
 * the tab open.
 */
export async function requestCadClose(
  contents: WebContents,
  parent?: BrowserWindow | null,
): Promise<boolean> {
  // nothing opened yet, nothing to save: such a view closes without a question
  if (!mayWrite(contents.id)) return true
  if (!dirtyByWc.has(contents.id) || contents.isDestroyed()) return true
  // name the drawing: closing the window asks once per dirty tab
  const fileName = basename(savePathByWc.get(contents.id) ?? '') || tm('untitledFile')
  const options = {
    type: 'warning' as const,
    title: tm('closeUnsavedTitle'),
    message: tm('closeUnsavedMessage', { name: fileName }),
    detail: tm('closeUnsavedDetail'),
    buttons: [tm('btnSave'), tm('btnDontSave'), tm('btnCancel')],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  }
  const { response } =
    parent && !parent.isDestroyed()
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options)
  if (response === 2) return false
  if (response === 1) {
    // "Don't Save": the unsaved work is dropped, its recovery copy with it
    viewDropped(contents.id, copyAgain(contents))
    return true
  }
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      closeSaveWaiters.delete(contents.id)
      resolve(false)
    }, 120_000)
    closeSaveWaiters.set(contents.id, (ok) => {
      clearTimeout(timer)
      resolve(ok)
    })
    contents.send(CAD_CHANNELS.closeSaveRequest)
  })
}

/** Menu Save / Save As: ask the renderer to produce the bytes and save; clean views resolve true immediately on plain save */
export function requestCadSave(contents: WebContents, mode: SaveMode): Promise<boolean> {
  if (contents.isDestroyed() || !mayWrite(contents.id)) return Promise.resolve(false)
  if (mode === 'save' && !dirtyByWc.has(contents.id) && savePathByWc.has(contents.id)) {
    return Promise.resolve(true)
  }
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      saveWaiters.delete(contents.id)
      resolve(false)
    }, 120_000)
    saveWaiters.set(contents.id, (ok) => {
      clearTimeout(timer)
      resolve(ok)
    })
    contents.send(CAD_CHANNELS.saveRequest, mode)
  })
}

/**
 * Save the live drawing to `filePath` with no dialog (the in-app MCP server's
 * "save before closing"). Pointing the view's save target at `filePath` first
 * keeps the save from opening the dialog, so the renderer's normal save runs
 * unattended. Only a `.ttukcad` path is accepted.
 */
export function cadSaveToPath(contents: WebContents, filePath: string): Promise<void> {
  if (contents.isDestroyed()) return Promise.reject(new Error('the drawing is no longer open'))
  const wcId = contents.id
  if (!mayWrite(wcId)) {
    return Promise.reject(new Error('the file has not opened, so there is no drawing to save'))
  }
  if (!isDrawingPath(filePath)) {
    return Promise.reject(new Error(`a drawing is saved only as ${DRAWING_EXTENSION}`))
  }
  const previousPath = savePathByWc.get(wcId)
  const previousOpenPath = openPathByWc.get(wcId)
  savePathByWc.set(wcId, filePath)
  const allowed = allowedByWc.get(wcId) ?? new Set<string>()
  allowed.add(filePath)
  allowedByWc.set(wcId, allowed)
  return new Promise<void>((resolve, reject) => {
    const restore = (): void => {
      if (previousPath === undefined) savePathByWc.delete(wcId)
      else savePathByWc.set(wcId, previousPath)
      if (previousOpenPath === undefined) openPathByWc.delete(wcId)
      else openPathByWc.set(wcId, previousOpenPath)
    }
    const timer = setTimeout(() => {
      saveWaiters.delete(wcId)
      restore()
      reject(new Error('timed out saving the drawing'))
    }, 120_000)
    saveWaiters.set(wcId, (ok) => {
      clearTimeout(timer)
      if (ok) resolve()
      else {
        restore()
        reject(new Error('could not save the drawing'))
      }
    })
    contents.send(CAD_CHANNELS.saveRequest, 'save')
  })
}

/**
 * A tool closes the drawing without saving (the in-app MCP server, the AI):
 * the unsaved work is dropped, and its recovery copy with it, as with "Don't Save".
 */
export function discardCadRecovery(contents: WebContents): void {
  viewDropped(contents.id, copyAgain(contents))
}

/**
 * The recovery copy this view writes (its file's, or its own untitled id's),
 * for the shell's session record and for reopening an untitled drawing whose
 * renderer crashed. Null for a view that is not a live drawing view.
 */
export function cadRecoveryIdentity(webContentsId: number): RecoveryIdentity | null {
  if (!contentsByWc.has(webContentsId)) return null
  return viewRecoveryIdentity(webContentsId, savePathByWc.get(webContentsId))
}

/**
 * The OS is ending the session: every drawing view with unsaved changes
 * writes a copy now, without any question. Resolves when each has answered or
 * its time ran out; never throws.
 */
export async function writeCadCopiesNow(timeoutMs = COPY_NOW_TIMEOUT_MS): Promise<void> {
  const waits: Promise<void>[] = []
  for (const [wcId, contents] of contentsByWc) {
    if (contents.isDestroyed() || !dirtyByWc.has(wcId) || !mayWrite(wcId)) continue
    waits.push(
      new Promise<void>((resolve) => {
        const finish = (): void => {
          clearTimeout(timer)
          if (copyNowWaiters.get(wcId) === finish) copyNowWaiters.delete(wcId)
          resolve()
        }
        const timer = setTimeout(finish, timeoutMs)
        copyNowWaiters.get(wcId)?.()
        copyNowWaiters.set(wcId, finish)
        try {
          contents.send(CAD_CHANNELS.recoveryCopyNow)
        } catch {
          finish()
        }
      }),
    )
  }
  await Promise.all(waits)
}

/**
 * Open `filePath` in a drawing view the shell made, with the recovery
 * question already answered (launch list): `restore` loads the copy, the file
 * staying the save target; `original` loads the file without asking. Call it
 * in the tick the view is made with `createCadView(filePath)`; a view made
 * for another file (or none) is pointed at this one and loaded again.
 */
export function openCadFileWithDecision(
  contents: WebContents,
  request: RecoveryOpenFileRequest,
): void {
  registerCadIpc()
  const wcId = contents.id
  setViewOpenDecision(wcId, request.decision)
  if (openPathByWc.get(wcId) === request.filePath) return
  openPathByWc.set(wcId, request.filePath)
  allowedByWc.set(wcId, new Set([request.filePath]))
  unopenedByWc.add(wcId)
  untitledCopyByWc.delete(wcId)
  savePathByWc.delete(wcId)
  dirtyByWc.delete(wcId)
  if (!contents.isDestroyed()) contents.reload()
}

/**
 * Load a recovery copy into an untitled drawing view the shell made (call it
 * in the tick the view is made with `createCadView()`): the renderer's pending
 * path is the copy's title as a file name, and opening it answers with the
 * copy's bytes as `restored: 'untitled'`. The drawing opens unsaved, its first
 * save asks where (offering `saveAsDefaultPath` when given), and a successful
 * save deletes the copy.
 */
export function openCadUntitledCopy(
  contents: WebContents,
  request: RecoveryOpenUntitledRequest,
): void {
  registerCadIpc()
  const bytes = takeUntitledCopy(contents.id, request)
  if (!bytes) {
    console.warn('[cad] the recovery copy could not be read')
    return
  }
  const name = `${fileNameBase(request.title) || tm('untitledFile')}${DRAWING_EXTENSION}`
  untitledCopyByWc.set(contents.id, { name, bytes })
}

registerRecoveryEditor({
  kind: 'cad',
  writeCopiesNow: () => writeCadCopiesNow(),
  openFileWithDecision: openCadFileWithDecision,
  openUntitledCopy: openCadUntitledCopy,
  // every drawing can be copied as it is
  isUnprotectable: () => false,
})

/** Menu commands that need no answer: undo, redo, views and the like. */
export function sendCadMenuCommand(contents: WebContents, command: CadMenuCommand): void {
  if (!contents.isDestroyed()) contents.send(CAD_CHANNELS.menuCommand, command)
}

/** The menu's File › Export items: the renderer makes the bytes and calls `cad:export-file`. */
export function sendCadExportRequest(contents: WebContents, format: ExportFormat): void {
  if (!EXPORT_FORMATS.has(format) || contents.isDestroyed()) return
  contents.send(CAD_CHANNELS.exportRequest, format)
}

function fileNameBase(name: string | undefined): string {
  return (name ?? '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .slice(0, 80)
    .trim()
}

function isDrawingPath(path: string): boolean {
  return extname(path).toLowerCase() === DRAWING_EXTENSION
}

/** A picked name keeps `.ttukcad`; any other name gets it added, so no save lands on a DXF, STL or OBJ. */
function withDrawingExtension(path: string): string {
  return isDrawingPath(path) ? path : `${path}${DRAWING_EXTENSION}`
}

async function resolveSaveTarget(
  e: Electron.IpcMainInvokeEvent,
  mode: SaveMode,
  defaultName?: string,
): Promise<string | 'canceled'> {
  const current = savePathByWc.get(e.sender.id)
  if (mode === 'save' && current && isDrawingPath(current)) return current
  const win =
    BrowserWindow.fromWebContents(e.sender) ?? BrowserWindow.getFocusedWindow() ?? undefined
  // a restored drawing whose file is gone is offered that file's old place
  const restoredPath = current ? undefined : viewSaveAsDefault(e.sender.id)
  const defaultPath = current
    ? join(dirname(current), withDrawingExtension(basename(current)))
    : (restoredPath ??
      join(
        configuredDefaultSaveDir(app),
        `${fileNameBase(defaultName) || tm('untitledFile')}${DRAWING_EXTENSION}`,
      ))
  const picked = await showSaveDialogWithMemory(dialog, win, {
    title: tm('dlgSaveTitle'),
    defaultPath,
    filters: [{ name: tm('filterCad'), extensions: [DRAWING_EXTENSION.slice(1)] }],
  })
  if (picked.canceled || !picked.filePath) return 'canceled'
  return withDrawingExtension(picked.filePath)
}

/** The window a question about this view sits over. */
function parentWindowOf(contents: WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(contents) ?? BrowserWindow.getFocusedWindow() ?? null
}

/** The name an untitled drawing's recovery copy is listed under: the tab title, else what the renderer offers. */
function untitledCopyTitle(contents: WebContents, offered: unknown): string {
  const fromShell = recoveryTitleHook?.(contents)
  if (typeof fromShell === 'string' && fromShell.trim()) return fromShell.trim()
  const name = typeof offered === 'string' ? offered.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
  return name || tm('untitledFile')
}

/** Bytes as they arrive over IPC: a typed array, a buffer, or nothing usable. */
function bytesOf(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  }
  return null
}

type ReadOutcome = { bytes: Uint8Array } | { status: 'not-found' | 'too-large' | 'unreadable' }

/** The file's bytes, after `stat` has said it is there and small enough; nothing larger is read. */
async function readChecked(path: string): Promise<ReadOutcome> {
  let size: number
  try {
    size = (await stat(path)).size
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | null)?.code
    return { status: code === 'ENOENT' || code === 'ENOTDIR' ? 'not-found' : 'unreadable' }
  }
  if (size > MAX_FILE_BYTES) return { status: 'too-large' }
  try {
    return { bytes: new Uint8Array(await readFile(path)) }
  } catch {
    return { status: 'unreadable' }
  }
}

/** The file name without its extension, as an imported drawing's title. */
function importName(path: string): string {
  const name = basename(path)
  return name.slice(0, name.length - extname(name).length)
}

/** The view's file was not opened as a drawing: it is untitled now, with no save target. */
function openedUntitled(wcId: number): void {
  unopenedByWc.delete(wcId)
  savePathByWc.delete(wcId)
  dirtyByWc.delete(wcId)
}

/** Open a `.ttukcad`: the path becomes the save target only when the engine opens it `ok`. */
async function openDrawingFile(
  wcId: number,
  path: string,
  parent: BrowserWindow | null,
): Promise<OpenFileResult> {
  // A recovery copy left for this file is settled before any of the drawing is loaded.
  const restored = await resolveViewOpen(wcId, path, parent)
  const read = await readChecked(path)
  if (restored) {
    const copy = openCadFile(restored)
    if (copy.status === 'ok') {
      // the restored drawing is written only by a save; the copy is the whole file
      unopenedByWc.delete(wcId)
      if ('bytes' in read && openCadFile(read.bytes).status === 'ok') {
        // the file still opens: it stays the save target
        savePathByWc.set(wcId, path)
        await rememberDiskState(wcId, path)
        return { status: 'ok', bytes: restored, restored: 'file' }
      }
      // The file is gone or no longer opens, so it is not written over: the
      // drawing is untitled, its first save offers the old place, and its
      // copies keep replacing the restored one.
      savePathByWc.delete(wcId)
      viewRestoredUntitled(wcId, path)
      return { status: 'ok', bytes: restored, restored: 'untitled' }
    }
    console.warn(`[cad] the recovery copy does not open (${copy.status}); the file opens`)
  }
  if (!('bytes' in read)) {
    openedUntitled(wcId)
    return { status: read.status }
  }
  const opened = openCadFile(read.bytes)
  if (opened.status !== 'ok') {
    console.warn(`[cad] the file did not open (${opened.status}: ${opened.reason})`)
    openedUntitled(wcId)
    return { status: opened.status }
  }
  // Seen open, here: only now is the path a save target. This also covers a
  // reload of a view whose file opens again after it was replaced on disk.
  unopenedByWc.delete(wcId)
  savePathByWc.set(wcId, path)
  await rememberDiskState(wcId, path)
  return { status: 'ok', bytes: read.bytes }
}

/** The exported file keeps the format's extension; a picked name without it gets it added. */
function withExportExtension(path: string, format: ExportFormat): string {
  return extname(path).toLowerCase() === `.${format}` ? path : `${path}.${format}`
}

/** One file, as the file system compares names: Windows and macOS ignore case. */
function pathKey(path: string): string {
  const full = resolve(path)
  return process.platform === 'win32' || process.platform === 'darwin' ? full.toLowerCase() : full
}

/** A file this view opened, was granted or saved to: an export never replaces it. */
function isViewSourcePath(wcId: number, path: string): boolean {
  const key = pathKey(path)
  const known = [...(allowedByWc.get(wcId) ?? []), openPathByWc.get(wcId), savePathByWc.get(wcId)]
  return known.some((p) => p !== undefined && pathKey(p) === key)
}

function exportFilterName(format: ExportFormat): string {
  return format === 'png'
    ? `${tm('filterImage')} (PNG)`
    : `${tm('filterModel3d')} (${format.toUpperCase()})`
}

/**
 * `cad:export-file`: the bytes the renderer made for one format, written to
 * the path picked in the save dialog. The request comes from a renderer, so
 * the format and bytes are checked first; the path gets the format's
 * extension and is refused when it is a file this view came from.
 */
async function exportFile(e: Electron.IpcMainInvokeEvent, request: unknown): Promise<ExportResult> {
  const wcId = e.sender.id
  const {
    format,
    bytes: rawBytes,
    suggestedName,
  } = (request ?? {}) as { format?: unknown; bytes?: unknown; suggestedName?: unknown }
  const bytes = bytesOf(rawBytes)
  if (
    typeof format !== 'string' ||
    !EXPORT_FORMATS.has(format) ||
    !bytes ||
    bytes.byteLength === 0
  ) {
    return { ok: false, error: 'bad-request' }
  }
  const kind = format as ExportFormat
  if (!mayWrite(wcId)) return { ok: false, error: 'not-open' }
  const name =
    fileNameBase(typeof suggestedName === 'string' ? suggestedName : undefined) ||
    tm('untitledFile')
  const current = savePathByWc.get(wcId)
  const folder = current ? dirname(current) : configuredDefaultSaveDir(app)
  const picked = await showSaveDialogWithMemory(dialog, parentWindowOf(e.sender) ?? undefined, {
    title: tm('dlgExportTitle'),
    defaultPath: join(folder, `${name}.${kind}`),
    filters: [{ name: exportFilterName(kind), extensions: [kind] }],
  })
  if (picked.canceled || !picked.filePath) return { ok: true, canceled: true }
  const target = withExportExtension(picked.filePath, kind)
  if (isViewSourcePath(wcId, target)) return { ok: false, error: 'source-path' }
  try {
    await atomicWriteFile(target, Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
    return { ok: true, path: target }
  } catch (err) {
    console.warn('[cad] the export could not be written:', err)
    return { ok: false, error: 'write-failed' }
  }
}

let ipcRegistered = false

function registerCadIpc(): void {
  if (ipcRegistered) return
  ipcRegistered = true
  // the AI panel's attachments: picked and read here, never inside the page
  registerCadAttachmentIpc()

  ipcMain.handle(CAD_CHANNELS.consumePending, (e) => {
    const wcId = e.sender.id
    return openPathByWc.get(wcId) ?? untitledCopyByWc.get(wcId)?.name ?? null
  })

  ipcMain.handle(CAD_CHANNELS.openFile, async (e, path: unknown): Promise<OpenFileResult> => {
    const wcId = e.sender.id
    const copy = untitledCopyByWc.get(wcId)
    if (copy && path === copy.name && !openPathByWc.has(wcId)) {
      return { status: 'ok', bytes: copy.bytes, restored: 'untitled' }
    }
    if (typeof path !== 'string' || !allowedByWc.get(wcId)?.has(path)) {
      throw new Error('cad: path not granted to this view')
    }
    const ext = extname(path).toLowerCase().slice(1)
    if (`.${ext}` === DRAWING_EXTENSION) {
      return openDrawingFile(wcId, path, parentWindowOf(e.sender))
    }
    // anything else becomes an untitled drawing: its first save asks where
    openedUntitled(wcId)
    // a CAD program's own file: not read, the screen says how to get one that opens
    if (GUIDE_EXTENSIONS.has(ext)) return { status: 'guide', ext, name: importName(path) }
    if (!IMPORT_EXTENSIONS.has(ext)) return { status: 'unknown-type' }
    const read = await readChecked(path)
    if (!('bytes' in read)) return { status: read.status }
    return { status: 'import', bytes: read.bytes, name: importName(path), ext: ext as ImportExt }
  })

  ipcMain.handle(CAD_CHANNELS.save, async (e, request: unknown): Promise<SaveCadResult> => {
    const wcId = e.sender.id
    const waiter = saveWaiters.get(wcId)
    saveWaiters.delete(wcId)
    const done = (result: SaveCadResult): SaveCadResult => {
      waiter?.(result.ok && !('canceled' in result))
      return result
    }
    if (!mayWrite(wcId)) return done({ ok: false, error: 'no-target' })
    const {
      bytes: rawBytes,
      mode: rawMode,
      defaultName,
    } = (request ?? {}) as {
      bytes?: unknown
      mode?: unknown
      defaultName?: unknown
    }
    // The bytes come from a renderer. They replace a file only when they reopen as a drawing.
    const bytes = bytesOf(rawBytes)
    if (!bytes || openCadFile(bytes).status !== 'ok') {
      return done({ ok: false, error: 'not-reopenable' })
    }
    const mode: SaveMode = rawMode === 'saveAs' ? 'saveAs' : 'save'
    // Request input is untrusted: only an explicit automatic-save flag counts
    const auto = (request as { auto?: unknown } | null)?.auto === true
    // A copy pair saving onto the drawing's own path settles the conflict
    // first; keeping the disk copy (or a deferred automatic save) writes nothing
    if (mode === 'save') {
      const current = savePathByWc.get(wcId)
      if (current && (await conflictStopsSave(e.sender, current, auto))) {
        return done({ ok: true, canceled: true })
      }
    }
    try {
      const target = await resolveSaveTarget(
        e,
        mode,
        typeof defaultName === 'string' ? defaultName : undefined,
      )
      if (target === 'canceled') return done({ ok: true, canceled: true })
      const previousPath = savePathByWc.get(wcId)
      const isNewPath = previousPath !== target
      await atomicWriteFile(target, Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
      savePathByWc.set(wcId, target)
      // keep the reload path in sync: a stale openPathByWc would make a
      // reloaded renderer load the OLD file and then save it over the new one
      openPathByWc.set(wcId, target)
      untitledCopyByWc.delete(wcId)
      const allowed = allowedByWc.get(wcId) ?? new Set<string>()
      allowed.add(target)
      allowedByWc.set(wcId, allowed)
      dirtyByWc.delete(wcId)
      // the drawing is on disk: its recovery copies have done their part
      viewSaved(wcId)
      // Refresh the record for the written bytes; the view no longer edits a moved-away path
      await rememberDiskState(wcId, target)
      if (previousPath && previousPath !== target) forgetDiskState(wcId, previousPath)
      if (isNewPath) fileSavedHook?.(e.sender, target)
      return done({ ok: true, path: target })
    } catch (err) {
      console.warn('[cad] the drawing could not be written:', err)
      return done({ ok: false, error: 'write-failed' })
    }
  })

  ipcMain.handle(CAD_CHANNELS.exportFile, (e, request: unknown) => exportFile(e, request))

  // "Copy as picture": only PNG bytes of at most 10 MB reach the OS clipboard
  ipcMain.handle(CAD_CHANNELS.copyImage, (_e, raw: unknown): boolean => {
    const png = bytesOf(raw)
    if (!png || png.length > MAX_COPY_IMAGE_BYTES) return false
    if (png.length < PNG_SIGNATURE.length || PNG_SIGNATURE.some((b, i) => png[i] !== b)) {
      return false
    }
    clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(png)))
    return true
  })

  // "Send to Hangul / Word": the shell checks the request and opens the new tab
  ipcMain.handle(
    CAD_CHANNELS.sendToDocument,
    async (e, request: unknown): Promise<SendToDocumentResult> => {
      if (!sendToDocumentHook) return { ok: false, error: 'not available in this build' }
      try {
        return await sendToDocumentHook(e.sender, request)
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
  )

  ipcMain.on(CAD_CHANNELS.dirtyChanged, (e, dirty: unknown) => {
    if (dirty === true && mayWrite(e.sender.id)) dirtyByWc.add(e.sender.id)
    else dirtyByWc.delete(e.sender.id)
  })

  ipcMain.on(CAD_CHANNELS.closeSaveResult, (e, ok: unknown) => {
    const waiter = closeSaveWaiters.get(e.sender.id)
    closeSaveWaiters.delete(e.sender.id)
    waiter?.(ok === true)
  })

  // safety net for menu saves the renderer declined without invoking save()
  // (still loading, for one): the save handler itself resolves the normal path
  ipcMain.on(CAD_CHANNELS.saveRequestAck, (e, ok: unknown) => {
    const waiter = saveWaiters.get(e.sender.id)
    saveWaiters.delete(e.sender.id)
    waiter?.(ok === true)
  })

  // crash-recovery copies: bytes from the renderer, kept in the app data folder only
  ipcMain.handle(
    CAD_CHANNELS.recoveryCopy,
    async (e, request: unknown): Promise<RecoveryCopyResult> => {
      const wcId = e.sender.id
      // nothing unsaved (a save came first), or a view whose file has not opened yet
      if (!mayWrite(wcId) || !dirtyByWc.has(wcId)) return 'skipped'
      const { bytes: raw, name } = (request ?? {}) as { bytes?: unknown; name?: unknown }
      const bytes = bytesOf(raw)
      if (!bytes) return 'skipped'
      return writeViewCopy(wcId, savePathByWc.get(wcId), bytes, () =>
        untitledCopyTitle(e.sender, name),
      )
    },
  )

  ipcMain.on(CAD_CHANNELS.recoveryCopyNowDone, (e) => copyNowWaiters.get(e.sender.id)?.())

  // Language channel shared with other modules; removeHandler tolerates duplicate registration
  ipcMain.removeHandler(APP_CHANNELS.getLanguage)
  ipcMain.handle(APP_CHANNELS.getLanguage, () => getUiLang())
}

function grantAndTrack(wc: WebContents, openPath?: string | null): void {
  const wcId = wc.id
  contentsByWc.set(wcId, wc)
  if (openPath && existsSync(openPath)) {
    openPathByWc.set(wcId, openPath)
    allowedByWc.set(wcId, new Set([openPath]))
    // Not a save target yet: it becomes one when the open handler has seen the file open.
    unopenedByWc.add(wcId)
  }
  // The drawing never opens a window or leaves its page.
  wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  wc.on('will-navigate', (event, url) => {
    if (url !== wc.getURL()) event.preventDefault()
  })
  // a crashed view's recovery copies outlive it: the shell reopens the drawing from them
  wc.on('render-process-gone', () => viewCrashed(wcId))
  wc.once('destroyed', () => {
    viewGone(wcId, dirtyByWc.has(wcId))
    contentsByWc.delete(wcId)
    copyNowWaiters.get(wcId)?.()
    openPathByWc.delete(wcId)
    allowedByWc.delete(wcId)
    savePathByWc.delete(wcId)
    unopenedByWc.delete(wcId)
    untitledCopyByWc.delete(wcId)
    dirtyByWc.delete(wcId)
    docDiskStates.delete(wcId)
    closeSaveWaiters.get(wcId)?.(false)
    closeSaveWaiters.delete(wcId)
    saveWaiters.get(wcId)?.(false)
    saveWaiters.delete(wcId)
  })
}

/** The address the renderer is loaded from: the dev server when one runs, else the built files behind the app scheme. */
function cadRendererUrl(): string {
  return runtime.rendererUrl ?? `${RENDERER_SCHEME}://cad/index.html`
}

const VIEW_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
} as const

/** A drawing tab for the shell. `openPath` null or left out: a new, untitled drawing. */
export function createCadView(openPath?: string | null): WebContentsView {
  registerCadIpc()
  const view = new WebContentsView({
    webPreferences: { preload: runtime.preloadPath, ...VIEW_PREFERENCES },
  })
  grantAndTrack(view.webContents, openPath)
  void view.webContents.loadURL(cadRendererUrl())
  return view
}

/** Standalone window mode: `npm run dev -w @genoffice/cad`, a drawing path passed via argv */
export function startCadStandalone(): void {
  registerRendererScheme()
  installNavigationGuard(app)
  installContextMenu(app, () => contextMenuLabels(getUiLang()))
  configureCadRuntime({
    preloadPath: join(__dirname, '../preload/index.js'),
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
    rendererFile: join(__dirname, '../renderer/index.html'),
  })
  // A scratch profile for scripted runs, the same variable the shell reads.
  if (process.env.GENOFFICE_USER_DATA) app.setPath('userData', process.env.GENOFFICE_USER_DATA)
  void app.whenReady().then(() => {
    // there is no shell to say which language the user picked
    setUiLang(normalizeLang(process.env.GENOFFICE_LANG ?? app.getLocale()))
    installRendererProtocol({ cad: join(__dirname, '../renderer') })
    registerCadIpc()
    const win = new BrowserWindow({
      width: 1200,
      height: 850,
      webPreferences: { preload: runtime.preloadPath, ...VIEW_PREFERENCES },
    })
    const argPath = process.argv.slice(1).find((a) => OPENABLE_RE.test(a) && existsSync(a))
    grantAndTrack(win.webContents, argPath)
    void win.loadURL(cadRendererUrl())
  })
  app.on('window-all-closed', () => app.quit())
}
