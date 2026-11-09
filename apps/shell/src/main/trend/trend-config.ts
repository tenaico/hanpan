import { TREND_FORECAST_URL } from '../../shared/trend-forecast'

/**
 * Where the forecast comes from. HANPAN_TREND_URL is for tests and development
 * (plan R10): empty means a build without a forecast address, and a file:
 * address reads a fixed file. Anything else that is not an http(s) or file:
 * address gives no address at all.
 */
export function trendForecastUrl(env: Record<string, string | undefined>): string | null {
  const value = env.HANPAN_TREND_URL
  if (value === undefined) return TREND_FORECAST_URL
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:'
      ? url.href
      : null
  } catch {
    return null
  }
}

/**
 * The request address: a web address carries client=hanpan and the app
 * version (spec 7.11); a file: address for tests is read as it is.
 */
export function forecastRequestUrl(base: string, version: string): string {
  const url = new URL(base)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return base
  url.searchParams.set('client', 'hanpan')
  url.searchParams.set('v', version)
  return url.href
}
