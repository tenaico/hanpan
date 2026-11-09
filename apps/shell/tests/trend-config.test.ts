import { describe, expect, it } from 'vitest'
import { trendForecastUrl } from '../src/main/trend/trend-config'

/**
 * The forecast address (spec 7.10, 7.11): the built-in address unless
 * HANPAN_TREND_URL names another one for tests and development; empty means a
 * build without a forecast address.
 */

describe('trendForecastUrl', () => {
  it('uses the built-in address when the variable is not set', () => {
    expect(trendForecastUrl({})).toBe('https://trend.tenai.kr/api/forecast')
  })

  it('has no address when the variable is empty', () => {
    expect(trendForecastUrl({ HANPAN_TREND_URL: '' })).toBeNull()
  })

  it.each(['http://127.0.0.1:5123/api/forecast', 'file:///C:/fixtures/forecast.json'])(
    'takes %s as it is',
    (url) => {
      expect(trendForecastUrl({ HANPAN_TREND_URL: url })).toBe(url)
    },
  )

  it.each(['ftp://x/y', 'not a url'])('refuses %s', (url) => {
    expect(trendForecastUrl({ HANPAN_TREND_URL: url })).toBeNull()
  })
})
