// 0.17 v2 #11: References tab messages show inside the app (toast), never as a
// system alert titled "한판"; the Zotero group sits at the end of the tab.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { editorExtensions } from '../src/renderer/editor/extensions'
import { computeFormatState } from '../src/renderer/components/ribbon-format-state'
import { Ribbon } from '../src/renderer/components/Ribbon'
import { setToastEmitter, type ToastData } from '../src/renderer/components/toast-bus'
import { ribbonProps } from './helpers/ribbon-props'

describe('References tab notices', () => {
  let editor: Editor
  let root: Root
  let container: HTMLElement
  let toasts: ToastData[]
  let alertSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    editor = new Editor({ element: document.createElement('div'), extensions: editorExtensions })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    toasts = []
    setToastEmitter((toast) => toasts.push(toast))
    alertSpy = vi.fn()
    window.alert = alertSpy as unknown as typeof window.alert
    Object.assign(window, {
      desktop: {
        ...(window as unknown as { desktop?: object }).desktop,
        zoteroCommand: async () => ({
          ok: false,
          error: 'refused',
          errorCode: 'connection-refused',
        }),
      },
    })
    act(() => root.render(createElement(Ribbon, ribbonProps(editor, computeFormatState(editor)))))
    // tab order: (file) home insert draw design layout references …
    const refs = container.querySelectorAll<HTMLButtonElement>(
      '.ribbon-tab:not(.ribbon-tab-file)',
    )[5]!
    act(() => refs.click())
  })

  afterEach(() => {
    setToastEmitter(null)
    act(() => root.unmount())
    container.remove()
    editor.destroy()
  })

  const groups = () => [...container.querySelectorAll<HTMLElement>('.ribbon-body .ribbon-group')]

  it('puts the Zotero group last', () => {
    const all = groups()
    expect(all.length).toBeGreaterThan(2)
    expect(all[all.length - 1]!.textContent).toContain('Zotero')
    expect(all[0]!.textContent).not.toContain('Zotero')
  })

  it('a Zotero connection failure is an in-app notice, not an alert', async () => {
    const zoteroGroup = groups()[groups().length - 1]!
    await act(async () => {
      zoteroGroup.querySelector<HTMLButtonElement>('.rb-big')!.click()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(alertSpy).not.toHaveBeenCalled()
    expect(toasts).toHaveLength(1)
  })

  it('Table of Contents with no headings is an in-app notice, not an alert', () => {
    const toc = groups()[0]!.querySelector<HTMLButtonElement>('.rb-big')!
    act(() => toc.click())
    expect(alertSpy).not.toHaveBeenCalled()
    expect(toasts).toHaveLength(1)
  })
})
