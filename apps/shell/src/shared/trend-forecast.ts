/** Trend Radar, the site behind the trend card's links (spec 7.11) */
export const TREND_SITE = 'https://trend.tenai.kr'
/** today's forecast, read by the main process */
export const TREND_FORECAST_URL = 'https://trend.tenai.kr/api/forecast'
/** added to every link the trend card opens */
export const TREND_UTM = 'utm_source=hanpan&utm_medium=home&utm_campaign=forecast'

export const TREND_FIELD_KEYS = [
  'ai',
  'opensource',
  'local-ai',
  'ai-safety',
  'stocks',
  'economy',
  'semiconductor',
  'realestate',
  'fx',
  'crypto',
] as const
export type TrendFieldKey = (typeof TREND_FIELD_KEYS)[number]
export type TrendSignal = -2 | -1 | 0 | 1 | 2
export type TrendScale = 'weather' | 'market'

export interface TrendField {
  key: TrendFieldKey
  title: string
  scale: TrendScale
  /** null: no data for this field */
  s: TrendSignal | null
  label: string
  head: string
  path: string
  /**
   * Only in the stored copy: when this field's value was made, if it was
   * carried over from an earlier forecast (plan R24). Absent means the
   * forecast's own asOf.
   */
  asOf?: string
}

export interface TrendForecast {
  schema: 1
  asOf: string
  date: string
  fields: TrendField[]
  line: string
}

export const TREND_TEXT_MAX = { title: 20, label: 10, head: 80, line: 80 } as const
export const TREND_FIELDS_MAX = 12
/** a stored field value older than this is not carried into a new forecast (plan R24) */
export const TREND_CARRY_MAX_MS = 48 * 60 * 60 * 1000

const PATH_PATTERN = /^\/(?:[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*)?$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** text within max stays; longer text keeps max - 1 characters and ends in an ellipsis (plan R26) */
export function cutText(text: string, max: number): string {
  const chars = Array.from(text)
  return chars.length <= max ? text : chars.slice(0, max - 1).join('') + '…'
}

/** a plain path on the Trend Radar site, or null; no //, :, \, ?, #, % or . can pass */
export function trendPath(raw: unknown): string | null {
  return typeof raw === 'string' && PATH_PATTERN.test(raw) ? raw : null
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFieldKey(value: unknown): value is TrendFieldKey {
  return typeof value === 'string' && (TREND_FIELD_KEYS as readonly string[]).includes(value)
}

function readSignal(value: unknown): TrendSignal | null {
  return Number.isInteger(value) && (value as number) >= -2 && (value as number) <= 2
    ? (value as TrendSignal)
    : null
}

function readText(value: unknown, max: number): string {
  return typeof value === 'string' ? cutText(value, max) : ''
}

function readField(raw: unknown): TrendField | null {
  if (!isRecord(raw) || !isFieldKey(raw.key)) return null
  const title = readText(raw.title, TREND_TEXT_MAX.title)
  const path = trendPath(raw.path)
  if (!title || path === null) return null
  const field: TrendField = {
    key: raw.key,
    title,
    scale: raw.scale === 'market' ? 'market' : 'weather',
    s: readSignal(raw.s),
    label: readText(raw.label, TREND_TEXT_MAX.label),
    head: readText(raw.head, TREND_TEXT_MAX.head),
    path,
  }
  if (isTime(raw.asOf)) field.asOf = raw.asOf
  return field
}

/**
 * Checks a forecast answer (spec 7.11, plan R11). A field that fails its
 * check is dropped; a broken answer as a whole (wrong schema, broken asOf or
 * date, no field left) is null, so the caller keeps its stored copy.
 */
export function parseTrendForecast(raw: unknown): TrendForecast | null {
  if (!isRecord(raw) || raw.schema !== 1) return null
  if (!isTime(raw.asOf)) return null
  if (typeof raw.date !== 'string' || !DATE_PATTERN.test(raw.date)) return null
  if (!Array.isArray(raw.fields)) return null
  const fields: TrendField[] = []
  for (const item of raw.fields.slice(0, TREND_FIELDS_MAX)) {
    const field = readField(item)
    if (field && !fields.some((f) => f.key === field.key)) fields.push(field)
  }
  if (fields.length === 0) return null
  return {
    schema: 1,
    asOf: raw.asOf,
    date: raw.date,
    fields,
    line: readText(raw.line, TREND_TEXT_MAX.line),
  }
}

/**
 * Field by field merge (plan R24): a field with no data in the new answer
 * takes the stored value of the same key when that value is at most 48 hours
 * older, and keeps when it was made. The new answer decides which fields
 * there are and everything else.
 */
export function mergeTrendForecast(
  fresh: TrendForecast,
  stored: TrendForecast | null,
): TrendForecast {
  if (!stored) return fresh
  const freshAt = Date.parse(fresh.asOf)
  const fields = fresh.fields.map((f): TrendField => {
    const plain: TrendField = { ...f }
    delete plain.asOf
    if (f.s !== null) return plain
    const prev = stored.fields.find((p) => p.key === f.key)
    if (!prev || prev.s === null) return plain
    const madeAt = prev.asOf ?? stored.asOf
    const age = freshAt - Date.parse(madeAt)
    if (!(age >= 0 && age <= TREND_CARRY_MAX_MS)) return plain
    return { ...plain, s: prev.s, label: prev.label, head: prev.head, asOf: madeAt }
  })
  return { ...fresh, fields }
}

/** the link the card opens: the built-in site, a checked path and the UTM tags; null opens the front page */
export function trendLinkUrl(path: string | null): string | null {
  if (path === null) return `${TREND_SITE}/?${TREND_UTM}`
  return trendPath(path) === null ? null : `${TREND_SITE}${path}?${TREND_UTM}`
}

/** the calendar date in Korea (UTC+9, no daylight saving) as YYYY-MM-DD */
export function kstDate(now: Date): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10)
}

/**
 * The {when} of the card's "as of" (spec 7.6, plan R12): the time for a
 * forecast of today in Korea, otherwise the forecast's own date. A failed
 * fetch alone does not add a date; the forecast's date decides.
 */
export function trendAsOfText(forecast: TrendForecast, now: Date, locale: string): string {
  if (forecast.date === kstDate(now)) {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Seoul',
    }).format(new Date(forecast.asOf))
  }
  return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${forecast.date}T00:00:00Z`),
  )
}

export type TrendGlyph =
  'sun' | 'sun-cloud' | 'cloud' | 'rain' | 'storm' | 'fire' | 'up' | 'flat' | 'down' | 'snow'

const WEATHER_GLYPHS: readonly TrendGlyph[] = ['storm', 'rain', 'cloud', 'sun-cloud', 'sun']
const MARKET_GLYPHS: readonly TrendGlyph[] = ['snow', 'down', 'flat', 'up', 'fire']

/** the icon for a signal on its scale (spec 7.6), the same meaning as on the site */
export function trendGlyph(scale: TrendScale, s: TrendSignal): TrendGlyph {
  return (scale === 'market' ? MARKET_GLYPHS : WEATHER_GLYPHS)[s + 2]
}
