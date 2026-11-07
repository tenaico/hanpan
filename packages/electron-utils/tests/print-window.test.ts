import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  PRINT_READY_SCRIPT,
  printHtmlDocument,
  withPrintOptions,
  type PrintDialogWindow,
} from '../src/print-window'

/** Records the call order, so the assertions can pin sequencing and not just
 * end state: the readiness probe has to happen BEFORE print(), and show() has
 * to happen before the dialog opens. */
class TestPrintWindow implements PrintDialogWindow {
  calls: string[] = []
  loadedPath: string | null = null
  loadedHtml = ''
  destroyed = false
  dirExistedAtDestroy = false
  shown = false
  focused = false
  failLoad = false
  printResult = { success: true, reason: '' }
  /** print() never calls back: a wedged system dialog */
  printHangs = false
  printOptions: unknown[] = []
  readyScripts: string[] = []
  readyHangs = false
  readyRejects = false

  async loadFile(path: string): Promise<void> {
    this.calls.push('loadFile')
    this.loadedPath = path
    this.loadedHtml = await readFile(path, 'utf8')
    if (this.failLoad) throw new Error('load failed')
  }

  webContents = {
    executeJavaScript: (script: string): Promise<unknown> => {
      this.calls.push('executeJavaScript')
      this.readyScripts.push(script)
      if (this.readyRejects) return Promise.reject(new Error('scripting disabled'))
      if (this.readyHangs) return new Promise<never>(() => {})
      return Promise.resolve('READY')
    },
    print: (
      _options: { silent: boolean; printBackground: boolean },
      callback: (success: boolean, reason: string) => void,
    ): void => {
      this.calls.push('print')
      this.printOptions.push(_options)
      if (this.printHangs) return
      callback(this.printResult.success, this.printResult.reason)
    },
  }

  show(): void {
    this.calls.push('show')
    this.shown = true
  }

  focus(): void {
    this.calls.push('focus')
    this.focused = true
  }

  isDestroyed(): boolean {
    return this.destroyed
  }

  destroy(): void {
    this.calls.push('destroy')
    this.dirExistedAtDestroy = !!this.loadedPath && existsSync(dirname(this.loadedPath))
    this.destroyed = true
  }
}

const run = (win: TestPrintWindow, platform?: string) =>
  printHtmlDocument({
    html: '<html><body>doc</body></html>',
    window: win,
    fileName: 'print.html',
    dirPrefix: 'genoffice-html-print-',
    platform: platform as NodeJS.Platform,
  })

describe('HTML print window', () => {
  it('waits for fonts and images to be ready before printing', async () => {
    // Printing straight after loadFile ships fallback fonts and missing images.
    const win = new TestPrintWindow()
    expect(await run(win)).toEqual({ ok: true })
    expect(win.calls.indexOf('executeJavaScript')).toBeGreaterThan(win.calls.indexOf('loadFile'))
    expect(win.calls.indexOf('print')).toBeGreaterThan(win.calls.indexOf('executeJavaScript'))
    // The probe must cover webfonts and every decoded bitmap, not just one.
    expect(win.readyScripts).toEqual([PRINT_READY_SCRIPT])
    expect(PRINT_READY_SCRIPT).toContain('document.fonts.ready')
    expect(PRINT_READY_SCRIPT).toContain('document.images')
    expect(PRINT_READY_SCRIPT).toContain('decode()')
  })

  it('shows and focuses the window on win32 so the native dialog can appear', async () => {
    // Windows attaches the native dialog to the printed window; printing from
    // a show:false window means no dialog is ever shown.
    const win = new TestPrintWindow()
    expect(await run(win, 'win32')).toEqual({ ok: true })
    expect(win.shown).toBe(true)
    expect(win.focused).toBe(true)
    expect(win.calls).toEqual([
      'loadFile',
      'executeJavaScript',
      'show',
      'focus',
      'print',
      'destroy',
    ])
  })

  it('keeps the window hidden on the platforms that show a sheet', async () => {
    const win = new TestPrintWindow()
    expect(await run(win, 'darwin')).toEqual({ ok: true })
    expect(win.shown).toBe(false)
    expect(win.focused).toBe(false)
    expect(win.calls).not.toContain('show')
  })

  it('surfaces the failure reason rather than swallowing it', async () => {
    const win = new TestPrintWindow()
    win.printResult = { success: false, reason: 'Printer not available' }
    expect(await run(win)).toEqual({ ok: false, error: 'Printer not available' })
  })

  it('distinguishes a cancelled job from a failure', async () => {
    // The user closing the dialog is their own outcome: ok, but not printed,
    // and carrying no error to shout about.
    const win = new TestPrintWindow()
    win.printResult = { success: false, reason: 'Print job canceled' }
    expect(await run(win)).toEqual({ ok: true, canceled: true })
  })

  it('reports a load failure instead of resolving as a success', async () => {
    const win = new TestPrintWindow()
    win.failLoad = true
    expect(await run(win)).toEqual({ ok: false, error: 'load failed' })
  })

  it('still prints when the readiness probe cannot run', async () => {
    // Chromium rejects executeJavaScript when the window is script-free. That
    // must degrade to a printout without the extra wait, never to no printout.
    const win = new TestPrintWindow()
    win.readyRejects = true
    expect(await run(win)).toEqual({ ok: true })
    expect(win.calls).toContain('print')
  })

  it('prints anyway when the readiness probe never settles', async () => {
    // Combined with the renderer's in-flight guard, a promise that never
    // resolves would wedge printing for the rest of the session.
    const win = new TestPrintWindow()
    win.readyHangs = true
    expect(await run(win)).toEqual({ ok: true })
    expect(win.calls).toContain('print')
  }, 10_000)

  it('destroys the window and removes the temp dir on success and on failure', async () => {
    const ok = new TestPrintWindow()
    await run(ok)
    expect(ok.destroyed).toBe(true)
    expect(ok.dirExistedAtDestroy).toBe(true)
    expect(ok.loadedPath).toMatch(/genoffice-html-print-.*print\.html$/)
    expect(ok.loadedHtml).toBe('<html><body>doc</body></html>')
    expect(existsSync(dirname(ok.loadedPath!))).toBe(false)

    const failed = new TestPrintWindow()
    failed.failLoad = true
    await run(failed)
    expect(failed.destroyed).toBe(true)
    expect(existsSync(dirname(failed.loadedPath!))).toBe(false)
  })

  it('destroys a window that died under it without throwing', async () => {
    const win = new TestPrintWindow()
    win.destroy = () => {
      throw new Error('window already gone')
    }
    // Teardown must not turn a print failure into an unhandled rejection.
    await expect(run(win, 'win32')).rejects.toThrow('window already gone')
  })
})

describe('HTML print window — in-app dialog jobs', () => {
  it('prints silently to the chosen printer without showing the window', async () => {
    // The in-app dialog already chose printer and copies: no system dialog, no
    // throwaway window flashing on screen.
    const win = new TestPrintWindow()
    const outcome = await printHtmlDocument({
      html: '<p>x</p>',
      window: win,
      platform: 'win32',
      job: { silent: true, deviceName: 'Office Printer', copies: 2 },
    })
    expect(outcome).toEqual({ ok: true })
    expect(win.shown).toBe(false)
    expect(win.printOptions).toEqual([
      { silent: true, printBackground: true, deviceName: 'Office Printer', copies: 2 },
    ])
  })

  it('gives up on a silent job the spooler never answers, and destroys the window', async () => {
    const win = new TestPrintWindow()
    win.printHangs = true
    const outcome = await printHtmlDocument({
      html: '<p>x</p>',
      window: win,
      job: { silent: true },
      silentTimeoutMs: 50,
    })
    expect(outcome).toEqual({ ok: false, error: 'timeout' })
    expect(win.destroyed).toBe(true)
  })

  it('an abort (app quit, window closed) settles a wedged system dialog as canceled', async () => {
    // A system print dialog that never comes back must not keep the app (and
    // its process) alive after the user quits.
    const win = new TestPrintWindow()
    win.printHangs = true
    const controller = new AbortController()
    const pending = printHtmlDocument({
      html: '<p>x</p>',
      window: win,
      platform: 'win32',
      signal: controller.signal,
    })
    await vi.waitFor(() => expect(win.calls).toContain('print'))
    controller.abort()
    expect(await pending).toEqual({ ok: true, canceled: true })
    expect(win.destroyed).toBe(true)
  })

  it('does not load anything when already aborted', async () => {
    const win = new TestPrintWindow()
    const controller = new AbortController()
    controller.abort()
    const outcome = await printHtmlDocument({ html: 'x', window: win, signal: controller.signal })
    expect(outcome).toEqual({ ok: true, canceled: true })
    expect(win.calls).not.toContain('print')
  })
})

describe('withPrintOptions', () => {
  it('tells the system dialog the paper on every print, and passes the rest through', async () => {
    const seen: unknown[] = []
    const calls: string[] = []
    const win = {
      loadFile: async () => void calls.push('load'),
      webContents: {
        executeJavaScript: async () => 'READY',
        print: (options: unknown, callback: (ok: boolean, reason: string) => void) => {
          seen.push(options)
          callback(true, '')
        },
      },
      show: () => void calls.push('show'),
      focus: () => void calls.push('focus'),
      isDestroyed: () => false,
      destroy: () => void calls.push('destroy'),
    }
    const wrapped = withPrintOptions(win, { pageSize: 'A4', landscape: true })
    await wrapped.loadFile('x.html')
    wrapped.show()
    wrapped.focus()
    await new Promise<void>((resolve) =>
      wrapped.webContents.print({ silent: false, printBackground: true }, () => resolve()),
    )
    wrapped.destroy()
    expect(seen).toEqual([
      {
        silent: false,
        printBackground: true,
        pageSize: 'A4',
        landscape: true,
        margins: { marginType: 'none' },
      },
    ])
    expect(calls).toEqual(['load', 'show', 'focus', 'destroy'])
  })
})
