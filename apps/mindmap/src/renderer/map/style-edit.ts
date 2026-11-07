/**
 * The values the Style tab, its shortcuts, the format painter and the AI put
 * into a topic's own style. Every value here is in the one form the engine
 * writes (`isWritableStyleValue`); what a file holds in another form is only
 * ever kept or taken off, never copied.
 */
import {
  isWritableStyleValue,
  STYLE_KEYS,
  type StyleKey,
  type ViewTopicStyle,
} from '@genoffice/xmind-engine'
import { safeDecoration } from './style-values'

/** Values to set on a topic's own style; null takes one off, a missing key leaves it. */
export type StylePatch = Partial<Record<StyleKey, string | null>>

/** Whether every value a patch sets is one the file takes. */
export function isWritablePatch(patch: StylePatch): boolean {
  return Object.entries(patch).every(
    ([key, value]) =>
      (STYLE_KEYS as readonly string[]).includes(key) &&
      (value === null || value === undefined || isWritableStyleValue(key as StyleKey, value)),
  )
}

/** A style with a patch put on it; the style given is left as it is. */
export function withStylePatch(style: ViewTopicStyle, patch: StylePatch): ViewTopicStyle {
  const next: ViewTopicStyle = { ...style }
  for (const key of STYLE_KEYS) {
    if (!(key in patch)) continue
    const value = patch[key]
    if (value === null || value === undefined) delete next[key]
    else next[key] = value
  }
  return next
}

export function sameStyle(a: ViewTopicStyle, b: ViewTopicStyle): boolean {
  return STYLE_KEYS.every((key) => (a[key] ?? null) === (b[key] ?? null))
}

/**
 * What the format painter puts on a topic from the topic it copies: every
 * value the source sets in a form the file takes, and every value it does
 * not set taken off. A source value in another form is not copied, and the
 * value of the target for it stays.
 */
export function paintPatch(source: ViewTopicStyle): StylePatch {
  const patch: StylePatch = {}
  for (const key of STYLE_KEYS) {
    const value = source[key]
    if (value === undefined) patch[key] = null
    else if (isWritableStyleValue(key, value)) patch[key] = value
  }
  return patch
}

/** The patch that takes every value of a topic's own style off. */
export function clearPatch(): StylePatch {
  return Object.fromEntries(STYLE_KEYS.map((key) => [key, null])) as StylePatch
}

/**
 * The text decoration with underline or strike-through turned on or off,
 * from the one a topic sets; null (taken off) when neither is left.
 */
export function toggledDecoration(
  current: string | undefined,
  which: 'underline' | 'line-through',
  on: boolean,
): string | null {
  const now = safeDecoration(current) ?? { underline: false, lineThrough: false }
  const underline = which === 'underline' ? on : now.underline
  const lineThrough = which === 'line-through' ? on : now.lineThrough
  const words = [underline ? 'underline' : '', lineThrough ? 'line-through' : ''].filter(Boolean)
  return words.length === 0 ? null : words.join(' ')
}

/** The text sizes the grow and shrink buttons step through, in points. */
export const FONT_SIZE_STEPS = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72,
] as const

/** The next size up or down from a drawn size in CSS pixels, in the form the file takes; null at either end. */
export function steppedFontSize(drawnPx: number, up: boolean): string | null {
  // the file's points are 4/3 of a CSS pixel
  const points = (drawnPx * 3) / 4
  const next = up
    ? FONT_SIZE_STEPS.find((step) => step > points + 0.25)
    : [...FONT_SIZE_STEPS].reverse().find((step) => step < points - 0.25)
  return next === undefined ? null : `${next}pt`
}

/** The widths the outline and line menus offer, in points. */
export const LINE_WIDTH_STEPS = [1, 2, 3, 4, 6] as const

/** The font families the Style tab offers. Each passes the engine's check (letters, digits, spaces, hyphens). */
export const FONT_FAMILIES = [
  'Malgun Gothic',
  'Noto Sans KR',
  'Nanum Gothic',
  'Nanum Myeongjo',
  'Arial',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
] as const

/** Korean names of the Korean fonts of the list, as Windows and the slide editor show them. */
const KOREAN_FONT_NAMES: Readonly<Record<string, string>> = {
  'Malgun Gothic': '맑은 고딕',
  'Noto Sans KR': '본고딕(Noto Sans KR)',
  'Nanum Gothic': '나눔고딕',
  'Nanum Myeongjo': '나눔명조',
}

/** How the font list names a family: in Korean for a Korean font when the app is in Korean. */
export function fontFamilyName(family: string, lang: string): string {
  return (lang === 'ko' && KOREAN_FONT_NAMES[family]) || family
}

/** The colours every colour menu offers after the theme's own: black, white, grey and six clear hues. */
export const BASIC_COLORS = [
  '#000000',
  '#ffffff',
  '#868e96',
  '#e03131',
  '#f08c00',
  '#f5c400',
  '#2f9e44',
  '#1971c2',
  '#7048e8',
] as const
