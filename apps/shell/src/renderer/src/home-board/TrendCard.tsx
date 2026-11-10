import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useDismissablePopover } from '@genoffice/ui'
import type { TrendApi, TrendSnapshot } from '../../../shared/trend-api'
import {
  kstDate,
  trendAsOfText,
  trendGlyph,
  type TrendField,
  type TrendForecast,
  type TrendGlyph,
} from '../../../shared/trend-forecast'
import {
  BRIEFING_FORMATS,
  briefingFormat,
  briefingPrompt,
  parseBriefing,
  type BriefingFormat,
} from '../../../shared/trend-briefing'
import { runDesignAi, type AiTurn, type DesignAiApi } from '../design/ai-run'
import { useI18n } from '../locale'
import type { StringKey } from '../locale'
import iconDocx from '../assets/file-docx.svg'
import iconHwp from '../assets/file-hwp.svg'
import iconMindmap from '../assets/file-mindmap.svg'
import iconPdf from '../assets/file-pdf.svg'
import iconPptx from '../assets/file-pptx.svg'
import './trend-card.css'

/** the same document pages the Home app list uses */
const FORMAT_ICON: Record<BriefingFormat, string> = {
  docx: iconDocx,
  hwp: iconHwp,
  mindmap: iconMindmap,
  pptx: iconPptx,
  pdf: iconPdf,
}

declare global {
  interface Window {
    /** the trend card's bridge (src/preload/index.ts); absent in tests and old builds */
    aiOfficeTrend?: TrendApi
  }
}

/** line icons on a 24 grid; the sun parts carry .hb-trend-sun for the chalk color */
function GlyphShape({ glyph }: { glyph: TrendGlyph }): ReactElement {
  switch (glyph) {
    case 'sun':
      return (
        <g className="hb-trend-sun">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
        </g>
      )
    case 'sun-cloud':
      return (
        <>
          <g className="hb-trend-sun">
            <circle cx="9" cy="9" r="3.5" />
            <path d="M9 2.5v1.5M2.5 9H4M4.4 4.4l1.1 1.1M13.6 4.4l-1.1 1.1" />
          </g>
          <path d="M8 19.5h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 8 19.5z" />
        </>
      )
    case 'cloud':
      return <path d="M7 18.5h10.5a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 18.5z" />
    case 'rain':
      return (
        <>
          <path d="M7 14.5h10.5a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 14.5z" />
          <path d="M8.5 17.5l-1 3M12.5 17.5l-1 3M16.5 17.5l-1 3" />
        </>
      )
    case 'storm':
      return (
        <>
          <path d="M7 14.5h10.5a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 14.5z" />
          <path d="M12.5 15l-2.5 4h3l-2 3.5" />
        </>
      )
    case 'fire':
      return (
        <path d="M12 21.5a6 6 0 0 0 6-6c0-3.5-2.5-5.5-3.5-8.5-1 2-2 2.5-3 3 0-2.5-1-5-3-7.5 0 4-4.5 6.5-4.5 13a6 6 0 0 0 8 6z" />
      )
    case 'up':
      return <path d="M4 18l6-6 3.5 3.5L20 9M14.5 9H20v5.5" />
    case 'flat':
      return <path d="M4 12h16M16.5 8.5L20 12l-3.5 3.5" />
    case 'down':
      return <path d="M4 6l6 6 3.5-3.5L20 15M14.5 15H20V9.5" />
    case 'snow':
      return (
        <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 6l2.5-1.5M9.5 19.5L12 18l2.5 1.5" />
      )
  }
}

function WeatherIcon({ glyph }: { glyph: TrendGlyph }): ReactElement {
  return (
    <svg
      className="hb-trend-icon"
      data-glyph={glyph}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <GlyphShape glyph={glyph} />
    </svg>
  )
}

/** one AI turn for the briefing: the system and user prompt in, the answer (or why not) out */
export type BriefRunner = (
  prompt: { system: string; user: string },
  signal: AbortSignal,
) => Promise<AiTurn>

/** the AI the person chose in Settings, through Home's AI bridge (the design board's one-turn run) */
function homeBriefRunner(lang: string, failed: string): BriefRunner | null {
  const home = window.aiOffice
  if (!home?.aiGetSettings || !home.aiStream || !home.aiStreamCancel || !home.onAiStream)
    return null
  const api: DesignAiApi = {
    getAiSettings: () => home.aiGetSettings(),
    aiStream: (request) => home.aiStream(request as never),
    aiStreamCancel: (requestId) => home.aiStreamCancel(requestId),
    onAiStream: (handler) => home.onAiStream(handler as never),
  }
  const words = {
    unknown: failed,
    timeout: failed,
    credits: failed,
    network: failed,
    overloaded: failed,
    noSettings: failed,
  }
  return (prompt, signal) => runDesignAi(api, lang, words, prompt, { signal, maxChars: 20_000 })
}

/**
 * The trend card (spec 7.6): Trend Radar's forecast for today, read from the
 * copy the main process stored. It draws at once (the offline line until a
 * forecast is there) and redraws when a new one arrives. 'AI 브리핑' (0.19.1)
 * sends that forecast to the person's AI once and opens the answer as a new
 * untitled Word document; nothing new is fetched.
 */
/** the format a plain click on 'AI 브리핑' makes: the last one picked on this PC */
const FORMAT_KEY = 'hanpan.trendBriefFormat'
const storedFormat = (): BriefingFormat => {
  try {
    return briefingFormat(localStorage.getItem(FORMAT_KEY))
  } catch {
    return 'docx'
  }
}

/** the menu's words for each format */
const FORMAT_WORD: Record<BriefingFormat, StringKey> = {
  docx: 'hbBriefDocx',
  hwp: 'hbBriefHwp',
  mindmap: 'hbBriefMindmap',
  pptx: 'hbBriefPptx',
  pdf: 'hbBriefPdf',
}

export function TrendCard({
  now = () => new Date(),
  brief,
  koreanDocs = false,
}: { now?: () => Date; brief?: BriefRunner; koreanDocs?: boolean } = {}): ReactElement {
  const { t, lang, dateLocale } = useI18n()
  const [forecast, setForecast] = useState<TrendForecast | null>(null)
  const [briefing, setBriefing] = useState(false)
  const formats = BRIEFING_FORMATS.filter((f) => f !== 'hwp' || koreanDocs)
  const [format, setFormat] = useState<BriefingFormat>(storedFormat)
  const [menuOpen, setMenuOpen] = useState(false)
  const briefRef = useRef<HTMLSpanElement | null>(null)
  // a press outside, Esc and the window losing focus close the format menu
  useDismissablePopover(menuOpen, () => setMenuOpen(false), { inside: () => [briefRef.current] })
  // HWP picked earlier, Korean document features turned off since: Word
  const current: BriefingFormat = formats.includes(format) ? format : 'docx'
  const [briefError, setBriefError] = useState<string | null>(null)
  const briefStop = useRef<AbortController | null>(null)
  useEffect(() => () => briefStop.current?.abort(), [])
  const runner = brief ?? homeBriefRunner(lang, t('hbTrendBriefFailed'))
  const canBrief = Boolean(runner && window.hanpanApi?.openBriefing)

  const pick = (next: BriefingFormat) => {
    setMenuOpen(false)
    setFormat(next)
    try {
      localStorage.setItem(FORMAT_KEY, next)
    } catch {
      // the choice holds for this session only
    }
    void writeBriefing(next)
  }

  const writeBriefing = async (as: BriefingFormat) => {
    if (!forecast || !runner || briefing) return
    const stop = new AbortController()
    briefStop.current = stop
    setBriefing(true)
    setBriefError(null)
    try {
      const turn = await runner(briefingPrompt(forecast), stop.signal)
      if (stop.signal.aborted) return
      if (!turn.ok) {
        setBriefError(turn.error || t('hbTrendBriefFailed'))
        return
      }
      const parsed = parseBriefing(turn.text)
      if (!parsed) {
        setBriefError(t('hbTrendBriefFailed'))
        return
      }
      const opened = await window.hanpanApi?.openBriefing?.({ format: as, brief: parsed, forecast })
      if (!opened?.ok) setBriefError(t('hbTrendBriefFailed'))
    } catch {
      if (!stop.signal.aborted) setBriefError(t('hbTrendBriefFailed'))
    } finally {
      if (briefStop.current === stop) briefStop.current = null
      setBriefing(false)
    }
  }

  useEffect(() => {
    const api = window.aiOfficeTrend
    if (!api) return
    let live = true
    const take = (snapshot: TrendSnapshot) => {
      if (live) setForecast(snapshot.forecast)
    }
    void api.get().then(take, () => undefined)
    const off = api.onChanged(take)
    return () => {
      live = false
      off()
    }
  }, [])

  const open = (path: string | null) => {
    void window.aiOfficeTrend?.open(path)
  }

  // a field carried over from another Korean day gets that day after its tip (plan R25)
  const fieldTip = (f: TrendField, date: string): { tip: string; carried?: string } => {
    const tip = f.head ? `${f.title}: ${f.head}` : f.title
    if (!f.asOf) return { tip }
    const madeAt = new Date(f.asOf)
    const day = kstDate(madeAt)
    if (day === date) return { tip }
    const when = new Intl.DateTimeFormat(dateLocale, {
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Seoul',
    }).format(madeAt)
    return { tip: `${tip} · ${t('hbTrendAsOf', { when })}`, carried: day }
  }

  return (
    <section className="hb-trend">
      <header className="hb-trend-head">
        <h2 className="hb-card-title">{t('hbTrendTitle')}</h2>
        {forecast && (
          <span className="hb-trend-asof" data-trend-asof>
            {t('hbTrendAsOf', { when: trendAsOfText(forecast, now(), dateLocale) })}
          </span>
        )}
        {forecast && canBrief && (
          <span className="hb-trend-brief" ref={briefRef}>
            <button
              type="button"
              className="hb-trend-more"
              data-trend-brief
              data-tip={t('hbTrendBriefTip', { format: t(FORMAT_WORD[current]) })}
              disabled={briefing}
              aria-busy={briefing}
              onClick={() => void writeBriefing(current)}
            >
              {briefing ? t('hbTrendBriefBusy') : t('hbTrendBrief')}
            </button>
            <button
              type="button"
              className="hb-trend-more hb-trend-brief-menu"
              data-trend-brief-menu
              aria-label={t('hbTrendBriefFormat')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={briefing}
              onClick={() => setMenuOpen((on) => !on)}
            >
              ▾
            </button>
            {menuOpen && (
              <span className="hb-trend-brief-list" role="menu">
                {formats.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="menuitemradio"
                    aria-checked={f === current}
                    data-trend-brief-format={f}
                    onClick={() => pick(f)}
                  >
                    <img src={FORMAT_ICON[f]} alt="" width={16} height={16} />
                    {t(FORMAT_WORD[f])}
                  </button>
                ))}
              </span>
            )}
          </span>
        )}
        <button type="button" className="hb-trend-more" data-trend-more onClick={() => open(null)}>
          {t('hbTrendMore')}
        </button>
      </header>
      {forecast ? (
        <>
          <div className="hb-trend-fields">
            <div className="hb-trend-grid">
              {forecast.fields.map((f) => {
                const { tip, carried } = fieldTip(f, forecast.date)
                const word = f.s === null ? t('hbTrendNoData') : f.label
                return (
                  <button
                    key={f.key}
                    type="button"
                    className="hb-trend-field"
                    data-trend-field={f.key}
                    data-trend-carried={carried}
                    data-tip={tip}
                    aria-label={`${f.title} ${word}`}
                    onClick={() => open(f.path)}
                  >
                    {f.s === null ? (
                      <span className="hb-trend-nodata" data-trend-nodata>
                        {t('hbTrendNoData')}
                      </span>
                    ) : (
                      <WeatherIcon glyph={trendGlyph(f.scale, f.s)} />
                    )}
                    <span className="hb-trend-name">{f.title}</span>
                    {f.s !== null && <span className="hb-trend-label">{f.label}</span>}
                  </button>
                )
              })}
            </div>
          </div>
          {briefError ? (
            <p className="hb-trend-line hb-trend-brief-error" role="alert" data-trend-brief-error>
              {briefError}
            </p>
          ) : (
            <p className="hb-trend-line" data-trend-line>
              <span className="hb-trend-line-head">{t('hbTrendLine')}</span> {forecast.line}
            </p>
          )}
        </>
      ) : (
        <p className="hb-trend-offline" data-trend-offline>
          {t('hbTrendOffline')}
        </p>
      )}
    </section>
  )
}
