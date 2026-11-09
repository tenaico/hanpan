/**
 * 0.17 위젯 및 인터페이스 사용자화: how the person arranged Home — the widgets
 * they placed (each with its own options), which app cards show and in what
 * order, and the apps pinned to the favorites widget. Stored in
 * userData/app-settings.json under `homeLayout`; anything unreadable falls back
 * to the defaults one field (or one widget) at a time, so a damaged value never
 * blanks Home. Only the trend card shows data from the network: the forecast
 * the main process fetched (src/main/trend, docs/security.md).
 */

export const HOME_LAYOUT_SETTING_KEY = 'homeLayout'

export const HOME_WIDGET_TYPES = [
  'recent',
  'favorites',
  'memo',
  'shortcut',
  'folder',
  'clock',
] as const
export type HomeWidgetType = (typeof HOME_WIDGET_TYPES)[number]
export type HomeWidgetSize = 'small' | 'wide'

/** recent documents and favorites show the same lists everywhere: one of each is enough */
export const SINGLE_WIDGET_TYPES: readonly HomeWidgetType[] = ['recent', 'favorites']

export const HOME_MEMO_MAX = 2000
export const HOME_TITLE_MAX = 60
export const HOME_WIDGET_MAX = 24
const PATH_MAX = 4096
const URL_MAX = 2048

/** what a shortcut opens */
export type ShortcutKind = 'file' | 'folder' | 'app' | 'link'
export interface ShortcutTarget {
  kind: ShortcutKind
  value: string
}

interface WidgetBase {
  /** stable id, unique within the layout */
  id: string
  size: HomeWidgetSize
  /** the person's title; '' shows the widget type's own name */
  title: string
}
export type HomeWidget =
  | (WidgetBase & { type: 'recent' | 'favorites' | 'clock' })
  | (WidgetBase & { type: 'memo'; text: string })
  | (WidgetBase & { type: 'shortcut'; target: ShortcutTarget | null })
  | (WidgetBase & { type: 'folder'; path: string })

export interface HomeLayout {
  /** the widgets in display order */
  widgets: HomeWidget[]
  /** app card keys in the order the person put them; cards not listed keep their default place after */
  cardOrder: string[]
  hiddenCards: string[]
  /** app cards pinned to the favorites widget */
  pinnedApps: string[]
}

/** app card keys are the `data-new` keys of Home's cards */
const CARD_KEY = /^[a-z0-9][a-z0-9-]{0,31}$/
const WIDGET_ID = /^[a-z0-9][a-z0-9-]{0,39}$/
const MAX_KEYS = 64

export const DEFAULT_HOME_LAYOUT: HomeLayout = Object.freeze({
  widgets: [
    { id: 'recent', type: 'recent', size: 'small', title: '' },
    { id: 'favorites', type: 'favorites', size: 'small', title: '' },
    { id: 'memo', type: 'memo', size: 'small', title: '', text: '' },
  ],
  cardOrder: [],
  hiddenCards: [],
  pinnedApps: [],
}) as HomeLayout

/** an absolute local path: `C:\…`, `\\server\…` or `/…` */
export function isAbsolutePath(value: string): boolean {
  return /^(?:[a-zA-Z]:[\\/]|\\\\[^\\]|\/)/.test(value)
}

/** an http(s) address, written out in full; anything else (file:, javascript:, bare words) is null */
export function validLinkUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > URL_MAX) return null
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

export function normalizeShortcutTarget(raw: unknown): ShortcutTarget | null {
  if (!raw || typeof raw !== 'object') return null
  const { kind, value } = raw as Record<string, unknown>
  if (typeof value !== 'string') return null
  if (kind === 'link') {
    const href = validLinkUrl(value)
    return href ? { kind, value: href } : null
  }
  if (kind === 'file' || kind === 'folder') {
    return value.length <= PATH_MAX && isAbsolutePath(value) ? { kind, value } : null
  }
  if (kind === 'app') return CARD_KEY.test(value) ? { kind, value } : null
  return null
}

function text(raw: unknown, max: number): string {
  return typeof raw === 'string' ? raw.slice(0, max) : ''
}

function normalizeWidget(raw: unknown): HomeWidget | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Record<string, unknown>
  const type = HOME_WIDGET_TYPES.find((t) => t === value.type)
  if (!type || typeof value.id !== 'string' || !WIDGET_ID.test(value.id)) return null
  const base: WidgetBase = {
    id: value.id,
    size: value.size === 'wide' ? 'wide' : 'small',
    title: text(value.title, HOME_TITLE_MAX),
  }
  switch (type) {
    case 'memo':
      return { ...base, type, text: text(value.text, HOME_MEMO_MAX) }
    case 'shortcut':
      return { ...base, type, target: normalizeShortcutTarget(value.target) }
    case 'folder': {
      const path = text(value.path, PATH_MAX)
      return { ...base, type, path: isAbsolutePath(path) ? path : '' }
    }
    default:
      return { ...base, type }
  }
}

function keyList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const keys = raw.filter((key): key is string => typeof key === 'string' && CARD_KEY.test(key))
  return [...new Set(keys)].slice(0, MAX_KEYS)
}

function defaultWidgets(): HomeWidget[] {
  return DEFAULT_HOME_LAYOUT.widgets.map((widget) => ({ ...widget }))
}

/** the first 0.17 draft kept one memo and a fixed set of widgets */
function widgetsFromDraft(value: Record<string, unknown>): HomeWidget[] | null {
  if (!Array.isArray(value.widgetOrder)) return null
  const hidden = Array.isArray(value.hiddenWidgets) ? value.hiddenWidgets : []
  const shown = [...new Set(value.widgetOrder)].filter(
    (type): type is 'recent' | 'favorites' | 'memo' =>
      (type === 'recent' || type === 'favorites' || type === 'memo') && !hidden.includes(type),
  )
  return shown.map((type) =>
    type === 'memo'
      ? { id: 'memo', type, size: 'small', title: '', text: text(value.memo, HOME_MEMO_MAX) }
      : { id: type, type, size: 'small', title: '' },
  )
}

function widgetList(value: Record<string, unknown>): HomeWidget[] {
  if (!Array.isArray(value.widgets)) return widgetsFromDraft(value) ?? defaultWidgets()
  const out: HomeWidget[] = []
  for (const raw of value.widgets) {
    const widget = normalizeWidget(raw)
    if (!widget || out.some((w) => w.id === widget.id)) continue
    if (SINGLE_WIDGET_TYPES.includes(widget.type) && out.some((w) => w.type === widget.type))
      continue
    out.push(widget)
    if (out.length === HOME_WIDGET_MAX) break
  }
  return out
}

export function normalizeHomeLayout(raw: unknown): HomeLayout {
  const value =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    widgets: widgetList(value),
    cardOrder: keyList(value.cardOrder),
    hiddenCards: keyList(value.hiddenCards),
    pinnedApps: keyList(value.pinnedApps),
  }
}

// ---- widgets ----

function newWidgetId(layout: HomeLayout, type: HomeWidgetType): string {
  for (;;) {
    const id = `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    if (!layout.widgets.some((w) => w.id === id)) return id
  }
}

/** whether the gallery can still add `type` */
export function canAddWidget(layout: HomeLayout, type: HomeWidgetType): boolean {
  if (layout.widgets.length >= HOME_WIDGET_MAX) return false
  return !SINGLE_WIDGET_TYPES.includes(type) || !layout.widgets.some((w) => w.type === type)
}

/** a new widget of `type` at the end; `id` is null when nothing could be added */
export function addWidget(
  layout: HomeLayout,
  type: HomeWidgetType,
): { layout: HomeLayout; id: string | null } {
  if (!canAddWidget(layout, type)) return { layout, id: null }
  const id = newWidgetId(layout, type)
  const widget = normalizeWidget({ id, type, text: '', target: null, path: '' })!
  return { layout: { ...layout, widgets: [...layout.widgets, widget] }, id }
}

export function removeWidget(layout: HomeLayout, id: string): HomeLayout {
  return { ...layout, widgets: layout.widgets.filter((w) => w.id !== id) }
}

/** change a widget's options; its id and type stay, and the result is cleaned up like stored data */
export function updateWidget(
  layout: HomeLayout,
  id: string,
  patch: Partial<Record<string, unknown>>,
): HomeLayout {
  return {
    ...layout,
    widgets: layout.widgets.map((w) => {
      if (w.id !== id) return w
      return normalizeWidget({ ...w, ...patch, id: w.id, type: w.type }) ?? w
    }),
  }
}

/** one place earlier (-1) or later (1) */
export function moveWidget(layout: HomeLayout, id: string, delta: -1 | 1): HomeLayout {
  const at = layout.widgets.findIndex((w) => w.id === id)
  const to = at + delta
  if (at === -1 || to < 0 || to >= layout.widgets.length) return layout
  const widgets = [...layout.widgets]
  ;[widgets[at], widgets[to]] = [widgets[to]!, widgets[at]!]
  return { ...layout, widgets }
}

/** a dragged widget takes the dropped-on widget's place */
export function moveWidgetTo(layout: HomeLayout, id: string, targetId: string): HomeLayout {
  const from = layout.widgets.findIndex((w) => w.id === id)
  const to = layout.widgets.findIndex((w) => w.id === targetId)
  if (from === -1 || to === -1 || from === to) return layout
  const widgets = [...layout.widgets]
  const [moved] = widgets.splice(from, 1)
  widgets.splice(to, 0, moved!)
  return { ...layout, widgets }
}

// ---- app cards ----

/** `keys` in the stored `order`; keys the order does not name follow in their own order */
export function arrangeKeys<K extends string>(keys: readonly K[], order: readonly string[]): K[] {
  const rank = (key: K) => {
    const at = order.indexOf(key)
    return at === -1 ? order.length + keys.indexOf(key) : at
  }
  return [...keys].sort((a, b) => rank(a) - rank(b))
}

/**
 * Move `key` one place up (-1) or down (1) among `keys` as currently arranged;
 * returns the new stored order, keeping keys of other groups after.
 */
export function moveKey<K extends string>(
  keys: readonly K[],
  order: readonly string[],
  key: K,
  delta: -1 | 1,
): string[] {
  const arranged: string[] = arrangeKeys(keys, order)
  const rest = order.filter((k) => !arranged.includes(k))
  const at = arranged.indexOf(key)
  const to = at + delta
  if (at !== -1 && to >= 0 && to < arranged.length) {
    arranged[at] = arranged[to]!
    arranged[to] = key
  }
  return [...arranged, ...rest]
}

export function toggleKey<K extends string>(list: readonly K[], key: K): K[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
}

/** "기본값으로 되돌리기": the default widgets and cards */
export function resetHomeLayout(): HomeLayout {
  return normalizeHomeLayout({ widgets: defaultWidgets() })
}
