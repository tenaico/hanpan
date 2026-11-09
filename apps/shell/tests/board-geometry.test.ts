import { describe, expect, it } from 'vitest'
import { recentRows } from '../src/renderer/src/home-board/board-geometry'

/** the board's measures that follow from a card's size (spec 7.6) */
describe('recentRows', () => {
  it('shows six rows on a card three rows high', () => expect(recentRows(3)).toBe(6))
  it('shows three rows on a card two rows high', () => expect(recentRows(2)).toBe(3))
})
