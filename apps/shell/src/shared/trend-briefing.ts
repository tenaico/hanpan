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

export const BRIEFING_SYSTEM = `당신은 한국어로 쓰는 트렌드 애널리스트입니다. 사용자가 보낸 오늘의 트렌드 기상도만 근거로 삼아 브리핑을 작성합니다.
형식(마크다운 없이 아래 키를 가진 JSON 하나만 출력):
{"headline":"한 문장 헤드라인","summary":["현황 요약 3~5개"],"outlook":["향후 1~3개월 전망 3~5개"],"watch":["체크포인트 2~4개"]}
규칙: 숫자는 기상도에 있는 값만 인용하고, 기상도에 없는 사실은 만들지 않습니다. 투자 권유 표현은 쓰지 않습니다.`

/** the AI's question: the forecast as plain lines, one per field */
export function briefingPrompt(forecast: TrendForecast): { system: string; user: string } {
  const lines = forecast.fields.map((f) =>
    f.s === null
      ? `- ${f.title}: ${NO_DATA}`
      : `- ${f.title}: ${f.label}${f.head ? ` — ${f.head}` : ''}`,
  )
  const user = [
    `기상도 날짜: ${forecast.date}`,
    '분야별 날씨(맑음이 가장 좋고 폭풍우가 가장 궂음, 부동산은 과열~침체):',
    ...lines,
    `오늘의 한 줄: ${forecast.line}`,
  ].join('\n')
  return { system: BRIEFING_SYSTEM, user }
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
  | { kind: 'item'; depth: 0; marker: string; text: string }
  | { kind: 'para'; depth: 0; role: 'lead'; bold: true; text: string }
  | { kind: 'table'; rows: string[][]; header: true }
  | { kind: 'reference'; depth: 0; text: string }

const CHAPTER_LABELS = ['Ⅰ.', 'Ⅱ.', 'Ⅲ.', 'Ⅳ.', 'Ⅴ.']

/**
 * The briefing as report blocks for the Word, HWP and PDF writers: the date
 * line, the headline in bold, numbered chapters (an empty one left out), the
 * forecast table and the source line.
 */
export function briefingBlocks(brief: TrendBriefing, forecast: TrendForecast): BriefingBlock[] {
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
  out.push({
    kind: 'reference',
    depth: 0,
    text: `자료: TEN AI 트렌드 레이더(trend.tenai.kr) ${forecast.date} 기상도. AI가 기상도만 보고 쓴 글이며 투자 권유가 아닙니다.`,
  })
  return out
}

/** a table cell: no pipe or line break breaks the table */
const cell = (text: string) => text.replace(/\|/g, '/').replace(/\s+/g, ' ').trim()

/** the briefing as Markdown, which the shell turns into a Word document */
export function briefingMarkdown(brief: TrendBriefing, forecast: TrendForecast): string {
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
    `자료: TEN AI 트렌드 레이더(trend.tenai.kr) ${forecast.date} 기상도. AI가 기상도만 보고 쓴 글이며 투자 권유가 아닙니다.`,
    '',
  ].join('\n')
}
