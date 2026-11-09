/**
 * The board's measures that follow from a card's size (spec 7.2, 7.6).
 */

/** one grid row, in pixels */
export const BOARD_ROW_PX = 96
/** the gap between columns and between rows, in pixels */
export const BOARD_GAP_PX = 14

export type BoardColumns = 12 | 6 | 1

/** the columns a card `w` wide spans on a board of `cols` columns; its stored size stays */
export function cardSpan(w: number, cols: BoardColumns): number {
  if (cols === 12) return w
  if (cols === 6) return w >= 5 ? 6 : 3
  return 1
}

/** the files the recent card lists: six on a card three rows high, else three */
export function recentRows(h: number): number {
  return h >= 3 ? 6 : 3
}
