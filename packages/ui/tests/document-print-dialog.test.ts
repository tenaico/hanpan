/** @vitest-environment jsdom */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentPrintDialog, type DocumentPrintDialogLabels } from '../src/document-print-dialog'

const LABELS: DocumentPrintDialogLabels = {
  title: 'Print',
  printer: 'Printer',
  defaultPrinter: 'Default printer',
  systemDialog: 'System print dialog…',
  copies: 'Copies',
  print: 'Print',
  cancel: 'Cancel',
  preparing: 'Preparing',
  printing: 'Printing',
}

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

function mount(props: { onPrint?: () => void; onClose?: () => void; html?: string | null }) {
  act(() =>
    root.render(
      createElement(DocumentPrintDialog, {
        html: props.html === undefined ? '<p>doc</p>' : props.html,
        printers: [
          { name: 'Office', displayName: 'Office', isDefault: true },
          { name: 'PDF', displayName: 'Microsoft Print to PDF' },
        ],
        labels: LABELS,
        onPrint: props.onPrint ?? (() => {}),
        onClose: props.onClose ?? (() => {}),
      }),
    ),
  )
}

describe('DocumentPrintDialog', () => {
  it('shows the document itself as a script-free preview', () => {
    mount({})
    const frame = host.querySelector<HTMLIFrameElement>('[data-hanpan="document-print-preview"]')!
    expect(frame.getAttribute('srcdoc')).toContain('<p>doc</p>')
    expect(frame.getAttribute('sandbox')).toBe('allow-same-origin')
  })

  it('prints to the default printer with the chosen copies', async () => {
    const onPrint = vi.fn()
    mount({ onPrint })
    const copies = host.querySelector<HTMLInputElement>('[data-hanpan="document-print-copies"]')!
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(copies, '2')
      copies.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-action="document-print-go"]')!.click()
    })
    expect(onPrint).toHaveBeenCalledWith({ deviceName: '', copies: 2 })
  })

  it('"System print dialog…" hands the job to the OS dialog (deviceName null)', async () => {
    const onPrint = vi.fn()
    mount({ onPrint })
    const select = host.querySelector<HTMLSelectElement>('[data-hanpan="document-print-printer"]')!
    expect([...select.options].map((o) => o.textContent)).toEqual([
      'Default printer (Office)',
      'Microsoft Print to PDF',
      'System print dialog…',
    ])
    act(() => {
      select.value = select.options[2].value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-action="document-print-go"]')!.click()
    })
    expect(onPrint).toHaveBeenCalledWith({ deviceName: null, copies: 1 })
  })

  it('Esc closes it', () => {
    const onClose = vi.fn()
    mount({ onClose })
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('cannot print before the preview exists', () => {
    mount({ html: null })
    expect(
      host.querySelector<HTMLButtonElement>('[data-action="document-print-go"]')!.disabled,
    ).toBe(true)
  })
})
