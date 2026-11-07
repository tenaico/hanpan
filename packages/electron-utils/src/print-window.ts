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
    const printed = new Promise<{ success: boolean; failureReason: string }>((resolve) => {
      win.webContents.print(options, (success, failureReason) =>
        resolve({ success, failureReason }),
      )
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
