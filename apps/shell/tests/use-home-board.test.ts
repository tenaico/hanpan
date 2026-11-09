/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  defaultCardTypes,
  defaultHomeBoard,
  type BoardContext,
  type HomeBoard,
  type HomeBoardSource,
} from '../src/shared/home-board'
import { useHomeBoard } from '../src/renderer/src/home-board/useHomeBoard'

/**
 * Home's board in the renderer (spec 7.10, plan R4): nothing is drawn until
 * the stored board arrives, the board is cleaned up for this screen and stored
 * again when that changed it, and changes made one after another all reach the
 * last write.
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

const KO: BoardContext = { korean: true, koreanDocs: true, trend: true }

type Hook = ReturnType<typeof useHomeBoard>
let hook: Hook
let host: HTMLDivElement
let root: Root
let answer: (source: unknown) => void
let setHomeBoard: ReturnType<typeof vi.fn>

function Probe(props: { korean: boolean; koreanDocs: boolean }) {
  hook = useHomeBoard(props)
  return null
}

async function mount(props = { korean: true, koreanDocs: true }): Promise<void> {
  await act(async () => {
    root.render(createElement(Probe, props))
  })
}

async function reply(source: unknown): Promise<void> {
  await act(async () => {
    answer(source)
  })
}

beforeEach(() => {
  setHomeBoard = vi.fn(async (board: HomeBoard) => board)
  const pending = new Promise<unknown>((resolve) => {
    answer = resolve
  })
  ;(window as unknown as { aiOffice: unknown }).aiOffice = {
    getHomeBoard: vi.fn(() => pending as Promise<HomeBoardSource>),
    setHomeBoard,
  }
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('useHomeBoard', () => {
  it('has no board until the stored one arrives', async () => {
    await mount()
    expect(hook.board).toBeNull()
    expect(hook.context).toBeNull()
    const stored = defaultHomeBoard(KO)
    await reply({ board: stored, trendAvailable: true })
    expect(hook.board).toEqual(stored)
    expect(hook.context).toEqual(KO)
    expect(setHomeBoard).not.toHaveBeenCalled()
  })

  it('puts the trend card in on a Korean screen and stores it once', async () => {
    await mount()
    const stored = {
      ...defaultHomeBoard({ ...KO, trend: false }),
      introduced: ['start', 'apps', 'recent', 'memo', 'favorites'],
    }
    await reply({ board: stored, trendAvailable: true })
    expect(hook.board!.cards.map((c) => c.type)).toContain('trend')
    expect(setHomeBoard).toHaveBeenCalledTimes(1)
    expect(setHomeBoard.mock.calls[0]![0].introduced).toContain('trend')
  })

  it('keeps both of two changes made one after another', async () => {
    await mount()
    await reply({ board: defaultHomeBoard(KO), trendAvailable: true })
    await act(async () => {
      hook.update((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => (c.type === 'memo' ? { ...c, text: '보고 마감' } : c)),
      }))
      hook.update((prev) => ({ ...prev, pinned: [...prev.pinned, 'md'] }))
    })
    const last = setHomeBoard.mock.calls.at(-1)![0] as HomeBoard
    expect(last.pinned.at(-1)).toBe('md')
    expect(last.cards.find((c) => c.type === 'memo')).toMatchObject({ text: '보고 마감' })
    expect(hook.board).toEqual(last)
  })

  it('ignores a change made before the stored board arrives', async () => {
    await mount()
    act(() => hook.update((prev) => ({ ...prev, pinned: [] })))
    await reply({ board: defaultHomeBoard(KO), trendAvailable: true })
    expect(hook.board!.pinned).toEqual(defaultHomeBoard(KO).pinned)
    expect(setHomeBoard).not.toHaveBeenCalled()
  })

  it('draws the default board without storing it when the answer has no board', async () => {
    await mount()
    await reply(null)
    const ctx = { ...KO, trend: false }
    expect(hook.board).toEqual(defaultHomeBoard(ctx))
    expect(hook.board!.introduced).toEqual(defaultCardTypes(ctx))
    expect(setHomeBoard).not.toHaveBeenCalled()
  })

  it('draws the default board without storing it when reading fails', async () => {
    let fail!: (error: unknown) => void
    const failing = new Promise<HomeBoardSource>((_, reject) => {
      fail = reject
    })
    ;(window as unknown as { aiOffice: { getHomeBoard: unknown } }).aiOffice.getHomeBoard = vi.fn(
      () => failing,
    )
    await mount()
    await act(async () => {
      fail(new Error('EBUSY: resource busy or locked'))
    })
    expect(hook.board).toEqual(defaultHomeBoard({ ...KO, trend: false }))
    // a language change cleans the drawn board up but still stores nothing
    await mount({ korean: false, koreanDocs: false })
    expect(setHomeBoard).not.toHaveBeenCalled()
    // a change the person makes is stored
    await act(async () => {
      hook.update((prev) => ({ ...prev, pinned: [...prev.pinned, 'md'] }))
    })
    expect(setHomeBoard).toHaveBeenCalledTimes(1)
    expect((setHomeBoard.mock.calls[0]![0] as HomeBoard).pinned.at(-1)).toBe('md')
  })

  it('cleans the board up again when the screen turns Korean', async () => {
    const en = { korean: false, koreanDocs: false, trend: true }
    await mount({ korean: false, koreanDocs: false })
    await reply({ board: defaultHomeBoard(en), trendAvailable: true })
    expect(setHomeBoard).not.toHaveBeenCalled()
    await mount({ korean: true, koreanDocs: true })
    expect(hook.board!.cards[1]!.type).toBe('trend')
    expect(setHomeBoard).toHaveBeenCalledTimes(1)
  })
})
