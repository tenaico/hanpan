import { describe, expect, it } from 'vitest'
import {
  boardColumns,
  cardSpan,
  narrowOrder,
  recentRows,
  sizeFromDrag,
} from '../src/renderer/src/home-board/board-geometry'

/** the board's measures that follow from a card's size (spec 7.2, 7.6) */
describe('recentRows', () => {
  it('shows six rows on a card three rows high', () => expect(recentRows(3)).toBe(6))
  it('shows three rows on a card two rows high', () => expect(recentRows(2)).toBe(3))
})

describe('cardSpan', () => {
  it('spans as many columns as the card is wide on twelve columns', () => {
    expect(cardSpan(7, 12)).toBe(7)
    expect(cardSpan(5, 12)).toBe(5)
  })
})

describe('sizeFromDrag', () => {
  it('turns a drag to the right into columns', () => {
    expect(sizeFromDrag({ w: 5, h: 2 }, 179, 0, 75.5)).toEqual({ w: 7, h: 2 })
  })
  it('turns a drag down into rows', () => {
    expect(sizeFromDrag({ w: 7, h: 2 }, 0, 110, 75.5)).toEqual({ w: 7, h: 3 })
  })
  it('stays within one column and one row', () => {
    expect(sizeFromDrag({ w: 3, h: 2 }, -1000, -1000, 75.5)).toEqual({ w: 1, h: 1 })
  })
  it('stays within twelve columns and four rows', () => {
    expect(sizeFromDrag({ w: 7, h: 3 }, 5000, 5000, 75.5)).toEqual({ w: 12, h: 4 })
  })
})

describe('boardColumns', () => {
  it('uses twelve columns from 960px', () => {
    expect(boardColumns(1060)).toBe(12)
    expect(boardColumns(960)).toBe(12)
  })
  it('uses six columns from 700px', () => {
    expect(boardColumns(959)).toBe(6)
    expect(boardColumns(700)).toBe(6)
  })
  it('stacks the cards below 700px', () => expect(boardColumns(699)).toBe(1))
})

describe('cardSpan on narrow boards', () => {
  it('makes a card five or more wide a full row of six, and the rest half', () => {
    expect(cardSpan(5, 6)).toBe(6)
    expect(cardSpan(3, 6)).toBe(3)
    expect(cardSpan(12, 6)).toBe(6)
  })
  it('gives every card the one column', () => expect(cardSpan(7, 1)).toBe(1))
})

/** a narrowed board shows the cards that make documents before the trend card (0.19.0 review) */
describe('narrowOrder', () => {
  const types = ['start', 'trend', 'apps', 'recent', 'memo', 'favorites'] as const
  it('keeps the stored order on twelve columns', () => {
    expect(narrowOrder([...types], 12)).toBeNull()
  })
  it('puts the apps card before the trend card on six columns and on one', () => {
    expect(narrowOrder([...types], 6)).toEqual([0, 2, 1, 3, 4, 5])
    expect(narrowOrder([...types], 1)).toEqual([0, 2, 1, 3, 4, 5])
  })
  it('leaves a board whose apps card already comes first, or that has none, as it is', () => {
    expect(narrowOrder(['start', 'apps', 'trend', 'memo'], 6)).toBeNull()
    expect(narrowOrder(['trend', 'memo', 'recent'], 6)).toBeNull()
  })
})
