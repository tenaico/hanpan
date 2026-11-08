// The quick-access row starts with Save and Save As in the Word, Markdown and
// web editors alike (Hanpan 0.17.1 docs #25): Save is off until something
// changed, so Save As is how a copy of an unchanged document is made.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QuickSaveButtons } from '../src/renderer/components/quick-save-buttons'
import { LocaleProvider, setModuleLang } from '../src/renderer/i18n/locale'

describe('Word quick-access Save / Save As', () => {
  let root: Root
  let container: HTMLElement

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    ;(window as unknown as { desktop: unknown }).desktop = { onLanguageChanged: () => () => {} }
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    setModuleLang('zh')
    vi.unstubAllGlobals()
  })

  function render(props: { hasDoc: boolean; dirty: boolean }) {
    const onSave = vi.fn()
    const onSaveAs = vi.fn()
    setModuleLang('ko')
    act(() =>
      root.render(
        createElement(LocaleProvider, {
          initial: 'ko',
          children: createElement(QuickSaveButtons, { ...props, onSave, onSaveAs }),
        }),
      ),
    )
    const [save, saveAs] = [...container.querySelectorAll<HTMLButtonElement>('button.qa-btn')]
    return { save, saveAs, onSave, onSaveAs }
  }

  it('offers Save As beside Save for an unchanged document', () => {
    const { save, saveAs, onSave, onSaveAs } = render({ hasDoc: true, dirty: false })
    expect(save.getAttribute('aria-label')).toMatch(/^저장 \(/)
    expect(save.disabled).toBe(true)
    expect(saveAs.getAttribute('aria-label')).toBe('다른 이름으로 저장…')
    expect(saveAs.getAttribute('data-tip')).toBe('다른 이름으로 저장…')
    expect(saveAs.textContent).toBe('')
    expect(saveAs.querySelector('svg')).not.toBeNull()
    expect(saveAs.disabled).toBe(false)
    act(() => saveAs.click())
    expect(onSaveAs).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves a changed document and offers nothing without one', () => {
    const changed = render({ hasDoc: true, dirty: true })
    act(() => changed.save.click())
    expect(changed.onSave).toHaveBeenCalledOnce()
    const none = render({ hasDoc: false, dirty: false })
    expect(none.save.disabled).toBe(true)
    expect(none.saveAs.disabled).toBe(true)
  })
})
