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
      unknownNumbers(brief({ headline: '금리 0.25%p 인하, 3nm 공정, HBM3E와 H100, GPT-5' }), allowed, D),
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
