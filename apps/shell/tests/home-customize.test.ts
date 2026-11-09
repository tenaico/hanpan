/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAiSettings } from '@genoffice/ai-provider'
import type { SubscriptionStatusMap } from '@genoffice/ai-provider/browser'
import { applyKoreanDocFeatures } from '@genoffice/ui'
import type { HomeApi } from '../src/shared/home-api'
import {
  defaultHomeBoard,
  newCard,
  type BoardCardType,
  type HomeBoard,
} from '../src/shared/home-board'
import type { SubscriptionApi } from '../src/shared/subscription-api'
import { Home } from '../src/renderer/src/Home'
import { LocaleProvider } from '../src/renderer/src/locale'
import type { SubscriptionConnection } from '../src/renderer/src/subscription-client'

/**
 * 0.19 홈 꾸미기 (spec 7.8): the head row's "홈 꾸미기" turns customizing on;
 * the bar under it adds cards, puts the default layout back and opens the
 * list view; each card gets a menu with its sizes and, when it may go, an ×.
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let stored: unknown
let trendAvailable: boolean
let setHomeBoard: ReturnType<typeof vi.fn>
let setTheme: ReturnType<typeof vi.fn>
let newMindmap: ReturnType<typeof vi.fn>

const MAP: SubscriptionStatusMap = {
  'claude-code': { provider: 'claude-code', meteredAccepted: false, state: 'not-installed' },
  codex: { provider: 'codex', meteredAccepted: false, state: 'not-installed' },
}

function installHome(): void {
  setHomeBoard = vi.fn(async (board: HomeBoard) => {
    stored = board
    return board
  })
  setTheme = vi.fn(async () => undefined)
  newMindmap = vi.fn(async () => undefined)
  const known: Record<string, unknown> = {
    recents: async () => ({ entries: [], total: 0, totalAll: 0 }),
    starred: async () => ({ entries: [], total: 0, totalAll: 0 }),
    starredGroups: async () => [],
    folderRoots: async () => [],
    newMindmap,
    kbList: async () => [],
    getAiSettings: async () => defaultAiSettings(),
    aiGetSettings: async () => defaultAiSettings(),
    getAiProviders: () => [],
    getAiMediaProviders: () => [],
    getAiSearchProviders: () => [],
    getTheme: async () => 'system',
    setTheme,
    getDocumentTheme: async () => 'follow',
    getDefaultSaveDir: async () => '',
    getAutoSaveDefault: async () => ({ on: false, updatedAt: 0 }),
    getAiPanelPrefs: async () => ({ fontSize: 'default', customFontSize: 14, spellcheck: true }),
    getUpdateChannel: async () => 'stable',
    getAppVersion: async () => '1.0.0',
    getCodexModels: async () => ({ models: [], defaultModel: '' }),
    getHomeBoard: async () => ({ board: stored ?? null, trendAvailable }),
    setHomeBoard,
  }
  window.aiOffice = new Proxy(known, {
    get: (target, name: string) =>
      target[name] ?? (name.startsWith('on') ? () => () => undefined : async () => null),
  }) as unknown as HomeApi
  window.aiOfficeSubscription = {
    statuses: async () => MAP,
    recheck: async () => MAP,
    login: async () => ({ ok: true }),
    install: async () => ({ ok: true }),
    setMeteredAccepted: async () => ({ ok: true, statuses: MAP }),
    codexImageAvailable: async () => false,
    onChanged: () => () => undefined,
    openInstallHelp: async () => undefined,
  } as SubscriptionApi
  window.hanpanApi = {
    templates: async () => [],
    openTemplate: async () => ({ ok: true }),
    openDesign: async () => undefined,
  }
}

const connection: SubscriptionConnection = {
  statuses: MAP,
  busy: false,
  failed: {},
  codexImageAvailable: false,
  install: vi.fn(),
  login: vi.fn(),
  switchAccount: vi.fn(),
  logout: vi.fn(),
  recheck: vi.fn(),
  refresh: vi.fn(),
  acceptMetered: vi.fn(async () => undefined),
  openInstallHelp: vi.fn(),
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function renderHome(): Promise<void> {
  await act(async () => {
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'ko' },
        createElement(Home, {
          connection,
          aiSettings: defaultAiSettings(),
          noticeDue: false,
          onNoticeAcknowledge: vi.fn(),
        }),
      ),
    )
  })
  await flush()
}

const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector<T>(selector)
const $$ = (selector: string) => Array.from(host.querySelectorAll<HTMLElement>(selector))
const cardIds = () => $$('[data-home-board] [data-card]').map((el) => el.dataset.card)
const cardTypes = () => $$('[data-home-board] [data-card]').map((el) => el.dataset.cardType)
const cardEl = (id: string) => $(`[data-card="${id}"]`)!
const tileKeys = () => $$('.quick-card[data-new]').map((el) => el.dataset.new)
const boardNow = () => stored as HomeBoard
const click = async (el: Element | null | undefined) => {
  expect(el).toBeTruthy()
  await act(async () => (el as HTMLElement).click())
  await flush()
}
const press = async (key: string, target: EventTarget = document.body) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
  await flush()
}
const customize = () => click($('[data-home-custom="open"]'))
/** the default Korean board (no trend card) with `extra` cards after it */
function boardWith(...extra: Array<[BoardCardType, string]>): HomeBoard {
  const board = defaultHomeBoard({ korean: true, koreanDocs: true, trend: false })
  return { ...board, cards: [...board.cards, ...extra.map(([type, id]) => newCard(type, id))] }
}
/** the board as last stored, or the default one before any store */
const boardNowOr = (): HomeBoard => (stored as HomeBoard | undefined) ?? boardWith()

beforeEach(() => {
  Element.prototype.scrollTo = () => undefined
  stored = undefined
  trendAvailable = false
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  installHome()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  delete window.aiOfficeSubscription
  delete window.hanpanApi
  applyKoreanDocFeatures(null)
})

describe('customizing', () => {
  it('shows the hint and four buttons, and ends on a second press, Esc or Done', async () => {
    await renderHome()
    expect($('[data-customize-bar]')).toBeNull()
    await customize()
    const bar = $('[data-customize-bar]')!
    expect(bar.getAttribute('role')).toBe('toolbar')
    expect(bar.textContent).toContain(
      '카드를 끌어서 옮기고, 오른쪽 아래 모서리를 끌어 크기를 바꿉니다.',
    )
    expect($$('[data-customize-bar] [data-customize]').map((el) => el.dataset.customize)).toEqual([
      'add',
      'reset',
      'list',
      'done',
    ])
    expect($('[data-home-custom="open"]')!.getAttribute('aria-pressed')).toBe('true')
    expect($('[data-home-board]')!.dataset.customizing).toBe('true')
    await customize()
    expect($('[data-customize-bar]')).toBeNull()
    await customize()
    await press('Escape')
    expect($('[data-customize-bar]')).toBeNull()
    await customize()
    await click($('[data-customize="done"]'))
    expect($('[data-customize-bar]')).toBeNull()
  })

  it('offers × on the cards that may go, and takes one off', async () => {
    await renderHome()
    await customize()
    expect(cardEl('start').querySelector('[data-card-remove]')).toBeNull()
    expect(cardEl('apps').querySelector('[data-card-remove]')).toBeNull()
    const remove = cardEl('memo').querySelector('[data-card-remove]')!
    expect(remove.getAttribute('aria-label')).toBe('빠른 메모 빼기')
    await click(remove)
    expect(cardIds()).not.toContain('memo')
    expect(boardNow().cards.map((c) => c.id)).not.toContain('memo')
  })

  it('changes a size from the card menu', async () => {
    await renderHome()
    await customize()
    await click(cardEl('memo').querySelector('[data-card-menu]'))
    const sizes = Array.from(cardEl('memo').querySelectorAll<HTMLElement>('[data-card-size]'))
    expect(sizes.map((el) => el.dataset.cardSize)).toEqual(['3x2', '6x2'])
    expect(
      cardEl('memo').querySelector('[data-card-size="6x2"]')!.getAttribute('aria-checked'),
    ).toBe('true')
    expect(cardEl('memo').querySelector('[data-card-menu-settings]')).not.toBeNull()
    await click(cardEl('memo').querySelector('[data-card-size="3x2"]'))
    expect(cardEl('memo').dataset.size).toBe('3x2')
    expect(cardEl('memo').querySelector('[role="menu"]')).toBeNull()
  })

  it('closes the card menu with Esc and stays customizing', async () => {
    await renderHome()
    await customize()
    await click(cardEl('memo').querySelector('[data-card-menu]'))
    expect(cardEl('memo').querySelector('[role="menu"]')).not.toBeNull()
    await press('Escape')
    expect(cardEl('memo').querySelector('[role="menu"]')).toBeNull()
    expect($('[data-customize-bar]')).not.toBeNull()
  })

  it('makes the card bodies inert except the new card (R16)', async () => {
    await renderHome()
    await customize()
    expect(cardEl('memo').querySelector('.hb-card-body')!.hasAttribute('inert')).toBe(true)
    expect(cardEl('apps').querySelector('.hb-card-body')!.hasAttribute('inert')).toBe(false)
    await click($('[data-customize="done"]'))
    expect(cardEl('memo').querySelector('.hb-card-body')!.hasAttribute('inert')).toBe(false)
  })
})

describe('customizing the new card', () => {
  it('takes an app off with its ×', async () => {
    await renderHome()
    expect($('[data-app-unpin]')).toBeNull()
    await customize()
    const unpin = $('[data-app-unpin="photo"]')!
    expect(unpin.getAttribute('aria-label')).toContain('홈에서 빼기')
    await click(unpin)
    expect($('.quick-card[data-new="photo"]')).toBeNull()
    expect(boardNow().pinned).not.toContain('photo')
  })

  it('fills blank slots with "앱 추가" only while customizing, which opens All apps', async () => {
    stored = { ...boardWith(), pinned: ['xmind', 'pptx'] }
    await renderHome()
    expect($('[data-app-slot-add]')).toBeNull()
    await customize()
    const add = $$('[data-app-slot-add]')
    expect(add.length).toBeGreaterThan(0)
    expect(add[0]!.textContent).toBe('앱 추가')
    await click(add[0])
    expect($('[data-all-apps]')).not.toBeNull()
  })

  it('does not start an app from a tile while customizing', async () => {
    await renderHome()
    await customize()
    await click($('.quick-card[data-new="xmind"]'))
    expect(newMindmap).not.toHaveBeenCalled()
  })
})

describe('adding cards', () => {
  it("greys out a single card that is there and opens a new memo's settings", async () => {
    trendAvailable = true
    await renderHome()
    await customize()
    await click($('[data-customize="add"]'))
    const gallery = $('[data-widget-gallery]')!
    expect(
      Array.from(gallery.querySelectorAll<HTMLElement>('[data-add-type]')).map(
        (el) => el.dataset.addType,
      ),
    ).toEqual(['shortcut', 'memo', 'folder', 'clock', 'recent', 'favorites', 'trend'])
    expect(gallery.querySelector<HTMLButtonElement>('[data-add-type="trend"]')!.disabled).toBe(true)
    expect(gallery.querySelector('[data-add-type="trend"]')!.textContent).toContain('이미 있음')
    await click(gallery.querySelector('[data-add-type="memo"]'))
    expect($('[data-widget-gallery]')).toBeNull()
    const cards = $$('[data-home-board] [data-card]')
    const last = cards[cards.length - 1]!
    expect(last.dataset.cardType).toBe('memo')
    expect(last.querySelector('[data-widget-form]')).not.toBeNull()
    // the card being set up takes input while customizing
    expect(last.querySelector('.hb-card-body')!.hasAttribute('inert')).toBe(false)
  })

  it('offers no trend card without a forecast address (R29)', async () => {
    await renderHome()
    await customize()
    await click($('[data-customize="add"]'))
    expect($('[data-widget-gallery]')).not.toBeNull()
    expect($('[data-widget-gallery] [data-add-type="trend"]')).toBeNull()
  })
})

describe('the default layout', () => {
  it('asks first, and puts the default cards back in front without touching the theme', async () => {
    stored = {
      ...boardWith(),
      cards: [
        newCard('clock', 'clock-a'),
        ...boardWith()
          .cards.filter((c) => c.type !== 'recent')
          .reverse(),
      ],
    }
    await renderHome()
    const before = cardIds()
    await customize()
    await click($('[data-customize="reset"]'))
    const confirm = $('[data-reset-confirm]')!
    expect(confirm.getAttribute('role')).toBe('dialog')
    await click(confirm.querySelector('[data-reset="no"]'))
    expect($('[data-reset-confirm]')).toBeNull()
    expect(cardIds()).toEqual(before)
    await click($('[data-customize="reset"]'))
    await click($('[data-reset-confirm] [data-reset="yes"]'))
    expect(cardTypes()).toEqual(['start', 'apps', 'recent', 'memo', 'favorites', 'clock'])
    expect(setTheme).not.toHaveBeenCalled()
  })
})

describe('the list view', () => {
  it('moves cards, hides apps and picks the theme', async () => {
    await renderHome()
    await customize()
    await click($('[data-customize="list"]'))
    const panel = $('[data-home-custom="panel"]')!
    const rows = () => Array.from(panel.querySelectorAll<HTMLElement>('[data-custom-board]'))
    expect(rows().map((el) => el.dataset.customBoard)).toEqual(cardIds())
    expect(rows()[0]!.querySelector<HTMLButtonElement>('[data-move="up"]')!.disabled).toBe(true)
    await click(rows()[1]!.querySelector('[data-move="up"]'))
    expect(cardIds().slice(0, 2)).toEqual(['apps', 'start'])
    const size = panel.querySelector<HTMLSelectElement>(
      '[data-custom-board="memo"] select[name="size"]',
    )!
    expect(Array.from(size.options).map((o) => o.value)).toEqual(['3x2', '6x2'])
    expect(panel.querySelector('[data-custom-board="start"] [data-card-remove]')).toBeNull()
    expect(panel.querySelector('[data-custom-board="memo"] [data-card-remove]')).not.toBeNull()
    await click(panel.querySelector('[data-custom-card="html"] input[type="checkbox"]'))
    expect($('.quick-card[data-new="html"]')).toBeNull()
    await click(panel.querySelector('input[name="home-theme"][value="dark"]'))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('lists the pinned apps first and moves them', async () => {
    await renderHome()
    await customize()
    await click($('[data-customize="list"]'))
    const panel = $('[data-home-custom="panel"]')!
    const keys = Array.from(panel.querySelectorAll<HTMLElement>('[data-custom-card]')).map(
      (el) => el.dataset.customCard,
    )
    const pinned = boardNowOr().pinned
    expect(keys.slice(0, pinned.length)).toEqual(pinned)
    await click(panel.querySelector('[data-custom-card="hwp"] [data-move="up"]'))
    expect(tileKeys().slice(0, 2)).toEqual(['hwp', 'xmind'])
    // an app that is not pinned has no move buttons
    expect(panel.querySelector('[data-custom-card="md"] [data-move]')).toBeNull()
  })
})
