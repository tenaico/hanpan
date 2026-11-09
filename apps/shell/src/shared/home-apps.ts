import type { CardSize, HomeBoard } from './home-board'

/**
 * The apps Home can start (spec 7.4): their groups in "모든 앱", their keys
 * (the `data-new` keys of Home's tiles) and the apps pinned to the new card on
 * a fresh board.
 */

export const APP_GROUPS = [
  { id: 'docs', keys: ['xmind', 'hwp', 'pptx', 'docx', 'xlsx', 'md', 'html', 'templates'] },
  { id: 'pdf', keys: ['pdf', 'pdf-tools', 'md-convert'] },
  { id: 'graphics', keys: ['photo', 'illust', 'design'] },
  { id: 'file', keys: ['open'] },
] as const

export type AppGroupId = (typeof APP_GROUPS)[number]['id']
export type AppKey = (typeof APP_GROUPS)[number]['keys'][number]

/** every app key, in the order of the groups */
export const APP_KEYS: readonly AppKey[] = APP_GROUPS.flatMap((group) => group.keys)

export function isAppKey(value: unknown): value is AppKey {
  return typeof value === 'string' && (APP_KEYS as readonly string[]).includes(value)
}

/** the pins with the Korean document features on */
export const DEFAULT_PINS_KOREAN: readonly AppKey[] = [
  'xmind',
  'hwp',
  'pptx',
  'docx',
  'xlsx',
  'pdf',
  'templates',
  'photo',
  'illust',
  'design',
  'html',
]

/** the pins with the Korean document features off */
export const DEFAULT_PINS_OTHER: readonly AppKey[] = [
  'xmind',
  'pptx',
  'docx',
  'xlsx',
  'pdf',
  'photo',
  'illust',
  'html',
  'md',
  'pdf-tools',
  'md-convert',
]

export function defaultPins(koreanDocs: boolean): AppKey[] {
  return [...(koreanDocs ? DEFAULT_PINS_KOREAN : DEFAULT_PINS_OTHER)]
}

/** the app slots of a new card this size: one column less than the card, as many rows */
export function slotGrid(size: CardSize): { cols: number; rows: number } {
  return { cols: Math.max(1, size.w - 1), rows: Math.max(1, size.h) }
}

/** what the new card shows: the apps, the "+N" on "모든 앱" and the slots left blank */
export interface AppSlots {
  apps: AppKey[]
  more: number
  empty: number
}

/**
 * Fills the new card with the available pins in pin order and "모든 앱" right
 * after the last one. When the pins do not fit, the last slot is "모든 앱"
 * with "+N". Pins that are not available are skipped but stay pinned.
 */
export function appSlots(
  pinned: readonly string[],
  available: ReadonlySet<string>,
  size: CardSize,
): AppSlots {
  const shown = pinned.filter((key): key is AppKey => isAppKey(key) && available.has(key))
  const grid = slotGrid(size)
  const total = grid.cols * grid.rows
  if (shown.length < total) return { apps: shown, more: 0, empty: total - shown.length - 1 }
  return { apps: shown.slice(0, total - 1), more: shown.length - (total - 1), empty: 0 }
}

/** how many apps recentApps keeps */
export const RECENT_APPS_MAX = 8

/** the recent apps with this one moved to the front, newest first */
export function withRecentApp(recent: readonly string[], key: AppKey): AppKey[] {
  const rest = recent.filter((k): k is AppKey => isAppKey(k) && k !== key)
  return [key, ...rest].slice(0, RECENT_APPS_MAX)
}

/** the available apps not seen in "모든 앱" yet, in APP_KEYS order */
export function unseenApps(seen: readonly string[], available: ReadonlySet<string>): AppKey[] {
  return APP_KEYS.filter((key) => available.has(key) && !seen.includes(key))
}

export function recordAppLaunch(board: HomeBoard, key: AppKey): HomeBoard {
  return { ...board, recentApps: withRecentApp(board.recentApps, key) }
}

/** marks every available app as seen; the same board when nothing is new */
export function markAppsSeen(board: HomeBoard, available: ReadonlySet<string>): HomeBoard {
  const fresh = unseenApps(board.seenApps, available)
  if (fresh.length === 0) return board
  return { ...board, seenApps: [...board.seenApps, ...fresh] }
}

/** pins an app at the end of the new card (a pinned app keeps its place), or takes it off */
export function setPinned(board: HomeBoard, key: AppKey, on: boolean): HomeBoard {
  if (on && board.pinned.includes(key)) return board
  const rest = board.pinned.filter((k) => k !== key)
  return { ...board, pinned: on ? [...rest, key] : rest }
}
