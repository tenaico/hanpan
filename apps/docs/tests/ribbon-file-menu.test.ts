// The on-screen File menu offers the same commands as the tab bar's ☰ menu:
// open, save, save as, the exports and print (Hanpan 0.17 #6).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { editorExtensions } from '../src/renderer/editor/extensions'
import { computeFormatState } from '../src/renderer/components/ribbon-format-state'
import { Ribbon } from '../src/renderer/components/Ribbon'
import { LocaleProvider, setModuleLang, t } from '../src/renderer/i18n/locale'
import { ribbonProps } from './helpers/ribbon-props'

describe('ribbon File menu', () => {
  let editor: Editor
  let root: Root
  let container: HTMLElement

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    editor = new Editor({ element: document.createElement('div'), extensions: editorExtensions })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    ;(window as unknown as { desktop: unknown }).desktop = { onLanguageChanged: () => () => {} }
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    editor.destroy()
    setModuleLang('zh')
    vi.unstubAllGlobals()
  })

  function openMenu(overrides: Record<string, unknown>) {
    setModuleLang('ko')
    act(() =>
      root.render(
        createElement(LocaleProvider, {
          initial: 'ko',
          children: createElement(Ribbon, {
            ...ribbonProps(editor, computeFormatState(editor)),
            ...overrides,
          }),
        }),
      ),
    )
    const fileTab = container.querySelector<HTMLButtonElement>('.ribbon-tab-file')
    expect(fileTab).not.toBeNull()
    act(() => fileTab!.click())
    const menu = container.querySelector('.file-menu')
    expect(menu).not.toBeNull()
    return menu!
  }

  const item = (menu: Element, label: string) => {
    const button = [...menu.querySelectorAll('button')].find((b) =>
      b.textContent?.startsWith(label),
    )
    expect(button, `menu item "${label}"`).toBeDefined()
    return button!
  }

  it('lists open, save, save as, the four exports and print in that order', () => {
    const menu = openMenu({})
    const labels = [...menu.querySelectorAll('button')].map((b) =>
      (b.firstChild?.textContent ?? '').trim(),
    )
    expect(labels).toEqual([
      t('ribbonOpen'),
      t('ribbonSave'),
      t('ribbonSaveAs').trim(),
      t('ribbonExportPdf'),
      t('ribbonExportHtml'),
      t('ribbonExportMarkdown'),
      t('ribbonExportImages'),
      t('ribbonPrint'),
    ])
    expect(t('ribbonPrint')).toBe('인쇄…')
  })

  it('runs the existing export and print handlers and closes the menu', () => {
    const onExport = vi.fn()
    const onPrint = vi.fn()
    const cases: Array<[string, unknown]> = [
      ['ribbonExportPdf', 'pdf'],
      ['ribbonExportHtml', 'html'],
      ['ribbonExportMarkdown', 'markdown'],
      ['ribbonExportImages', 'images'],
    ]
    for (const [key, format] of cases) {
      const menu = openMenu({ onExport, onPrint })
      act(() => item(menu, t(key as 'ribbonExportPdf')).click())
      expect(onExport).toHaveBeenLastCalledWith(format)
      expect(container.querySelector('.file-menu')).toBeNull()
    }
    const menu = openMenu({ onExport, onPrint })
    act(() => item(menu, t('ribbonPrint')).click())
    expect(onPrint).toHaveBeenCalledOnce()
  })

  it('disables the exports and print without a document', () => {
    const menu = openMenu({ hasDoc: false })
    for (const key of ['ribbonExportPdf', 'ribbonExportImages', 'ribbonPrint'] as const)
      expect(item(menu, t(key)).disabled).toBe(true)
    expect(item(menu, t('ribbonOpen')).disabled).toBe(false)
  })
})
