/**
 * @vitest-environment jsdom
 */
import { act, createElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildHomeApps, type HomeAppsDeps } from '../src/renderer/src/home-board/home-apps'
import { AppsCard } from '../src/renderer/src/home-board/AppsCard'
import { AllApps } from '../src/renderer/src/home-board/AllApps'
import type { HomeAppCard } from '../src/renderer/src/HomeWidgets'
import { LocaleProvider } from '../src/renderer/src/locale'
import { APP_KEYS, DEFAULT_PINS_KOREAN, type AppKey } from '../src/shared/home-apps'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function show(el: ReactElement): Promise<void> {
  await act(async () => {
    root.render(createElement(LocaleProvider, { initial: 'ko' }, el))
  })
}

function deps(over: Partial<HomeAppsDeps> = {}): HomeAppsDeps {
  const actions = Object.fromEntries(APP_KEYS.map((key) => [key, vi.fn()])) as unknown as Record<
    AppKey,
    () => unknown
  >
  return {
    t: (key) => `t:${key}`,
    koreanDocs: true,
    offers: { templates: true, design: true, converter: true },
    iconFor: (key) => createElement('img', { 'data-icon': key }),
    actions,
    onLaunch: vi.fn(),
    ...over,
  }
}

/** one card per app; the title is the key and the line is "sub-<key>" */
function cards(keys: readonly AppKey[] = APP_KEYS): HomeAppCard[] {
  return keys.map((key) => ({
    key,
    title: `title-${key}`,
    sub: `sub-${key}`,
    icon: createElement('img', { src: 'x.svg' }),
    action: vi.fn(),
  }))
}

describe('buildHomeApps', () => {
  it('lists all 15 apps in APP_KEYS order with the Korean features on', () => {
    const apps = buildHomeApps(deps())
    expect(apps.map((a) => a.key)).toEqual([...APP_KEYS])
  })

  it('names each app and gives it its one-line description', () => {
    const apps = buildHomeApps(deps())
    const docx = apps.find((a) => a.key === 'docx')!
    expect(docx.title).toBe('t:newDoc')
    expect(docx.sub).toBe('t:hbAppDocxSub')
    const design = apps.find((a) => a.key === 'design')!
    expect(design.title).toBe('t:hpDesignCard')
    expect(design.sub).toBe('t:hpDesignCardSub')
  })

  it('drops hwp, templates and design with the Korean features off', () => {
    const keys = buildHomeApps(deps({ koreanDocs: false })).map((a) => a.key)
    expect(keys).toHaveLength(12)
    expect(keys).not.toContain('hwp')
    expect(keys).not.toContain('templates')
    expect(keys).not.toContain('design')
  })

  it('drops md-convert when the build has no converter', () => {
    const keys = buildHomeApps(
      deps({ offers: { templates: true, design: true, converter: false } }),
    ).map((a) => a.key)
    expect(keys).not.toContain('md-convert')
    expect(keys).toHaveLength(14)
  })

  it('drops templates and design when the build does not offer them', () => {
    const keys = buildHomeApps(
      deps({ offers: { templates: false, design: false, converter: true } }),
    ).map((a) => a.key)
    expect(keys).not.toContain('templates')
    expect(keys).not.toContain('design')
    expect(keys).toContain('hwp')
  })

  it('records the launch before it starts the app', () => {
    const order: string[] = []
    const d = deps({ onLaunch: (key) => order.push(`launch:${key}`) })
    d.actions.xmind = () => order.push('action:xmind')
    const apps = buildHomeApps(d)
    apps[0].action()
    expect(order).toEqual(['launch:xmind', 'action:xmind'])
  })
})

function appsCard(over: Partial<Parameters<typeof AppsCard>[0]> = {}): ReactElement {
  return createElement(AppsCard, {
    apps: cards(),
    pinned: DEFAULT_PINS_KOREAN,
    size: { w: 5, h: 3 },
    unseen: 0,
    customizing: false,
    onOpenAll: vi.fn(),
    ...over,
  })
}

describe('AppsCard', () => {
  it('shows the pinned apps in pin order and All apps in the next slot', async () => {
    await show(appsCard())
    const tiles = [...host.querySelectorAll<HTMLElement>('.quick-card')]
    expect(tiles.map((el) => el.dataset.new)).toEqual([...DEFAULT_PINS_KOREAN])
    const slot12 = host.querySelector('[data-app-slot="11"]')!
    expect(slot12.querySelector('[data-all-apps-open]')).toBeTruthy()
    expect(host.querySelectorAll('[data-app-slot]')).toHaveLength(12)
  })

  it('titles the card with the New card name', async () => {
    await show(appsCard())
    expect(host.querySelector('section h2.hb-card-title')?.textContent).toBe('새로 만들기')
    const grid = host.querySelector<HTMLElement>('div.hb-apps')!
    expect(grid.style.getPropertyValue('--cols')).toBe('4')
  })

  it('marks the tiles the e2e tests rely on and keeps out the AI chip', async () => {
    await show(appsCard())
    expect(host.querySelector('[data-new="xmind"] .hp-start-badge')).toBeTruthy()
    expect(host.querySelector<HTMLElement>('[data-new="templates"]')!.dataset.hanpan).toBe(
      'templates',
    )
    expect(host.querySelector<HTMLElement>('[data-new="design"]')!.dataset.hanpan).toBe('design')
    expect(host.querySelector<HTMLElement>('[data-new="docx"]')!.dataset.hanpan).toBeUndefined()
    expect(host.querySelector('.ai-chip')).toBeNull()
    expect(host.querySelector<HTMLElement>('[data-new="docx"]')!.dataset.tip).toBe('sub-docx')
    expect(host.querySelector<HTMLImageElement>('[data-new="docx"] img')!.draggable).toBe(false)
  })

  it('starts the app when a tile is pressed', async () => {
    const apps = cards()
    await show(appsCard({ apps }))
    act(() => host.querySelector<HTMLElement>('[data-new="pptx"]')!.click())
    expect(apps.find((a) => a.key === 'pptx')!.action).toHaveBeenCalledTimes(1)
  })

  it('opens All apps from its tile', async () => {
    const onOpenAll = vi.fn()
    await show(appsCard({ onOpenAll }))
    act(() => host.querySelector<HTMLElement>('[data-all-apps-open]')!.click())
    expect(onOpenAll).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[data-all-apps-open]')!.textContent).toContain('모든 앱')
  })

  it('shows +N on All apps when the pins overflow a 5x2 card', async () => {
    await show(appsCard({ size: { w: 5, h: 2 } }))
    expect(host.querySelectorAll('.quick-card')).toHaveLength(7)
    expect(host.querySelector('[data-all-apps-more]')!.textContent).toBe('+4')
  })

  it('has no +N when every pin fits', async () => {
    await show(appsCard())
    expect(host.querySelector('[data-all-apps-more]')).toBeNull()
  })

  it('marks All apps as new only when an app is unseen', async () => {
    await show(appsCard({ unseen: 2 }))
    expect(host.querySelector('[data-all-apps-new]')!.textContent).toBe('새 앱')
    await show(appsCard({ unseen: 0 }))
    expect(host.querySelector('[data-all-apps-new]')).toBeNull()
  })

  it('leaves out pins that are not available', async () => {
    await show(appsCard({ apps: cards(APP_KEYS.filter((k) => k !== 'hwp')) }))
    const keys = [...host.querySelectorAll<HTMLElement>('.quick-card')].map((el) => el.dataset.new)
    expect(keys).not.toContain('hwp')
    expect(keys).toHaveLength(10)
  })
})

function allApps(over: Partial<Parameters<typeof AllApps>[0]> = {}): ReactElement {
  return createElement(AllApps, {
    apps: cards(),
    pinned: ['xmind', 'docx'],
    recent: ['md', 'hwp', 'pdf', 'xlsx'],
    newKeys: new Set<string>(),
    onLaunch: vi.fn(),
    onTogglePin: vi.fn(),
    onClose: vi.fn(),
    ...over,
  })
}

function search(value: string): void {
  const input = host.querySelector<HTMLInputElement>('[data-all-apps-search]')!
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('AllApps', () => {
  it('focuses the search box when it opens', async () => {
    await show(allApps())
    expect(document.activeElement).toBe(host.querySelector('[data-all-apps-search]'))
    expect(host.querySelector('[data-all-apps-search]')!.getAttribute('placeholder')).toBe(
      '앱 이름이나 하는 일로 찾기',
    )
  })

  it('shows the first three available recent apps, in order, without data-new', async () => {
    await show(allApps({ apps: cards(APP_KEYS.filter((k) => k !== 'hwp')) }))
    const row = [...host.querySelectorAll<HTMLElement>('[data-all-apps-recent] [data-recent-app]')]
    expect(row.map((el) => el.dataset.recentApp)).toEqual(['md', 'pdf', 'xlsx'])
    expect(row.every((el) => !el.hasAttribute('data-new'))).toBe(true)
  })

  it('lists the apps in their groups with data-new and without quick-card', async () => {
    await show(allApps())
    const docs = host.querySelector('section[data-app-group="docs"]')!
    expect(docs.textContent).toContain('문서 만들기')
    expect(host.querySelectorAll('[data-all-apps] [data-new="md"]')).toHaveLength(1)
    expect(host.querySelectorAll('[data-all-apps] [data-new]')).toHaveLength(APP_KEYS.length)
    expect(host.querySelector('[data-all-apps] .quick-card')).toBeNull()
    expect(host.querySelector('section[data-app-group="file"] [data-new="open"]')).toBeTruthy()
  })

  it('filters by name and description and hides the recent row while searching', async () => {
    await show(allApps())
    search('SUB-PPTX')
    expect(host.querySelector('[data-all-apps-recent]')).toBeNull()
    const keys = [...host.querySelectorAll<HTMLElement>('[data-all-apps] [data-new]')].map(
      (el) => el.dataset.new,
    )
    expect(keys).toEqual(['pptx'])
    search('title-photo')
    expect(
      [...host.querySelectorAll<HTMLElement>('[data-all-apps] [data-new]')].map(
        (el) => el.dataset.new,
      ),
    ).toEqual(['photo'])
    expect(host.querySelector('section[data-app-group="docs"]')).toBeNull()
  })

  it('says so when nothing matches', async () => {
    await show(allApps())
    search('zzz')
    expect(host.querySelector('[data-all-apps]')!.textContent).toContain('맞는 앱이 없습니다')
  })

  it('launches an item, then closes', async () => {
    const order: string[] = []
    await show(
      allApps({
        onLaunch: (key) => order.push(`launch:${key}`),
        onClose: () => order.push('close'),
      }),
    )
    act(() => host.querySelector<HTMLElement>('[data-all-apps] [data-new="xlsx"]')!.click())
    expect(order).toEqual(['launch:xlsx', 'close'])
  })

  it('launches a recent app, then closes', async () => {
    const order: string[] = []
    await show(
      allApps({
        onLaunch: (key) => order.push(`launch:${key}`),
        onClose: () => order.push('close'),
      }),
    )
    act(() => host.querySelector<HTMLElement>('[data-recent-app="hwp"]')!.click())
    expect(order).toEqual(['launch:hwp', 'close'])
  })

  it('shows the pin state and toggles a pin', async () => {
    const onTogglePin = vi.fn()
    await show(allApps({ onTogglePin }))
    const docx = host.querySelector<HTMLElement>('[data-app-pin="docx"]')!
    const md = host.querySelector<HTMLElement>('[data-app-pin="md"]')!
    expect(docx.getAttribute('aria-pressed')).toBe('true')
    expect(docx.textContent).toBe('홈에서 빼기')
    expect(md.getAttribute('aria-pressed')).toBe('false')
    expect(md.textContent).toBe('홈에 고정')
    act(() => md.click())
    expect(onTogglePin).toHaveBeenCalledWith('md')
  })

  it('marks only the new apps', async () => {
    await show(allApps({ newKeys: new Set(['design']) }))
    const marks = [...host.querySelectorAll('[data-app-new]')]
    expect(marks).toHaveLength(1)
    expect(marks[0].closest('[data-new]')!.getAttribute('data-new')).toBe('design')
    expect(marks[0].textContent).toBe('새 앱')
  })

  it('closes with Esc', async () => {
    const onClose = vi.fn()
    await show(allApps({ onClose }))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
