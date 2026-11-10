/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TrendApi, TrendSnapshot } from '../src/shared/trend-api'
import { TREND_FIELD_KEYS, type TrendField, type TrendForecast } from '../src/shared/trend-forecast'
import { TrendCard } from '../src/renderer/src/home-board/TrendCard'
import { LocaleProvider } from '../src/renderer/src/locale'

/**
 * The trend card (spec 7.6, plan Task 8): today's forecast, its time, the
 * links it opens, the offline line, fields with no data and fields carried
 * over from an earlier forecast (plan R25).
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let snapshot: TrendSnapshot
let open: ReturnType<typeof vi.fn>
let listeners: ((s: TrendSnapshot) => void)[]

const MARKET = new Set(['realestate'])

function field(key: string, extra: Partial<TrendField> = {}): TrendField {
  return {
    key: key as TrendField['key'],
    title: `${key}-title`,
    scale: MARKET.has(key) ? 'market' : 'weather',
    s: 1,
    label: `${key}-label`,
    head: `${key} head`,
    path: `/${key}`,
    ...extra,
  }
}

function forecast(fields: TrendField[], extra: Partial<TrendForecast> = {}): TrendForecast {
  return {
    schema: 1,
    asOf: '2026-11-09T00:30:00Z',
    date: '2026-11-09',
    fields,
    line: '오늘은 맑음',
    ...extra,
  }
}

const TEN = (): TrendField[] =>
  TREND_FIELD_KEYS.map((key) => field(key, key === 'fx' ? { s: null, label: '' } : {}))

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  listeners = []
  snapshot = { available: true, forecast: null }
  open = vi.fn(async () => undefined)
  const api: TrendApi = {
    get: vi.fn(async () => snapshot),
    onChanged: (handler) => {
      listeners.push(handler)
      return () => {
        listeners = listeners.filter((h) => h !== handler)
      }
    },
    open,
  }
  window.aiOfficeTrend = api
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  delete window.aiOfficeTrend
})

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function render(
  now = new Date('2026-11-09T03:00:00Z'),
  brief?: Parameters<typeof TrendCard>[0] extends infer P ? NonNullable<P>['brief'] : never,
  koreanDocs = false,
): Promise<void> {
  await act(async () =>
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'ko' },
        createElement(TrendCard, { now: () => now, koreanDocs, ...(brief ? { brief } : {}) }),
      ),
    ),
  )
  await flush()
}

const fieldEl = (key: string) => host.querySelector<HTMLElement>(`[data-trend-field="${key}"]`)

describe('TrendCard', () => {
  it('shows the offline line when nothing was ever stored', async () => {
    await render()
    expect(host.querySelector('[data-trend-offline]')?.textContent).toBe(
      '인터넷에 연결되면 오늘의 트렌드가 나옵니다',
    )
    expect(host.querySelector('[data-trend-field]')).toBeNull()
    expect(host.querySelector('h2.hb-card-title')?.textContent).toBe(
      '트렌드 레이더 · 오늘의 기상도',
    )
  })

  it('shows the offline line without the bridge', async () => {
    delete window.aiOfficeTrend
    await render()
    expect(host.querySelector('[data-trend-offline]')).not.toBeNull()
  })

  it('draws every field in the forecast order', async () => {
    snapshot = { available: true, forecast: forecast(TEN()) }
    await render()
    const keys = Array.from(host.querySelectorAll<HTMLElement>('[data-trend-field]')).map(
      (el) => el.dataset.trendField,
    )
    expect(keys).toEqual([...TREND_FIELD_KEYS])
    expect(host.querySelector('[data-trend-offline]')).toBeNull()
    expect(fieldEl('fx')?.querySelector('[data-trend-nodata]')?.textContent).toBe('정보 없음')
    expect(fieldEl('fx')?.querySelector('[data-glyph]')).toBeNull()
    expect(fieldEl('realestate')?.querySelector('[data-glyph]')?.getAttribute('data-glyph')).toBe(
      'up',
    )
    expect(fieldEl('ai')?.querySelector('[data-glyph]')?.getAttribute('data-glyph')).toBe(
      'sun-cloud',
    )
    expect(fieldEl('ai')?.textContent).toContain('ai-label')
    expect(fieldEl('ai')?.querySelector('.hb-trend-name')?.textContent).toBe('ai-title')
    expect(fieldEl('ai')?.dataset.tip).toBe('ai-title: ai head')
    expect(fieldEl('ai')?.getAttribute('aria-label')).toBe('ai-title ai-label')
    expect(fieldEl('fx')?.getAttribute('aria-label')).toBe('fx-title 정보 없음')
    expect(host.querySelector('[data-trend-line]')?.textContent).toContain('오늘의 한 줄')
    expect(host.querySelector('[data-trend-line]')?.textContent).toContain('오늘은 맑음')
  })

  it('uses the title alone as the tip when there is no head', async () => {
    snapshot = { available: true, forecast: forecast([field('ai', { head: '' })]) }
    await render()
    expect(fieldEl('ai')?.dataset.tip).toBe('ai-title')
  })

  it('opens a field and the front page', async () => {
    snapshot = { available: true, forecast: forecast(TEN()) }
    await render()
    await act(async () => fieldEl('stocks')!.click())
    expect(open).toHaveBeenCalledWith('/stocks')
    const more = host.querySelector<HTMLButtonElement>('button[data-trend-more]')!
    expect(more.textContent).toBe('자세히')
    await act(async () => more.click())
    expect(open).toHaveBeenLastCalledWith(null)
  })

  it('marks a field carried over from another day (R25)', async () => {
    const carried = field('local-ai', { s: 0, label: '흐림', asOf: '2026-11-08T00:30:00Z' })
    snapshot = { available: true, forecast: forecast([field('ai'), carried]) }
    await render()
    const el = fieldEl('local-ai')!
    expect(el.dataset.trendCarried).toBe('2026-11-08')
    expect(el.querySelector('[data-glyph]')?.getAttribute('data-glyph')).toBe('cloud')
    expect(el.dataset.tip).toContain('11월 8일 기준')
    expect(el.textContent).toContain('흐림')
    expect(fieldEl('ai')!.hasAttribute('data-trend-carried')).toBe(false)
    expect(host.querySelector('[data-trend-asof]')?.textContent).toBe('09:30 기준')
  })

  it('does not mark a field carried over from the same Korean day', async () => {
    const carried = field('local-ai', { s: 0, label: '흐림', asOf: '2026-11-09T00:30:00Z' })
    snapshot = { available: true, forecast: forecast([carried]) }
    await render()
    expect(fieldEl('local-ai')!.hasAttribute('data-trend-carried')).toBe(false)
    expect(fieldEl('local-ai')!.dataset.tip).not.toContain('기준')
  })

  it('draws again when a new forecast comes', async () => {
    await render()
    expect(host.querySelector('[data-trend-field]')).toBeNull()
    await act(async () => {
      for (const h of listeners) h({ available: true, forecast: forecast([field('stocks')]) })
    })
    expect(fieldEl('stocks')).not.toBeNull()
    expect(host.querySelector('[data-trend-offline]')).toBeNull()
  })

  it('stops listening once removed', async () => {
    await render()
    expect(listeners).toHaveLength(1)
    act(() => root.unmount())
    expect(listeners).toHaveLength(0)
    root = createRoot(host)
  })

  it('gives the time for today and the date for another day', async () => {
    snapshot = { available: true, forecast: forecast(TEN()) }
    await render(new Date('2026-11-09T03:00:00Z'))
    expect(host.querySelector('[data-trend-asof]')?.textContent).toBe('09:30 기준')
    act(() => root.unmount())
    root = createRoot(host)
    await render(new Date('2026-11-10T03:00:00Z'))
    expect(host.querySelector('[data-trend-asof]')?.textContent).toBe('11월 9일 기준')
  })

  describe('AI briefing (0.19.1)', () => {
    const ANSWER = JSON.stringify({
      headline: '오늘은 대체로 맑습니다',
      summary: ['AI 분야가 맑습니다'],
      outlook: ['흐름이 이어질 수 있습니다'],
      watch: ['환율'],
    })
    let openBriefing: ReturnType<typeof vi.fn>

    beforeEach(() => {
      localStorage.clear()
      openBriefing = vi.fn(async () => ({ ok: true }))
      window.hanpanApi = { openBriefing } as unknown as NonNullable<typeof window.hanpanApi>
    })
    afterEach(() => {
      delete window.hanpanApi
    })

    const button = () => host.querySelector<HTMLButtonElement>('[data-trend-brief]')

    it('asks the AI once with the forecast and opens the answer as a new Word document', async () => {
      snapshot = { available: true, forecast: forecast(TEN()) }
      const brief = vi.fn(async () => ({ ok: true as const, text: ANSWER }))
      await render(undefined, brief)
      await act(async () => button()!.click())
      await flush()
      expect(brief).toHaveBeenCalledTimes(1)
      const prompt = brief.mock.calls[0]![0] as { system: string; user: string }
      expect(prompt.system).toContain('"headline"')
      expect(prompt.user).toContain('ai-title')
      expect(prompt.user).toContain('오늘은 맑음')
      expect(openBriefing).toHaveBeenCalledTimes(1)
      const sent = openBriefing.mock.calls[0]![0] as {
        format: string
        brief: { headline: string }
        forecast: { date: string }
      }
      // Word unless the person picked another format
      expect(sent.format).toBe('docx')
      expect(sent.brief.headline).toBe('오늘은 대체로 맑습니다')
      expect(sent.forecast.date).toBe('2026-11-09')
      expect(button()!.disabled).toBe(false)
    })

    it('offers the formats, writes in the one picked and remembers it (0.19.2)', async () => {
      snapshot = { available: true, forecast: forecast(TEN()) }
      const brief = vi.fn(async () => ({ ok: true as const, text: ANSWER }))
      await render(undefined, brief)
      await act(async () =>
        host.querySelector<HTMLButtonElement>('[data-trend-brief-menu]')!.click(),
      )
      const options = [...host.querySelectorAll<HTMLButtonElement>('[data-trend-brief-format]')]
      expect(options.map((o) => o.dataset.trendBriefFormat)).toEqual([
        'docx',
        'mindmap',
        'pptx',
        'pdf',
      ])
      await act(async () => options.find((o) => o.dataset.trendBriefFormat === 'pdf')!.click())
      await flush()
      expect((openBriefing.mock.calls[0]![0] as { format: string }).format).toBe('pdf')
      expect(host.querySelector('[data-trend-brief-format]')).toBeNull()
      // the next plain click makes a PDF again
      await act(async () => button()!.click())
      await flush()
      expect((openBriefing.mock.calls[1]![0] as { format: string }).format).toBe('pdf')
    })

    it('offers HWP when the Korean document features are on', async () => {
      snapshot = { available: true, forecast: forecast(TEN()) }
      await render(undefined, async () => ({ ok: true as const, text: ANSWER }), true)
      await act(async () =>
        host.querySelector<HTMLButtonElement>('[data-trend-brief-menu]')!.click(),
      )
      const formats = [
        ...host.querySelectorAll<HTMLButtonElement>('[data-trend-brief-format]'),
      ].map((o) => o.dataset.trendBriefFormat)
      expect(formats).toEqual(['docx', 'hwp', 'mindmap', 'pptx', 'pdf'])
    })

    it('says why when the AI cannot write it, and opens nothing', async () => {
      snapshot = { available: true, forecast: forecast(TEN()) }
      await render(undefined, async () => ({ ok: false as const, error: 'AI를 연결하세요.' }))
      await act(async () => button()!.click())
      await flush()
      expect(host.querySelector('[data-trend-brief-error]')?.textContent).toBe('AI를 연결하세요.')
      expect(openBriefing).not.toHaveBeenCalled()
    })

    it('says it could not write one when the answer is not a briefing', async () => {
      snapshot = { available: true, forecast: forecast(TEN()) }
      await render(undefined, async () => ({ ok: true as const, text: '못 하겠습니다.' }))
      await act(async () => button()!.click())
      await flush()
      expect(host.querySelector('[data-trend-brief-error]')?.textContent).toContain(
        '브리핑을 쓰지 못했습니다',
      )
      expect(openBriefing).not.toHaveBeenCalled()
    })

    it('offers no briefing without a forecast', async () => {
      await render()
      expect(button()).toBeNull()
    })
  })
})
