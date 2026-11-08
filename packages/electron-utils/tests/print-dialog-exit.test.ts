import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import type { PrintDialogWindow } from '../src/print-window'

/**
 * Measured on Windows 11 (0.17.0, markdown → Print → system dialog): while the
 * system print dialog is open, closing the app runs before-quit, will-quit and
 * process 'exit' in ~50ms, and then the process sits in Chromium's teardown
 * until someone closes the dialog (200 s and more in the test; 2 s after the
 * dialog went away). The print window also counts toward window-all-closed,
 * so closing the main window alone did not even start the quit. Closing the
 * tab first destroys the print window and answers its print() callback, but
 * the dialog stays on screen and holds the exit the same way. A dialog the
 * user already canceled exits in 0.5 s.
 */

// the bookkeeping is module state: every test gets a fresh copy
let mod: typeof import('../src/print-window')
beforeEach(async () => {
  vi.resetModules()
  mod = await import('../src/print-window')
})

type Answer = { callback?: (ok: boolean, reason: string) => void }

function dialogWindow(answer: Answer) {
  const win: PrintDialogWindow = {
    loadFile: async () => {},
    webContents: {
      executeJavaScript: async () => 'READY',
      print: (_options, callback) => {
        answer.callback = callback
      },
    },
    show: () => {},
    focus: () => {},
    isDestroyed: () => false,
    destroy: () => {},
  }
  return win
}

const tick = () => new Promise((r) => setTimeout(r, 20))
async function dialogShown(answer: Answer) {
  for (let i = 0; i < 50 && !answer.callback; i++) await tick()
  expect(answer.callback).toBeDefined()
}

describe('system print dialog bookkeeping', () => {
  it('is pending from print() until the user answers the dialog', async () => {
    const answer: Answer = {}
    expect(mod.systemPrintDialogPending()).toBe(false)
    const job = mod.printHtmlDocument({
      html: '<p>x</p>',
      window: dialogWindow(answer),
      platform: 'win32',
    })
    await dialogShown(answer)
    expect(mod.systemPrintDialogPending()).toBe(true)
    answer.callback!(false, 'Print job canceled')
    expect(await job).toEqual({ ok: true, canceled: true })
    expect(mod.systemPrintDialogPending()).toBe(false)
  })

  it('stays pending once a job is abandoned under its dialog, whatever answers later', async () => {
    const answer: Answer = {}
    const controller = new AbortController()
    const job = mod.printHtmlDocument({
      html: '<p>x</p>',
      window: dialogWindow(answer),
      platform: 'win32',
      signal: controller.signal,
    })
    await dialogShown(answer)
    // the tab closed: the job settles and its window goes, the OS dialog does not
    controller.abort()
    expect(await job).toEqual({ ok: true, canceled: true })
    expect(mod.systemPrintDialogPending()).toBe(true)
    // Chromium answers the callback when the window is destroyed: no proof the dialog left
    answer.callback!(false, 'Print job canceled')
    expect(mod.systemPrintDialogPending()).toBe(true)
  })

  it('does not count a silent job, which opens no dialog', async () => {
    const answer: Answer = {}
    const job = mod.printHtmlDocument({
      html: '<p>x</p>',
      window: dialogWindow(answer),
      platform: 'win32',
      job: { silent: true },
    })
    await dialogShown(answer)
    expect(mod.systemPrintDialogPending()).toBe(false)
    expect(mod.printDialogWindowCount()).toBe(0)
    answer.callback!(true, '')
    expect(await job).toEqual({ ok: true })
  })
})

describe('print windows left behind by an open dialog', () => {
  it('counts the window under an open dialog and lets the app release it', async () => {
    const answer: Answer = {}
    const controller = new AbortController()
    const win = dialogWindow(answer)
    let destroyed = false
    win.destroy = () => {
      destroyed = true
      // Electron: destroy() emits 'closed', which the document printer turns into an abort
      controller.abort()
    }
    win.isDestroyed = () => destroyed
    const job = mod.printHtmlDocument({
      html: '<p>x</p>',
      window: win,
      platform: 'win32',
      signal: controller.signal,
    })
    await dialogShown(answer)
    expect(mod.printDialogWindowCount()).toBe(1)
    // the main window closed: this window alone must not keep the app running
    mod.releasePrintDialogWindows()
    expect(destroyed).toBe(true)
    expect(await job).toEqual({ ok: true, canceled: true })
    expect(mod.printDialogWindowCount()).toBe(0)
    // and the dialog it leaves on screen is the exit guard's to end
    expect(mod.systemPrintDialogPending()).toBe(true)
  })
})

describe('exit past an open print dialog', () => {
  function fakes(pending: boolean) {
    const app = new EventEmitter()
    const proc = new EventEmitter()
    const flushStorage = vi.fn()
    const terminate = vi.fn()
    mod.installPrintDialogExitGuard({
      app,
      process: proc,
      pending: () => pending,
      flushStorage,
      terminate,
    })
    return { app, proc, flushStorage, terminate }
  }

  it('flushes storage at will-quit and ends the process at exit while a dialog is open', () => {
    const f = fakes(true)
    f.app.emit('will-quit')
    expect(f.flushStorage).toHaveBeenCalledOnce()
    expect(f.terminate).not.toHaveBeenCalled()
    f.proc.emit('exit', 0)
    expect(f.terminate).toHaveBeenCalledOnce()
  })

  it('runs after the exit listeners the app registered while it ran', () => {
    const f = fakes(true)
    const order: string[] = []
    f.terminate.mockImplementation(() => order.push('terminate'))
    f.proc.on('exit', () => order.push('app clean-up'))
    f.app.emit('will-quit')
    f.proc.emit('exit', 0)
    expect(order).toEqual(['app clean-up', 'terminate'])
  })

  it('leaves an ordinary quit alone', () => {
    const f = fakes(false)
    f.app.emit('will-quit')
    f.proc.emit('exit', 0)
    expect(f.flushStorage).not.toHaveBeenCalled()
    expect(f.terminate).not.toHaveBeenCalled()
  })
})
