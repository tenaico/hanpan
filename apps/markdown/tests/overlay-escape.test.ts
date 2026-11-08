// The image upload server dialog and the graph overlay close on Esc like every
// other dialog in the app (UX v2 #7).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ImageHostDialog } from '../src/renderer/components/ImageHostDialog'
import { GraphView } from '../src/renderer/components/GraphView'

const cleanups: Array<() => void> = []
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('markdownApi', {
    getImageHost: () => Promise.resolve(null),
    getWikiGraph: () => new Promise(() => {}),
  })
  HTMLCanvasElement.prototype.getContext = (() => null) as never
})
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

function mount(element: ReturnType<typeof createElement>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  cleanups.push(() => {
    act(() => root.unmount())
    container.remove()
  })
  return container
}

const pressEsc = () =>
  act(() => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

describe('Esc closes the markdown overlays', () => {
  it('image upload server dialog', () => {
    const onClose = vi.fn()
    mount(createElement(ImageHostDialog, { onClose, onSaved: () => {} }))
    pressEsc()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('graph view', () => {
    const onClose = vi.fn()
    mount(createElement(GraphView, { current: null, onClose, onOpen: () => {} }))
    pressEsc()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
