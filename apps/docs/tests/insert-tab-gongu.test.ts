// Hanpan: Insert → Gongu pictures sits next to Insert → Picture and opens the
// shared picker, which searches through the preload's Gongu calls.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { editorExtensions } from '../src/renderer/editor/extensions'
import { computeFormatState } from '../src/renderer/components/ribbon-format-state'
import { Ribbon } from '../src/renderer/components/Ribbon'
import { t } from '../src/renderer/i18n/locale'
import { ribbonProps } from './helpers/ribbon-props'

function makeEditor(): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: editorExtensions,
    content: {
      type: 'doc',
      content: [{ type: 'docParagraph', content: [{ type: 'text', text: 'hello world' }] }],
    },
  })
}

describe('Insert → Gongu pictures', () => {
  let editor: Editor
  let root: Root
  let container: HTMLElement
  const gonguSearch = vi.fn(async () => ({ ok: true, works: [], total: 0 }))

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    ;(window as unknown as { desktop: unknown }).desktop = {
      gonguSearch,
      gonguPicture: vi.fn(),
    }
    editor = makeEditor()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    editor.destroy()
    gonguSearch.mockClear()
    vi.unstubAllGlobals()
  })

  function insertTabButtons() {
    act(() => root.render(createElement(Ribbon, ribbonProps(editor, computeFormatState(editor)))))
    const insertTab = [...container.querySelectorAll<HTMLButtonElement>('.ribbon-tab')].find(
      (b) => b.textContent === t('ribbonTabInsert'),
    )!
    act(() => insertTab.click())
    return [...container.querySelectorAll<HTMLButtonElement>('button.rb-big')]
  }

  it('sits right after Picture and opens the picker', async () => {
    const buttons = insertTabButtons()
    const picture = buttons.findIndex((b) => b.textContent === t('ribbonPicture'))
    const gongu = buttons.findIndex((b) => b.dataset.action === 'insert-gongu')
    expect(picture).toBeGreaterThanOrEqual(0)
    expect(gongu).toBe(picture + 1)
    expect(buttons[gongu]!.disabled).toBe(false)

    act(() => buttons[gongu]!.click())
    const dialog = document.querySelector('[data-hanpan="gongu-picker"]')
    expect(dialog).not.toBeNull()

    const input = document.querySelector<HTMLInputElement>('[data-hanpan="gongu-query"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, '호랑이')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await act(async () => {
      input.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(gonguSearch).toHaveBeenCalledWith('호랑이', 1)

    act(() => document.querySelector<HTMLButtonElement>('[data-action="gongu-close"]')!.click())
    expect(document.querySelector('[data-hanpan="gongu-picker"]')).toBeNull()
  })
})
