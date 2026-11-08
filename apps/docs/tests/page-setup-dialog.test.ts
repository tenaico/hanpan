// Layout → Margins → Custom Margins is Word's Page Setup (Hanpan 0.17.1 docs
// #30): margins, paper size and orientation in one dialog, applied together.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MarginDialog } from '../src/renderer/components/MarginDialog'
import { LocaleProvider, setModuleLang } from '../src/renderer/i18n/locale'

const A4 = { pageWidth: 11906, pageHeight: 16838 }
const MARGINS = { top: 1440, right: 1440, bottom: 1440, left: 1440 }

describe('Page Setup dialog', () => {
  let root: Root
  let container: HTMLElement

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    ;(window as unknown as { desktop: unknown }).desktop = { onLanguageChanged: () => () => {} }
    setModuleLang('ko')
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    setModuleLang('zh')
    vi.unstubAllGlobals()
  })

  function open(page: { pageWidth: number; pageHeight: number }, margins = MARGINS) {
    const onApply = vi.fn()
    act(() =>
      root.render(
        createElement(LocaleProvider, {
          initial: 'ko',
          children: createElement(MarginDialog, {
            margins,
            mirror: false,
            ...page,
            orientation: page.pageWidth > page.pageHeight ? 'landscape' : 'portrait',
            onApply,
            onClose: () => {},
          }),
        }),
      ),
    )
    const paper = container.querySelector<HTMLSelectElement>('select[data-field="paper"]')!
    const orientation = container.querySelector<HTMLSelectElement>(
      'select[data-field="orientation"]',
    )!
    const ok = [...container.querySelectorAll('button')].find((b) => b.textContent === '확인')!
    return { onApply, paper, orientation, ok }
  }

  const choose = (select: HTMLSelectElement, value: string) =>
    act(() => {
      select.value = value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

  it('is titled Page Setup and starts from the page as it is', () => {
    const { paper, orientation } = open(A4)
    expect(container.querySelector('h2')?.textContent).toBe('페이지 설정')
    expect(paper.value).toBe('a4')
    expect(orientation.value).toBe('portrait')
  })

  it('applies margins, paper and orientation together', () => {
    const { onApply, paper, orientation, ok } = open(A4)
    choose(paper, 'letter')
    choose(orientation, 'landscape')
    act(() => ok.click())
    expect(onApply).toHaveBeenCalledWith(MARGINS, false, {
      pageWidth: 15840,
      pageHeight: 12240,
      orientation: 'landscape',
    })
  })

  it('keeps a size that is not in the list', () => {
    const { onApply, paper, ok } = open({ pageWidth: 10000, pageHeight: 14000 })
    expect(paper.value).toBe('custom')
    act(() => ok.click())
    expect(onApply).toHaveBeenCalledWith(MARGINS, false, {
      pageWidth: 10000,
      pageHeight: 14000,
      orientation: 'portrait',
    })
  })

  it('refuses margins the chosen paper cannot hold', () => {
    const wide = { top: 1440, right: 3600, bottom: 1440, left: 3600 }
    const { paper, ok } = open(A4, wide)
    expect(ok.disabled).toBe(false)
    choose(paper, 'env10')
    expect(ok.disabled).toBe(true)
  })
})
