import { describe, expect, it } from 'vitest'
import { CONTEXT_WARNING_RATIO, estimatePromptTokens } from '@genoffice/agent-core'
import {
  BRIEFING_FORMATS,
  BRIEFING_WARNING_RATIO,
  briefingArticles,
  briefingBudget,
  briefingDropped,
  briefingBlocks,
  briefingFormat,
  briefingMarkdown,
  briefingPrompt,
  briefingTitle,
  checkBriefing,
  citedArticles,
  parseBriefing,
} from '../src/shared/trend-briefing'
import type { TrendField, TrendForecast } from '../src/shared/trend-forecast'

/** 트렌드 카드의 'AI 브리핑' (0.19.1): 오늘의 기상도 → AI 한 번 → 새 Word 문서 */
const forecast: TrendForecast = {
  schema: 1,
  asOf: '2026-11-09T23:37:30.600Z',
  date: '2026-11-10',
  line: '반도체·AI 트렌드 Big 5는 맑은 편이고, 주식은 궂은 편입니다.',
  fields: [
    {
      key: 'semiconductor',
      title: '반도체',
      scale: 'weather',
      s: 2,
      label: '맑음',
      head: '삼성전자 영업이익 107.4조 원',
      path: '/semiconductor',
    },
    {
      key: 'stocks',
      title: '주식',
      scale: 'weather',
      s: -2,
      label: '폭풍우',
      head: '코스피 5,019 (-6.78%)',
      path: '/stocks',
    },
    {
      key: 'realestate',
      title: '부동산',
      scale: 'market',
      s: null,
      label: '',
      head: '',
      path: '/realestate',
    },
  ],
}

describe('briefingPrompt', () => {
  it('asks for one JSON object from the forecast alone, without investment advice', () => {
    const { system, user } = briefingPrompt(forecast)
    expect(system).toContain('"headline"')
    expect(system).toContain('"outlook"')
    expect(system).toContain('투자 권유')
    expect(user).toContain('2026-11-10')
    expect(user).toContain('코스피 5,019 (-6.78%)')
    expect(user).toContain('반도체')
    // a field without data says so instead of an empty label
    expect(user).toContain('자료 없음')
  })
})

/** the question 0.19.2 asked for the forecast above, kept as it was */
const USER_0192 = [
  '기상도 날짜: 2026-11-10',
  '분야별 날씨(맑음이 가장 좋고 폭풍우가 가장 궂음, 부동산은 과열~침체):',
  '- 반도체: 맑음 — 삼성전자 영업이익 107.4조 원',
  '- 주식: 폭풍우 — 코스피 5,019 (-6.78%)',
  '- 부동산: 자료 없음',
  '오늘의 한 줄: 반도체·AI 트렌드 Big 5는 맑은 편이고, 주식은 궂은 편입니다.',
].join('\n')

const S1_URL = 'https://news.google.com/rss/articles/s1?a=1&b=2'
const F1_URL = 'https://news.google.com/rss/articles/f1'
const article = (title: string, source: string, date: string, url = 'https://example.com/a') => ({
  title,
  source,
  date,
  url,
})
const fx: TrendField = {
  key: 'fx',
  title: '환율',
  scale: 'weather',
  s: 0,
  label: '흐림',
  head: '원·달러 1,470원',
  path: '/fx',
  news: [article('F1', '한국경제', '2026-11-08', F1_URL)],
  materialAsOf: '2026-10-30',
}
const withMaterial: TrendForecast = {
  ...forecast,
  fields: [
    ...forecast.fields.map((f) =>
      f.key === 'stocks'
        ? {
            ...f,
            facts: [
              { label: '코스피', value: '5,019 (-6.78%)' },
              { label: '코스피 1개월', value: '-26.2%' },
            ],
            news: [
              article('S1', '연합뉴스', '2026-11-09', S1_URL),
              article('S2', '매일경제', '2026-11-08'),
            ],
            points: ['외국인 순매도가 9거래일째 이어졌다.'],
            materialAsOf: '2026-10-30',
          }
        : f,
    ),
  ].flatMap((f) => (f.key === 'stocks' ? [f, fx] : [f])),
}
const withoutMaterial = (f: TrendForecast): TrendForecast => ({
  ...f,
  fields: f.fields.map((x): TrendField => {
    const rest: TrendField = { ...x }
    delete rest.facts
    delete rest.points
    delete rest.news
    delete rest.materialAsOf
    return rest
  }),
})
const bigMaterial: TrendForecast = {
  ...forecast,
  fields: Array.from({ length: 10 }, (_, i) => ({
    key: forecast.fields[0].key,
    title: `분야${i}`,
    scale: 'weather' as const,
    s: 1 as const,
    label: '맑음',
    head: '한 줄',
    path: '/x',
    facts: Array.from({ length: 4 }, (_, j) => ({ label: `수치${j}`, value: '1,234 (+1.2%)' })),
    news: Array.from({ length: 3 }, (_, j) =>
      article('기'.repeat(40) + j, '연합뉴스', '2026-11-09'),
    ),
    points: Array.from({ length: 3 }, () => '요'.repeat(200)),
    materialAsOf: '2026-10-30',
  })),
}
const estimate = (s: string, u: string) => estimatePromptTokens(s, [{ role: 'user', text: u }], [])

describe('briefingPrompt material', () => {
  it('numbers the articles across fields in forecast order', () => {
    expect(briefingArticles(withMaterial).map((a) => [a.n, a.title])).toEqual([
      [1, 'S1'],
      [2, 'S2'],
      [3, 'F1'],
    ])
  })
  it('puts every fact, article and point under its field without a budget', () => {
    const p = briefingPrompt(withMaterial)
    expect(p.user).toContain('\n  수치: 코스피 5,019 (-6.78%); 코스피 1개월 -26.2%\n')
    expect(p.user).toContain('\n  [1] 2026-11-09 S1 — 연합뉴스\n')
    expect(p.user).toContain('\n  요약(2026-10-30 기준): 외국인 순매도가 9거래일째 이어졌다.')
    expect(p.articles).toEqual([1, 2, 3])
  })
  it('asks the 0.19.2 user text for a forecast without material', () => {
    expect(briefingPrompt(forecast).user).toBe(USER_0192)
    expect(briefingPrompt(withoutMaterial(withMaterial)).user).not.toContain('수치:')
  })
  it('adds material to a field whose weather is unknown', () => {
    const f: TrendForecast = {
      ...forecast,
      fields: forecast.fields.map((x) =>
        x.s === null ? { ...x, news: [article('N1', '연합뉴스', '2026-11-09')] } : x,
      ),
    }
    expect(briefingPrompt(f).user).toContain('- 부동산: 자료 없음\n  [1] 2026-11-09 N1 — 연합뉴스')
  })
  it('stays under the confirm line of a 4,096-token local model, with articles before points', () => {
    const p = briefingPrompt(bigMaterial, { tokens: briefingBudget(4096), estimate })
    expect(estimate(p.system, p.user)).toBeLessThanOrEqual(3072)
    expect(p.articles).toHaveLength(30)
    expect(p.user.match(/요약\(/g)?.length ?? 0).toBeLessThan(30)
  })
  it('sends the bare forecast when even that passes the budget', () => {
    const p = briefingPrompt(withMaterial, { tokens: 10, estimate })
    expect([p.user, p.articles]).toEqual([briefingPrompt(withoutMaterial(withMaterial)).user, []])
  })
  it("sizes the budget from the context window with agent-core's warning line", () => {
    expect([4096, 8192, 32768].map(briefingBudget)).toEqual([3072, 6553, 26214])
    expect(BRIEFING_WARNING_RATIO).toBe(CONTEXT_WARNING_RATIO)
  })
})

describe('parseBriefing', () => {
  const answer = {
    headline: '반도체는 맑고 주식은 폭풍우입니다',
    summary: ['반도체 실적이 강합니다', '코스피가 6.78% 내렸습니다'],
    outlook: ['변동성이 이어질 수 있습니다'],
    watch: ['환율'],
  }

  it('reads the JSON object, also inside a code fence or with words around it', () => {
    expect(parseBriefing(JSON.stringify(answer))).toEqual(answer)
    expect(parseBriefing('```json\n' + JSON.stringify(answer) + '\n```')).toEqual(answer)
    expect(parseBriefing('다음과 같습니다.\n' + JSON.stringify(answer) + '\n끝.')).toEqual(answer)
  })

  it('drops list marks a small model puts in front of items', () => {
    const marked = { ...answer, summary: ['- 반도체 실적이 강합니다', '2. 코스피'] }
    expect(parseBriefing(JSON.stringify(marked))?.summary).toEqual([
      '반도체 실적이 강합니다',
      '코스피',
    ])
  })

  it('gives null for an answer that is not a briefing', () => {
    expect(parseBriefing('죄송하지만 할 수 없습니다.')).toBeNull()
    expect(parseBriefing('{"headline": ""}')).toBeNull()
  })
})

describe('briefingMarkdown', () => {
  it('writes the title, the forecast table and the four parts, and names the source', () => {
    const md = briefingMarkdown(
      {
        headline: '반도체는 맑고 주식은 폭풍우입니다',
        summary: ['반도체 실적이 강합니다'],
        outlook: ['변동성이 이어질 수 있습니다'],
        watch: ['환율'],
      },
      forecast,
    )
    expect(md.split('\n')[0]).toBe(`# ${briefingTitle(forecast)}`)
    expect(md).toContain('반도체는 맑고 주식은 폭풍우입니다')
    expect(md).toContain('| 반도체 | 맑음 | 삼성전자 영업이익 107.4조 원 |')
    expect(md).toContain('| 부동산 | 자료 없음 |  |')
    expect(md).toContain('## 현황')
    expect(md).toContain('## 1~3개월 전망')
    expect(md).toContain('## 체크포인트')
    expect(md).toContain('- 환율')
    expect(md).toContain('트렌드 레이더')
    expect(md).toContain('투자 권유가 아닙니다')
  })

  it('titles the briefing with the forecast day', () => {
    expect(briefingTitle(forecast)).toBe('트렌드 브리핑 2026-11-10')
  })
})

const brief = {
  headline: '반도체는 맑고 주식은 폭풍우입니다',
  summary: ['반도체 실적이 강합니다'],
  outlook: ['변동성이 이어질 수 있습니다'],
  watch: ['환율'],
}

const SOURCE_LINE =
  '자료: TEN AI 트렌드 레이더(trend.tenai.kr) 2026-11-10 기상도. AI가 기상도와 재료만 보고 쓴 글이며 투자 권유가 아닙니다.'
const NOTE = '재료로 확인되지 않은 숫자가 있던 문장 2개를 뺐습니다.'

describe('briefingBlocks (0.19.2)', () => {
  it('lays the briefing out as a report: date line, bold headline, numbered chapters, the table, the source', () => {
    const blocks = briefingBlocks(brief, forecast)
    expect(blocks[0]).toEqual({ kind: 'title', text: '트렌드 브리핑 2026-11-10' })
    expect(blocks[1]).toMatchObject({ kind: 'meta' })
    expect((blocks[1] as { text: string }).text).toContain('2026-11-10')
    expect(blocks[2]).toEqual({
      kind: 'para',
      depth: 0,
      role: 'lead',
      bold: true,
      text: brief.headline,
    })
    const chapters = blocks.filter((b) => b.kind === 'chapter') as { label: string; text: string }[]
    expect(chapters.map((c) => `${c.label} ${c.text}`)).toEqual([
      'Ⅰ. 오늘의 기상도',
      'Ⅱ. 현황',
      'Ⅲ. 1~3개월 전망',
      'Ⅳ. 체크포인트',
    ])
    const table = blocks.find((b) => b.kind === 'table') as { rows: string[][]; header: boolean }
    expect(table.header).toBe(true)
    expect(table.rows[0]).toEqual(['분야', '날씨', '한 줄'])
    expect(table.rows).toContainEqual(['부동산', '자료 없음', ''])
    expect(blocks).toContainEqual({ kind: 'item', depth: 0, marker: '○', text: '환율' })
    const last = blocks.at(-1) as { kind: string; text: string }
    expect(last.kind).toBe('reference')
    expect(last.text).toBe(SOURCE_LINE)
  })

  it('leaves out an empty outlook or checkpoint chapter and keeps the numbering in order', () => {
    const blocks = briefingBlocks({ ...brief, outlook: [] }, forecast)
    const chapters = blocks.filter((b) => b.kind === 'chapter') as { label: string; text: string }[]
    expect(chapters.map((c) => c.label)).toEqual(['Ⅰ.', 'Ⅱ.', 'Ⅲ.'])
    expect(chapters.at(-1)!.text).toBe('체크포인트')
  })
})

describe('checkBriefing and briefingFormat', () => {
  it('accepts a briefing object and drops what is not text', () => {
    expect(checkBriefing(brief)).toEqual(brief)
    expect(checkBriefing({ ...brief, summary: ['ok', 3, ''] })?.summary).toEqual(['ok'])
    expect(checkBriefing({ headline: '', summary: ['x'] })).toBeNull()
    expect(checkBriefing('text')).toBeNull()
  })

  it('knows the five formats and falls back to Word for anything else', () => {
    expect(BRIEFING_FORMATS).toEqual(['docx', 'hwp', 'mindmap', 'pptx', 'pdf'])
    expect(briefingFormat('pdf')).toBe('pdf')
    expect(briefingFormat('exe')).toBe('docx')
    expect(briefingFormat(undefined)).toBe('docx')
  })
})

describe('참고 자료 chapter', () => {
  const cited = { ...brief, summary: ['코스피 5,019 [3]', '반도체 [1][3]'] }

  it('lists the cited articles with links in a 참고 자료 chapter, then the research dates', () => {
    const blocks = briefingBlocks(cited, withMaterial)
    const i = blocks.findIndex((b) => b.kind === 'chapter' && b.text === '참고 자료')
    expect(blocks.slice(i + 1, i + 4)).toEqual([
      { kind: 'item', depth: 0, marker: '[1]', text: 'S1 — 연합뉴스, 2026-11-09', href: S1_URL },
      { kind: 'item', depth: 0, marker: '[3]', text: 'F1 — 한국경제, 2026-11-08', href: F1_URL },
      { kind: 'reference', depth: 0, text: '정리 자료 기준일: 주식·환율 2026-10-30' },
    ])
    // after the checkpoints, before the source line
    expect(blocks.at(-1)).toMatchObject({ kind: 'reference', text: SOURCE_LINE })
    expect(blocks.findIndex((b) => b.kind === 'chapter' && b.text === '체크포인트')).toBeLessThan(i)
  })

  it('joins fields with the same date and keeps first-seen order', () => {
    const f: TrendForecast = {
      ...withMaterial,
      fields: withMaterial.fields.map((x) =>
        x.key === 'fx' ? { ...x, materialAsOf: '2026-11-06' } : x,
      ),
    }
    const blocks = briefingBlocks({ ...cited, summary: ['a [1]'] }, f)
    expect(blocks).toContainEqual({
      kind: 'reference',
      depth: 0,
      text: '정리 자료 기준일: 주식 2026-10-30, 환율 2026-11-06',
    })
  })

  it('has no 참고 자료 chapter when nothing is cited', () => {
    const blocks = briefingBlocks({ ...brief, summary: ['인용 없음 [9]'] }, withMaterial)
    expect(blocks.some((b) => b.kind === 'chapter' && b.text === '참고 자료')).toBe(false)
    expect(citedArticles(cited, withMaterial).map((a) => a.n)).toEqual([1, 3])
    expect(citedArticles({ ...brief, summary: ['x [9]'] }, withMaterial)).toEqual([])
  })

  it('adds the note about dropped sentences to the source line', () => {
    const last = briefingBlocks(brief, forecast, 2).at(-1) as { text: string }
    expect(last.text).toBe(`${SOURCE_LINE} ${NOTE}`)
    expect((briefingBlocks(brief, forecast).at(-1) as { text: string }).text).toBe(SOURCE_LINE)
    expect(briefingMarkdown(brief, forecast, 2)).toContain(`${SOURCE_LINE} ${NOTE}`)
  })

  it('prints the article links in the Markdown for PPT and the mind map', () => {
    const md = briefingMarkdown(cited, withMaterial)
    expect(md).toContain('## 참고 자료')
    expect(md.split('\n')).toContain(`- [1] S1 — 연합뉴스, 2026-11-09 ${S1_URL}`)
    expect(md).toContain('정리 자료 기준일: 주식·환율 2026-10-30')
    expect(briefingMarkdown(brief, withMaterial)).not.toContain('## 참고 자료')
  })

  it('reads the dropped count from the page as a small whole number', () => {
    expect([2, -1, 1.5, 99, '3', undefined].map(briefingDropped)).toEqual([2, 0, 0, 0, 0, 0])
  })
})
