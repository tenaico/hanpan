/**
 * Hanpan: the "send this map to a document" dialog. The person picks the layout,
 * the fonts, and whether the map's words go as they are or the AI writes
 * sentences for them; the shell makes the document and opens it in a new tab,
 * linked to this map. With the Korean document features off (decision 0091) a
 * Word report skips the Korean report settings and goes out as a numbered
 * outline in a basic look.
 *
 * For slides, the AI writes each slide in the chosen style (slide-writer.ts):
 * its title, its lines, supporting lines, a takeaway and the speaker notes.
 *
 * The AI is whatever the person chose in Settings: a local model (Ollama,
 * LM Studio, vLLM) when one is set up. If it does not answer, the map is sent
 * as it is and the dialog says why; nothing is sent anywhere else instead.
 */
import { useRef, useState } from 'react'
import { streamText } from '@genoffice/agent-core'
import {
  applyBodies,
  emptySlideWriting,
  fleshOutJobs,
  koreanDate,
  parseFleshOut,
  parseSlideWriting,
  wroteSlide,
  slideWriterJobs,
  topicTitles,
  SLIDE_STYLES,
  type SlideStyleId,
  type MarkerStyle,
  type PanOutline,
  type SendTarget,
  type SlideWriting,
  type SlideWritingStyle,
} from '@genoffice/hanpan-core/renderer'
import type { AiSettings } from '@genoffice/ai-provider'
import { useKoreanDocFeatures } from '@genoffice/ui'
import { Modal } from '../components/dialogs'
import type { DocumentSession } from '../document/session'
import { createElectronTransport } from '../ai/transport'
import { useI18n, type StringKey } from '../i18n/locale'
import { sheetOutline } from './map-outline'

const TITLE: Record<SendTarget, StringKey> = {
  hwp: 'sendHwp',
  slides: 'sendSlides',
  docx: 'sendDocx',
}
/** Longest answer taken for one branch (a branch of 200 topics at 2 sentences each fits). */
const MAX_ANSWER_CHARS = 60_000

type Phase =
  | { kind: 'idle' }
  | { kind: 'ai'; done: number; total: number }
  | { kind: 'sending' }
  | { kind: 'error'; text: string }

async function fleshOut(
  outline: PanOutline,
  settings: AiSettings,
  lang: () => import('@genoffice/i18n').Lang,
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
): Promise<{ outline: PanOutline; error: string | null }> {
  let lastError: string | null = null
  const transport = createElectronTransport(() => settings, {
    getLang: lang,
    onStreamError: (error) => {
      lastError = error.message
    },
    onSubscriptionUsage: () => {},
    onInputTruncated: () => {},
  })
  const jobs = fleshOutJobs(outline, lang())
  const bodies = new Map<string, string>()
  for (let i = 0; i < jobs.length; i++) {
    progress(i, jobs.length)
    const job = jobs[i]!
    const outcome = await streamText({
      transport,
      system: job.system,
      user: job.user,
      signal,
      maxChars: MAX_ANSWER_CHARS,
      extract: (raw) => ({ text: raw }),
    })
    if (outcome.status === 'empty') {
      return { outline, error: outcome.error ?? lastError ?? 'no answer' }
    }
    for (const [key, sentence] of parseFleshOut(outcome.text, job.keys)) bodies.set(key, sentence)
    if (signal.aborted) break
  }
  progress(jobs.length, jobs.length)
  return {
    outline: applyBodies(outline, bodies),
    error: bodies.size ? null : (lastError ?? 'no sentences'),
  }
}

interface SlidesOutcome {
  writing: SlideWriting | undefined
  /** why the AI stopped, or wrote nothing; null when every slide came back */
  error: string | null
  /** slides the AI wrote, of those it was asked for */
  done: number
  total: number
}

/** The slides' text, one request per main branch; what came back before a failure is kept. */
async function writeSlides(
  outline: PanOutline,
  style: SlideWritingStyle,
  options: { audience: string; includeNotes: boolean },
  settings: AiSettings,
  lang: () => import('@genoffice/i18n').Lang,
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
): Promise<SlidesOutcome> {
  let lastError: string | null = null
  const transport = createElectronTransport(() => settings, {
    getLang: lang,
    onStreamError: (error) => {
      lastError = error.message
    },
    onSubscriptionUsage: () => {},
    onInputTruncated: () => {},
  })
  const jobs = slideWriterJobs(outline, style, options)
  const titles = topicTitles(outline)
  const writing = emptySlideWriting()
  const done = () => jobs.filter((job) => wroteSlide(writing, job.branchKey)).length
  const result = (error: string | null): SlidesOutcome => {
    const n = done()
    return {
      writing: n ? writing : undefined,
      error: n ? error : (error ?? lastError ?? 'no slide text'),
      done: n,
      total: jobs.length,
    }
  }
  for (let i = 0; i < jobs.length; i++) {
    progress(i, jobs.length)
    const job = jobs[i]!
    const outcome = await streamText({
      transport,
      system: job.system,
      user: job.user,
      signal,
      maxChars: MAX_ANSWER_CHARS,
      extract: (raw) => ({ text: raw }),
    })
    if (outcome.status === 'empty') return result(outcome.error ?? lastError ?? 'no answer')
    parseSlideWriting(outcome.text, job, titles, writing)
    if (signal.aborted) break
  }
  progress(jobs.length, jobs.length)
  return result(null)
}

export function SendDialog(p: {
  target: SendTarget
  session: DocumentSession
  sheetKey: string
  mapPath: string | null
  /** puts any topic title still being typed into the map */
  flush(): void
  onClose(): void
  onSent(warning: string | null): void
}) {
  const { t, lang } = useI18n()
  const [style, setStyle] = useState<MarkerStyle>('report')
  const [theme, setTheme] = useState<'auto' | 'plain'>('auto')
  const [ai, setAi] = useState(false)
  const [notes, setNotes] = useState(true)
  const [date, setDate] = useState(() => koreanDate(new Date()))
  const [department, setDepartment] = useState('')
  const [slideStyle, setSlideStyle] = useState<SlideStyleId | 'plain'>('mckinsey')
  const [audience, setAudience] = useState('')
  const styleInfo = SLIDE_STYLES.find((st) => st.id === slideStyle)
  const ko = lang === 'ko'
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const abort = useRef<AbortController | null>(null)
  const busy = phase.kind === 'ai' || phase.kind === 'sending'
  const isDocument = p.target !== 'slides'
  const korean = useKoreanDocFeatures(lang)
  /** the Korean report settings (layout, look, date, department) */
  const reportSettings = isDocument && korean

  const close = () => {
    abort.current?.abort()
    p.onClose()
  }

  const send = async () => {
    p.flush()
    const { outline: mapOutline, sheetId } = await sheetOutline(p.session, p.sheetKey)
    if (!mapOutline.nodes.length) {
      setPhase({ kind: 'error', text: t('sendEmpty') })
      return
    }
    let outline = mapOutline
    let warning: string | null = null
    let slideWriting: SlideWriting | undefined
    if (ai && !isDocument) {
      const controller = new AbortController()
      abort.current = controller
      const settings = await window.mindmapApi.getAiSettings?.().catch(() => null)
      if (!settings) {
        warning = t('sendAiFallback', { error: 'AI settings' })
      } else {
        const result = await writeSlides(
          outline,
          slideStyle,
          { audience: audience.trim(), includeNotes: notes },
          settings,
          () => lang,
          controller.signal,
          (done, total) => setPhase({ kind: 'ai', done, total }),
        )
        if (controller.signal.aborted) return
        slideWriting = result.writing
        if (result.error) {
          // some slides came back before the AI stopped: those are kept, and the message says so
          warning = result.done
            ? t('sendAiPartial', { done: result.done, total: result.total, error: result.error })
            : t('sendAiFallback', { error: result.error })
        }
      }
    } else if (ai) {
      const controller = new AbortController()
      abort.current = controller
      const settings = await window.mindmapApi.getAiSettings?.().catch(() => null)
      if (!settings) {
        warning = t('sendAiFallback', { error: 'AI settings' })
      } else {
        const result = await fleshOut(
          outline,
          settings,
          () => lang,
          controller.signal,
          (done, total) => setPhase({ kind: 'ai', done, total }),
        )
        if (controller.signal.aborted) return
        outline = result.outline
        if (result.error) warning = t('sendAiFallback', { error: result.error })
      }
    }
    setPhase({ kind: 'sending' })
    const result = await window.mindmapApi.sendToDocument?.({
      target: p.target,
      outline,
      style: reportSettings ? style : isDocument ? 'outline' : 'report',
      theme: isDocument && !reportSettings ? 'basic' : theme === 'plain' ? 'plain' : undefined,
      date: reportSettings && date.trim() ? date.trim() : undefined,
      department: reportSettings && department.trim() ? department.trim() : undefined,
      includeNotes: notes,
      slideStyle: !isDocument && slideStyle !== 'plain' ? slideStyle : undefined,
      slideWriting,
      mapPath: p.mapPath,
      sheetId,
    })
    if (!result) {
      setPhase({ kind: 'error', text: t('sendFailed', { error: 'not available' }) })
    } else if (!result.ok) {
      setPhase({
        kind: 'error',
        text: result.error === 'empty' ? t('sendEmpty') : t('sendFailed', { error: result.error }),
      })
    } else {
      p.onSent(warning)
    }
  }

  return (
    <Modal title={t(TITLE[p.target])} kind="hanpan-send" onCancel={close}>
      <div className="hp-send-form">
        {reportSettings && (
          <>
            <label className="hp-send-row">
              <span>{t('sendStyle')}</span>
              <select
                value={style}
                disabled={busy}
                onChange={(e) => setStyle(e.target.value as MarkerStyle)}
              >
                <option value="report">{t('sendStyleReport')}</option>
                <option value="chapter-report">{t('sendStyleChapter')}</option>
                <option value="gongmun">{t('sendStyleGongmun')}</option>
              </select>
            </label>
            <label className="hp-send-row">
              <span>{t('sendLook')}</span>
              <select
                value={theme}
                disabled={busy}
                onChange={(e) => setTheme(e.target.value as 'auto' | 'plain')}
              >
                <option value="auto">{t('sendLookHancom')}</option>
                <option value="plain">{t('sendLookPlain')}</option>
              </select>
            </label>
            <label className="hp-send-row">
              <span>{t('sendDate')}</span>
              <input
                className="mm-field"
                type="text"
                value={date}
                disabled={busy}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="hp-send-row">
              <span>{t('sendDepartment')}</span>
              <input
                className="mm-field"
                type="text"
                value={department}
                disabled={busy}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </label>
          </>
        )}
        {!isDocument && (
          <>
            <label className="hp-send-row">
              <span>{t('sendSlideStyle')}</span>
              <select
                value={slideStyle}
                disabled={busy}
                data-field="slide-style"
                onChange={(e) => setSlideStyle(e.target.value as SlideStyleId | 'plain')}
              >
                {SLIDE_STYLES.map((st, k) => (
                  <option key={st.id} value={st.id}>
                    {k + 1}. {ko ? st.name.ko : st.name.en}
                  </option>
                ))}
                <option value="plain">{t('sendSlidePlain')}</option>
              </select>
            </label>
            {styleInfo && (
              <p className="hp-send-hint">
                {ko ? styleInfo.description.ko : styleInfo.description.en}
              </p>
            )}
          </>
        )}
        <span className="hp-send-label" id="hp-content-label">
          {t('sendContent')}
        </span>
        <div className="hp-send-choice" role="radiogroup" aria-labelledby="hp-content-label">
          <label>
            <input
              type="radio"
              name="hp-content"
              checked={!ai}
              disabled={busy}
              onChange={() => setAi(false)}
            />{' '}
            {t('sendAsIs')}
          </label>
          <label>
            <input
              type="radio"
              name="hp-content"
              checked={ai}
              disabled={busy}
              onChange={() => setAi(true)}
            />{' '}
            {isDocument ? t('sendFleshOut') : t('sendSlideWrite')}
          </label>
        </div>
        {!isDocument && (
          <label className="hp-send-row">
            <span>{t('sendAudience')}</span>
            <input
              className="mm-field"
              type="text"
              value={audience}
              maxLength={200}
              disabled={busy || !ai}
              data-field="slide-audience"
              placeholder={t('sendAudienceHint')}
              onChange={(e) => setAudience(e.target.value)}
            />
          </label>
        )}
        <label className="hp-send-check">
          <input
            type="checkbox"
            checked={notes}
            disabled={busy}
            onChange={(e) => setNotes(e.target.checked)}
          />{' '}
          {t('sendNotes')}
        </label>
      </div>
      {phase.kind !== 'idle' && (
        <p
          className={`mm-modal-hint${phase.kind === 'error' ? ' error' : ''}`}
          role={phase.kind === 'error' ? 'alert' : 'status'}
        >
          {phase.kind === 'ai'
            ? t('sendAiWorking', { done: phase.done, total: phase.total })
            : phase.kind === 'sending'
              ? t('sendWorking')
              : phase.text}
        </p>
      )}
      <div className="mm-modal-actions">
        <button type="button" className="mm-btn" data-action="send-cancel" onClick={close}>
          {t('cancel')}
        </button>
        <button
          type="button"
          className="mm-btn primary"
          data-action="send-go"
          disabled={busy}
          onClick={() => {
            send().catch((error: unknown) =>
              setPhase({
                kind: 'error',
                text: t('sendFailed', {
                  error: error instanceof Error ? error.message : String(error),
                }),
              }),
            )
          }}
        >
          {t('sendGo')}
        </button>
      </div>
    </Modal>
  )
}
