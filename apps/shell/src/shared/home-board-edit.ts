import { BOARD_CARD_TYPES, normalizeHomeBoard, type HomeBoard } from './home-board'

/**
 * The edits Home makes to its board, card by card (plan R21). Each returns a
 * new board and leaves the one given alone; the cleanup rules are the ones in
 * home-board.ts, so an edit can never store a card its type does not allow.
 */

/** the context for cleaning up one card alone: no default card goes in */
const CARD_ONLY = { korean: false, koreanDocs: false, trend: false }

/** `patch` merged into card `id`, cleaned up; the id and the type stay */
export function updateCard(
  board: HomeBoard,
  id: string,
  patch: Record<string, unknown>,
): HomeBoard {
  const at = board.cards.findIndex((card) => card.id === id)
  if (at === -1) return board
  const prev = board.cards[at]!
  const merged = { ...prev, ...patch, id: prev.id, type: prev.type }
  // the board's own cleanup, run on this card alone; the required cards it adds are dropped
  const cleaned = normalizeHomeBoard(
    { v: 1, cards: [merged], introduced: [...BOARD_CARD_TYPES] },
    CARD_ONLY,
  ).cards.find((card) => card.id === id)
  if (!cleaned) return board
  const cards = [...board.cards]
  cards[at] = cleaned
  return { ...board, cards }
}

/** card `id` one place earlier (-1) or later (1); at either end it stays */
export function moveCard(board: HomeBoard, id: string, delta: -1 | 1): HomeBoard {
  const at = board.cards.findIndex((card) => card.id === id)
  const to = at + delta
  if (at === -1 || to < 0 || to >= board.cards.length) return board
  const cards = [...board.cards]
  ;[cards[at], cards[to]] = [cards[to]!, cards[at]!]
  return { ...board, cards }
}
