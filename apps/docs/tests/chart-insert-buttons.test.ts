// Insert → Chart (Hanpan 0.17.1 docs #29): the chart type and "+ category /
// + series" buttons were bare browser buttons beside the app's own footer
// buttons. They now use the app's button look, and the chart type is a toggle.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { editorExtensions } from '../src/renderer/editor/extensions'
import { ChartInsertModal } from '../src/renderer/components/ribbon-insert-tab'

describe('chart insert dialog buttons', () => {
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
    vi.unstubAllGlobals()
  })

  it('draws every dialog button as an app button, with the chart type as a toggle', () => {
    act(() => root.render(createElement(ChartInsertModal, { editor, onClose: () => {} })))
    const modal = container.querySelector('.modal-chart')!
    const bare = [...modal.querySelectorAll('button')].filter(
      (b) => !b.closest('.modal-actions') && !b.classList.contains('modal-btn'),
    )
    expect(bare).toHaveLength(0)
    const kinds = [...modal.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')]
    expect(kinds).toHaveLength(3)
    expect(kinds.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false'])
    act(() => kinds[2]!.click())
    expect(kinds.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true'])
  })
})
