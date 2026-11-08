/**
 * Korean document item markers.
 *
 * Two systems, never mixed in one document:
 * - the internal report (보고서) symbol ladder □ ○ ― ※, with Ⅰ. Ⅱ. chapters
 *   when the report is split into chapters;
 * - the official letter (공문서) number ladder of the 행정업무운영 편람:
 *   1. → 가. → 1) → 가) → (1) → (가) → ① → ㉮.
 */

export type MarkerStyle = 'report' | 'chapter-report' | 'gongmun' | 'outline'

/** Report symbols by depth; deeper than the list repeats the last one. */
export const REPORT_SYMBOLS = ['□', '○', '―', '·'] as const

const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ']
const GANADA = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하']
const CIRCLED_DIGITS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
const CIRCLED_GANADA = '㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻'

export function romanNumeral(n: number): string {
  return ROMAN[n - 1] ?? String(n)
}

/** 가, 나, ... 하, then 거, 너 ... (편람 says to continue with 거너더 after 하). */
export function ganada(n: number): string {
  if (n <= GANADA.length) return GANADA[n - 1]!
  const second = [
    '거',
    '너',
    '더',
    '러',
    '머',
    '버',
    '서',
    '어',
    '저',
    '처',
    '커',
    '터',
    '퍼',
    '허',
  ]
  return second[n - GANADA.length - 1] ?? String(n)
}

/** The official-letter marker for the `n`th (1-based) item at `depth` (0-based). */
export function gongmunMarker(depth: number, n: number): string {
  switch (depth) {
    case 0:
      return `${n}.`
    case 1:
      return `${ganada(n)}.`
    case 2:
      return `${n})`
    case 3:
      return `${ganada(n)})`
    case 4:
      return `(${n})`
    case 5:
      return `(${ganada(n)})`
    case 6:
      return CIRCLED_DIGITS[n - 1] ?? `(${n})`
    default:
      return CIRCLED_GANADA[n - 1] ?? `(${ganada(n)})`
  }
}

export function reportMarker(depth: number): string {
  return REPORT_SYMBOLS[Math.min(depth, REPORT_SYMBOLS.length - 1)]!
}

/**
 * The marker for the `n`th of `siblings` items at `depth`.
 * `gongmun`: a lone item gets no number (편람: 항목이 하나뿐이면 항목기호를 붙이지 않는다).
 * `chapter-report`: depth 0 is the chapter (Ⅰ.), the symbol ladder starts at depth 1.
 * `outline`: Hanpan without its Korean document features (decision 0091): chapters
 * numbered 1. 2., then • and – under them.
 */
export function markerFor(style: MarkerStyle, depth: number, n: number, siblings: number): string {
  if (style === 'outline') return depth === 0 ? `${n}.` : depth === 1 ? '•' : '–'
  if (style === 'gongmun') return siblings === 1 ? '' : gongmunMarker(depth, n)
  if (style === 'chapter-report')
    return depth === 0 ? `${romanNumeral(n)}.` : reportMarker(depth - 1)
  return reportMarker(depth)
}

/** Every marker any of the systems can put in front of an item, for stripping when reading a document back. */
const MARKER_PATTERN =
  /^\s*(?:[□■○●◦―\-–·•※]|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]\.|\d{1,3}[.)]|[가-힣][.)]|\(\d{1,3}\)|\([가-힣]\)|[①-⑳]|[㉮-㉻])\s*/

/** The text with its leading item marker (any system) removed. */
export function stripMarker(text: string): string {
  return text.replace(MARKER_PATTERN, '')
}

/** The leading marker of `text`, or '' when it has none. */
export function leadingMarker(text: string): string {
  const m = MARKER_PATTERN.exec(text)
  return m ? m[0].trim() : ''
}
