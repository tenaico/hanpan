import { describe, expect, it } from 'vitest'
import { defaultHomeBoard, type BoardContext, type HomeBoard } from '../src/shared/home-board'
import { moveCard, updateCard } from '../src/shared/home-board-edit'

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
