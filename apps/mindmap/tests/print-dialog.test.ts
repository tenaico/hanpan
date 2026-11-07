/**
 * Print, as the user meets it: the editor's own print dialog with a preview of
 * the page, a printer and the number of copies, like the slide editor's. The
 * system's print dialog (which holds the whole app while it is open) is only
 * an option in the printer list.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PrintDialog } from '../src/renderer/components/PrintDialog'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { MindmapApi, PrintJob, PrintResult } from '../src/shared/ipc'

let container: HTMLElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  ;(window as unknown as { mindmapApi: Partial<MindmapApi> }).mindmapApi = {
    onLanguageChanged: () => () => {},
    listPrinters: async () => [
      { name: 'p1', displayName: 'Front desk' },
      { name: 'p2', displayName: 'Colour' },
    ],
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

const PAGE = '<!DOCTYPE html><html><body><div class="mm-page">map</div></body></html>'

async function show(onPrint: (job: PrintJob) => Promise<PrintResult>, onClose = vi.fn()) {
  await act(async () => {
    root.render(
      createElement(LocaleProvider, {
        initial: 'ko',
        children: createElement(PrintDialog, { html: PAGE, onPrint, onClose }),
      }),
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return onClose
}

const dialog = () => document.querySelector<HTMLElement>('[data-dialog="print"]')!

describe('the print dialog', () => {
  it('shows the page itself, sandboxed, and the printers with the default first and the system dialog last', async () => {
    await show(async () => ({ ok: true }))
    const frame = dialog().querySelector('iframe')!
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.getAttribute('srcdoc')).toBe(PAGE)
    const options = [...dialog().querySelectorAll('select[data-field="printer"] option')].map(
      (o) => o.textContent,
    )
    expect(options[0]).toBe('기본 프린터')
    expect(options.slice(1, 3)).toEqual(['Front desk', 'Colour'])
    expect(options.at(-1)).toContain('시스템 인쇄 창')
  })

  it('prints to the picked printer with the copies asked for, then closes', async () => {
    const onPrint = vi.fn(async () => ({ ok: true }) as PrintResult)
    const onClose = await show(onPrint)
    const select = dialog().querySelector<HTMLSelectElement>('select[data-field="printer"]')!
    const copies = dialog().querySelector<HTMLInputElement>('input[data-field="copies"]')!
    await act(async () => {
      select.value = 'p2'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(copies, '3')
      copies.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      dialog().querySelector<HTMLButtonElement>('[data-action="print-go"]')!.click()
    })
    expect(onPrint).toHaveBeenCalledWith({ deviceName: 'p2', copies: 3 })
    expect(onClose).toHaveBeenCalled()
  })

  it('stays open when the system dialog was cancelled, and Escape closes it', async () => {
    const onPrint = vi.fn(async () => ({ ok: true, canceled: true }) as PrintResult)
    const onClose = await show(onPrint)
    const select = dialog().querySelector<HTMLSelectElement>('select[data-field="printer"]')!
    await act(async () => {
      select.value = select.options[select.options.length - 1]!.value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      dialog().querySelector<HTMLButtonElement>('[data-action="print-go"]')!.click()
    })
    expect(onPrint).toHaveBeenCalledWith({ deviceName: null })
    expect(onClose).not.toHaveBeenCalled()
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalled()
  })
})
