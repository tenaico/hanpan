/**
 * 트렌드 카드의 'AI 브리핑' (0.19.1): 오늘의 기상도를 사람이 고른 AI에 한 번 보내 받은 브리핑을
 * 새 Word 문서로 만든다. 트렌드 레이더 사이트의 'AI 브리핑 생성'과 같은 형식(헤드라인, 현황,
 * 1~3개월 전망, 체크포인트)이다. 기상도는 이미 이 PC에 있는 것을 쓰고, 새로 받아 오지 않는다.
 */
import type { TrendForecast } from './trend-forecast'

export interface TrendBriefing {
  headline: string
  summary: string[]
  outlook: string[]
  watch: string[]
}

const NO_DATA = '자료 없음'

export const BRIEFING_SYSTEM = `당신은 한국어로 쓰는 트렌드 애널리스트입니다. 사용자가 보낸 오늘의 트렌드 기상도와 그 아래 재료(수치, 기사 제목, 요약)만 근거로 삼아 브리핑을 작성합니다.
형식(마크다운 없이 아래 키를 가진 JSON 하나만 출력):
{"headline":"한 문장 헤드라인","summary":["현황 요약 3~5개"],"outlook":["향후 1~3개월 전망 3~5개"],"watch":["체크포인트 2~4개"]}
규칙: 숫자는 기상도와 재료에 있는 값만 그대로 인용하고, 없는 사실은 만들지 않습니다. 기사를 근거로 쓴 문장 끝에는 그 기사 번호를 [1]처럼 붙이고, 기사 제목에 없는 내용은 지어내지 않습니다. 투자 권유 표현은 쓰지 않습니다.`

export interface BriefingArticle {
  n: number
  title: string
  source: string
  date: string
  url: string
}

/** the articles of the forecast, numbered from 1 in field order, whatever the budget */
export function briefingArticles(forecast: TrendForecast): BriefingArticle[] {
  const out: BriefingArticle[] = []
  for (const f of forecast.fields) {
    for (const a of f.news ?? []) out.push({ n: out.length + 1, ...a })
  }
  return out
}

export interface BriefingBudget {
  tokens: number
  estimate(system: string, user: string): number
}

export interface BriefingPrompt {
  system: string
  user: string
  /** the numbers of the articles the question holds */
  articles: number[]
}

/** room kept for the answer */
export const BRIEFING_ANSWER_TOKENS = 1024
/** the same line agent-core warns at; the question stays under it */
export const BRIEFING_WARNING_RATIO = 0.8

/** the most tokens the question may take in a model with this context window */
export function briefingBudget(contextTokens: number): number {
  return Math.min(
    contextTokens - BRIEFING_ANSWER_TOKENS,
    Math.ceil(contextTokens * BRIEFING_WARNING_RATIO) - 1,
  )
}

/** how much of each field's material is in the question */
interface Taken {
  facts: number
  news: number
  points: number
}

function questionText(
  forecast: TrendForecast,
  taken: Taken[],
): { user: string; articles: number[] } {
  const articles: number[] = []
  let n = 0
  const lines: string[] = []
  forecast.fields.forEach((f, i) => {
    lines.push(
      f.s === null
        ? `- ${f.title}: ${NO_DATA}`
        : `- ${f.title}: ${f.label}${f.head ? ` — ${f.head}` : ''}`,
    )
    const t = taken[i]
    const facts = (f.facts ?? []).slice(0, t.facts)
    if (facts.length > 0)
      lines.push(`  수치: ${facts.map((x) => `${x.label} ${x.value}`).join('; ')}`)
    const all = f.news ?? []
    // the number of an article is its place among all articles, shown or not
    all.forEach((a, j) => {
      n += 1
      if (j >= t.news) return
      articles.push(n)
      lines.push(`  [${n}] ${a.date} ${a.title}${a.source ? ` — ${a.source}` : ''}`)
    })
    const asOf = f.materialAsOf ? `(${f.materialAsOf} 기준)` : ''
    for (const p of (f.points ?? []).slice(0, t.points)) lines.push(`  요약${asOf}: ${p}`)
  })
  const user = [
    `기상도 날짜: ${forecast.date}`,
    '분야별 날씨(맑음이 가장 좋고 폭풍우가 가장 궂음, 부동산은 과열~침체):',
    ...lines,
    `오늘의 한 줄: ${forecast.line}`,
  ].join('\n')
  return { user, articles }
}

/**
 * the AI's question: the forecast as plain lines, one per field, with the
 * field's material under it. Material is added a stage at a time (facts, then
 * articles, then points), one item per field per round, until the next item
 * would pass the budget. The bare forecast is always sent.
 */
export function briefingPrompt(forecast: TrendForecast, budget?: BriefingBudget): BriefingPrompt {
  const taken: Taken[] = forecast.fields.map(() => ({ facts: 0, news: 0, points: 0 }))
  const stages: (keyof Taken)[] = ['facts', 'news', 'points']
  const lengthOf = (f: TrendForecast['fields'][number], k: keyof Taken) =>
    (k === 'facts' ? f.facts : k === 'news' ? f.news : f.points)?.length ?? 0
  const fits = () =>
    !budget || budget.estimate(BRIEFING_SYSTEM, questionText(forecast, taken).user) <= budget.tokens
  stage: for (const k of stages) {
    const rounds = Math.max(0, ...forecast.fields.map((f) => lengthOf(f, k)))
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < forecast.fields.length; i++) {
        if (r >= lengthOf(forecast.fields[i], k)) continue
        taken[i][k] = r + 1
        if (!fits()) {
          taken[i][k] = r
          break stage
        }
      }
    }
  }
  const { user, articles } = questionText(forecast, taken)
  return { system: BRIEFING_SYSTEM, user, articles }
}

const items = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim().replace(/^(?:[-*•·]|\d+[.)])\s+/, ''))
        .filter(Boolean)
    : []

/** the briefing in the AI's answer, or null when there is none */
export function parseBriefing(text: string): TrendBriefing | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let raw: unknown
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
  return checkBriefing(raw)
}

/** a briefing object (the AI's JSON, or what the Home page hands to main), or null */
export function checkBriefing(raw: unknown): TrendBriefing | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const headline = typeof r.headline === 'string' ? r.headline.trim() : ''
  const brief = {
    headline,
    summary: items(r.summary),
    outlook: items(r.outlook),
    watch: items(r.watch),
  }
  if (!headline || brief.summary.length === 0) return null
  return brief
}

/** what the briefing can open as (0.19.2): Word first, the one a click with no choice makes */
export const BRIEFING_FORMATS = ['docx', 'hwp', 'mindmap', 'pptx', 'pdf'] as const
export type BriefingFormat = (typeof BRIEFING_FORMATS)[number]

export function briefingFormat(raw: unknown): BriefingFormat {
  return BRIEFING_FORMATS.includes(raw as BriefingFormat) ? (raw as BriefingFormat) : 'docx'
}

export function briefingTitle(forecast: TrendForecast): string {
  return `트렌드 브리핑 ${forecast.date}`
}

/** One page block of the briefing: the shape of @genoffice/hanpan-core's DocBlock it uses */
export type BriefingBlock =
  | { kind: 'title'; text: string }
  | { kind: 'meta'; text: string }
  | { kind: 'chapter'; label: string; text: string }
  | { kind: 'item'; depth: 0; marker: string; text: string; href?: string }
  | { kind: 'para'; depth: 0; role: 'lead'; bold: true; text: string }
  | { kind: 'table'; rows: string[][]; header: true }
  | { kind: 'reference'; depth: 0; text: string }

/** a grouped citation such as [1, 2] or [1,2] */
const CITATION_GROUP = /\[(\d{1,3}(?:\s*,\s*\d{1,3})+)\]/g

/** the text with each grouped citation written one by one: [1, 2] becomes [1][2] */
export function expandCitations(text: string): string {
  return text.replace(CITATION_GROUP, (_all, list: string) =>
    list
      .split(',')
      .map((n) => `[${n.trim()}]`)
      .join(''),
  )
}

/** the numbers `[n]` the briefing cites, in its text */
function citedNumbers(brief: TrendBriefing): Set<number> {
  const text = expandCitations(
    [brief.headline, ...brief.summary, ...brief.outlook, ...brief.watch].join('\n'),
  )
  return new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))
}

/** the articles the briefing cites that the forecast really has: ascending, once each */
export function citedArticles(brief: TrendBriefing, forecast: TrendForecast): BriefingArticle[] {
  const cited = citedNumbers(brief)
  return briefingArticles(forecast).filter((a) => cited.has(a.n))
}

/** the most dropped sentences the note names */
const DROPPED_MAX = 20

/** the dropped-sentence count the page sends: a whole number, one over 20 as 20, else 0 */
export function briefingDropped(raw: unknown): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0
    ? Math.min(raw, DROPPED_MAX)
    : 0
}

/** an article as the document lists it; no separator when the source is empty */
const articleText = (a: BriefingArticle) =>
  a.source ? `${a.title} — ${a.source}, ${a.date}` : `${a.title}, ${a.date}`

/** 'AI 보안·윤리 2026-11-06' per research date, fields with one date joined, first seen first */
function materialDatesLine(forecast: TrendForecast): string | null {
  const byDate = new Map<string, string[]>()
  for (const f of forecast.fields) {
    if (!f.materialAsOf) continue
    byDate.set(f.materialAsOf, [...(byDate.get(f.materialAsOf) ?? []), f.title])
  }
  if (byDate.size === 0) return null
  return `정리 자료 기준일: ${[...byDate].map(([date, titles]) => `${titles.join('·')} ${date}`).join(', ')}`
}

/** the source line, with the note when sentences were dropped */
function sourceLine(forecast: TrendForecast, dropped: number): string {
  const note = dropped >= 1 ? ` 재료로 확인되지 않은 숫자가 있던 문장 ${dropped}개를 뺐습니다.` : ''
  return `자료: TEN AI 트렌드 레이더(trend.tenai.kr) ${forecast.date} 기상도. AI가 기상도와 재료만 보고 쓴 글이며 투자 권유가 아닙니다.${note}`
}

const CHAPTER_LABELS = ['Ⅰ.', 'Ⅱ.', 'Ⅲ.', 'Ⅳ.', 'Ⅴ.']

/**
 * The briefing as report blocks for the Word, HWP and PDF writers: the date
 * line, the headline in bold, numbered chapters (an empty one left out), the
 * forecast table and the source line.
 */
export function briefingBlocks(
  brief: TrendBriefing,
  forecast: TrendForecast,
  dropped = 0,
): BriefingBlock[] {
  const out: BriefingBlock[] = [
    { kind: 'title', text: briefingTitle(forecast) },
    { kind: 'meta', text: `TEN AI 트렌드 레이더 · ${forecast.date} 기상도` },
    { kind: 'para', depth: 0, role: 'lead', bold: true, text: brief.headline },
  ]
  let n = 0
  const chapter = (text: string) =>
    out.push({ kind: 'chapter', label: CHAPTER_LABELS[n++] ?? '', text })
  chapter('오늘의 기상도')
  out.push({
    kind: 'table',
    header: true,
    rows: [
      ['분야', '날씨', '한 줄'],
      ...forecast.fields.map((f) =>
        f.s === null ? [f.title, NO_DATA, ''] : [f.title, f.label, f.head],
      ),
    ],
  })
  const list = (text: string, values: string[]) => {
    if (values.length === 0) return
    chapter(text)
    for (const v of values) out.push({ kind: 'item', depth: 0, marker: '○', text: v })
  }
  list('현황', brief.summary)
  list('1~3개월 전망', brief.outlook)
  list('체크포인트', brief.watch)
  const sources = citedArticles(brief, forecast)
  if (sources.length > 0) {
    chapter('참고 자료')
    for (const a of sources) {
      out.push({ kind: 'item', depth: 0, marker: `[${a.n}]`, text: articleText(a), href: a.url })
    }
    const asOf = materialDatesLine(forecast)
    if (asOf) out.push({ kind: 'reference', depth: 0, text: asOf })
  }
  out.push({ kind: 'reference', depth: 0, text: sourceLine(forecast, dropped) })
  return out
}

/** a table cell: no pipe or line break breaks the table */
const cell = (text: string) => text.replace(/\|/g, '/').replace(/\s+/g, ' ').trim()

/** the briefing as Markdown, which the shell turns into a Word document */
export function briefingMarkdown(
  brief: TrendBriefing,
  forecast: TrendForecast,
  dropped = 0,
): string {
  const sources = citedArticles(brief, forecast)
  const asOf = materialDatesLine(forecast)
  const list = (values: string[]) => values.map((v) => `- ${v}`).join('\n')
  const rows = forecast.fields.map(
    (f) =>
      `| ${cell(f.title)} | ${f.s === null ? NO_DATA : cell(f.label)} | ${f.s === null ? '' : cell(f.head)} |`,
  )
  return [
    `# ${briefingTitle(forecast)}`,
    '',
    `**${brief.headline}**`,
    '',
    '## 오늘의 기상도',
    '',
    '| 분야 | 날씨 | 한 줄 |',
    '| --- | --- | --- |',
    ...rows,
    '',
    '## 현황',
    '',
    list(brief.summary),
    '',
    ...(brief.outlook.length ? ['## 1~3개월 전망', '', list(brief.outlook), ''] : []),
    ...(brief.watch.length ? ['## 체크포인트', '', list(brief.watch), ''] : []),
    ...(sources.length
      ? [
          '## 참고 자료',
          '',
          sources.map((a) => `- [${a.n}] ${articleText(a)} ${a.url}`).join('\n'),
          '',
          ...(asOf ? [asOf, ''] : []),
        ]
      : []),
    sourceLine(forecast, dropped),
    '',
  ].join('\n')
}
