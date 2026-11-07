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
import { DEFAULT_HOME_LAYOUT, type HomeLayout } from '../src/shared/home-layout'
import type { SubscriptionApi } from '../src/shared/subscription-api'
import { Home } from '../src/renderer/src/Home'
import { LocaleProvider } from '../src/renderer/src/locale'
import type { SubscriptionConnection } from '../src/renderer/src/subscription-client'

/**
 * 0.17 위젯 및 인터페이스 사용자화: Home shows a widget row (favorites, a quick
 * memo, recent documents) and a "홈 꾸미기" panel that shows/hides and reorders
 * the widgets and the app cards, picks the theme and goes back to the defaults.
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let stored: unknown
let setHomeLayout: ReturnType<typeof vi.fn>
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
  setHomeLayout = vi.fn(async (layout: HomeLayout) => {
    stored = layout
    return layout
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
    getHomeLayout: async () => stored,
    setHomeLayout,
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

const widgetEls = () => Array.from(host.querySelectorAll<HTMLElement>('[data-widget]'))
const widgetTypes = () => widgetEls().map((el) => el.dataset.widgetType)
const last = () => widgetEls().at(-1)!
const layoutNow = () => stored as HomeLayout
const panel = () => host.querySelector<HTMLElement>('[data-home-custom="panel"]')
const click = async (el: Element | null | undefined) => {
  expect(el).toBeTruthy()
  await act(async () => (el as HTMLElement).click())
  await flush()
}
const openPanel = () => click(host.querySelector('[data-home-custom="open"]'))
const addWidget = async (type: string) => {
  await click(host.querySelector('[data-home-widgets="add"]'))
  await click(host.querySelector(`[data-widget-gallery] [data-add-type="${type}"]`))
}
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
const secondaryKeys = () =>
  Array.from(host.querySelectorAll<HTMLElement>('.hp-secondary [data-new]'))
    .map((el) => el.dataset.new)
    .filter((key) => key !== 'pdf-tools' && key !== 'md-convert')

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

describe('home widgets', () => {
  it('shows recent documents, favorites and a quick memo by default', async () => {
    await renderHome()
    expect(widgetTypes()).toEqual(DEFAULT_HOME_LAYOUT.widgets.map((w) => w.type))
    expect(widgetTypes().sort()).toEqual(['favorites', 'memo', 'recent'])
    expect(host.querySelector('[data-widget-type="recent"]')!.textContent).toContain('report.hwp')
  })

  it('falls back to the defaults when the stored layout is corrupt', async () => {
    stored = { widgets: 12, hiddenCards: 'pdf' }
    await renderHome()
    expect(widgetTypes().sort()).toEqual(['favorites', 'memo', 'recent'])
    expect(host.querySelector('.hp-cards [data-new="pdf"]')).not.toBeNull()
  })

  it('lists starred files and pinned apps in the favorites widget', async () => {
    stored = { ...DEFAULT_HOME_LAYOUT, pinnedApps: ['xmind'] }
    await renderHome()
    const fav = host.querySelector('[data-widget-type="favorites"]')!
    expect(fav.textContent).toContain('plan.docx')
    expect(fav.querySelector('[data-fav-app="xmind"]')).not.toBeNull()
    await click(fav.querySelector('[data-fav-file]'))
    expect(openPath).toHaveBeenCalledWith('C:\\docs\\plan.docx')
  })

  it('saves a memo when it loses focus', async () => {
    await renderHome()
    const box = host.querySelector<HTMLTextAreaElement>('[data-widget-type="memo"] textarea')!
    await setValue(box, '회의 10시')
    await act(async () => {
      box.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    await flush()
    const memo = layoutNow().widgets.find((w) => w.type === 'memo')!
    expect(memo.type === 'memo' && memo.text).toBe('회의 10시')
  })

  it('adds several memos from the gallery, each with its own title', async () => {
    await renderHome()
    await addWidget('memo')
    await setValue(last().querySelector('[data-widget-form] input[name="title"]'), '장보기')
    await click(last().querySelector('[data-widget-done]'))
    await addWidget('memo')
    const memos = layoutNow().widgets.filter((w) => w.type === 'memo')
    expect(memos).toHaveLength(3)
    expect(memos.map((m) => m.title)).toContain('장보기')
    expect(host.textContent).toContain('장보기')
  })

  it('adds a clock that shows the time', async () => {
    await renderHome()
    await addWidget('clock')
    expect(last().dataset.widgetType).toBe('clock')
    expect(last().querySelector('[data-clock-time]')!.textContent).toMatch(/\d{1,2}:\d{2}/)
  })

  it('adds a link shortcut and opens it through main', async () => {
    await renderHome()
    await addWidget('shortcut')
    const form = () => last().querySelector('[data-widget-form]')!
    expect(form()).not.toBeNull()
    await setValue(form().querySelector('select[name="kind"]'), 'link')
    await setValue(form().querySelector('input[name="title"]'), '사내 포털')
    await setValue(form().querySelector('input[name="link"]'), 'https://intra.example.com')
    await click(form().querySelector('[data-widget-done]'))
    await click(last().querySelector('[data-shortcut-open]'))
    expect(openWidgetTarget).toHaveBeenCalledWith({
      kind: 'link',
      value: 'https://intra.example.com/',
    })
    expect(last().textContent).toContain('사내 포털')
  })

  it('refuses a link that is not http(s)', async () => {
    await renderHome()
    await addWidget('shortcut')
    const form = () => last().querySelector('[data-widget-form]')!
    await setValue(form().querySelector('select[name="kind"]'), 'link')
    await setValue(form().querySelector('input[name="link"]'), 'javascript:alert(1)')
    await click(form().querySelector('[data-widget-done]'))
    const shortcut = layoutNow().widgets.at(-1)!
    expect(shortcut.type === 'shortcut' && shortcut.target).toBeNull()
    expect(last().querySelector('[data-widget-form] [role="alert"]')).not.toBeNull()
  })

  it('picks a file for a shortcut, and opens an app shortcut in place', async () => {
    await renderHome()
    await addWidget('shortcut')
    const form = () => last().querySelector('[data-widget-form]')!
    await setValue(form().querySelector('select[name="kind"]'), 'file')
    await click(form().querySelector('[data-pick]'))
    expect(pickWidgetTarget).toHaveBeenCalledWith('file')
    await click(form().querySelector('[data-widget-done]'))
    await click(last().querySelector('[data-shortcut-open]'))
    expect(openWidgetTarget).toHaveBeenCalledWith({ kind: 'file', value: 'C:\\docs\\plan.docx' })

    await addWidget('shortcut')
    await setValue(form().querySelector('select[name="kind"]'), 'app')
    await setValue(form().querySelector('select[name="app"]'), 'xmind')
    await click(form().querySelector('[data-widget-done]'))
    await click(last().querySelector('[data-shortcut-open]'))
    expect(newMindmap).toHaveBeenCalled()
  })

  it('shows the newest files of a chosen folder', async () => {
    await renderHome()
    await addWidget('folder')
    const form = () => last().querySelector('[data-widget-form]')!
    await setValue(form().querySelector('select[name="folder"]'), 'C:\\work')
    await click(form().querySelector('[data-widget-done]'))
    expect(listFolder).toHaveBeenCalledWith('C:\\work')
    expect(last().textContent).toContain('minutes.hwp')
    await click(last().querySelector('[data-folder-file]'))
    expect(openPath).toHaveBeenCalledWith('C:\\work\\minutes.hwp')
  })

  it('removes a widget with its X button', async () => {
    await renderHome()
    await click(host.querySelector('[data-widget-type="recent"] [data-widget-remove]'))
    expect(widgetTypes()).not.toContain('recent')
    expect(layoutNow().widgets.map((w) => w.type)).not.toContain('recent')
  })

  it('makes a widget wide from its settings', async () => {
    await renderHome()
    const memo = () => host.querySelector<HTMLElement>('[data-widget-type="memo"]')!
    await click(memo().querySelector('[data-widget-settings]'))
    await setValue(memo().querySelector('[data-widget-form] select[name="size"]'), 'wide')
    expect(memo().dataset.size).toBe('wide')
  })

  it('reorders widgets with the move buttons and by dragging', async () => {
    await renderHome()
    const before = widgetTypes()
    await click(widgetEls()[1]!.querySelector('[data-widget-settings]'))
    await click(widgetEls()[1]!.querySelector('[data-widget-form] [data-move="up"]'))
    expect(widgetTypes().slice(0, 2)).toEqual([before[1], before[0]])

    const [a, , c] = widgetEls()
    await act(async () => {
      a!.dispatchEvent(new Event('dragstart', { bubbles: true }))
      c!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
      c!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    })
    await flush()
    expect(widgetTypes().at(-1)).toBe(before[1])
  })
})

describe('0.17 review v2: widget settings say what to do next', () => {
  it('asks to pick a file below, not to press the settings button, while setting a shortcut', async () => {
    await renderHome()
    await addWidget('shortcut')
    const form = () => last().querySelector('[data-widget-form]')!
    await setValue(form().querySelector('select[name="kind"]'), 'file')
    expect(form().textContent).not.toContain('설정 단추')
    expect(form().querySelector('[data-pick-hint]')?.textContent).toContain('파일')
    // the pick button sits on its own row under the hint, so it never leaves the card
    expect(form().querySelector('[data-pick-row] [data-pick="file"]')).not.toBeNull()
    await setValue(form().querySelector('select[name="kind"]'), 'folder')
    expect(form().querySelector('[data-pick-hint]')?.textContent).toContain('폴더')
  })

  it('puts the current name in an empty title field and opens settings from an unset widget', async () => {
    await renderHome()
    await addWidget('shortcut')
    await click(last().querySelector('[data-widget-done]'))
    expect(last().dataset.unset).toBe('true')
    // the empty state is itself the way in: no hunting for a hover-only gear
    await click(last().querySelector('[data-widget-setup]'))
    const title = last().querySelector<HTMLInputElement>('[data-widget-form] input[name="title"]')!
    expect(title.value).toBe('')
    expect(title.placeholder).toBe('바로가기')
  })

  it('names each gear after its widget, so it is not one more plain "설정" next to the app Settings', async () => {
    await renderHome()
    const gears = Array.from(host.querySelectorAll<HTMLElement>('[data-widget-settings]'))
    expect(gears).toHaveLength(3)
    const names = gears.map((gear) => gear.getAttribute('aria-label'))
    expect(names).not.toContain('설정')
    expect(new Set(names).size).toBe(gears.length)
    const memo = host.querySelector('[data-widget-type="memo"] [data-widget-settings]')!
    expect(memo.getAttribute('aria-label')).toContain('빠른 메모')
    expect(memo.getAttribute('aria-label')).toContain('설정')
  })
})

describe('0.17 review v2: 홈 꾸미기 guards', () => {
  it('asks before going back to the defaults', async () => {
    stored = { ...DEFAULT_HOME_LAYOUT, widgets: [{ id: 'c1', type: 'clock', size: 'wide' }] }
    await renderHome()
    await openPanel()
    await click(panel()!.querySelector('[data-home-custom="reset"]'))
    expect(widgetTypes()).toEqual(['clock'])
    await click(panel()!.querySelector('[data-home-custom="reset-confirm"]'))
    expect(stored).toEqual(DEFAULT_HOME_LAYOUT)
  })

  it('turns off moving the first item up and the last item down', async () => {
    await renderHome()
    await openPanel()
    const rows = Array.from(panel()!.querySelectorAll<HTMLElement>('[data-custom-widget]'))
    const up = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('[data-move="up"]')!
    const down = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('[data-move="down"]')!
    expect(up(rows[0]!).disabled).toBe(true)
    expect(down(rows[0]!).disabled).toBe(false)
    expect(down(rows.at(-1)!).disabled).toBe(true)
  })
})

describe('홈 꾸미기 panel', () => {
  it('removes and reorders widgets, and opens the gallery', async () => {
    await renderHome()
    await openPanel()
    const ids = DEFAULT_HOME_LAYOUT.widgets.map((w) => w.id)
    await click(panel()!.querySelector(`[data-custom-widget="${ids[1]}"] [data-move="up"]`))
    expect(layoutNow().widgets[0]!.id).toBe(ids[1])
    await click(panel()!.querySelector(`[data-custom-widget="${ids[2]}"] [data-widget-remove]`))
    expect(layoutNow().widgets).toHaveLength(2)
    await click(panel()!.querySelector('[data-home-widgets="add"]'))
    expect(host.querySelector('[data-widget-gallery]')).not.toBeNull()
  })

  it('hides an app card and reorders the others', async () => {
    await renderHome()
    await openPanel()
    await click(panel()!.querySelector('[data-custom-card="pdf"] input[type="checkbox"]'))
    expect(host.querySelector('.hp-cards [data-new="pdf"]')).toBeNull()
    const order = secondaryKeys()
    await click(panel()!.querySelector(`[data-custom-card="${order[1]}"] [data-move="up"]`))
    expect(secondaryKeys().slice(0, 2)).toEqual([order[1], order[0]])
  })

  it('pins an app into favorites', async () => {
    await renderHome()
    await openPanel()
    await click(panel()!.querySelector('[data-custom-card="html"] [data-pin]'))
    expect(
      host.querySelector('[data-widget-type="favorites"] [data-fav-app="html"]'),
    ).not.toBeNull()
  })

  it('switches the theme through the existing setting', async () => {
    await renderHome()
    await openPanel()
    await click(panel()!.querySelector('input[name="home-theme"][value="dark"]'))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('goes back to the defaults', async () => {
    stored = {
      ...DEFAULT_HOME_LAYOUT,
      widgets: [{ id: 'c1', type: 'clock', size: 'wide' }],
      hiddenCards: ['pdf'],
    }
    await renderHome()
    expect(widgetTypes()).toEqual(['clock'])
    await openPanel()
    await click(panel()!.querySelector('[data-home-custom="reset"]'))
    await click(panel()!.querySelector('[data-home-custom="reset-confirm"]'))
    expect(stored).toEqual(DEFAULT_HOME_LAYOUT)
    expect(setTheme).toHaveBeenCalledWith('system')
    expect(widgetTypes().sort()).toEqual(['favorites', 'memo', 'recent'])
    expect(host.querySelector('.hp-cards [data-new="pdf"]')).not.toBeNull()
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
    const pills = Array.from(host.querySelectorAll<HTMLButtonElement>('.filter-pill'))
    await click(pills.at(-1))
    expect(host.textContent).toContain('이 종류의 최근 파일이 없습니다.')
    expect(host.textContent).not.toContain('새로 만들거나 파일을 열어')
  })
})

describe('0.17 review v2: quiet row actions say they happened', () => {
  it('confirms "remove from list" with a short line', async () => {
    await renderHome()
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
