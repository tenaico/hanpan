import { defaultPins, type AppKey } from './home-apps'
import {
  BOARD_CARD_TYPES,
  CARD_SIZES,
  DEFAULT_SIZE,
  REQUIRED_CARD_TYPES,
  SINGLE_CARD_TYPES,
  defaultCardTypes,
  newCard,
  newCardId,
  normalizeHomeBoard,
  type BoardCard,
  type BoardCardType,
  type BoardContext,
  type CardSize,
  type HomeBoard,
} from './home-board'
import { HOME_WIDGET_MAX } from './home-layout'

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

/** every card but start and apps can leave the board */
export function isRemovable(type: BoardCardType): boolean {
  return !REQUIRED_CARD_TYPES.includes(type)
}

/** whether "카드 추가" can still add `type`: room on the board, and none yet of a single type */
export function canAddCard(board: HomeBoard, type: BoardCardType): boolean {
  if (board.cards.length >= HOME_WIDGET_MAX) return false
  return !SINGLE_CARD_TYPES.includes(type) || !board.cards.some((card) => card.type === type)
}

/** a new card of `type` at the end in its default size; `id` is null when nothing could be added */
export function addCard(
  board: HomeBoard,
  type: BoardCardType,
): { board: HomeBoard; id: string | null } {
  if (!canAddCard(board, type)) return { board, id: null }
  const id = newCardId((taken) => board.cards.some((card) => card.id === taken), type)
  return { board: { ...board, cards: [...board.cards, newCard(type, id)] }, id }
}

/** the board without card `id`; start and apps stay */
export function removeCard(board: HomeBoard, id: string): HomeBoard {
  const card = board.cards.find((c) => c.id === id)
  if (!card || !isRemovable(card.type)) return board
  return { ...board, cards: board.cards.filter((c) => c.id !== id) }
}

/** the dragged card `id` takes the place of card `targetId`; the cards between shift by one */
export function moveCardTo(board: HomeBoard, id: string, targetId: string): HomeBoard {
  const from = board.cards.findIndex((card) => card.id === id)
  const to = board.cards.findIndex((card) => card.id === targetId)
  if (from === -1 || to === -1 || from === to) return board
  const cards = [...board.cards]
  const [moved] = cards.splice(from, 1)
  cards.splice(to, 0, moved!)
  return { ...board, cards }
}

/** the allowed size of `type` closest to `size` (|dw| + |dh|); on a tie the one listed first */
export function nearestSize(type: BoardCardType, wanted: CardSize): CardSize {
  let best = CARD_SIZES[type][0]!
  let bestDistance = Infinity
  for (const allowed of CARD_SIZES[type]) {
    const distance = Math.abs(allowed.w - wanted.w) + Math.abs(allowed.h - wanted.h)
    if (distance < bestDistance) {
      best = allowed
      bestDistance = distance
    }
  }
  return { w: best.w, h: best.h }
}

/** card `id` at the allowed size nearest `size` */
export function resizeCard(board: HomeBoard, id: string, wanted: CardSize): HomeBoard {
  const card = board.cards.find((c) => c.id === id)
  if (!card) return board
  return updateCard(board, id, { ...nearestSize(card.type, wanted) })
}

/** pinned app `key` moved to place `toIndex` of the pins; an app not pinned stays off */
export function moveApp(board: HomeBoard, key: AppKey, toIndex: number): HomeBoard {
  const from = board.pinned.indexOf(key)
  if (from === -1) return board
  const pinned = board.pinned.filter((k) => k !== key)
  const to = Math.max(0, Math.min(pinned.length, Math.round(toIndex)))
  pinned.splice(to, 0, key)
  if (pinned.every((k, index) => k === board.pinned[index])) return board
  return { ...board, pinned }
}

/**
 * "기본 배치로" (plan R17): the default cards in their default order and size
 * in front (back in when removed; the ones there keep their id, title and,
 * for the default memo, its text), every other card after them in its current
 * order, and the default pins. Nothing is deleted; the seen and recent apps
 * stay, and the theme is not this board's.
 */
export function resetHomeBoard(board: HomeBoard, ctx: BoardContext): HomeBoard {
  const used = new Set<string>()
  const front: BoardCard[] = []
  const types = defaultCardTypes(ctx)
  for (const type of types) {
    // the default memo is the one with the id `memo`; the person's own memos stay theirs
    const found = board.cards.find((card) =>
      type === 'memo' ? card.id === 'memo' : card.type === type,
    )
    if (found) {
      used.add(found.id)
      front.push({ ...found, ...DEFAULT_SIZE[type] })
      continue
    }
    const taken = (id: string) => used.has(id) || board.cards.some((card) => card.id === id)
    const card = newCard(type, newCardId(taken, type))
    used.add(card.id)
    front.push(card)
  }
  const rest = board.cards.filter((card) => !used.has(card.id))
  return {
    ...board,
    cards: [...front, ...rest],
    pinned: defaultPins(ctx.koreanDocs),
    introduced: [...new Set([...board.introduced, ...types])],
  }
}
