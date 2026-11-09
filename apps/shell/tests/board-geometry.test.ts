import { describe, expect, it } from 'vitest'
import { cardSpan, recentRows, sizeFromDrag } from '../src/renderer/src/home-board/board-geometry'

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
