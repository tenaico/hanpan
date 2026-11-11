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
  briefingMapMarkdown,
  briefingMarkdown,
  briefingPrompt,
  briefingTitle,
  checkBriefing,
  citedArticles,
  MAP_TITLE_MAX,
  mapItemTitle,
  parseBriefing,
} from '../src/shared/trend-briefing'
import { noteText, openXmind, type XmindTopic } from '@genoffice/xmind-engine'
import { buildTargetDocument } from '../src/main/send-to-app/from-markdown'
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

  it('reads the dropped count from the page as a whole number, capped at 20', () => {
    expect([2, -1, 1.5, 99, '3', undefined].map(briefingDropped)).toEqual([2, 0, 0, 20, 0, 0])
    expect([20, 21].map(briefingDropped)).toEqual([20, 20])
  })
})

describe('grouped citations and an empty source (I1, M6)', () => {
  it('reads [1, 2] and [1,2] as two citations', () => {
    for (const s of ['코스피 4,012.35 [1, 2]', '코스피 [1,2]']) {
      expect(citedArticles({ ...brief, summary: [s] }, withMaterial).map((a) => a.n)).toEqual([
        1, 2,
      ])
    }
  })
  it('leaves out the separator when an article has no source', () => {
    const f: TrendForecast = {
      ...forecast,
      fields: forecast.fields.map((x) =>
        x.key === 'stocks' ? { ...x, news: [article('S1', '', '2026-11-09', S1_URL)] } : x,
      ),
    }
    const cites = { ...brief, summary: ['a [1]'] }
    expect(briefingBlocks(cites, f)).toContainEqual({
      kind: 'item',
      depth: 0,
      marker: '[1]',
      text: 'S1, 2026-11-09',
      href: S1_URL,
    })
    // the slides cannot open a link: the source line has no web address
    expect(briefingMarkdown(cites, f).split('\n')).toContain('- [1] S1, 2026-11-09')
    expect(briefingMarkdown(cites, f)).not.toContain(S1_URL)
    expect(briefingPrompt(f).user.split('\n')).toContain('  [1] 2026-11-09 S1')
  })
})

/** the mind map the briefing opens as (0.19.4), built by the real Markdown → map builder */
describe('briefingMapMarkdown (mind map)', () => {
  const long =
    '코스피가 5,019로 6.78% 내리며 1개월 사이 26.2% 빠졌고, 외국인 순매도가 9거래일째 이어지며 변동성이 커졌습니다 [1][2]. 반도체 실적은 강하지만 시장 전체는 흔들리고 있습니다 [3].'
  const mapBrief = {
    headline: '반도체는 **맑고** 주식은 폭풍우입니다',
    summary: [long, '삼성전자 영업이익 107.4조 원으로 반도체 업황이 맑습니다 [1, 3]'],
    outlook: ['향후 1~3개월은 외국인 수급과 환율이 주식 시장의 방향을 정할 가능성이 큽니다 [2]'],
    watch: ['환율: 원·달러 1,470원에서 1,500원을 넘는지 [3]', '외국인 순매도 지속 여부'],
  }
  const longTitle = `${'아주 긴 기사 제목 '.repeat(8)}[속보]`
  const mapForecast: TrendForecast = {
    ...withMaterial,
    fields: withMaterial.fields.map((f) =>
      f.key === 'stocks'
        ? {
            ...f,
            news: [
              article('S1 - 연합뉴스', '연합뉴스', '2026-11-09', S1_URL),
              article(
                longTitle,
                '매일경제',
                '2026-11-08',
                'https://news.google.com/rss/articles/s2',
              ),
            ],
          }
        : f,
    ),
  }
  const opts = {
    title: '브리핑',
    untitled: '제목 없음',
    korean: true,
    loadHwpEngine: () => never(),
  }
  const never = (): never => {
    throw new Error('no hwp engine in a map')
  }
  const mapOf = async (b = mapBrief, f = mapForecast, dropped = 0) => {
    const built = await buildTargetDocument(briefingMapMarkdown(b, f, dropped), 'mindmap', opts)
    const opened = await openXmind(built.bytes)
    if (opened.status !== 'ok') throw new Error('the map did not open')
    return opened.document.sheets[0]!.rootTopic
  }
  const kids = (t: XmindTopic) => t.children?.attached ?? []
  const branch = (root: XmindTopic, title: string) => kids(root).find((t) => t.title === title)!
  const all = (t: XmindTopic): XmindTopic[] => [t, ...kids(t).flatMap(all)]

  it('makes short item titles without citations and keeps the full text in the note', async () => {
    expect(mapItemTitle(long)).toBe('코스피가 5,019로 6.78% 내리며 1개월 사이…')
    expect(mapItemTitle('환율: 원·달러 1,470원에서 1,500원을 넘는지 [3]')).toBe('환율')
    expect(mapItemTitle('삼성전자 영업이익 107.4조 원 [1, 3]')).toBe('삼성전자 영업이익 107.4조 원')
    const root = await mapOf()
    const summary = kids(branch(root, '현황'))
    expect(summary.map((t) => t.title)).toEqual([
      mapItemTitle(long),
      '삼성전자 영업이익 107.4조 원으로 반도체 업황이…',
    ])
    expect(summary.map((t) => noteText(t.notes))).toEqual(mapBrief.summary)
    expect(kids(branch(root, '체크포인트')).map((t) => [t.title, noteText(t.notes)])).toEqual([
      ['환율', mapBrief.watch[0]],
      ['외국인 순매도 지속 여부', mapBrief.watch[1]],
    ])
    expect(kids(branch(root, '1~3개월 전망'))[0]!.title.length).toBeLessThanOrEqual(MAP_TITLE_MAX)
  })

  it('puts the title at the center with the headline as plain text, and a topic per field', async () => {
    const root = await mapOf()
    expect(root.title).toBe(briefingTitle(mapForecast))
    expect(noteText(root.notes)).toBe('반도체는 맑고 주식은 폭풍우입니다')
    const bare = await mapOf({ ...mapBrief, headline: '반도체는 맑습니다' })
    expect(noteText(bare.notes)).toBe('반도체는 맑습니다')
    const weather = branch(root, '오늘의 기상도')
    expect(kids(weather).map((t) => [t.title, noteText(t.notes)])).toEqual([
      ['반도체 · 맑음', '삼성전자 영업이익 107.4조 원'],
      ['주식 · 폭풍우', '코스피 5,019 (-6.78%)'],
      ['환율 · 흐림', '원·달러 1,470원'],
      ['부동산 · 자료 없음', null],
    ])
    expect(noteText(weather.notes)).toBeNull()
  })

  it('lists the cited articles with their links, never a URL or pipe text in a title', async () => {
    const root = await mapOf(mapBrief, mapForecast, 2)
    const refs = branch(root, '참고 자료')
    expect(kids(refs).map((t) => [t.title, t.href, noteText(t.notes)])).toEqual([
      ['[1] S1 — 연합뉴스', S1_URL, '2026-11-09'],
      [
        '[2] 아주 긴 기사 제목 아주 긴 기사 제목 아주 긴… — 매일경제',
        'https://news.google.com/rss/articles/s2',
        `${longTitle}\n2026-11-08`,
      ],
      ['[3] F1 — 한국경제', F1_URL, '2026-11-08'],
    ])
    expect(noteText(refs.notes)).toBe(
      `정리 자료 기준일: 주식·환율 2026-10-30\n\n${SOURCE_LINE} ${NOTE}`,
    )
    for (const t of all(root)) {
      expect(t.title).not.toMatch(/https?:|\||\*\*|\\/)
      expect(noteText(t.notes) ?? '').not.toMatch(/\|\s*-{3}|\*\*.*\*\*$/m)
    }
  })

  it('puts the source line in the central note when nothing is cited, and leaves out empty parts', async () => {
    const root = await mapOf({ ...brief, outlook: [], watch: [] }, forecast, 2)
    expect(kids(root).map((t) => t.title)).toEqual(['오늘의 기상도', '현황'])
    expect(noteText(root.notes)).toBe(`${brief.headline}\n\n${SOURCE_LINE} ${NOTE}`)
  })

  it('escapes item text that would read as a label, a link or a list mark', async () => {
    const root = await mapOf({
      ...brief,
      summary: ['- 첫 [주의]', '1. 둘 <https://a.b>', '#셋'],
      outlook: [],
      watch: [],
    })
    expect(kids(branch(root, '현황')).map((t) => [t.title, t.labels, t.href])).toEqual([
      ['- 첫 [주의]', undefined, undefined],
      ['1. 둘 <https://a.b>', undefined, undefined],
      ['#셋', undefined, undefined],
    ])
  })
})
