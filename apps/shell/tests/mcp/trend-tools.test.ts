import { describe, expect, it } from 'vitest'
import { createTrendTools } from '../../src/main/mcp/tools/trend-tools'
import type { TrendForecast } from '../../src/shared/trend-forecast'

/** read_trend_forecast (0.19.1): the AI reads the forecast the trend card already has */
const forecast: TrendForecast = {
  schema: 1,
  asOf: '2026-11-09T23:37:30.600Z',
  date: '2026-11-10',
  line: '반도체는 맑고 주식은 궂습니다.',
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
      key: 'fx',
      title: '환율',
      scale: 'weather',
      s: null,
      label: '',
      head: '',
      path: '/fx',
    },
  ],
}

const run = async (read: () => TrendForecast | null) => {
  const [tool] = createTrendTools({ read })
  expect(tool!.name).toBe('read_trend_forecast')
  return tool!.handler({})
}

describe('read_trend_forecast', () => {
  it('gives the stored forecast field by field, with its site link', async () => {
    expect(await run(() => forecast)).toEqual({
      available: true,
      date: '2026-11-10',
      asOf: '2026-11-09T23:37:30.600Z',
      line: '반도체는 맑고 주식은 궂습니다.',
      source: 'https://trend.tenai.kr',
      fields: [
        {
          field: '반도체',
          signal: 2,
          weather: '맑음',
          headline: '삼성전자 영업이익 107.4조 원',
          link: 'https://trend.tenai.kr/semiconductor',
        },
        {
          field: '환율',
          signal: null,
          weather: null,
          headline: null,
          link: 'https://trend.tenai.kr/fx',
        },
      ],
    })
  })

  it('says there is none yet, without fetching anything', async () => {
    const answer = (await run(() => null)) as { available: boolean; reason: string }
    expect(answer.available).toBe(false)
    expect(answer.reason).toMatch(/trend card/i)
  })
})
