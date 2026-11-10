import { describe, expect, it } from 'vitest'
import { allowedNumbers, dropUnknownNumbers, unknownNumbers } from '../src/shared/briefing-numbers'
import { checkBriefing, type TrendBriefing } from '../src/shared/trend-briefing'

/** the line of the day, without a number */
const LINE = '반도체는 맑은 편이고, 주식은 궂은 편입니다.'
const D = '2026-11-10'
const allowed = allowedNumbers(
  '- 주식: 폭풍우 — 코스피 5,019 (-6.78%), 1개월 -26.2%\n  수치: 원/달러 1,334.3원 (+2.1원)',
  D,
)
const brief = (over: Partial<TrendBriefing>): TrendBriefing => ({
  headline: '맑음',
  summary: ['맑음'],
  outlook: [],
  watch: [],
  ...over,
})

describe('unknownNumbers', () => {
  it('reads 5019, 6.78% falling, 26.2% and 1,334.3원 as values in the question', () => {
    expect(
      unknownNumbers(
        brief({ headline: '코스피 5019, 6.78% 하락, 1개월 26.2%↓, 환율 1,334.3원' }),
        allowed,
        D,
      ),
    ).toEqual([])
  })
  it('does not check the date, 3개월, 1~3개월, 2분기 or [2]', () => {
    expect(
      unknownNumbers(
        brief({ headline: '2026년 11월 10일 기준 1~3개월, 3개월, 2분기 전망 [2]' }),
        allowed,
        D,
      ),
    ).toEqual([])
  })
  it('does not read digits inside Latin words', () => {
    expect(unknownNumbers(brief({ headline: 'HBM3E와 H100, GPT-5 수요' }), allowed, D)).toEqual([])
  })
  it('reads a number with a Latin unit after it, such as 0.25%p and 3nm', () => {
    expect(
      unknownNumbers(
        brief({ headline: '금리 0.25%p 인하, 3nm 공정, HBM3E와 H100, GPT-5' }),
        allowed,
        D,
      ),
    ).toEqual(['0.25%', '3'])
    const a = allowedNumbers('- 반도체: 맑음 — 3nm 양산', D)
    expect(unknownNumbers(brief({ headline: '3nm 공정' }), a, D)).toEqual([])
  })
  it('finds a number the question did not carry, as the briefing wrote it', () => {
    expect(
      unknownNumbers(
        brief({ headline: '코스피 5,100선', summary: ['환율 1,400원', '코스피 5,100선'] }),
        allowed,
        D,
      ),
    ).toEqual(['5,100', '1,400'])
  })
  it('reads a leading zero and a trailing comma as the same value', () => {
    const a = allowedNumbers('기준금리 5%', D)
    expect(unknownNumbers(brief({ headline: '금리 05%, 2.1원' }), a, D)).toEqual(['2.1'])
    expect(unknownNumbers(brief({ headline: '금리 5, 오름' }), a, D)).toEqual([])
  })
})

describe('dropUnknownNumbers', () => {
  it('drops the items with an unknown number and replaces the headline, counting both', () => {
    const r = dropUnknownNumbers(
      brief({
        headline: '코스피 5,100선',
        summary: ['코스피 5,019', '환율 1,400원'],
        outlook: ['전망 7%'],
      }),
      allowed,
      D,
      LINE,
    )
    expect(r).toEqual({
      brief: { headline: LINE, summary: ['코스피 5,019'], outlook: [], watch: [] },
      dropped: 3,
    })
  })
  it('fills an emptied summary with the line so the briefing still opens', () => {
    const r = dropUnknownNumbers(brief({ summary: ['환율 1,400원'] }), allowed, D, LINE)
    expect(r.brief.summary).toEqual([LINE])
    expect(checkBriefing(r.brief)).not.toBeNull()
  })
})

describe('grouped citations (I1)', () => {
  const a = allowedNumbers('  수치: 코스피 4,012.35', D)
  it('reads [1, 2] and [1,2] as citations, not as numbers', () => {
    expect(unknownNumbers(brief({ headline: '코스피 4,012.35 [1, 2]' }), a, D)).toEqual([])
    expect(unknownNumbers(brief({ headline: '코스피 4,012.35 [1,2]' }), a, D)).toEqual([])
  })
})

describe('dates in the question (I2)', () => {
  const question = [
    '기상도 날짜: 2026-11-10',
    '  [1] 2026-11-08 외국인 순매도 — 연합뉴스',
    '  요약(2026-10-30 기준): 외국인 순매도가 이어졌다.',
  ].join('\n')
  const a = allowedNumbers(question, D)
  it('does not allow the parts of an article or research date as values', () => {
    expect(unknownNumbers(brief({ headline: '코스피 8% 급락' }), a, D)).toEqual(['8%'])
    expect(unknownNumbers(brief({ headline: '30% 하락' }), a, D)).toEqual(['30%'])
  })
  it('still allows the forecast date parts', () => {
    expect(unknownNumbers(brief({ headline: '2026년 11월 10일, 지수 10' }), a, D)).toEqual([])
  })
  it('lets a month and day of a date in the question pass, and no other', () => {
    expect(unknownNumbers(brief({ headline: '10월 30일 기준' }), a, D)).toEqual([])
    expect(unknownNumbers(brief({ headline: '11월 8일 기사, 10/30 자료' }), a, D)).toEqual([])
    expect(unknownNumbers(brief({ headline: '10월 25일 기준' }), a, D)).toEqual(['25'])
  })
})

describe('written dates and decimal spans (M1, M2)', () => {
  it('reads 2026.11.09, 2026/11/09 and 2026.11 as dates, not decimals', () => {
    const a = allowedNumbers('코스피 5,019', D)
    for (const headline of [
      '2026.11.09 기준',
      '2026/11/09 기준',
      '2026.11 기준',
      '2026-11-09 기준',
    ]) {
      expect(unknownNumbers(brief({ headline }), a, D)).toEqual([])
    }
  })
  it('reads 1.5개월 as the value 1.5, not as 1 and an exempt 5개월', () => {
    const a = allowedNumbers('기간 1.5', D)
    expect(unknownNumbers(brief({ headline: '1.5개월 지연' }), a, D)).toEqual([])
    expect(unknownNumbers(brief({ headline: '2.5개월 지연' }), a, D)).toEqual(['2.5'])
  })
})
