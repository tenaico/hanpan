/**
 * @vitest-environment jsdom
 */
import { act, createElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeApi, RecentEntry } from '../src/shared/home-api'
import { defaultHomeBoard, newCard, type BoardCard, type HomeBoard } from '../src/shared/home-board'
import { RecentCard } from '../src/renderer/src/home-board/RecentCard'
import { WidgetBody } from '../src/renderer/src/HomeWidgets'
import { LocaleProvider } from '../src/renderer/src/locale'

/**
 * The card bodies on the board (spec 7.6, 7.7): the recent files card and the
 * widget cards with their settings.
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let recents: ReturnType<typeof vi.fn>
let starred: ReturnType<typeof vi.fn>
let openPath: ReturnType<typeof vi.fn>
let recentEntries: RecentEntry[]
let starredEntries: RecentEntry[]

const entry = (name: string, starredFile = false): RecentEntry => ({
  path: `C:\\docs\\${name}`,
  name,
  ext: name.split('.').pop()!,
  mtimeMs: 0,
  sizeBytes: 1,
  starred: starredFile,
})

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  recentEntries = [entry('report.hwp'), entry('budget.xlsx')]
  starredEntries = [entry('plan.docx', true)]
  recents = vi.fn(async () => ({ entries: recentEntries, total: 12, totalAll: 12 }))
  starred = vi.fn(async () => ({ entries: starredEntries, total: 1, totalAll: 1 }))
  openPath = vi.fn(async () => undefined)
  window.aiOffice = { recents, starred, openPath } as unknown as HomeApi
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function render(element: ReactElement): Promise<void> {
  await act(async () => root.render(createElement(LocaleProvider, { initial: 'ko' }, element)))
  await flush()
}

const click = async (el: Element | null | undefined) => {
  expect(el).toBeTruthy()
  await act(async () => (el as HTMLElement).click())
  await flush()
}

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

describe('RecentCard', () => {
  const onShowAll = vi.fn()
  const renderCard = () =>
    render(
      createElement(RecentCard, {
        title: '이어서 하기',
        rows: 6,
        total: 12,
        reloadKey: 0,
        onShowAll,
        describe: (e: RecentEntry) => ({ location: `at ${e.name}`, modified: 'today' }),
        iconFor: (ext: string) => createElement('i', { 'data-icon': ext }),
      }),
    )

  it('asks for as many files as it has rows', async () => {
    await renderCard()
    expect(recents).toHaveBeenCalledWith({ limit: 6 })
  })

  it('shows each file with its name, place and time and opens it', async () => {
    await renderCard()
    const row = Array.from(host.querySelectorAll<HTMLElement>('[data-recent-file]')).find(
      (el) => el.dataset.recentFile === 'C:\\docs\\report.hwp',
    )!
    expect(row.querySelector('.hb-recent-name')?.textContent).toBe('report.hwp')
    expect(row.querySelector('.hb-recent-name')?.getAttribute('title')).toBe('report.hwp')
    expect(row.textContent).toContain('at report.hwp')
    expect(row.textContent).toContain('today')
    expect(row.querySelector('[data-icon="hwp"]')).not.toBeNull()
    await click(row)
    expect(openPath).toHaveBeenCalledWith('C:\\docs\\report.hwp')
  })

  it('offers the whole list with its count', async () => {
    await renderCard()
    const all = host.querySelector<HTMLElement>('[data-recent-all]')!
    expect(all.textContent).toBe('전체 12개')
    await click(all)
    expect(onShowAll).toHaveBeenCalled()
  })

  it('disables a file that is missing', async () => {
    recentEntries = [{ ...entry('gone.docx'), missing: true }]
    await renderCard()
    expect(host.querySelector<HTMLButtonElement>('[data-recent-file]')!.disabled).toBe(true)
  })

  it('says so when there are no recent files', async () => {
    recentEntries = []
    await renderCard()
    expect(host.textContent).toContain('최근 문서가 없습니다.')
  })
})

describe('WidgetBody', () => {
  let board: HomeBoard
  const update = (change: (prev: HomeBoard) => HomeBoard) => {
    board = change(board)
  }
  const cardOf = (id: string) => board.cards.find((c) => c.id === id)!
  const renderBody = (card: BoardCard, editing = false) =>
    render(
      createElement(WidgetBody, {
        card,
        update,
        apps: [],
        lang: 'ko',
        dateLocale: 'ko-KR',
        reloadKey: 0,
        editing,
        onEdit: () => undefined,
      }),
    )

  beforeEach(() => {
    board = defaultHomeBoard({ korean: true, koreanDocs: true, trend: true })
  })

  it('stores a memo when it loses focus', async () => {
    await renderBody(cardOf('memo'))
    const box = host.querySelector<HTMLTextAreaElement>('textarea')!
    await setValue(box, '회의 10시')
    await act(async () => {
      box.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    const memo = cardOf('memo')
    expect(memo.type === 'memo' && memo.text).toBe('회의 10시')
  })

  it('names the settings button after the card', async () => {
    await renderBody(cardOf('memo'))
    const name = host.querySelector('[data-widget-settings]')!.getAttribute('aria-label')!
    expect(name).toContain('빠른 메모')
    expect(name).toContain('설정')
  })

  it("offers the memo's sizes and takes the one picked", async () => {
    board = {
      ...board,
      cards: [
        ...board.cards.filter((c) => c.id !== 'memo'),
        { ...newCard('memo', 'memo'), w: 3, h: 2 },
      ],
    }
    await renderBody(cardOf('memo'), true)
    const select = host.querySelector<HTMLSelectElement>('select[name="size"]')!
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['3x2', '6x2'])
    await setValue(select, '6x2')
    expect([cardOf('memo').w, cardOf('memo').h]).toEqual([6, 2])
  })

  it('lists only starred files in favorites', async () => {
    await renderBody(cardOf('favorites'))
    expect(host.textContent).toContain('plan.docx')
    expect(host.querySelector('[data-fav-app]')).toBeNull()
  })

  it('does not mention pinning apps when favorites is empty', async () => {
    starredEntries = []
    await renderBody(cardOf('favorites'))
    expect(host.querySelector('.hw-empty')).not.toBeNull()
    expect(host.textContent).not.toContain('앱을 고정')
  })
})
