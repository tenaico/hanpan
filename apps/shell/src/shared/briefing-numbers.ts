/**
 * The numbers of the AI briefing against the question's material: a number
 * the question did not carry is one the AI made up. The check reads values,
 * not text, so "5019" matches "5,019" and "6.78% 하락" matches "-6.78%".
 */
import type { TrendBriefing } from './trend-briefing'

/** an article citation such as [2] */
const CITATION = /\[\d{1,3}\]/g
/** small counts and spans that are not material values: 3개월, 1~3개월, 2분기, 11월 */
const EXEMPT =
  /(?<!\d)(?:1[0-2]|[1-9])(?:\s*[~∼\-–]\s*(?:1[0-2]|[1-9]))?\s*(?:개월|분기|가지|월|주|일|개|위)/g
const NUMBER = /[+\-−]?\d[\d,]*(?:\.\d+)?%?/g
const LATIN = /[A-Za-z]/

/** the shape two numbers are compared in: no sign, comma, trailing % or leading zero */
function valueOf(raw: string): string {
  return raw
    .replace(/[+\-−,]/g, '')
    .replace(/%$/, '')
    .replace(/^0+(?=\d)/, '')
}

/** the numbers of a text, each as written and as compared */
function numbersIn(text: string): { raw: string; value: string }[] {
  const plain = text.replace(CITATION, ' ').replace(EXEMPT, ' ')
  const out: { raw: string; value: string }[] = []
  for (const m of plain.matchAll(NUMBER)) {
    const start = m.index ?? 0
    // digits after a Latin letter are a name, not a value: HBM3E, H100, GPT-5;
    // a Latin unit after the digits is still a value: 0.25%p, 3nm, 128GB
    if (LATIN.test(plain.charAt(start - 1))) continue
    const raw = m[0].replace(/,+$/, '')
    out.push({ raw, value: valueOf(raw) })
  }
  return out
}

/** the year, month and day of the forecast date, always allowed */
const dateValues = (date: string) => date.split('-').filter(Boolean).map(valueOf)

/** the values the question carries, with the forecast date */
export function allowedNumbers(user: string, date: string): Set<string> {
  return new Set([...numbersIn(user).map((n) => n.value), ...dateValues(date)])
}

const texts = (brief: TrendBriefing) => [
  brief.headline,
  ...brief.summary,
  ...brief.outlook,
  ...brief.watch,
]

function unknownIn(text: string, allowed: Set<string>, date: string): string[] {
  const dates = new Set(dateValues(date))
  return numbersIn(text)
    .filter((n) => !allowed.has(n.value) && !dates.has(n.value))
    .map((n) => n.raw)
}

/** the numbers of the briefing the question did not carry, first seen first, as written */
export function unknownNumbers(brief: TrendBriefing, allowed: Set<string>, date: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const text of texts(brief)) {
    for (const raw of unknownIn(text, allowed, date)) {
      const value = valueOf(raw)
      if (seen.has(value)) continue
      seen.add(value)
      out.push(raw)
    }
  }
  return out
}

/**
 * the briefing without the items that carry an unknown number; such a
 * headline becomes the line of the day. An emptied summary becomes the line,
 * since a briefing without one does not open.
 */
export function dropUnknownNumbers(
  brief: TrendBriefing,
  allowed: Set<string>,
  date: string,
  line: string,
): { brief: TrendBriefing; dropped: number } {
  let dropped = 0
  const known = (text: string) => unknownIn(text, allowed, date).length === 0
  const keep = (values: string[]) =>
    values.filter((v) => {
      if (known(v)) return true
      dropped += 1
      return false
    })
  const headline = known(brief.headline) ? brief.headline : (dropped++, line)
  const summary = keep(brief.summary)
  const outlook = keep(brief.outlook)
  const watch = keep(brief.watch)
  return {
    brief: { headline, summary: summary.length > 0 ? summary : [line], outlook, watch },
    dropped,
  }
}
