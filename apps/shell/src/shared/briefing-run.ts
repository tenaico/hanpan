/**
 * One grounded AI briefing: ask, check the answer's numbers against the
 * question, ask once more with the unknown numbers named, and drop what is
 * still unknown. Citations to articles the question did not carry are removed.
 */
import { allowedNumbers, dropUnknownNumbers, unknownNumbers } from './briefing-numbers'
import {
  briefingPrompt,
  parseBriefing,
  type BriefingBudget,
  type BriefingPrompt,
  type TrendBriefing,
} from './trend-briefing'
import type { TrendForecast } from './trend-forecast'

export type BriefingTurn = { ok: true; text: string } | { ok: false; error: string }
export type GroundedBriefing =
  | { ok: true; brief: TrendBriefing; dropped: number }
  | { ok: false; error: string }

/**
 * the briefing without the [n] of an article not in the list, with the space
 * before it; an item left empty is dropped
 */
export function keepCitations(brief: TrendBriefing, articles: readonly number[]): TrendBriefing {
  const keep = (text: string) =>
    text
      .replace(/ ?\[(\d{1,3})\]/g, (all, n: string) => (articles.includes(Number(n)) ? all : ''))
      .trim()
  const list = (values: string[]) => values.map(keep).filter(Boolean)
  return {
    headline: keep(brief.headline),
    summary: list(brief.summary),
    outlook: list(brief.outlook),
    watch: list(brief.watch),
  }
}

/** an emptied headline or summary becomes the line, so the briefing still opens */
const opening = (brief: TrendBriefing, line: string): TrendBriefing => ({
  ...brief,
  headline: brief.headline || line,
  summary: brief.summary.length > 0 ? brief.summary : [line],
})

/** the second question: the first, the earlier answer and the numbers to fix */
export function briefingFixPrompt(
  prompt: BriefingPrompt,
  answer: string,
  unknown: readonly string[],
): { system: string; user: string } {
  return {
    system: prompt.system,
    user: [
      prompt.user,
      '',
      '앞선 답:',
      answer,
      '',
      `앞선 답에 재료에 없는 숫자가 있습니다: ${unknown.join(', ')}`,
      '재료에 있는 값으로 고치거나 그 문장을 빼고, 같은 JSON 형식으로 다시 쓰세요.',
    ].join('\n'),
  }
}

export async function groundedBriefing(
  forecast: TrendForecast,
  ask: (prompt: { system: string; user: string }) => Promise<BriefingTurn>,
  budget?: BriefingBudget,
): Promise<GroundedBriefing> {
  const prompt = briefingPrompt(forecast, budget)
  const first = await ask({ system: prompt.system, user: prompt.user })
  if (!first.ok) return { ok: false, error: first.error }
  const parsed = parseBriefing(first.text)
  if (!parsed) return { ok: false, error: '' }
  let brief = opening(keepCitations(parsed, prompt.articles), forecast.line)
  const allowed = allowedNumbers(prompt.user, forecast.date)
  const unknown = unknownNumbers(brief, allowed, forecast.date)
  if (unknown.length === 0) return { ok: true, brief, dropped: 0 }
  const fix = briefingFixPrompt(prompt, first.text, unknown)
  // a second question past the budget is not asked; the first answer is trimmed instead
  if (!budget || budget.estimate(fix.system, fix.user) <= budget.tokens) {
    const second = await ask(fix)
    const again = second.ok ? parseBriefing(second.text) : null
    if (again) brief = opening(keepCitations(again, prompt.articles), forecast.line)
  }
  return { ok: true, ...dropUnknownNumbers(brief, allowed, forecast.date, forecast.line) }
}
