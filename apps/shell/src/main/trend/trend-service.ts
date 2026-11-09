import { forecastRequestUrl } from './trend-config'
import type { TrendSnapshot } from '../../shared/trend-api'
import {
  mergeTrendForecast,
  parseTrendForecast,
  type TrendForecast,
} from '../../shared/trend-forecast'

/**
 * When the forecast is fetched and what is kept (spec 7.11, plan Task 7).
 * No Electron here: the IPC module hands in how to load, store and tell the
 * window, so the schedule and the checks run in plain unit tests.
 */

export const TREND_FIRST_DELAY_MS = 3_000
export const TREND_INTERVAL_MS = 6 * 60 * 60 * 1000
export const TREND_TIMEOUT_MS = 5_000

export interface TrendServiceDeps {
  /** null in a build without a forecast address: nothing is ever fetched */
  url: string | null
  version: string
  load(url: string, signal: AbortSignal): Promise<unknown>
  readStored(): unknown
  writeStored(forecast: TrendForecast): void
  /** true while the stored board shows a trend card (plan R9) */
  wanted(): boolean
  broadcast(snapshot: TrendSnapshot): void
}

export interface TrendService {
  start(): void
  /** Home's board was read or written: fetch now if the first turn passed without one */
  boardChanged(): void
  snapshot(): TrendSnapshot
  stop(): void
}

export function createTrendService(deps: TrendServiceDeps): TrendService {
  let forecast: TrendForecast | null = parseTrendForecast(deps.readStored())
  let firstTimer: ReturnType<typeof setTimeout> | null = null
  let interval: ReturnType<typeof setInterval> | null = null
  let firstTurnPassed = false
  let lastTry: number | null = null
  let running: AbortController | null = null

  const snapshot = (): TrendSnapshot => ({ available: deps.url !== null, forecast })

  async function turn(): Promise<void> {
    const base = deps.url
    if (base === null || running || !deps.wanted()) return
    lastTry = Date.now()
    const controller = new AbortController()
    running = controller
    const timer = setTimeout(() => controller.abort(), TREND_TIMEOUT_MS)
    try {
      const raw = await deps.load(forecastRequestUrl(base, deps.version), controller.signal)
      if (controller.signal.aborted) return
      const parsed = parseTrendForecast(raw)
      if (!parsed) return
      const merged = mergeTrendForecast(parsed, forecast)
      deps.writeStored(merged)
      forecast = merged
      deps.broadcast(snapshot())
    } catch {
      // offline, timed out or refused: the stored forecast stays as it is
    } finally {
      clearTimeout(timer)
      if (running === controller) running = null
    }
  }

  return {
    start() {
      if (firstTimer || interval) return
      firstTimer = setTimeout(() => {
        firstTimer = null
        firstTurnPassed = true
        void turn()
        interval = setInterval(() => void turn(), TREND_INTERVAL_MS)
      }, TREND_FIRST_DELAY_MS)
    },
    boardChanged() {
      if (!firstTurnPassed || lastTry !== null) return
      void turn()
    },
    snapshot,
    stop() {
      if (firstTimer) clearTimeout(firstTimer)
      if (interval) clearInterval(interval)
      firstTimer = null
      interval = null
      running?.abort()
    },
  }
}
