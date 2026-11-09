import type { CardSize } from '../../../shared/home-board'

/**
 * The board's measures that follow from a card's size (spec 7.2, 7.6).
 */

/** one grid row, in pixels */
export const BOARD_ROW_PX = 96
/** the gap between columns and between rows, in pixels */
export const BOARD_GAP_PX = 14

export type BoardColumns = 12 | 6 | 1

/**
 * The columns a board this wide uses (spec 7.9): twelve from 960px (a 1366
 * window's board is about 1,060px), six from 700px, else one column of cards.
 */
export function boardColumns(width: number): BoardColumns {
  if (width >= 960) return 12
  if (width >= 700) return 6
  return 1
}

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * The size a card `start` wide and high would have after its corner moved
 * `dx`, `dy` pixels on a board whose columns are `colPx` wide: whole columns
 * and rows, 1 to 12 wide and 1 to 4 high. The caller snaps it to a size the
 * card's type allows.
 */
export function sizeFromDrag(start: CardSize, dx: number, dy: number, colPx: number): CardSize {
  const width = start.w * colPx + (start.w - 1) * BOARD_GAP_PX + dx
  const height = start.h * BOARD_ROW_PX + (start.h - 1) * BOARD_GAP_PX + dy
  return {
    w: clamp(Math.round((width + BOARD_GAP_PX) / (colPx + BOARD_GAP_PX)), 1, 12),
    h: clamp(Math.round((height + BOARD_GAP_PX) / (BOARD_ROW_PX + BOARD_GAP_PX)), 1, 4),
  }
}

/** a card `size` big on the board, in pixels */
export function cardPixels(size: CardSize, colPx: number): { width: number; height: number } {
  return {
    width: size.w * colPx + (size.w - 1) * BOARD_GAP_PX,
    height: size.h * BOARD_ROW_PX + (size.h - 1) * BOARD_GAP_PX,
  }
}

/** one column's width on a twelve-column board `boardWidth` pixels wide */
export function columnPixels(boardWidth: number): number {
  return (boardWidth - 11 * BOARD_GAP_PX) / 12
}
