/**
 * @vitest-environment jsdom
 */
// 0.17 리뷰 #6: 홈 대화상자(한판 양식, 마크다운 변환기, 위젯 추가, 홈 꾸미기)는 열리면
// 포커스가 대화상자 안으로 들어가고, 포커스가 어디 있든 Esc로 닫힌다.
import { act, createElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplatePicker, type HanpanApi } from '../src/renderer/src/hanpan/TemplatePicker'
import {
  MarkdownConverter,
  type MarkdownConverterApi,
} from '../src/renderer/src/hanpan/MarkdownConverter'
import { HomeCustomizePanel, WidgetGallery } from '../src/renderer/src/HomeWidgets'
import { AllApps } from '../src/renderer/src/home-board/AllApps'
import { LocaleProvider } from '../src/renderer/src/locale'
import { DEFAULT_HOME_LAYOUT } from '../src/shared/home-layout'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  window.hanpanApi = {
    templates: vi.fn(async () => []),
    myForms: vi.fn(async () => []),
    myFormSources: vi.fn(async () => []),
  } as unknown as HanpanApi
  ;(window as unknown as { aiOffice: unknown }).aiOffice = { getTheme: async () => 'system' }
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  delete window.hanpanApi
})

async function show(el: ReactElement): Promise<void> {
  await act(async () => {
    root.render(createElement(LocaleProvider, { initial: 'ko' }, el))
  })
  await act(async () => {})
}

function pressEscapeOnBody(): void {
  act(() => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
}

const converterApi: MarkdownConverterApi = {
  mdFolder: async () => 'C:/x',
  mdPickFile: async () => null,
  mdPickFolder: async () => null,
  mdConvert: async () => ({ ok: false, error: 'x' }),
  mdShowFolder: async () => 'C:/x',
}

const cases: [string, (onClose: () => void) => ReactElement][] = [
  ['template picker', (onClose) => createElement(TemplatePicker, { onClose })],
  [
    'markdown converter',
    (onClose) => createElement(MarkdownConverter, { api: converterApi, onClose }),
  ],
  [
    'widget gallery',
    (onClose) =>
      createElement(WidgetGallery, {
        layout: DEFAULT_HOME_LAYOUT,
        lang: 'ko',
        onPick: () => undefined,
        onClose,
      }),
  ],
  [
    'home customize panel',
    (onClose) =>
      createElement(HomeCustomizePanel, {
        layout: DEFAULT_HOME_LAYOUT,
        update: () => undefined,
        groups: [],
        cards: [],
        lang: 'ko',
        themeLabels: { title: '테마', light: '밝게', dark: '어둡게', system: '시스템' },
        onOpenGallery: () => undefined,
        onClose,
      }),
  ],
  [
    'all apps',
    (onClose) =>
      createElement(AllApps, {
        apps: [],
        pinned: [],
        recent: [],
        newKeys: new Set<string>(),
        onLaunch: () => undefined,
        onTogglePin: () => undefined,
        onClose,
      }),
  ],
]

describe.each(cases)('%s', (_name, make) => {
  it('takes focus when it opens', async () => {
    await show(make(vi.fn()))
    const dialog = host.querySelector('[role="dialog"]')!
    expect(dialog).toBeTruthy()
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('closes with Esc even when focus fell back to the page body', async () => {
    const onClose = vi.fn()
    await show(make(onClose))
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.activeElement).toBe(document.body)
    pressEscapeOnBody()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
