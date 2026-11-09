/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultHomeBoard } from '../src/shared/home-board'
import { BoardGrid } from '../src/renderer/src/home-board/BoardGrid'

/**
 * 7.9 좁은 화면: the board measures itself and lays the cards out on 12, 6 or
 * 1 columns; the stored sizes stay as they are.
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

type Report = (entries: Array<{ contentRect: { width: number } }>) => void

let host: HTMLDivElement
let root: Root
let report: Report | null
const original = globalThis.ResizeObserver

/** a ResizeObserver that tells the board whatever width the test says */
class FakeResizeObserver {
  constructor(callback: Report) {
    report = callback
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {
    report = null
  }
}

const board = defaultHomeBoard({ korean: true, koreanDocs: true, trend: true })

async function show(update: ReturnType<typeof vi.fn>, customizing = false): Promise<void> {
  await act(async () => {
    root.render(
      createElement(BoardGrid, {
        board,
        cardName: (card) => card.id,
        renderCard: (card) => createElement('p', null, card.id),
        customizing,
        update,
        lang: 'ko',
        editing: null,
        onEdit: () => undefined,
      }),
    )
  })
}

async function widthIs(width: number): Promise<void> {
  expect(report).toBeTruthy()
  await act(async () => report!([{ contentRect: { width } }]))
}

const boardEl = () => host.querySelector<HTMLElement>('[data-home-board]')!
const span = (id: string) =>
  host.querySelector<HTMLElement>(`[data-card="${id}"]`)!.style.getPropertyValue('--span')

beforeEach(() => {
  report = null
  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  globalThis.ResizeObserver = original
})

describe('board columns', () => {
  it('uses six columns at 800px: the trend card takes a full row', async () => {
    const update = vi.fn()
    await show(update)
    await widthIs(800)
    expect(boardEl().dataset.cols).toBe('6')
    expect(boardEl().style.getPropertyValue('--cols')).toBe('6')
    expect(span('trend')).toBe('6')
    expect(span('memo')).toBe('6')
    expect(host.querySelector('[data-card="trend"]')!.getAttribute('data-size')).toBe('5x2')
    expect(update).not.toHaveBeenCalled()
  })

  it('stacks the cards at 650px and goes back to twelve at 1060px', async () => {
    const update = vi.fn()
    await show(update)
    await widthIs(650)
    expect(boardEl().dataset.cols).toBe('1')
    expect(span('start')).toBe('1')
    await widthIs(1060)
    expect(boardEl().dataset.cols).toBe('12')
    expect(span('start')).toBe('7')
    expect(span('trend')).toBe('5')
    expect(update).not.toHaveBeenCalled()
  })

  it('has no resize corner on six columns while customizing (R15)', async () => {
    await show(vi.fn(), true)
    expect(host.querySelector('[data-card-resize]')).not.toBeNull()
    await widthIs(800)
    expect(host.querySelector('[data-card-resize]')).toBeNull()
    // the card menu still offers the sizes
    expect(host.querySelector('[data-card-menu]')).not.toBeNull()
  })

  it('stays on twelve columns without a ResizeObserver', async () => {
    globalThis.ResizeObserver = undefined as unknown as typeof ResizeObserver
    await show(vi.fn())
    expect(boardEl().dataset.cols).toBe('12')
  })
})
