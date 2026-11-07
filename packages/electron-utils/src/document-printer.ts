import { abortOnDestroyed, type DestroyableSender } from './abort-on-destroyed'
import { printJobOptions } from './print-job'
import type { PrintDialogOutcome, PrintDialogWindow, PrintDocumentOptions } from './print-window'

/** what a tab asks for: the HTML and the in-app dialog's job (omitted = system dialog) */
export interface PrintDocumentRequest {
  html: string
  /** printer name ('' = OS default) prints silently; null = the system dialog */
  job?: { deviceName?: string | null; copies?: number }
}

/**
 * Print runs in a throwaway main-process window, never in the tab: a
 * window.print() in the tab blocks its renderer until the system dialog
 * returns, and a dialog that never appears (a wedged PrintDialog.exe on
 * Windows) froze the tab and kept the app alive after its window closed.
 * Every pending job is aborted when the tab goes away, when the print window
 * is closed, and when the app quits.
 */
export interface DocumentPrinterDeps {
  createWindow(): { window: PrintDialogWindow; onClosed(listener: () => void): void }
  print(options: PrintDocumentOptions): Promise<PrintDialogOutcome>
  /** app name for errors and the temp-dir prefix: 'markdown', 'html' */
  app: string
  /** the HTML the window prints (e.g. with a <base> for the document's folder) */
  prepare?(html: string, sender: DestroyableSender): string
}

export function createDocumentPrinter(deps: DocumentPrinterDeps) {
  const pending = new Set<AbortController>()
  return {
    async print(
      sender: DestroyableSender,
      request: PrintDocumentRequest,
    ): Promise<PrintDialogOutcome> {
      if (typeof request?.html !== 'string' || !request.html) {
        return { ok: false, error: `${deps.app}: bad print request` }
      }
      const controller = new AbortController()
      pending.add(controller)
      const release = abortOnDestroyed(sender, controller)
      try {
        const { window, onClosed } = deps.createWindow()
        onClosed(() => controller.abort())
        return await deps.print({
          html: deps.prepare ? deps.prepare(request.html, sender) : request.html,
          window,
          fileName: 'print.html',
          dirPrefix: `genoffice-${deps.app}-print-`,
          job: printJobOptions(request.job),
          signal: controller.signal,
        })
      } finally {
        release()
        pending.delete(controller)
      }
    },
    abortAll(): void {
      for (const controller of pending) controller.abort()
    },
    pendingCount(): number {
      return pending.size
    },
  }
}
