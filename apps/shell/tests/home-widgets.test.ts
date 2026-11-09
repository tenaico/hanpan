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
import type { HomeApi, RecentEntry } from '../src/shared/home-api'
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
 * 0.19 홈 보드: Home shows its cards on a board (start, new, continue, a quick
 * memo, favorites by default) and the 0.17 widgets as cards of their own. The
 * file lists sit behind the sidebar's "최근 사용" and "즐겨찾기".
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let stored: unknown
let setHomeBoard: ReturnType<typeof vi.fn>
let setTheme: ReturnType<typeof vi.fn>
let openPath: ReturnType<typeof vi.fn>
let openWidgetTarget: ReturnType<typeof vi.fn>
let pickWidgetTarget: ReturnType<typeof vi.fn>
let listFolder: ReturnType<typeof vi.fn>
let newMindmap: ReturnType<typeof vi.fn>

const MAP: SubscriptionStatusMap = {
  'claude-code': { provider: 'claude-code', meteredAccepted: false, state: 'not-installed' },
  codex: { provider: 'codex', meteredAccepted: false, state: 'not-installed' },
}

const entry = (name: string, starred = false): RecentEntry => ({
  path: `C:\\docs\\${name}`,
  name,
  ext: name.split('.').pop()!,
  mtimeMs: 0,
  sizeBytes: 1,
  starred,
})

function installHome(): void {
  setHomeBoard = vi.fn(async (board: HomeBoard) => {
    stored = board
    return board
  })
  setTheme = vi.fn(async () => undefined)
  openPath = vi.fn(async () => undefined)
  openWidgetTarget = vi.fn(async () => true)
  pickWidgetTarget = vi.fn(async () => 'C:\\docs\\plan.docx')
  newMindmap = vi.fn(async () => undefined)
  listFolder = vi.fn(async (dir: string) => ({
    dir,
    folders: [],
    files: [{ ...entry('minutes.hwp'), path: `${dir}\\minutes.hwp` }],
  }))
  const known: Record<string, unknown> = {
    recents: async () => ({ entries: [entry('report.hwp')], total: 1, totalAll: 1 }),
    starred: async () => ({ entries: [entry('plan.docx', true)], total: 1, totalAll: 1 }),
    starredGroups: async () => [],
    folderRoots: async () => [
      { path: 'C:\\work', name: 'work', usable: true, readable: true, removable: true },
    ],
    listFolder,
    openWidgetTarget,
    pickWidgetTarget,
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
    getHomeBoard: async () => ({ board: stored ?? null, trendAvailable: false }),
    setHomeBoard,
    openPath,
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

const cards = () => Array.from(host.querySelectorAll<HTMLElement>('[data-card]'))
const cardTypes = () => cards().map((el) => el.dataset.cardType)
const cardEl = (id: string) => host.querySelector<HTMLElement>(`[data-card="${id}"]`)!
const boardNow = () => stored as HomeBoard
const click = async (el: Element | null | undefined) => {
  expect(el).toBeTruthy()
  await act(async () => (el as HTMLElement).click())
  await flush()
}
/** the default Korean board with `extra` cards after it */
function boardWith(...extra: Array<[BoardCardType, string]>): HomeBoard {
  const board = defaultHomeBoard({ korean: true, koreanDocs: true, trend: false })
  return { ...board, cards: [...board.cards, ...extra.map(([type, id]) => newCard(type, id))] }
}
const openSettings = (id: string) => click(cardEl(id).querySelector('[data-widget-settings]'))
const form = (id: string) => cardEl(id).querySelector('[data-widget-form]')!
/** the sidebar's file lists */
const goTo = (label: '최근 사용' | '즐겨찾기') =>
  click(
    Array.from(host.querySelectorAll<HTMLElement>('.sidebar-nav .nav-item')).find(
      (el) => el.querySelector('.nav-label')?.textContent === label,
    ),
  )
/** set a form control's value the way typing or picking would */
async function setValue(el: Element | null, value: string): Promise<void> {
  expect(el).toBeTruthy()
  const proto = Object.getPrototypeOf(el) as object
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  await act(async () => {
    setter.call(el, value)
    const type = el instanceof HTMLSelectElement ? 'change' : 'input'
    el!.dispatchEvent(new Event(type, { bubbles: true }))
  })
  await flush()
}
beforeEach(() => {
  Element.prototype.scrollTo = () => undefined
  stored = undefined
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

describe('home board', () => {
  it('shows start, new, continue, a quick memo and favorites by default', async () => {
    await renderHome()
    expect(cardTypes()).toEqual(['start', 'apps', 'recent', 'memo', 'favorites'])
    expect(host.querySelector('[data-card-type="recent"]')!.textContent).toContain('report.hwp')
  })

  it('falls back to the defaults when the stored board is corrupt', async () => {
    stored = { v: 1, cards: 12 }
    await renderHome()
    expect(cardTypes()).toEqual(['start', 'apps', 'recent', 'memo', 'favorites'])
    expect(host.querySelector('.quick-card[data-new="pdf"]')).not.toBeNull()
  })

  it('lists starred files in the favorites card', async () => {
    await renderHome()
    const fav = host.querySelector('[data-card-type="favorites"]')!
    expect(fav.textContent).toContain('plan.docx')
    expect(fav.querySelector('[data-fav-app]')).toBeNull()
    await click(fav.querySelector('[data-fav-file]'))
    expect(openPath).toHaveBeenCalledWith('C:\\docs\\plan.docx')
  })

  it('saves a memo when it loses focus', async () => {
    await renderHome()
    const box = host.querySelector<HTMLTextAreaElement>('[data-card-type="memo"] textarea')!
    await setValue(box, '회의 10시')
    await act(async () => {
      box.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    await flush()
    const memo = boardNow().cards.find((c) => c.type === 'memo')!
    expect(memo.type === 'memo' && memo.text).toBe('회의 10시')
  })

  it('keeps several memos, each with its own title', async () => {
    stored = boardWith(['memo', 'memo-2'])
    await renderHome()
    await openSettings('memo-2')
    await setValue(form('memo-2').querySelector('input[name="title"]'), '장보기')
    await click(form('memo-2').querySelector('[data-widget-done]'))
    const memos = boardNow().cards.filter((c) => c.type === 'memo')
    expect(memos).toHaveLength(2)
    expect(memos.map((m) => m.title)).toContain('장보기')
    expect(cardEl('memo-2').textContent).toContain('장보기')
  })

  it('shows the time on a clock card', async () => {
    stored = boardWith(['clock', 'clock'])
    await renderHome()
    expect(cardEl('clock').dataset.cardType).toBe('clock')
    expect(cardEl('clock').querySelector('[data-clock-time]')!.textContent).toMatch(/\d{1,2}:\d{2}/)
  })

  it('sets up a link shortcut and opens it through main', async () => {
    stored = boardWith(['shortcut', 'shortcut'])
    await renderHome()
    await openSettings('shortcut')
    await setValue(form('shortcut').querySelector('select[name="kind"]'), 'link')
    await setValue(form('shortcut').querySelector('input[name="title"]'), '사내 포털')
    await setValue(
      form('shortcut').querySelector('input[name="link"]'),
      'https://intra.example.com',
    )
    await click(form('shortcut').querySelector('[data-widget-done]'))
    await click(cardEl('shortcut').querySelector('[data-shortcut-open]'))
    expect(openWidgetTarget).toHaveBeenCalledWith({
      kind: 'link',
      value: 'https://intra.example.com/',
    })
    expect(cardEl('shortcut').textContent).toContain('사내 포털')
  })

  it('refuses a link that is not http(s)', async () => {
    stored = boardWith(['shortcut', 'shortcut'])
    await renderHome()
    await openSettings('shortcut')
    await setValue(form('shortcut').querySelector('select[name="kind"]'), 'link')
    await setValue(form('shortcut').querySelector('input[name="link"]'), 'javascript:alert(1)')
    await click(form('shortcut').querySelector('[data-widget-done]'))
    const shortcut = boardNow().cards.find((c) => c.id === 'shortcut')!
    expect(shortcut.type === 'shortcut' && shortcut.target).toBeNull()
    expect(form('shortcut').querySelector('[role="alert"]')).not.toBeNull()
  })

  it('picks a file for a shortcut, and opens an app shortcut in place', async () => {
    stored = boardWith(['shortcut', 'shortcut'], ['shortcut', 'shortcut-2'])
    await renderHome()
    await openSettings('shortcut')
    await setValue(form('shortcut').querySelector('select[name="kind"]'), 'file')
    await click(form('shortcut').querySelector('[data-pick]'))
    expect(pickWidgetTarget).toHaveBeenCalledWith('file')
    await click(form('shortcut').querySelector('[data-widget-done]'))
    await click(cardEl('shortcut').querySelector('[data-shortcut-open]'))
    expect(openWidgetTarget).toHaveBeenCalledWith({ kind: 'file', value: 'C:\\docs\\plan.docx' })

    await openSettings('shortcut-2')
    await setValue(form('shortcut-2').querySelector('select[name="kind"]'), 'app')
    await setValue(form('shortcut-2').querySelector('select[name="app"]'), 'xmind')
    await click(form('shortcut-2').querySelector('[data-widget-done]'))
    await click(cardEl('shortcut-2').querySelector('[data-shortcut-open]'))
    expect(newMindmap).toHaveBeenCalled()
    // an app started from a shortcut card counts as started from Home (plan R18)
    expect(boardNow().recentApps[0]).toBe('xmind')
  })

  it('shows the newest files of a chosen folder', async () => {
    stored = boardWith(['folder', 'folder'])
    await renderHome()
    await openSettings('folder')
    await setValue(form('folder').querySelector('select[name="folder"]'), 'C:\\work')
    await click(form('folder').querySelector('[data-widget-done]'))
    expect(listFolder).toHaveBeenCalledWith('C:\\work')
    expect(cardEl('folder').textContent).toContain('minutes.hwp')
    await click(cardEl('folder').querySelector('[data-folder-file]'))
    expect(openPath).toHaveBeenCalledWith('C:\\work\\minutes.hwp')
  })

  it('changes a card size from its settings', async () => {
    await renderHome()
    await openSettings('memo')
    await setValue(form('memo').querySelector('select[name="size"]'), '3x2')
    expect(cardEl('memo').dataset.size).toBe('3x2')
    expect(cardEl('memo').style.getPropertyValue('--span')).toBe('3')
  })

  it('moves a card with the move buttons', async () => {
    await renderHome()
    await openSettings('memo')
    await click(form('memo').querySelector('[data-move="up"]'))
    expect(cardTypes()).toEqual(['start', 'apps', 'memo', 'recent', 'favorites'])
  })
})

describe('0.17 review v2: widget settings say what to do next', () => {
  it('asks to pick a file below, not to press the settings button, while setting a shortcut', async () => {
    stored = boardWith(['shortcut', 'shortcut'])
    await renderHome()
    await openSettings('shortcut')
    await setValue(form('shortcut').querySelector('select[name="kind"]'), 'file')
    expect(form('shortcut').textContent).not.toContain('설정 단추')
    expect(form('shortcut').querySelector('[data-pick-hint]')?.textContent).toContain('파일')
    // the pick button sits on its own row under the hint, so it never leaves the card
    expect(form('shortcut').querySelector('[data-pick-row] [data-pick="file"]')).not.toBeNull()
    await setValue(form('shortcut').querySelector('select[name="kind"]'), 'folder')
    expect(form('shortcut').querySelector('[data-pick-hint]')?.textContent).toContain('폴더')
  })

  it('puts the current name in an empty title field and opens settings from an unset card', async () => {
    stored = boardWith(['shortcut', 'shortcut'])
    await renderHome()
    // the empty state is itself the way in: no hunting for a hover-only gear
    await click(cardEl('shortcut').querySelector('[data-widget-setup]'))
    const title = form('shortcut').querySelector<HTMLInputElement>('input[name="title"]')!
    expect(title.value).toBe('')
    expect(title.placeholder).toBe('바로가기')
  })

  it('names each gear after its card, so it is not one more plain "설정" next to the app Settings', async () => {
    await renderHome()
    const gears = Array.from(host.querySelectorAll<HTMLElement>('[data-widget-settings]'))
    expect(gears).toHaveLength(2)
    const names = gears.map((gear) => gear.getAttribute('aria-label'))
    expect(names).not.toContain('설정')
    expect(new Set(names).size).toBe(gears.length)
    const memo = host.querySelector('[data-card-type="memo"] [data-widget-settings]')!
    expect(memo.getAttribute('aria-label')).toContain('빠른 메모')
    expect(memo.getAttribute('aria-label')).toContain('설정')
  })
})

describe('0.17 review v2: deleting a file that is open in a tab', () => {
  it('says the tab closes first, and the button says so too', async () => {
    window.aiOffice = new Proxy(window.aiOffice as object, {
      get: (target, name: string) =>
        name === 'openTabPaths'
          ? async (paths: string[]) => paths
          : (target as Record<string, unknown>)[name],
    }) as typeof window.aiOffice
    await renderHome()
    await goTo('최근 사용')
    await click(host.querySelector('.recent-row .more-btn, .more-btn'))
    await click(host.querySelector('.row-menu button.danger'))
    const dialog = host.querySelector('[role="dialog"]')!
    expect(dialog.querySelector('[data-delete-open-tabs]')?.textContent).toContain('report.hwp')
    expect(dialog.querySelector('.btn-danger')?.textContent).toBe('탭 닫고 삭제')
  })
})

describe('0.17 review v2: the search box settings button', () => {
  it('says what it is and opens Settings without the subscription notice on top', async () => {
    await act(async () => {
      root.render(
        createElement(
          LocaleProvider,
          { initial: 'ko' },
          createElement(Home, {
            connection,
            aiSettings: defaultAiSettings(),
            noticeDue: true,
            onNoticeAcknowledge: vi.fn(),
          }),
        ),
      )
    })
    await flush()
    const button = host.querySelector<HTMLButtonElement>('[data-search-settings]')!
    expect(button.title).toBe('검색 설정')
    await click(button)
    expect(host.querySelector('.first-notice')).toBeNull()
  })
})

describe('coordinator: the subscription notice does not cover the shell from Settings', () => {
  it('opens Settings without the notice over the screen and shows it in the AI section', async () => {
    const acknowledge = vi.fn()
    await act(async () => {
      root.render(
        createElement(
          LocaleProvider,
          { initial: 'ko' },
          createElement(Home, {
            connection,
            aiSettings: defaultAiSettings(),
            noticeDue: true,
            onNoticeAcknowledge: acknowledge,
          }),
        ),
      )
    })
    await flush()
    await click(host.querySelector('.account-btn'))
    expect(host.querySelector('.first-notice-overlay')).toBeNull()
    const aiNav = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'AI',
    )
    await click(aiNav)
    const inline = host.querySelector('[data-ai-notice-due]')
    expect(inline).not.toBeNull()
    // closing Settings does not bring the overlay up afterwards either
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    await flush()
    expect(host.querySelector('.first-notice-overlay')).toBeNull()
  })
})

describe('0.17 review v2: an empty filter on a non-empty recent list', () => {
  it('says this type has no recent files, not that there are none at all', async () => {
    window.aiOffice = new Proxy(window.aiOffice as object, {
      get: (target, name: string) =>
        name === 'recents'
          ? async (q: { ext?: string }) =>
              q?.ext
                ? { entries: [], total: 0, totalAll: 5 }
                : { entries: [entry('report.hwp')], total: 1, totalAll: 5 }
          : (target as Record<string, unknown>)[name],
    }) as typeof window.aiOffice
    await renderHome()
    await goTo('최근 사용')
    const pills = Array.from(host.querySelectorAll<HTMLButtonElement>('.filter-pill'))
    await click(pills.at(-1))
    expect(host.textContent).toContain('이 종류의 최근 파일이 없습니다.')
    expect(host.textContent).not.toContain('새로 만들거나 파일을 열어')
  })
})

describe('0.17 review v2: quiet row actions say they happened', () => {
  it('confirms "remove from list" with a short line', async () => {
    await renderHome()
    await goTo('최근 사용')
    await click(host.querySelector('.more-btn'))
    const remove = Array.from(host.querySelectorAll<HTMLButtonElement>('.row-menu button')).find(
      (b) => b.textContent?.includes('목록에서'),
    )
    await click(remove)
    expect(host.querySelector('[data-home-toast]')?.textContent).toContain('목록에서 뺐습니다')
  })
})

describe('0.17 review v2: starting a mind map with an empty box', () => {
  it('says to type a topic first', async () => {
    const newMap = vi.fn(async () => ({ ok: true }))
    window.hanpanApi = { ...window.hanpanApi!, newMap } as typeof window.hanpanApi
    await renderHome()
    await click(host.querySelector('[data-hanpan="start-go"]'))
    expect(host.querySelector('[data-hanpan="start-note"]')?.textContent).toContain('먼저 주제를')
    expect(host.querySelector('[data-hanpan="start-topic"]')?.getAttribute('aria-invalid')).toBe(
      'true',
    )
    expect(newMap).not.toHaveBeenCalled()
  })
})

describe('0.17 review v2: a sidebar folder says which folder it is', () => {
  it('names the folder and leads back to Recent', async () => {
    await renderHome()
    const folder = Array.from(host.querySelectorAll<HTMLElement>('.folder-panel *')).find(
      (el) => el.textContent?.trim() === 'work' && el.closest('button, [role="treeitem"]'),
    )
    await click(folder?.closest('button, [role="treeitem"]'))
    expect(host.querySelector('[data-folder-heading]')?.textContent).toContain('work')
    await click(host.querySelector('.folder-back-btn'))
    expect(host.querySelector('[data-folder-heading]')).toBeNull()
  })
})
