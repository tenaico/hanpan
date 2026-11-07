import { describe, expect, it } from 'vitest'
import type { PrintDocumentOptions, PrintDialogOutcome } from '../src/print-window'
import { createDocumentPrinter } from '../src/document-printer'

class FakeSender {
  destroyed = false
  listeners: Array<() => void> = []
  isDestroyed() {
    return this.destroyed
  }
  once(_event: 'destroyed', listener: () => void) {
    this.listeners.push(listener)
  }
  removeListener(_event: 'destroyed', listener: () => void) {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }
  destroy() {
    this.destroyed = true
    for (const l of this.listeners) l()
  }
}

/** a print that only settles when its signal aborts: a system dialog that never comes back */
function wedgedPrint(seen: PrintDocumentOptions[]) {
  return (options: PrintDocumentOptions): Promise<PrintDialogOutcome> => {
    seen.push(options)
    return new Promise((resolve) =>
      options.signal?.addEventListener('abort', () => resolve({ ok: true, canceled: true })),
    )
  }
}

const fakeWindow = () => ({ closed: [] as Array<() => void> })

describe('document printer (main process, never the tab renderer)', () => {
  it('passes the in-app dialog job through as a silent print to the chosen printer', async () => {
    const seen: PrintDocumentOptions[] = []
    const printer = createDocumentPrinter({
      app: 'markdown',
      createWindow: () => ({ window: {} as never, onClosed: () => {} }),
      print: async (options) => {
        seen.push(options)
        return { ok: true }
      },
    })
    const outcome = await printer.print(new FakeSender(), {
      html: '<p>doc</p>',
      job: { deviceName: 'Office', copies: 3 },
    })
    expect(outcome).toEqual({ ok: true })
    expect(seen[0].html).toBe('<p>doc</p>')
    expect(seen[0].job).toEqual({ silent: true, deviceName: 'Office', copies: 3 })
  })

  it('a null printer means the system dialog', async () => {
    const seen: PrintDocumentOptions[] = []
    const printer = createDocumentPrinter({
      app: 'markdown',
      createWindow: () => ({ window: {} as never, onClosed: () => {} }),
      print: async (options) => {
        seen.push(options)
        return { ok: true }
      },
    })
    await printer.print(new FakeSender(), { html: 'x', job: { deviceName: null } })
    expect(seen[0].job).toEqual({ silent: false })
  })

  it('rejects a malformed request without opening a window', async () => {
    let created = 0
    const printer = createDocumentPrinter({
      app: 'markdown',
      createWindow: () => {
        created++
        return { window: {} as never, onClosed: () => {} }
      },
      print: async () => ({ ok: true }),
    })
    expect(await printer.print(new FakeSender(), { html: 42 } as never)).toEqual({
      ok: false,
      error: 'markdown: bad print request',
    })
    expect(created).toBe(0)
  })

  it('quitting the app settles a wedged print, so no process is left behind', async () => {
    const seen: PrintDocumentOptions[] = []
    const printer = createDocumentPrinter({
      app: 'markdown',
      createWindow: () => ({ window: {} as never, onClosed: () => {} }),
      print: wedgedPrint(seen),
    })
    const pending = printer.print(new FakeSender(), { html: 'x' })
    expect(printer.pendingCount()).toBe(1)
    printer.abortAll()
    expect(await pending).toEqual({ ok: true, canceled: true })
    expect(printer.pendingCount()).toBe(0)
  })

  it('closing the tab or the print window settles it too', async () => {
    const seen: PrintDocumentOptions[] = []
    const win = fakeWindow()
    const printer = createDocumentPrinter({
      app: 'markdown',
      createWindow: () => ({ window: {} as never, onClosed: (cb) => win.closed.push(cb) }),
      print: wedgedPrint(seen),
    })
    const tab = new FakeSender()
    const byTab = printer.print(tab, { html: 'x' })
    tab.destroy()
    expect(await byTab).toEqual({ ok: true, canceled: true })

    const byWindow = printer.print(new FakeSender(), { html: 'x' })
    win.closed.at(-1)!()
    expect(await byWindow).toEqual({ ok: true, canceled: true })
  })

  it('lets the app finish the HTML for the sender (a <base> for its folder)', async () => {
    const seen: PrintDocumentOptions[] = []
    const printer = createDocumentPrinter({
      app: 'html',
      createWindow: () => ({ window: {} as never, onClosed: () => {} }),
      print: async (options) => {
        seen.push(options)
        return { ok: true }
      },
      prepare: (html) => `<base href="file:///doc/">${html}`,
    })
    await printer.print(new FakeSender(), { html: '<p>x</p>' })
    expect(seen[0].html).toBe('<base href="file:///doc/"><p>x</p>')
    expect(seen[0].dirPrefix).toBe('genoffice-html-print-')
  })
})
