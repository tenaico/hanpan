// The Insert → Equation gallery (Hanpan 0.17.1 docs #29): a thumbnail wider
// than the panel was clipped (Fourier series) and every thumbnail was its own
// scroll box, so Windows drew ▲▼ arrows beside each one. A wide thumbnail is
// scaled down to fit instead, and none of them scrolls.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { editorExtensions } from '../src/renderer/editor/extensions'
import { EquationGallery, galleryPreviewScale } from '../src/renderer/components/EquationModal'

describe('equation gallery thumbnails', () => {
  let root: Root
  let container: HTMLElement
  let editor: Editor

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    editor = new Editor({ element: document.createElement('div'), extensions: editorExtensions })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    editor.destroy()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('scales only what does not fit', () => {
    expect(galleryPreviewScale(200, 280)).toBe(1)
    expect(galleryPreviewScale(280, 280)).toBe(1)
    expect(galleryPreviewScale(400, 280)).toBeCloseTo(0.7)
    // an unmeasured box (hidden panel) leaves the thumbnail alone
    expect(galleryPreviewScale(400, 0)).toBe(1)
  })

  it('shrinks a wide thumbnail into the panel', () => {
    // jsdom has no layout: the Fourier thumbnail reports 400px in a 280px box
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.classList.contains('equation-gallery-preview') ? 280 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      const name = this.closest('.equation-gallery-item')?.getAttribute('data-tip') ?? ''
      return this.classList.contains('equation-gallery-preview') &&
        /Fourier|푸리에|傅里叶/.test(name)
        ? 400
        : 200
    })
    act(() =>
      root.render(createElement(EquationGallery, { editor, onPick: () => {}, onCustom: () => {} })),
    )
    const previews = [...container.querySelectorAll<HTMLElement>('.equation-gallery-preview')]
    expect(previews.length).toBeGreaterThan(5)
    const formulas = previews.map((p) => p.firstElementChild as HTMLElement)
    expect(formulas.every((f) => f !== null)).toBe(true)
    const scaled = formulas.filter((f) => f.style.zoom !== '')
    expect(scaled).toHaveLength(1)
    expect(Number(scaled[0]!.style.zoom)).toBeCloseTo(0.7)
    // the box itself keeps the panel's width
    expect(previews.every((p) => p.style.zoom === '')).toBe(true)
  })
})
