/**
 * The numbers of the AI briefing against the question's material: a number
 * the question did not carry is one the AI made up. The check reads values,
 * not text, so "5019" matches "5,019" and "6.78% 하락" matches "-6.78%".
 */
import { expandCitations, type TrendBriefing } from './trend-briefing'

/** an article citation such as [2]; a group such as [1, 2] is expanded first */
const CITATION = /\[\d{1,3}\]/g
/** a written date: 2026-11-09, 2026.11.09, 2026/11/09 (month and day captured) */
const FULL_DATE = /(?<![\d.,])(?:19|20)\d{2}([-./])(0?[1-9]|1[0-2])\1(0?[1-9]|[12]\d|3[01])(?!\d)/g
/** a written year and month: 2026.11, 2026/11 */
const YEAR_MONTH = /(?<![\d.,])(?:19|20)\d{2}[./](?:0[1-9]|1[0-2])(?![\d%]|[.,]\d)/g
/** a month and day in words or with a slash: 10월 30일, 10/30 */
const MONTH_DAY =
  /(?<![\d.,/])(1[0-2]|0?[1-9])(?:\s*월\s*(3[01]|[12]\d|0?[1-9])\s*일|\/(3[01]|[12]\d|0?[1-9])(?![\d/]))/g
/** small counts and spans that are not material values: 3개월, 1~3개월, 2분기, 11월 */
const EXEMPT =
  /(?<![\d.,])(?:1[0-2]|[1-9])(?:\s*[~∼\-–]\s*(?:1[0-2]|[1-9]))?\s*(?:개월|분기|가지|월|주|일|개|위)/g
const NUMBER = /[+\-−]?\d[\d,]*(?:\.\d+)?%?/g
const LATIN = /[A-Za-z]/

/** a month and day as the date check compares them: '10-30' */
const monthDay = (month: string, day: string) => `${Number(month)}-${Number(day)}`

/** what the answer may carry: the values of the question, and the month-days of its dates */
export interface AllowedNumbers {
  values: Set<string>
  dates: Set<string>
}

/** the shape two numbers are compared in: no sign, comma, trailing % or leading zero */
function valueOf(raw: string): string {
  return raw
    .replace(/[+\-−,]/g, '')
    .replace(/%$/, '')
    .replace(/^0+(?=\d)/, '')
}

/**
 * the numbers of a text, each as written and as compared. Citations and
 * written dates are not values; a month and day is not one either when it is
 * among the given dates.
 */
function numbersIn(
  text: string,
  dates: ReadonlySet<string> = new Set(),
): { raw: string; value: string }[] {
  const plain = expandCitations(text)
    .replace(CITATION, ' ')
    .replace(FULL_DATE, ' ')
    .replace(YEAR_MONTH, ' ')
    .replace(MONTH_DAY, (all, month: string, wordDay?: string, slashDay?: string) =>
      dates.has(monthDay(month, wordDay ?? slashDay ?? '')) ? ' ' : all,
    )
    .replace(EXEMPT, ' ')
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

/**
 * the values the question carries, with the parts of the forecast date. The
 * other dates of the question (article and research dates) give no values:
 * only their month and day, written as a date, may appear in the answer.
 */
export function allowedNumbers(user: string, date: string): AllowedNumbers {
  const dates = new Set<string>()
  for (const m of `${user}\n${date}`.matchAll(FULL_DATE)) dates.add(monthDay(m[2]!, m[3]!))
  return {
    values: new Set([...numbersIn(user).map((n) => n.value), ...dateValues(date)]),
    dates,
  }
}

const texts = (brief: TrendBriefing) => [
  brief.headline,
  ...brief.summary,
  ...brief.outlook,
  ...brief.watch,
]

function unknownIn(text: string, allowed: AllowedNumbers, date: string): string[] {
  const parts = new Set(dateValues(date))
  return numbersIn(text, allowed.dates)
    .filter((n) => !allowed.values.has(n.value) && !parts.has(n.value))
    .map((n) => n.raw)
}

/** the numbers of the briefing the question did not carry, first seen first, as written */
export function unknownNumbers(
  brief: TrendBriefing,
  allowed: AllowedNumbers,
  date: string,
): string[] {
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
  allowed: AllowedNumbers,
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
