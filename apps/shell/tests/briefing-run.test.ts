import { describe, expect, it, vi } from 'vitest'
import { briefingFixPrompt, groundedBriefing, keepCitations } from '../src/shared/briefing-run'
import { checkBriefing } from '../src/shared/trend-briefing'
import type { TrendField, TrendForecast } from '../src/shared/trend-forecast'

const article = (title: string, source: string, date: string) => ({
  title,
  source,
  date,
  url: 'https://example.com/a',
})
const stocks: TrendField = {
  key: 'stocks',
  title: '주식',
  scale: 'weather',
  s: -2,
  label: '폭풍우',
  head: '코스피 5,019 (-6.78%)',
  path: '/stocks',
  facts: [
    { label: '코스피', value: '5,019 (-6.78%)' },
    { label: '코스피 1개월', value: '-26.2%' },
  ],
  news: [article('S1', '연합뉴스', '2026-11-09'), article('S2', '매일경제', '2026-11-08')],
  points: ['외국인 순매도가 9거래일째 이어졌다.'],
  materialAsOf: '2026-10-30',
}
const fx: TrendField = {
  key: 'fx',
  title: '환율',
  scale: 'weather',
  s: 0,
  label: '흐림',
  head: '원·달러 1,470원',
  path: '/fx',
  news: [article('F1', '한국경제', '2026-11-08')],
  materialAsOf: '2026-10-30',
}
/** the material sample of trend-briefing.test.ts: articles [1, 2, 3] */
const withMaterial: TrendForecast = {
  schema: 1,
  asOf: '2026-11-09T23:37:30.600Z',
  date: '2026-11-10',
  line: '반도체·AI 트렌드 Big 5는 맑은 편이고, 주식은 궂은 편입니다.',
  fields: [stocks, fx],
}

const RIGHT = JSON.stringify({
  headline: '코스피가 폭풍우입니다',
  summary: ['코스피 5,019 [1]'],
  outlook: [],
  watch: [],
})
const WRONG = JSON.stringify({
  headline: '코스피가 폭풍우입니다',
  summary: ['코스피 5,019 [1]', '코스피 5,100선 [9]'],
  outlook: [],
  watch: [],
})
const kept = JSON.parse(RIGHT)

describe('groundedBriefing', () => {
  it('asks once when every number is in the question', async () => {
    const ask = vi.fn().mockResolvedValue({ ok: true, text: RIGHT })
    const r = await groundedBriefing(withMaterial, ask)
    expect(ask).toHaveBeenCalledTimes(1)
    expect(r).toEqual({ ok: true, brief: JSON.parse(RIGHT), dropped: 0 })
  })
  it('asks again with the numbers to fix and takes the corrected answer', async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: WRONG })
      .mockResolvedValueOnce({ ok: true, text: RIGHT })
    const r = await groundedBriefing(withMaterial, ask)
    expect(ask).toHaveBeenCalledTimes(2)
    expect(ask.mock.calls[1]![0].user).toContain('앞선 답에 재료에 없는 숫자가 있습니다: 5,100')
    expect(r).toEqual({ ok: true, brief: JSON.parse(RIGHT), dropped: 0 })
  })
  it('drops what is still wrong after the second answer and counts it', async () => {
    const ask = vi.fn().mockResolvedValue({ ok: true, text: WRONG })
    const r = await groundedBriefing(withMaterial, ask)
    expect(ask).toHaveBeenCalledTimes(2)
    expect(r).toEqual({ ok: true, brief: kept, dropped: 1 })
  })
  it('does not ask again when the second question would pass the budget', async () => {
    const ask = vi.fn().mockResolvedValue({ ok: true, text: WRONG })
    const estimate = (_s: string, u: string) => (u.includes('앞선 답') ? Infinity : 0)
    const r = await groundedBriefing(withMaterial, ask, { tokens: 1000, estimate })
    expect(ask).toHaveBeenCalledTimes(1)
    expect(r).toEqual({ ok: true, brief: kept, dropped: 1 })
  })
  it('uses the first answer when the second question fails', async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: WRONG })
      .mockResolvedValueOnce({ ok: false, error: 'x' })
    const r = await groundedBriefing(withMaterial, ask)
    expect(ask).toHaveBeenCalledTimes(2)
    expect(r).toEqual({ ok: true, brief: kept, dropped: 1 })
  })
  it('uses the first answer when the second answer holds no briefing', async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: WRONG })
      .mockResolvedValueOnce({ ok: true, text: '모르겠습니다' })
    expect(await groundedBriefing(withMaterial, ask)).toEqual({ ok: true, brief: kept, dropped: 1 })
  })
  it('removes a citation to an article the question did not carry', async () => {
    const text = JSON.stringify({
      headline: '코스피가 폭풍우입니다',
      summary: ['코스피 5,019 [1]', '외국인 순매도 [9]'],
      outlook: [],
      watch: [],
    })
    const ask = vi.fn().mockResolvedValue({ ok: true, text })
    const r = await groundedBriefing(withMaterial, ask)
    expect(ask).toHaveBeenCalledTimes(1)
    expect(r).toEqual({
      ok: true,
      brief: { ...kept, summary: ['코스피 5,019 [1]', '외국인 순매도'] },
      dropped: 0,
    })
    expect(JSON.stringify(r)).not.toContain('[9]')
  })
  it('still opens when a citation was all an item or the headline held', async () => {
    const text = JSON.stringify({ headline: '[9]', summary: ['[9]'], outlook: ['[9]'], watch: [] })
    const ask = vi.fn().mockResolvedValue({ ok: true, text })
    const r = await groundedBriefing(withMaterial, ask)
    expect(r).toEqual({
      ok: true,
      brief: { headline: withMaterial.line, summary: [withMaterial.line], outlook: [], watch: [] },
      dropped: 0,
    })
    expect(r.ok && checkBriefing(r.brief)).toEqual(r.ok && r.brief)
  })
  it('passes the AI error through when the first answer fails', async () => {
    const ask = vi.fn().mockResolvedValue({ ok: false, error: '연결 끊김' })
    expect(await groundedBriefing(withMaterial, ask)).toEqual({ ok: false, error: '연결 끊김' })
  })
  it('reports an empty error when the first answer holds no briefing', async () => {
    const ask = vi.fn().mockResolvedValue({ ok: true, text: '모르겠습니다' })
    expect(await groundedBriefing(withMaterial, ask)).toEqual({ ok: false, error: '' })
  })
})

describe('briefingFixPrompt', () => {
  it('keeps the system and adds the earlier answer and the numbers to the question', () => {
    const p = { system: 'S', user: 'U', articles: [] }
    expect(briefingFixPrompt(p, 'A', ['5,100', '7%'])).toEqual({
      system: 'S',
      user:
        'U\n\n앞선 답:\nA\n\n앞선 답에 재료에 없는 숫자가 있습니다: 5,100, 7%\n' +
        '재료에 있는 값으로 고치거나 그 문장을 빼고, 같은 JSON 형식으로 다시 쓰세요.',
    })
  })
})

describe('grouped citations (I1)', () => {
  const b = (headline: string) => ({ headline, summary: ['x'], outlook: [], watch: [] })
  it('keeps the sent articles of a group and removes the others', () => {
    expect(keepCitations(b('코스피 [1, 2]'), [1, 2]).headline).toBe('코스피 [1][2]')
    expect(keepCitations(b('코스피 [1,9]'), [1, 2]).headline).toBe('코스피 [1]')
    expect(keepCitations(b('코스피 [8, 9]'), [1, 2]).headline).toBe('코스피')
  })
  it('keeps a correct sentence with a grouped citation', async () => {
    const f: TrendForecast = {
      ...withMaterial,
      fields: [{ ...stocks, facts: [{ label: '코스피', value: '4,012.35' }] }, fx],
    }
    const text = JSON.stringify({
      headline: '코스피가 폭풍우입니다',
      summary: ['코스피 4,012.35 [1, 2]'],
      outlook: [],
      watch: [],
    })
    const ask = vi.fn().mockResolvedValue({ ok: true, text })
    const r = await groundedBriefing(f, ask)
    expect(ask).toHaveBeenCalledTimes(1)
    expect(r).toEqual({
      ok: true,
      brief: {
        headline: '코스피가 폭풍우입니다',
        summary: ['코스피 4,012.35 [1][2]'],
        outlook: [],
        watch: [],
      },
      dropped: 0,
    })
  })
})

describe('an empty line of the day (M5)', () => {
  const empty = JSON.stringify({ headline: '[9]', summary: ['[9]'], outlook: [], watch: [] })
  it("falls back to the first field's head", async () => {
    const ask = vi.fn().mockResolvedValue({ ok: true, text: empty })
    const r = await groundedBriefing({ ...withMaterial, line: '' }, ask)
    expect(r.ok && r.brief.headline).toBe(stocks.head)
    expect(r.ok && r.brief.summary).toEqual([stocks.head])
    expect(r.ok && checkBriefing(r.brief)).toEqual(r.ok && r.brief)
  })
  it('falls back to a fixed text when no field has a head', async () => {
    const ask = vi.fn().mockResolvedValue({ ok: true, text: empty })
    const f: TrendForecast = {
      ...withMaterial,
      line: '',
      fields: withMaterial.fields.map((x) => ({ ...x, head: '' })),
    }
    const r = await groundedBriefing(f, ask)
    expect(r.ok && r.brief.headline).toBe('오늘의 트렌드 기상도')
    expect(r.ok && checkBriefing(r.brief)).toEqual(r.ok && r.brief)
  })
  it('replaces a headline with an unknown number by the fallback too', async () => {
    const text = JSON.stringify({
      headline: '코스피 7,777',
      summary: ['코스피 7,777'],
      outlook: [],
      watch: [],
    })
    const ask = vi.fn().mockResolvedValue({ ok: true, text })
    const r = await groundedBriefing({ ...withMaterial, line: '' }, ask)
    expect(r.ok && r.brief.headline).toBe(stocks.head)
    expect(r.ok && checkBriefing(r.brief)).toEqual(r.ok && r.brief)
  })
})
