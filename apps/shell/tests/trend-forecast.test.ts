import { describe, expect, it } from 'vitest'
import {
  TREND_FIELD_KEYS,
  cutText,
  kstDate,
  mergeTrendForecast,
  parseTrendForecast,
  trendAsOfText,
  trendGlyph,
  trendLinkUrl,
  type TrendForecast,
} from '../src/shared/trend-forecast'

/**
 * Checking the Trend Radar forecast (spec 7.11, plan Task 7): what the main
 * process keeps from an answer, the links it opens, and how a partial answer
 * borrows from the stored one (plan R24).
 */

function field(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    key,
    title: `${key} title`,
    scale: 'weather',
    s: 1,
    label: 'sunny',
    head: `${key} head`,
    path: `/${key}`,
    ...extra,
  }
}

function answer(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: 1,
    asOf: '2026-11-09T00:30:00Z',
    date: '2026-11-09',
    fields: [field('ai'), field('stocks')],
    line: 'today in one line',
    ...extra,
  }
}

const parse = (raw: unknown): TrendForecast => {
  const parsed = parseTrendForecast(raw)
  if (!parsed) throw new Error('expected a forecast')
  return parsed
}
const keys = (f: TrendForecast) => f.fields.map((x) => x.key)

describe('parseTrendForecast', () => {
  it('reads a well-formed answer', () => {
    const f = parse(answer())
    expect(f).toEqual({
      schema: 1,
      asOf: '2026-11-09T00:30:00Z',
      date: '2026-11-09',
      fields: [
        {
          key: 'ai',
          title: 'ai title',
          scale: 'weather',
          s: 1,
          label: 'sunny',
          head: 'ai head',
          path: '/ai',
        },
        {
          key: 'stocks',
          title: 'stocks title',
          scale: 'weather',
          s: 1,
          label: 'sunny',
          head: 'stocks head',
          path: '/stocks',
        },
      ],
      line: 'today in one line',
    })
  })

  it('drops the whole answer when the schema is not 1', () => {
    expect(parseTrendForecast(answer({ schema: 2 }))).toBeNull()
    expect(parseTrendForecast('<html>error</html>')).toBeNull()
    expect(parseTrendForecast(null)).toBeNull()
  })

  it('drops a field with an unknown key', () => {
    expect(keys(parse(answer({ fields: [field('weather'), field('ai')] })))).toEqual(['ai'])
  })

  it('has no signal when s is out of range or not an integer', () => {
    const f = parse(
      answer({
        fields: [
          field('ai', { s: 3 }),
          field('stocks', { s: 1.5 }),
          field('fx', { s: '1' }),
          field('crypto', { s: -2 }),
        ],
      }),
    )
    expect(f.fields.map((x) => x.s)).toEqual([null, null, null, -2])
  })

  it('drops a field whose path is not a plain site path', () => {
    const f = parse(
      answer({
        fields: [
          field('ai', { path: '//evil.example' }),
          field('stocks', { path: '/a:b' }),
          field('fx', { path: '/a\\b' }),
          field('crypto'),
        ],
      }),
    )
    expect(keys(f)).toEqual(['crypto'])
  })

  it('cuts long text to its limit', () => {
    const f = parse(
      answer({
        fields: [
          field('ai', { title: 'T'.repeat(25), label: 'L'.repeat(15), head: 'H'.repeat(100) }),
        ],
        line: 'X'.repeat(100),
      }),
    )
    expect(f.fields[0].title).toHaveLength(20)
    expect(f.fields[0].label).toHaveLength(10)
    expect(f.fields[0].head).toHaveLength(80)
    expect(f.line).toHaveLength(80)
  })

  it('reads only the first 12 fields', () => {
    // 13 fields: 10 known keys, then unknown ones; the 13th is a duplicate that must not count
    const many = [...TREND_FIELD_KEYS.map((k) => field(k)), field('x1'), field('x2'), field('ai')]
    const raw = answer({ fields: many })
    expect((raw.fields as unknown[]).length).toBe(13)
    expect(keys(parse(raw))).toEqual([...TREND_FIELD_KEYS])
    // the 13th field is past the limit even when it is the only valid one
    const late = [...Array.from({ length: 12 }, () => field('nope')), field('ai')]
    expect(parseTrendForecast(answer({ fields: late }))).toBeNull()
  })

  it('keeps the first field of a repeated key', () => {
    const f = parse(
      answer({ fields: [field('ai', { head: 'first' }), field('ai', { head: 'second' })] }),
    )
    expect(f.fields).toHaveLength(1)
    expect(f.fields[0].head).toBe('first')
  })

  it('drops the answer when asOf or date is broken', () => {
    expect(parseTrendForecast(answer({ asOf: 'yesterday' }))).toBeNull()
    expect(parseTrendForecast(answer({ date: '11/09/2026' }))).toBeNull()
  })

  it('drops the answer when no field is left', () => {
    expect(parseTrendForecast(answer({ fields: [field('weather')] }))).toBeNull()
    expect(parseTrendForecast(answer({ fields: 'none' }))).toBeNull()
  })
})

describe('cutText', () => {
  it('ends a cut text with an ellipsis at exactly the limit (R26)', () => {
    const cut = cutText('a'.repeat(25), 20)
    expect(cut).toHaveLength(20)
    expect(cut.endsWith('…')).toBe(true)
    expect(cutText('a'.repeat(20), 20)).toBe('a'.repeat(20))
  })
})

describe('trendLinkUrl', () => {
  const utm = 'utm_source=hanpan&utm_medium=home&utm_campaign=forecast'

  it('builds a link on the built-in site', () => {
    expect(trendLinkUrl('/stocks')).toBe(`https://trend.tenai.kr/stocks?${utm}`)
    expect(trendLinkUrl(null)).toBe(`https://trend.tenai.kr/?${utm}`)
  })

  it('refuses anything that is not a plain path', () => {
    expect(trendLinkUrl('//evil.example')).toBeNull()
    expect(trendLinkUrl('https://evil.example/x')).toBeNull()
  })
})

describe('mergeTrendForecast (R24)', () => {
  const FULL = parse(
    answer({
      asOf: '2026-11-09T00:30:00Z',
      fields: TREND_FIELD_KEYS.map((k) => field(k, { s: 2, label: 'old', head: `old ${k}` })),
      line: 'old line',
    }),
  )
  const partialAt = (asOf: string, drop: string[] = []) =>
    parse(
      answer({
        asOf,
        fields: TREND_FIELD_KEYS.filter((k) => !drop.includes(k)).map((k) =>
          k === 'local-ai' || k === 'fx'
            ? field(k, { s: null, label: '', head: '' })
            : field(k, { s: -1, label: 'new', head: `new ${k}` }),
        ),
        line: 'new line',
      }),
    )
  const PARTIAL = partialAt('2026-11-09T06:30:00Z')
  const byKey = (f: TrendForecast, key: string) => f.fields.find((x) => x.key === key)

  it('fills a null field from the stored value and keeps when it was made', () => {
    const merged = mergeTrendForecast(PARTIAL, FULL)
    for (const key of ['local-ai', 'fx']) {
      expect(byKey(merged, key)).toMatchObject({
        s: 2,
        label: 'old',
        head: `old ${key}`,
        asOf: '2026-11-09T00:30:00Z',
      })
    }
    for (const key of TREND_FIELD_KEYS.filter((k) => k !== 'local-ai' && k !== 'fx')) {
      const f = byKey(merged, key)
      expect(f).toMatchObject({ s: -1, label: 'new', head: `new ${key}` })
      expect(f).not.toHaveProperty('asOf')
    }
    expect(merged.asOf).toBe(PARTIAL.asOf)
    expect(merged.date).toBe(PARTIAL.date)
    expect(merged.line).toBe('new line')
  })

  it('does not borrow a value older than 48 hours', () => {
    const old = { ...FULL, asOf: '2026-11-07T05:30:00Z' } // 49 h before PARTIAL
    expect(byKey(mergeTrendForecast(PARTIAL, old), 'local-ai')?.s).toBeNull()
  })

  it('leaves the field empty when the stored one is empty too', () => {
    const emptyStored = {
      ...FULL,
      fields: FULL.fields.map((f) => (f.key === 'local-ai' ? { ...f, s: null } : f)),
    }
    expect(byKey(mergeTrendForecast(PARTIAL, emptyStored), 'local-ai')?.s).toBeNull()
    expect(mergeTrendForecast(PARTIAL, null)).toEqual(PARTIAL)
  })

  it('does not add a field the new answer left out', () => {
    const merged = mergeTrendForecast(partialAt('2026-11-09T06:30:00Z', ['crypto']), FULL)
    expect(keys(merged)).not.toContain('crypto')
  })

  it('reads its own stored copy back unchanged', () => {
    const merged = mergeTrendForecast(PARTIAL, FULL)
    expect(parseTrendForecast(JSON.parse(JSON.stringify(merged)))).toEqual(merged)
    const broken = JSON.parse(JSON.stringify(merged)) as { fields: Record<string, unknown>[] }
    broken.fields.find((f) => f.key === 'fx')!.asOf = 'x'
    const reread = parse(broken)
    expect(byKey(reread, 'fx')).not.toHaveProperty('asOf')
    expect(byKey(reread, 'local-ai')?.asOf).toBe('2026-11-09T00:30:00Z')
  })
})

describe('kstDate and trendAsOfText (plan Task 8, R12)', () => {
  it('reads the date in Korean time', () => {
    expect(kstDate(new Date('2026-11-08T15:30:00Z'))).toBe('2026-11-09')
    expect(kstDate(new Date('2026-11-08T14:59:00Z'))).toBe('2026-11-08')
  })

  it('gives the time for a forecast of today and the date for an older one', () => {
    const f = parse(answer())
    expect(trendAsOfText(f, new Date('2026-11-09T03:00:00Z'), 'ko-KR')).toBe('09:30')
    expect(trendAsOfText(f, new Date('2026-11-10T03:00:00Z'), 'ko-KR')).toBe('11월 9일')
  })

  it('does not put a time on yesterday right after midnight in Korea (Review Focus 5)', () => {
    const f = parse(answer())
    expect(trendAsOfText(f, new Date('2026-11-09T15:30:00Z'), 'ko-KR')).toBe('11월 9일')
  })
})

describe('trendGlyph (spec 7.6)', () => {
  it('draws the weather scale', () => {
    expect([2, 1, 0, -1, -2].map((s) => trendGlyph('weather', s as -2 | -1 | 0 | 1 | 2))).toEqual([
      'sun',
      'sun-cloud',
      'cloud',
      'rain',
      'storm',
    ])
  })

  it('draws the market scale', () => {
    expect([2, 1, 0, -1, -2].map((s) => trendGlyph('market', s as -2 | -1 | 0 | 1 | 2))).toEqual([
      'fire',
      'up',
      'flat',
      'down',
      'snow',
    ])
  })
})
