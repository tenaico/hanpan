import { describe, expect, it } from 'vitest'
import {
  BRIEFING_FORMATS,
  briefingBlocks,
  briefingFormat,
  briefingMarkdown,
  briefingPrompt,
  briefingTitle,
  checkBriefing,
  parseBriefing,
} from '../src/shared/trend-briefing'
import type { TrendForecast } from '../src/shared/trend-forecast'

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
    expect(last.text).toContain('투자 권유가 아닙니다')
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
