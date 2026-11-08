import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Throwaway window supplied by the caller so each app keeps its own webPreferences. */
export interface PrintDialogWindow {
  loadFile(path: string): Promise<void>
  webContents: {
    executeJavaScript(script: string, userGesture?: boolean): Promise<unknown>
    print(
      options: { silent: boolean; printBackground: boolean },
      callback: (success: boolean, failureReason: string) => void,
    ): void
  }
  show(): void
  focus(): void
  isDestroyed(): boolean
  destroy(): void
}

/** Extra webContents.print fields for a job an in-app dialog already set up (see print-job.ts). */
export interface PrintDocumentJob {
  /** true: print straight to `deviceName` (OS default when omitted), no system dialog */
  silent: boolean
  deviceName?: string
  copies?: number
  collate?: boolean
  duplexMode?: 'simplex' | 'longEdge' | 'shortEdge'
}

/**
 * System print dialogs this process opened that have not answered yet. On
 * Windows the dialog lives on after its job is abandoned (tab closed, print
 * window destroyed), and while it is open the browser process cannot finish
 * its exit: it waits in Chromium's teardown until the dialog is closed.
 */
let openSystemDialogs = 0
/**
 * A job was abandoned (tab closed, app quitting, window destroyed) while its
 * dialog was open. Chromium then answers the print() callback, but the dialog
 * stays on screen; nothing tells the app when it goes, so this stays set.
 */
let orphanedDialog = false

/** a system print dialog opened by `printHtmlDocument` may still be on screen */
export function systemPrintDialogPending(): boolean {
  return openSystemDialogs > 0 || orphanedDialog
}

/** the print windows whose job is waiting on a system dialog (Windows shows them) */
const dialogWindows = new Set<PrintDialogWindow>()

export function printDialogWindowCount(): number {
  return dialogWindows.size
}

/**
 * The app's own windows are gone: a print window waiting on its dialog must
 * not keep the app running (it counts toward window-all-closed). Destroying
 * it ends its job as canceled; the dialog itself is left to the exit guard.
 */
export function releasePrintDialogWindows(): void {
  for (const win of [...dialogWindows]) {
    dialogWindows.delete(win)
    if (!win.isDestroyed()) win.destroy()
  }
}

/** the app and process events the exit guard needs (structural: no Electron import) */
export interface PrintDialogExitDeps {
  app: { on(event: 'will-quit', listener: () => void): unknown }
  process: { on(event: 'exit', listener: () => void): unknown }
  pending(): boolean
  /** write what the renderers stored (DOM storage) before the process ends early */
  flushStorage(): void
  /** end the process now (TerminateProcess), past the native teardown */
  terminate(): void
}

/**
 * A quit with a system print dialog still open ends the process itself once
 * every quit handler and 'exit' listener has run, instead of waiting until
 * the user finds and closes a dialog for an app they already closed. An
 * ordinary quit is not touched.
 */
export function installPrintDialogExitGuard(deps: PrintDialogExitDeps): void {
  deps.app.on('will-quit', () => {
    if (!deps.pending()) return
    deps.flushStorage()
    // added now, so it runs after every 'exit' listener registered while the app ran
    deps.process.on('exit', () => {
      if (deps.pending()) deps.terminate()
    })
  })
}

/** a silent job the spooler never answers is given up after this long */
const SILENT_PRINT_TIMEOUT_MS = 60_000

export type PrintDialogOutcome =
  | { ok: true }
  /** the user closed the system dialog: their own outcome, not a failure */
  | { ok: true; canceled: true }
  | { ok: false; error: string }

/** Fonts and bitmaps decoded before print(), or pages print with fallback fonts and missing images. */
export const PRINT_READY_SCRIPT =
  'Promise.all([document.fonts.ready, ...Array.from(document.images).map((i) => i.decode().catch(() => {}))])'

// a user-authored script that never yields must not wedge printing for the session
const PRINT_READY_TIMEOUT_MS = 5_000

export interface PrintDocumentOptions {
  /** final document HTML, assets already resolved by the caller */
  html: string
  /** needs scripting enabled: the readiness probe runs through executeJavaScript */
  window: PrintDialogWindow
  fileName?: string
  /** temp-dir prefix, so a leaked dir is attributable to the calling app */
  dirPrefix?: string
  platform?: NodeJS.Platform
  /** omitted: the system print dialog */
  job?: PrintDocumentJob
  /**
   * Abort settles the job as canceled and destroys the window: app quit, or the
   * user closing a system dialog that never came back (a wedged print dialog
   * would otherwise keep the window, and the app's process, alive).
   */
  signal?: AbortSignal
  silentTimeoutMs?: number
}

/**
 * Print a document through the system print dialog in a throwaway window.
 * The window outlives the dialog (destroying it as print() opens closes the
 * sheet) and is destroyed on every path.
 */
export async function printHtmlDocument({
  html,
  window: win,
  fileName = 'print.html',
  dirPrefix = 'genoffice-print-',
  platform = process.platform,
  job,
  signal,
  silentTimeoutMs = SILENT_PRINT_TIMEOUT_MS,
}: PrintDocumentOptions): Promise<PrintDialogOutcome> {
  let tempDir: string | null = null
  if (signal?.aborted) {
    if (!win.isDestroyed()) win.destroy()
    return { ok: true, canceled: true }
  }
  let onAbort: (() => void) | undefined
  const aborted = new Promise<'aborted'>((resolve) => {
    onAbort = () => resolve('aborted')
    signal?.addEventListener('abort', onAbort, { once: true })
  })
  let printTimer: ReturnType<typeof setTimeout> | undefined
  let dialogUnanswered = (): boolean => false
  try {
    // a temp file, not a data: URL: long documents truncate the URL
    tempDir = await mkdtemp(join(tmpdir(), dirPrefix))
    const htmlPath = join(tempDir, fileName)
    await writeFile(htmlPath, html, 'utf8')
    await win.loadFile(htmlPath)
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      win.webContents.executeJavaScript(PRINT_READY_SCRIPT, true),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, PRINT_READY_TIMEOUT_MS)
      }),
    ]).catch((err: unknown) => {
      console.error('[print] readiness probe failed:', err)
    })
    clearTimeout(timer)
    if (signal?.aborted) return { ok: true, canceled: true }
    const silent = job?.silent === true
    // Windows attaches the native dialog to the printed window, which must be visible
    if (platform === 'win32' && !silent) {
      win.show()
      win.focus()
    }
    const options = { ...job, silent, printBackground: true }
    // counted until the dialog answers, which may be after this job settled
    let dialogOpen = !silent
    if (dialogOpen) {
      openSystemDialogs += 1
      dialogWindows.add(win)
    }
    const answered = () => {
      if (!dialogOpen) return
      dialogOpen = false
      openSystemDialogs -= 1
    }
    dialogUnanswered = () => {
      if (!dialogOpen) return false
      answered()
      return true
    }
    const printed = new Promise<{ success: boolean; failureReason: string }>((resolve) => {
      try {
        win.webContents.print(options, (success, failureReason) => {
          answered()
          resolve({ success, failureReason })
        })
      } catch (err) {
        // no dialog opened
        answered()
        throw err
      }
    })
    const timedOut = silent
      ? new Promise<'timeout'>((resolve) => {
          printTimer = setTimeout(() => resolve('timeout'), silentTimeoutMs)
        })
      : new Promise<never>(() => {})
    const result = await Promise.race([printed, aborted, timedOut])
    if (result === 'aborted') return { ok: true, canceled: true }
    if (result === 'timeout') return { ok: false, error: 'timeout' }
    if (!result.success) {
      if (result.failureReason === 'Print job canceled') return { ok: true, canceled: true }
      return { ok: false, error: result.failureReason || 'the print job failed' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(printTimer)
    dialogWindows.delete(win)
    if (dialogUnanswered()) orphanedDialog = true
    if (onAbort) signal?.removeEventListener('abort', onAbort)
    try {
      if (!win.isDestroyed()) win.destroy()
    } finally {
      if (tempDir) await rm(tempDir, { recursive: true, force: true })
    }
  }
}

/** An Electron window as `withPrintOptions` needs it (kept structural: no Electron import here). */
export interface PrintableWindow<O extends object> {
  loadFile(path: string): Promise<void>
  webContents: {
    executeJavaScript(script: string, userGesture?: boolean): Promise<unknown>
    print(
      options: O & { silent: boolean; printBackground: boolean; margins: { marginType: 'none' } },
      callback: (success: boolean, failureReason: string) => void,
    ): void
  }
  show(): void
  focus(): void
  isDestroyed(): boolean
  destroy(): void
}

/**
 * A window for `printHtmlDocument` that tells the system dialog the page's own
 * paper (`pageSize`, `landscape`) with no margin of its own: the page sets its
 * margins itself, so what prints is what the preview showed.
 */
export function withPrintOptions<O extends object>(
  win: PrintableWindow<O>,
  page: O,
): PrintDialogWindow {
  return {
    loadFile: (path) => win.loadFile(path),
    webContents: {
      executeJavaScript: (script, userGesture) =>
        win.webContents.executeJavaScript(script, userGesture),
      print: (options, callback) =>
        win.webContents.print({ ...options, ...page, margins: { marginType: 'none' } }, callback),
    },
    show: () => win.show(),
    focus: () => win.focus(),
    isDestroyed: () => win.isDestroyed(),
    destroy: () => win.destroy(),
  }
}
