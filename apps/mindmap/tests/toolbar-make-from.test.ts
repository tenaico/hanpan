/**
 * The toolbar's "make another document from this one" (spec 5.2, 8.2): one
 * line-icon button in its own group after export, before the AI entry, named
 * in the app's language, asking the shell through the preload.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Lang } from '@genoffice/i18n'
import { Toolbar, type ToolbarProps } from '../src/renderer/components/Toolbar'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { MindmapApi } from '../src/shared/ipc'

let container: HTMLElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  ;(window as unknown as { mindmapApi: Partial<MindmapApi> }).mindmapApi = {
    onLanguageChanged: () => () => {},
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

function props(onMakeFromDocument: () => void, disabled = false): ToolbarProps {
  const none = () => {}
  return {
    disabled,
    dirty: false,
    statusText: '',
    canUndo: false,
    canRedo: false,
    autoSave: false,
    hasTopic: false,
    hasPicture: false,
    findOpen: false,
    hiddenParts: [],
    layout: 'right',
    layoutExact: true,
    pickingRelationship: false,
    themeOpen: false,
    noteOpen: false,
    iconsOpen: false,
    aiOpen: false,
    onSave: none,
    onSaveAs: none,
    onUndo: none,
    onRedo: none,
    onToggleAutoSave: none,
    onAddChild: none,
    onAddSibling: none,
    onRelationship: none,
    onSummary: none,
    onBoundary: none,
    style: {
      style: {},
      themeColors: [],
      painting: false,
      onStyle: none,
      onToggle: none,
      onFontStep: none,
      onPainter: none,
      onClear: none,
    },
    onNote: none,
    onLabel: none,
    onLink: none,
    onLayout: none,
    onToggleTheme: none,
    onFoldAll: none,
    onUnfoldAll: none,
    onZoomIn: none,
    onZoomOut: none,
    onZoomFit: none,
    onToggleAi: none,
    onExport: none,
    onFind: none,
    onDelete: none,
    onPicture: none,
    onIcons: none,
    onSort: none,
    onPresent: none,
    onFoldLevel: none,
    onToggleHiddenPart: none,
    onZoomReset: none,
    onMakeFromDocument,
    mapSaved: true,
    onOpen: none,
    onPrint: none,
  }
}

async function render(lang: Lang, p: ToolbarProps): Promise<HTMLButtonElement> {
  await act(async () => {
    root.render(
      createElement(LocaleProvider, { initial: lang, children: createElement(Toolbar, p) }),
    )
  })
  const button = container.querySelector<HTMLButtonElement>('[data-action="make-from-document"]')
  if (!button) throw new Error('no make-from-document button')
  return button
}

describe('the make-from-document button', () => {
  it('sits in its own group between export and the AI entry, as a line icon', async () => {
    const button = await render(
      'en',
      props(() => {}),
    )
    const tools = container.querySelector('.mm-tools')!
    const order = [...tools.querySelectorAll('[data-action]')].map((b) =>
      b.getAttribute('data-action'),
    )
    expect(order.indexOf('make-from-document')).toBe(order.indexOf('ai') - 1)
    expect(order.indexOf('make-from-document')).toBeGreaterThan(order.indexOf('zoom-fit'))
    const group = button.closest('.ribbon-group')!
    expect(group.previousElementSibling?.className).toBe('rb-sep')
    const svg = button.querySelector('svg')!
    expect(svg.getAttribute('stroke-width')).toBe('1.5')
    expect(svg.getAttribute('fill')).toBe('none')
  })

  it('is named in the app language and calls the handler', async () => {
    const asked = vi.fn()
    const button = await render('ko', props(asked))
    expect(button.getAttribute('aria-label')).toBe('이 문서로 다른 문서 만들기')
    button.click()
    expect(asked).toHaveBeenCalledTimes(1)
  })

  it('reads in English as written', async () => {
    const button = await render(
      'en',
      props(() => {}),
    )
    expect(button.getAttribute('aria-label')).toBe('Make Another Document from This')
  })

  it('carries its name as text beside the icon, not only as a tooltip', async () => {
    const button = await render(
      'ko',
      props(() => {}),
    )
    expect(button.textContent).toBe('다른 문서 만들기')
  })

  it('on a map never saved, says to save first instead of opening a window that cannot be used', async () => {
    const asked = vi.fn()
    const button = await render('ko', { ...props(asked), mapSaved: false })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.dataset.tip).toBe(
      '먼저 지도를 저장하세요. 저장한 지도로 다른 문서를 만들 수 있습니다.',
    )
    // still pressable, so the reason is told; the handler decides what pressing does
    button.click()
    expect(asked).toHaveBeenCalledTimes(1)
  })

  it('is off while the map is not ready', async () => {
    const button = await render(
      'en',
      props(() => {}, true),
    )
    expect(button.disabled).toBe(true)
  })
})

describe('the File menu in the toolbar', () => {
  it('comes first in the tab row and reaches open, export and print', async () => {
    const onOpen = vi.fn()
    const onPrint = vi.fn()
    const onExport = vi.fn()
    await render('ko', { ...props(() => {}), onOpen, onPrint, onExport })
    const tabs = container.querySelector('.ribbon-tabs')!
    expect(tabs.firstElementChild?.querySelector('[data-action="file-menu"]')).not.toBeNull()
    const pick = async (id: string) => {
      await act(async () => {
        container.querySelector<HTMLButtonElement>('[data-action="file-menu"]')!.click()
      })
      await act(async () => {
        container.querySelector<HTMLButtonElement>(`[data-file="${id}"]`)!.click()
      })
    }
    await pick('open')
    await pick('export-pdf')
    await pick('print')
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onExport).toHaveBeenCalledWith('pdf')
    expect(onPrint).toHaveBeenCalledTimes(1)
  })

  it('shows the shortcut of each item that has one, as the slide editor does', async () => {
    await render(
      'ko',
      props(() => {}),
    )
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-action="file-menu"]')!.click()
    })
    const kbd = (id: string) =>
      container.querySelector(`[data-file="${id}"] .mm-file-kbd`)?.textContent ?? null
    expect(kbd('open')).toBe('Ctrl+O')
    expect(kbd('save')).toBe('Ctrl+S')
    expect(kbd('save-as')).toBe('Ctrl+Shift+S')
    expect(kbd('print')).toBe('Ctrl+P')
    expect(kbd('export-png')).toBeNull()
    expect(container.querySelector('[data-file="export-png"]')!.textContent).toBe(
      '이미지로 내보내기…',
    )
  })
})

describe('the ribbon tab names', () => {
  it('say what the tabs hold: layout and theme under Design, the look of a topic under Format; the layout menu is named', async () => {
    await render(
      'ko',
      props(() => {}),
    )
    const name = (tab: string) => container.querySelector(`[data-ribbon-tab="${tab}"]`)!.textContent
    expect(name('format')).toBe('디자인')
    expect(name('style')).toBe('서식')
    expect(container.querySelector('.mm-layout .mm-layout-label')!.textContent).toBe('배치')
  })
})
