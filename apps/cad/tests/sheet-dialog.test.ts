/**
 * The dimension sheet dialog: the preview, the title block's three cells
 * (their edits land as one undo step), "Copy picture", and the send button
 * that follows the Korean document features switch while the dialog is open.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { applyKoreanDocFeatures } from '@genoffice/ui'
import {
  CadHistory,
  addShape,
  createDocument,
  createKernel,
  evaluateDocument,
  type CadDocument,
  type Kernel,
} from '@genoffice/cad-engine'
import { SheetDialog, type SheetDialogProps } from '../src/renderer/sheet/SheetDialog'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { strings } from '../src/renderer/i18n/strings'

const en = strings.en

let kernel: Promise<Kernel> | null = null
const sharedKernel = (): Promise<Kernel> => (kernel ??= createKernel())

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(window as unknown as { cadApi: unknown }).cadApi = { onLanguageChanged: () => () => {} }
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  applyKoreanDocFeatures(null)
})

async function show(over: Partial<SheetDialogProps> & { doc: CadDocument }): Promise<void> {
  const props: SheetDialogProps = {
    evaluated: evaluateDocument(over.doc, await sharedKernel()),
    tabTitle: 'Untitled Drawing',
    onTitle: vi.fn(),
    onCopy: vi.fn(async () => 'copyDone' as const),
    onSend: vi.fn(async () => null),
    onClose: vi.fn(),
    ...over,
  }
  await act(async () => {
    root.render(
      createElement(LocaleProvider, { initial: 'en', children: createElement(SheetDialog, props) }),
    )
  })
}

const q = <T extends Element = HTMLElement>(selector: string): T | null =>
  host.querySelector<T>(selector)

async function type(selector: string, value: string): Promise<void> {
  const input = q<HTMLInputElement>(selector)!
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function click(selector: string): Promise<void> {
  const el = q(selector)
  if (!el) throw new Error(`no ${selector}`)
  await act(async () => el.click())
}

const boxDoc = (): CadDocument => addShape(createDocument(), 'box', { name: 'Base' }).doc

describe('SheetDialog', () => {
  it('empty model disables the sheet with a reason', async () => {
    await show({ doc: createDocument() })
    expect(q('[data-sheet-empty]')?.textContent).toBe(en.sheetEmpty)
    expect(q<HTMLButtonElement>('[data-sheet-copy]')!.disabled).toBe(true)
    expect(q<HTMLButtonElement>('[data-sheet-send]')!.disabled).toBe(true)
    expect(q('[data-sheet-preview]')).toBeNull()
  })

  it('shows the sheet as a picture with the tab title in the title block', async () => {
    await show({ doc: boxDoc(), tabTitle: 'Pencil holder' })
    const img = q<HTMLImageElement>('[data-sheet-preview]')!
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    expect(decodeURIComponent(img.getAttribute('src')!)).toContain('Pencil holder')
    expect(q<HTMLInputElement>('[data-sheet-field="name"]')!.placeholder).toBe('Pencil holder')
    // the scale is the engine's, shown but not typed
    expect(q<HTMLInputElement>('[data-sheet-field="scale"]')!.readOnly).toBe(true)
  })

  it('title block edits are one undo step', async () => {
    const history = new CadHistory(boxDoc())
    const onTitle = vi.fn((title: CadDocument['title']) =>
      history.edit('title', (d) => ({ ...d, title })),
    )
    const onClose = vi.fn()
    await show({ doc: history.current(), onTitle, onClose })
    await type('[data-sheet-field="name"]', 'Bracket')
    await type('[data-sheet-field="date"]', '2026-12-01')
    // the preview follows the cells at once
    expect(decodeURIComponent(q('[data-sheet-preview]')!.getAttribute('src')!)).toContain('Bracket')
    expect(onTitle).not.toHaveBeenCalled()
    await click('[data-sheet-close]')
    expect(onTitle).toHaveBeenCalledTimes(1)
    expect(history.current().title).toEqual({ name: 'Bracket', date: '2026-12-01', scale: '' })
    expect(onClose).toHaveBeenCalled()
    history.undo()
    expect(history.current().title).toEqual({ name: '', date: '', scale: '' })
    expect(history.canUndo()).toBe(false)
  })

  it('unchanged cells make no edit', async () => {
    const onTitle = vi.fn()
    await show({ doc: boxDoc(), onTitle })
    await click('[data-sheet-close]')
    expect(onTitle).not.toHaveBeenCalled()
  })

  it('copy picture keeps the title edits first, then says it was copied', async () => {
    const order: string[] = []
    const onTitle = vi.fn(() => void order.push('title'))
    const onCopy = vi.fn(async () => {
      order.push('copy')
      return 'copyDone' as const
    })
    await show({ doc: boxDoc(), onTitle, onCopy })
    await type('[data-sheet-field="name"]', 'Bracket')
    await click('[data-sheet-copy]')
    expect(order).toEqual(['title', 'copy'])
    expect(q('[data-sheet-status]')?.textContent).toBe(en.copyDone)
  })

  it('the send button follows the Korean document switch', async () => {
    applyKoreanDocFeatures(true)
    const onSend = vi.fn(async () => null)
    await show({ doc: boxDoc(), onSend })
    expect(q('[data-sheet-send]')!.textContent).toBe(en.sendHwp)
    await act(async () => applyKoreanDocFeatures(false))
    expect(q('[data-sheet-send]')!.textContent).toBe(en.sendDocx)
    await click('[data-sheet-send]')
    expect(onSend).toHaveBeenCalledWith('docx')
  })

  it('a failed send shows the translated reason in the dialog', async () => {
    await show({ doc: boxDoc(), onSend: vi.fn(async () => 'sendFailed' as const) })
    await click('[data-sheet-send]')
    expect(q('[data-sheet-status]')?.textContent).toBe(en.sendFailed)
  })
})
