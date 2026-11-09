import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SIZE,
  defaultHomeBoard,
  type BoardContext,
  type HomeBoard,
} from '../src/shared/home-board'
import {
  addCard,
  canAddCard,
  isRemovable,
  moveApp,
  moveCard,
  moveCardTo,
  nearestSize,
  removeCard,
  resetHomeBoard,
  resizeCard,
  updateCard,
} from '../src/shared/home-board-edit'

/** the edits Home makes to a board card by card (plan R21) */

const KO: BoardContext = { korean: true, koreanDocs: true, trend: true }
const ids = (b: HomeBoard) => b.cards.map((c) => c.id)
const memo = (b: HomeBoard) => b.cards.find((c) => c.id === 'memo')!

describe('updateCard', () => {
  it('cuts a 61-character title to 60 and keeps the id and type', () => {
    const next = updateCard(defaultHomeBoard(KO), 'memo', {
      title: 'a'.repeat(61),
      id: 'other',
      type: 'clock',
    })
    expect(memo(next).title).toBe('a'.repeat(60))
    expect(memo(next).type).toBe('memo')
    expect(ids(next)).toEqual(ids(defaultHomeBoard(KO)))
  })

  it('gives a memo the default size for a size it does not allow', () => {
    const next = updateCard(defaultHomeBoard(KO), 'memo', { w: 5, h: 2 })
    expect([memo(next).w, memo(next).h]).toEqual([6, 2])
  })

  it('takes an allowed size', () => {
    const next = updateCard(defaultHomeBoard(KO), 'memo', { w: 3, h: 2 })
    expect([memo(next).w, memo(next).h]).toEqual([3, 2])
  })

  it('leaves the board alone for an unknown id', () => {
    const board = defaultHomeBoard(KO)
    expect(updateCard(board, 'nope', { title: 'x' })).toEqual(board)
  })
})

describe('moveCard', () => {
  const board = defaultHomeBoard(KO)
  it('moves a card one place', () => {
    expect(ids(moveCard(board, 'apps', -1))).toEqual([
      'start',
      'apps',
      'trend',
      'recent',
      'memo',
      'favorites',
    ])
    expect(ids(moveCard(board, 'apps', 1))).toEqual([
      'start',
      'trend',
      'recent',
      'apps',
      'memo',
      'favorites',
    ])
  })

  it('stays put at either end', () => {
    expect(ids(moveCard(board, 'start', -1))).toEqual(ids(board))
    expect(ids(moveCard(board, 'favorites', 1))).toEqual(ids(board))
  })
})

/** Task 5: the edits customizing makes (spec 8 '편집 동작') */
describe('removeCard', () => {
  const board = defaultHomeBoard(KO)
  it('keeps the start and new cards', () => {
    expect(removeCard(board, 'start')).toBe(board)
    expect(removeCard(board, 'apps')).toBe(board)
  })
  it('takes a memo off', () => {
    expect(ids(removeCard(board, 'memo'))).not.toContain('memo')
  })
  it('says which types can go', () => {
    expect(isRemovable('start')).toBe(false)
    expect(isRemovable('apps')).toBe(false)
    expect(isRemovable('trend')).toBe(true)
    expect(isRemovable('memo')).toBe(true)
  })
})

describe('addCard', () => {
  it('adds one trend card at most', () => {
    const noTrend = {
      ...defaultHomeBoard(KO),
      cards: defaultHomeBoard(KO).cards.filter((c) => c.type !== 'trend'),
    }
    const one = addCard(noTrend, 'trend')
    expect(one.id).toBe('trend')
    expect(one.board.cards.at(-1)!.type).toBe('trend')
    const two = addCard(one.board, 'trend')
    expect(two.id).toBeNull()
    expect(two.board.cards.filter((c) => c.type === 'trend')).toHaveLength(1)
  })
  it('adds memos with ids of their own, at the default size', () => {
    const one = addCard(defaultHomeBoard(KO), 'memo')
    const two = addCard(one.board, 'memo')
    expect(one.id).not.toBeNull()
    expect(two.id).not.toBeNull()
    expect(new Set([one.id, two.id, 'memo']).size).toBe(3)
    const added = two.board.cards.at(-1)!
    expect([added.w, added.h]).toEqual([6, 2])
  })
  it('adds nothing to a board of 24 cards', () => {
    let board = defaultHomeBoard(KO)
    while (board.cards.length < 24) board = addCard(board, 'clock').board
    expect(canAddCard(board, 'clock')).toBe(false)
    const full = addCard(board, 'clock')
    expect(full.id).toBeNull()
    expect(full.board.cards).toHaveLength(24)
  })
})

describe('resizeCard and nearestSize', () => {
  const card = (b: HomeBoard, id: string) => b.cards.find((c) => c.id === id)!
  const dims = (b: HomeBoard, id: string) => [card(b, id).w, card(b, id).h]
  it('takes the nearest allowed size', () => {
    const board = addCard(defaultHomeBoard(KO), 'clock').board
    const clock = board.cards.at(-1)!.id
    expect(dims(resizeCard(board, 'memo', { w: 5, h: 2 }), 'memo')).toEqual([6, 2])
    expect(dims(resizeCard(board, 'trend', { w: 9, h: 2 }), 'trend')).toEqual([12, 2])
    expect(dims(resizeCard(board, 'trend', { w: 8, h: 3 }), 'trend')).toEqual([5, 3])
    expect(dims(resizeCard(board, clock, { w: 6, h: 2 }), clock)).toEqual([3, 2])
  })
  it('prefers the earlier size on a tie', () => {
    // apps 6x2 is one step from 5x2 and from 7x2; 5x2 comes first
    expect(nearestSize('apps', { w: 6, h: 2 })).toEqual({ w: 5, h: 2 })
    expect(nearestSize('trend', { w: 5, h: 2 })).toEqual({ w: 5, h: 2 })
  })
})

describe('moveCardTo', () => {
  it("gives the dragged card the dropped-on card's place", () => {
    expect(ids(moveCardTo(defaultHomeBoard(KO), 'favorites', 'apps'))).toEqual([
      'start',
      'trend',
      'favorites',
      'apps',
      'recent',
      'memo',
    ])
  })
  it('moves a card later the same way', () => {
    expect(ids(moveCardTo(defaultHomeBoard(KO), 'trend', 'recent'))).toEqual([
      'start',
      'apps',
      'recent',
      'trend',
      'memo',
      'favorites',
    ])
  })
})

describe('moveApp', () => {
  it('moves a pin and keeps the rest in order', () => {
    const board = defaultHomeBoard(KO)
    const next = moveApp(board, 'photo', 0)
    expect(next.pinned[0]).toBe('photo')
    expect(next.pinned.slice(1)).toEqual(board.pinned.filter((k) => k !== 'photo'))
  })
  it('leaves an app that is not pinned alone', () => {
    const board = defaultHomeBoard(KO)
    expect(moveApp(board, 'open', 0)).toBe(board)
  })
})

describe('resetHomeBoard', () => {
  it('puts the default cards in front at their default size and keeps the rest', () => {
    const base = defaultHomeBoard(KO)
    const board: HomeBoard = {
      ...base,
      cards: [
        { id: 'memo-x', type: 'memo', w: 3, h: 2, title: '', text: '견적서' },
        ...base.cards
          .filter((c) => c.type !== 'recent')
          .map((c) => (c.id === 'memo' ? { ...c, w: 3, h: 2, text: '결재' } : c))
          .reverse(),
      ],
      pinned: ['photo'],
      seenApps: ['xmind'],
      recentApps: ['hwp'],
    }
    const next = resetHomeBoard(board, KO)
    expect(ids(next)).toEqual(['start', 'trend', 'apps', 'recent', 'memo', 'favorites', 'memo-x'])
    for (const card of next.cards.slice(0, 6)) {
      expect([card.w, card.h]).toEqual([DEFAULT_SIZE[card.type].w, DEFAULT_SIZE[card.type].h])
    }
    const memoCard = memo(next)
    expect(memoCard.type === 'memo' && memoCard.text).toBe('결재')
    const userMemo = next.cards.at(-1)!
    expect(userMemo.type === 'memo' && userMemo.text).toBe('견적서')
    expect(next.pinned).toEqual(base.pinned)
    expect(next.seenApps).toEqual(['xmind'])
    expect(next.recentApps).toEqual(['hwp'])
  })
})
