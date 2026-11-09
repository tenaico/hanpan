import { APP_KEYS, RECENT_APPS_MAX, defaultPins, isAppKey, type AppKey } from './home-apps'
import {
  arrangeKeys,
  HOME_MEMO_MAX,
  HOME_TITLE_MAX,
  HOME_WIDGET_MAX,
  isAbsolutePath,
  normalizeHomeLayout,
  normalizeShortcutTarget,
  type HomeLayout,
  type HomeWidget,
  type ShortcutTarget,
} from './home-layout'

/**
 * 0.19 홈 보드 (spec 7.10): Home as an ordered list of cards with fixed sizes,
 * the apps pinned to the new card, the apps seen in "모든 앱", the apps used
 * last and the default card types this board has ever had. Stored in
 * userData/app-settings.json under `homeBoard`; 0.18's `homeLayout` is only
 * read, once, to build the first board. Every reader cleans the value up field
 * by field and card by card, so a damaged value never blanks Home.
 *
 * Only the types, the constants and the cleanup live here; the edits are in
 * home-board-edit.ts and the app lists' edits in home-apps.ts (plan R21).
 */

export const HOME_BOARD_SETTING_KEY = 'homeBoard'

export const BOARD_CARD_TYPES = [
  'start',
  'trend',
  'apps',
  'recent',
  'memo',
  'favorites',
  'folder',
  'clock',
  'shortcut',
] as const
export type BoardCardType = (typeof BOARD_CARD_TYPES)[number]

export interface CardSize {
  w: number
  h: number
}

const size = (w: number, h: number): CardSize => ({ w, h })

/** the sizes each card type allows, in grid columns and rows */
export const CARD_SIZES: Record<BoardCardType, readonly CardSize[]> = {
  start: [size(7, 2), size(12, 2)],
  trend: [size(5, 2), size(5, 3), size(12, 2)],
  apps: [size(5, 2), size(5, 3), size(7, 2), size(7, 3)],
  recent: [size(7, 2), size(7, 3), size(12, 3)],
  memo: [size(3, 2), size(6, 2)],
  favorites: [size(3, 2), size(6, 2), size(6, 3)],
  folder: [size(3, 2), size(6, 2), size(6, 3)],
  clock: [size(3, 2)],
  shortcut: [size(3, 2), size(6, 2)],
}

/** the size a card gets when added, reset or stored with a size its type does not allow */
export const DEFAULT_SIZE: Record<BoardCardType, CardSize> = {
  start: size(7, 2),
  trend: size(5, 2),
  apps: size(5, 3),
  recent: size(7, 3),
  memo: size(6, 2),
  favorites: size(6, 2),
  folder: size(3, 2),
  clock: size(3, 2),
  shortcut: size(3, 2),
}

/** one card of these on a board at most */
export const SINGLE_CARD_TYPES: readonly BoardCardType[] = [
  'start',
  'trend',
  'apps',
  'recent',
  'favorites',
]
/** cards a board always has */
export const REQUIRED_CARD_TYPES: readonly BoardCardType[] = ['start', 'apps']
/** the default cards' order; also decides where a missing default card goes back */
export const DEFAULT_CARD_ORDER: readonly BoardCardType[] = [
  'start',
  'trend',
  'apps',
  'recent',
  'memo',
  'favorites',
]

export type BoardCard = { id: string; w: number; h: number; title: string } & (
  | { type: 'start' | 'trend' | 'apps' | 'recent' | 'favorites' | 'clock' }
  | { type: 'memo'; text: string }
  | { type: 'shortcut'; target: ShortcutTarget | null }
  | { type: 'folder'; path: string }
)

export interface HomeBoard {
  v: 1
  /** in display order */
  cards: BoardCard[]
  /** app keys on the new card, in order */
  pinned: string[]
  /** app keys seen in "모든 앱"; a key missing here is marked new */
  seenApps: string[]
  /** app keys started last, newest first */
  recentApps: string[]
  /** default card types this board ever had; a removed default card stays out */
  introduced: string[]
}

/** what the default layout and pins depend on (plan R1) */
export interface BoardContext {
  /** the screen language is Korean */
  korean: boolean
  /** Hanpan's Korean document features are on */
  koreanDocs: boolean
  /** this build has a forecast address */
  trend: boolean
}

/** what main hands Home: the stored board (cleaned up) and whether the build has a forecast address */
export interface HomeBoardSource {
  board: unknown
  trendAvailable: boolean
}

const CARD_ID = /^[a-z0-9][a-z0-9-]{0,39}$/
const PATH_MAX = 4096

export function sizeKey(value: CardSize): string {
  return `${value.w}x${value.h}`
}

export function parseSizeKey(value: string): CardSize | null {
  const match = /^([1-9]\d?)x([1-9]\d?)$/.exec(value)
  return match ? { w: Number(match[1]), h: Number(match[2]) } : null
}

export function defaultCardTypes(ctx: BoardContext): BoardCardType[] {
  return DEFAULT_CARD_ORDER.filter((type) => type !== 'trend' || (ctx.korean && ctx.trend))
}

export function newCard(type: BoardCardType, id: string): BoardCard {
  const base = { id, ...DEFAULT_SIZE[type], title: '' }
  switch (type) {
    case 'memo':
      return { ...base, type, text: '' }
    case 'shortcut':
      return { ...base, type, target: null }
    case 'folder':
      return { ...base, type, path: '' }
    default:
      return { ...base, type }
  }
}

export function defaultHomeBoard(ctx: BoardContext): HomeBoard {
  const types = defaultCardTypes(ctx)
  return {
    v: 1,
    cards: types.map((type) => newCard(type, type)),
    pinned: defaultPins(ctx.koreanDocs),
    seenApps: [...APP_KEYS],
    recentApps: [],
    introduced: [...types],
  }
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw)
}

/** a stored version 1 board with a card list, however damaged inside */
export function isBoardValue(raw: unknown): boolean {
  return isRecord(raw) && raw.v === 1 && Array.isArray(raw.cards)
}

export function boardHasTrend(raw: unknown): boolean {
  return (
    isRecord(raw) &&
    Array.isArray(raw.cards) &&
    raw.cards.some((card) => isRecord(card) && card.type === 'trend')
  )
}

function text(raw: unknown, max: number): string {
  return typeof raw === 'string' ? raw.slice(0, max) : ''
}

function normalizeCard(raw: unknown): BoardCard | null {
  if (!isRecord(raw)) return null
  const type = BOARD_CARD_TYPES.find((t) => t === raw.type)
  if (!type || typeof raw.id !== 'string' || !CARD_ID.test(raw.id)) return null
  const allowed = CARD_SIZES[type].find((s) => s.w === raw.w && s.h === raw.h)
  const base = {
    id: raw.id,
    ...(allowed ?? DEFAULT_SIZE[type]),
    title: text(raw.title, HOME_TITLE_MAX),
  }
  switch (type) {
    case 'memo':
      return { ...base, type, text: text(raw.text, HOME_MEMO_MAX) }
    case 'shortcut':
      return { ...base, type, target: normalizeShortcutTarget(raw.target) }
    case 'folder': {
      const path = text(raw.path, PATH_MAX)
      return { ...base, type, path: isAbsolutePath(path) ? path : '' }
    }
    default:
      return { ...base, type }
  }
}

function appKeyList(raw: unknown, fallback: readonly string[], max = APP_KEYS.length): string[] {
  if (!Array.isArray(raw)) return [...fallback]
  return [...new Set(raw.filter(isAppKey))].slice(0, max)
}

/** the type itself as the id, or `<type>-<time><random>` when that is taken */
export function newCardId(taken: (id: string) => boolean, type: BoardCardType): string {
  if (!taken(type)) return type
  for (;;) {
    const id = `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    if (!taken(id)) return id
  }
}

/** a default card of `type` in its default place: right after the closest earlier default type on the board, else first */
export function insertDefault(cards: BoardCard[], type: BoardCardType): BoardCard[] {
  const card = newCard(
    type,
    newCardId((id) => cards.some((c) => c.id === id), type),
  )
  const order = DEFAULT_CARD_ORDER.indexOf(type)
  for (let k = order - 1; k >= 0; k--) {
    const before = DEFAULT_CARD_ORDER[k]
    let at = -1
    cards.forEach((c, index) => {
      if (c.type === before) at = index
    })
    if (at !== -1) return [...cards.slice(0, at + 1), card, ...cards.slice(at + 1)]
  }
  return [card, ...cards]
}

function cardList(raw: unknown, ctx: BoardContext): BoardCard[] {
  if (!Array.isArray(raw)) return defaultHomeBoard(ctx).cards
  const out: BoardCard[] = []
  for (const item of raw) {
    const card = normalizeCard(item)
    if (!card || out.some((c) => c.id === card.id)) continue
    if (SINGLE_CARD_TYPES.includes(card.type) && out.some((c) => c.type === card.type)) continue
    out.push(card)
  }
  return out
}

/** drop cards other than the required ones from the end until `max` are left */
function trimCards(cards: BoardCard[], max: number): BoardCard[] {
  const out = [...cards]
  for (let k = out.length - 1; k >= 0 && out.length > max; k--) {
    if (!REQUIRED_CARD_TYPES.includes(out[k]!.type)) out.splice(k, 1)
  }
  return out
}

export function normalizeHomeBoard(raw: unknown, ctx: BoardContext): HomeBoard {
  if (!isBoardValue(raw)) return defaultHomeBoard(ctx)
  const value = raw as Record<string, unknown>
  let cards = cardList(value.cards, ctx)
  for (const type of REQUIRED_CARD_TYPES) {
    if (!cards.some((c) => c.type === type)) cards = insertDefault(cards, type)
  }
  cards = trimCards(cards, HOME_WIDGET_MAX)
  const introduced: string[] = Array.isArray(value.introduced)
    ? [
        ...new Set(
          value.introduced.filter((t): t is BoardCardType =>
            (BOARD_CARD_TYPES as readonly unknown[]).includes(t),
          ),
        ),
      ]
    : defaultCardTypes(ctx)
  // default cards of a later version go in once; a removed one stays out (7.10)
  for (const type of defaultCardTypes(ctx)) {
    if (introduced.includes(type)) continue
    if (!cards.some((c) => c.type === type) && cards.length < HOME_WIDGET_MAX) {
      cards = insertDefault(cards, type)
    }
    introduced.push(type)
  }
  return {
    v: 1,
    cards,
    pinned: appKeyList(value.pinned, defaultPins(ctx.koreanDocs)),
    seenApps: appKeyList(value.seenApps, APP_KEYS),
    recentApps: appKeyList(value.recentApps, [], RECENT_APPS_MAX),
    introduced,
  }
}

/** the app tiles 0.18 Home showed, in its two groups (plan R2) */
const LEGACY_MAIN_CARDS = ['xmind', 'hwp', 'pptx', 'templates'] as const
const LEGACY_OTHER_CARDS = [
  'docx',
  'xlsx',
  'design',
  'md',
  'html',
  'pdf',
  'photo',
  'illust',
  'open',
] as const

/**
 * The pins a 0.18 layout gives (plan R2): the default pins in the order 0.18
 * Home showed its tiles, without the hidden ones, then the apps pinned to the
 * favorites widget. The stored order only reorders; it adds no pins.
 */
function legacyPins(layout: HomeLayout, koreanDocs: boolean): string[] {
  const defaults = defaultPins(koreanDocs)
  let pins: string[] = defaults
  if (layout.cardOrder.length) {
    const legacyOrder = [
      ...arrangeKeys(LEGACY_MAIN_CARDS, layout.cardOrder),
      ...arrangeKeys(LEGACY_OTHER_CARDS, layout.cardOrder),
    ]
    pins = arrangeKeys<AppKey>(defaults, legacyOrder)
  }
  pins = pins.filter((key) => !layout.hiddenCards.includes(key))
  for (const key of layout.pinnedApps) {
    if (isAppKey(key) && !pins.includes(key)) pins.push(key)
  }
  return pins
}

function cardFromWidget(widget: HomeWidget): Record<string, unknown> {
  const { size: widgetSize, ...rest } = widget
  const dims =
    widget.type === 'recent' ? size(7, 3) : widgetSize === 'wide' ? size(6, 2) : size(3, 2)
  return { ...rest, ...dims }
}

export function migrateHomeLayout(layout: HomeLayout, ctx: BoardContext): HomeBoard {
  const head: BoardCardType[] = [
    'start',
    ...(ctx.korean && ctx.trend ? ['trend' as const] : []),
    'apps',
  ]
  const cards: Record<string, unknown>[] = head.map((type) => ({ ...newCard(type, type) }))
  const used = new Set<string>(head)
  const allIds = new Set<string>([...head, ...layout.widgets.map((w) => w.id)])
  for (const widget of layout.widgets) {
    const card = cardFromWidget(widget)
    // a 0.18 widget keeps its place even when a default card took its id
    if (used.has(widget.id)) {
      card.id = newCardId((id) => allIds.has(id), widget.type)
      allIds.add(card.id as string)
    }
    used.add(card.id as string)
    cards.push(card)
  }
  return normalizeHomeBoard(
    {
      v: 1,
      cards,
      pinned: legacyPins(layout, ctx.koreanDocs),
      seenApps: [...APP_KEYS],
      recentApps: [],
      introduced: defaultCardTypes(ctx),
    },
    ctx,
  )
}

/**
 * The board to show (plan R3): a stored version 1 board; else the 0.18 layout
 * moved over (also when the stored board is damaged, so 0.18 notes never get
 * lost); else the default board.
 */
export function resolveHomeBoard(stored: unknown, legacy: unknown, ctx: BoardContext): HomeBoard {
  if (isBoardValue(stored)) return normalizeHomeBoard(stored, ctx)
  if (isRecord(legacy)) return migrateHomeLayout(normalizeHomeLayout(legacy), ctx)
  return defaultHomeBoard(ctx)
}
