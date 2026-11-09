import { describe, expect, it } from 'vitest'
import { cardSpan, recentRows } from '../src/renderer/src/home-board/board-geometry'

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
