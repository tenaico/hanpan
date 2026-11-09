/**
 * The board's measures that follow from a card's size (spec 7.2, 7.6).
 */

/** the files the recent card lists: six on a card three rows high, else three */
export function recentRows(h: number): number {
  return h >= 3 ? 6 : 3
}
