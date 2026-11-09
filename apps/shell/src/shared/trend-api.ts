import { parseTrendForecast, type TrendForecast } from './trend-forecast'

/**
 * The trend card's bridge (spec 7.11): Home reads only the forecast the main
 * process stored and asks the main process to open its links; the window
 * itself never reaches the network.
 */

export const TREND_CHANNELS = {
  get: 'trend:get',
  changed: 'trend:changed',
  open: 'trend:open',
} as const

export interface TrendSnapshot {
  /** false in a build without a forecast address */
  available: boolean
  /** the stored forecast, or null before the first good answer */
  forecast: TrendForecast | null
}

/** window.aiOfficeTrend */
export interface TrendApi {
  get(): Promise<TrendSnapshot>
  onChanged(handler: (snapshot: TrendSnapshot) => void): () => void
  /** a path on the Trend Radar site, or null for its front page */
  open(path: string | null): Promise<void>
}

/** checks a snapshot that crossed the bridge; anything broken reads as no forecast */
export function parseTrendSnapshot(raw: unknown): TrendSnapshot {
  const record = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  return {
    available: record.available === true,
    forecast: parseTrendForecast(record.forecast),
  }
}
