import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forecastRequestUrl } from '../src/main/trend/trend-config'
import {
  TREND_INTERVAL_MS,
  createTrendService,
  type TrendServiceDeps,
} from '../src/main/trend/trend-service'
import {
  TREND_FIELD_KEYS,
  parseTrendForecast,
  type TrendForecast,
} from '../src/shared/trend-forecast'

/**
 * The forecast schedule (spec 7.11, plan Task 7): 3 s after launch, then every
 * 6 hours, at most 5 s a try, only while the board shows a trend card, and a
 * broken answer never replaces the stored one (Review Focus 2, 6).
 */

const URL_BASE = 'https://trend.tenai.kr/api/forecast'
const REQUEST = 'https://trend.tenai.kr/api/forecast?client=hanpan&v=0.19.0'

function raw(asOf: string, nulls: string[] = [], tag = 'new'): Record<string, unknown> {
  return {
    schema: 1,
    asOf,
    date: asOf.slice(0, 10),
    fields: TREND_FIELD_KEYS.map((key) => ({
      key,
      title: key,
      scale: 'weather',
      s: nulls.includes(key) ? null : 1,
      label: nulls.includes(key) ? '' : tag,
      head: nulls.includes(key) ? '' : `${tag} ${key}`,
      path: `/${key}`,
    })),
    line: `${tag} line`,
  }
}
const FULL_RAW = raw('2026-11-09T00:30:00Z', [], 'old')
const PARTIAL_RAW = raw('2026-11-09T06:30:00Z', ['local-ai', 'fx'])

function setup(over: Partial<TrendServiceDeps> = {}) {
  const deps = {
    url: URL_BASE as string | null,
    version: '0.19.0',
    load: vi.fn(async (): Promise<unknown> => PARTIAL_RAW),
    readStored: vi.fn((): unknown => null),
    writeStored: vi.fn(),
    wanted: vi.fn(() => true),
    broadcast: vi.fn(),
    ...over,
  }
  const service = createTrendService(deps as TrendServiceDeps)
  return { deps, service }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('forecastRequestUrl', () => {
  it('adds the client and version to a web address', () => {
    expect(forecastRequestUrl(URL_BASE, '0.19.0')).toBe(REQUEST)
  })

  it('leaves a file address alone', () => {
    expect(forecastRequestUrl('file:///C:/x/trend.json', '0.19.0')).toBe('file:///C:/x/trend.json')
  })
})

describe('createTrendService', () => {
  it('fetches 3 s after start and every 6 hours', async () => {
    const { deps, service } = setup()
    service.start()
    await vi.advanceTimersByTimeAsync(2_999)
    expect(deps.load).toHaveBeenCalledTimes(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(deps.load).toHaveBeenCalledTimes(1)
    expect(deps.load.mock.calls[0][0]).toBe(REQUEST)
    await vi.advanceTimersByTimeAsync(TREND_INTERVAL_MS)
    expect(deps.load).toHaveBeenCalledTimes(2)
    service.stop()
  })

  it('stores a valid answer and tells the window', async () => {
    const { deps, service } = setup({ load: vi.fn(async () => FULL_RAW) })
    service.start()
    await vi.advanceTimersByTimeAsync(3_000)
    const forecast = parseTrendForecast(FULL_RAW)
    expect(deps.writeStored).toHaveBeenCalledWith(forecast)
    expect(deps.broadcast).toHaveBeenCalledWith({ available: true, forecast })
    expect(service.snapshot()).toEqual({ available: true, forecast })
    service.stop()
  })

  it('keeps the stored forecast when the answer is broken', async () => {
    for (const broken of ['<html>오류</html>', { schema: 2 }]) {
      const { deps, service } = setup({
        readStored: vi.fn(() => FULL_RAW),
        load: vi.fn(async () => broken),
      })
      service.start()
      await vi.advanceTimersByTimeAsync(3_000)
      expect(deps.load).toHaveBeenCalledTimes(1)
      expect(deps.writeStored).not.toHaveBeenCalled()
      expect(deps.broadcast).not.toHaveBeenCalled()
      expect(service.snapshot().forecast).toEqual(parseTrendForecast(FULL_RAW))
      service.stop()
    }
  })

  it('keeps the stored forecast when the request fails', async () => {
    const { deps, service } = setup({
      readStored: vi.fn(() => FULL_RAW),
      load: vi.fn(async () => {
        throw new Error('HTTP 503')
      }),
    })
    service.start()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(deps.writeStored).not.toHaveBeenCalled()
    expect(service.snapshot().forecast).toEqual(parseTrendForecast(FULL_RAW))
    service.stop()
  })

  it('gives up after 5 seconds', async () => {
    const signals: AbortSignal[] = []
    const load = vi.fn(
      (_url: string, signal: AbortSignal) =>
        new Promise<unknown>((_resolve, reject) => {
          signals.push(signal)
          signal.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    )
    const { deps, service } = setup({ readStored: vi.fn(() => FULL_RAW), load })
    service.start()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(signals[0].aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(signals[0].aborted).toBe(true)
    expect(deps.writeStored).not.toHaveBeenCalled()
    expect(service.snapshot().forecast).toEqual(parseTrendForecast(FULL_RAW))
    await vi.advanceTimersByTimeAsync(TREND_INTERVAL_MS)
    expect(load).toHaveBeenCalledTimes(2)
    service.stop()
  })

  it('does not fetch while the board has no trend card', async () => {
    let wanted = false
    const { deps, service } = setup({ wanted: vi.fn(() => wanted) })
    service.start()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(deps.load).not.toHaveBeenCalled()
    wanted = true
    service.boardChanged()
    await vi.advanceTimersByTimeAsync(0)
    expect(deps.load).toHaveBeenCalledTimes(1)
    service.boardChanged()
    await vi.advanceTimersByTimeAsync(0)
    expect(deps.load).toHaveBeenCalledTimes(1)
    service.stop()
  })

  it('boardChanged before the first turn waits for it', async () => {
    const { deps, service } = setup()
    service.start()
    await vi.advanceTimersByTimeAsync(1_000)
    service.boardChanged()
    await vi.advanceTimersByTimeAsync(0)
    expect(deps.load).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(deps.load).toHaveBeenCalledTimes(1)
    service.stop()
  })

  it('no address: nothing is fetched', async () => {
    const { deps, service } = setup({ url: null })
    expect(service.snapshot().available).toBe(false)
    service.start()
    await vi.advanceTimersByTimeAsync(TREND_INTERVAL_MS + 3_000)
    service.boardChanged()
    expect(deps.load).not.toHaveBeenCalled()
    service.stop()
  })

  it('fills a null field from the stored forecast', async () => {
    const { deps, service } = setup({ readStored: vi.fn(() => FULL_RAW) })
    service.start()
    await vi.advanceTimersByTimeAsync(3_000)
    const written = deps.writeStored.mock.calls[0][0] as TrendForecast
    const sent = deps.broadcast.mock.calls[0][0] as { forecast: TrendForecast }
    for (const f of [written, sent.forecast]) {
      expect(f.fields.find((x) => x.key === 'local-ai')).toMatchObject({
        s: 1,
        label: 'old',
        head: 'old local-ai',
        asOf: '2026-11-09T00:30:00Z',
      })
    }
    expect(service.snapshot().forecast?.asOf).toBe('2026-11-09T06:30:00Z')
    service.stop()
  })
})
