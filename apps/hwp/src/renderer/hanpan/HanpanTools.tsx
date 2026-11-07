/**
 * Hanpan: 글집's document tools in the HWP tab. Tidy an official letter (dates,
 * times, the closing 끝.), check it, change its tone for a generation, mark the
 * three-colour review, and build a 역관목조분 prompt for the AI panel. The tools
 * that change the document load the result in place: the tab shows unsaved
 * changes, so not saving takes them back.
 */
import { useEffect, useRef, useState } from 'react'
import { composePrompt, type TaskType } from '@genoffice/hanpan-core/renderer'
import { useKoreanDocFeatures } from '@genoffice/ui'
import type { HanpanToolRequest, HanpanToolResult } from '../../shared/ipc'
import { useI18n, type StringKey } from '../i18n/locale'
import type { AgentBridge } from '../ai/agent-bridge'
import { CreditCheck } from './CreditCheck'

const FINDING_KEY: Record<string, StringKey> = {
  'no-recipient': 'hpFNoRecipient',
  'no-title': 'hpFNoTitle',
  'no-closing': 'hpFNoClosing',
  'date-format': 'hpFDateFormat',
  'time-format': 'hpFTimeFormat',
  'numbering-order': 'hpFNumberingOrder',
  'lone-item-numbered': 'hpFLoneItemNumbered',
  'mixed-endings': 'hpFMixedEndings',
}

const TASKS: [TaskType, StringKey][] = [
  ['summarize', 'hpTaskSummarize'],
  ['organize', 'hpTaskOrganize'],
  ['analyze', 'hpTaskAnalyze'],
  ['generate', 'hpTaskGenerate'],
  ['explain', 'hpTaskExplain'],
]

/** A tool's name with the one line that says what it does (0.17 review #13). */
function ToolLabel(p: { name: string; desc: string }) {
  return (
    <>
      <span className="hp-tools-name">{p.name}</span>
      <small className="hp-tools-desc">{p.desc}</small>
    </>
  )
}

/**
 * A tool's result, right under the tool, titled with its name (0.17 UI/UX review v2 #22: the
 * 공문 점검 result landed at the bottom of the menu without a title).
 */
function ToolResult(p: { title: string; lines: string[] }) {
  return (
    <div className="hp-tools-result" role="status">
      <strong className="hp-tools-result-title">{p.title}</strong>
      <ul>
        {p.lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

export function HanpanTools(p: { bridge?: AgentBridge }) {
  const { t, lang } = useI18n()
  const korean = useKoreanDocFeatures(lang)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  /** the last tool's result; one at a time, so two results never mix */
  const [result, setResult] = useState<{ tool: string; lines: string[] } | null>(null)
  /** bumped when a tool here runs: the picture-credit check drops its own result */
  const [creditClear, setCreditClear] = useState(0)
  const [promptOpen, setPromptOpen] = useState(false)
  const [axes, setAxes] = useState<{
    role: string
    field: string
    purpose: string
    conditions: string
    length: string
    task: TaskType | ''
    body: string
  }>({
    role: '',
    field: '',
    purpose: '',
    conditions: '',
    length: '',
    task: '',
    body: '',
  })
  const wrap = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    // Esc closes the menu and hands focus back to the button that opened it
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      toggle.current?.focus()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    // keyboard users land on the first tool
    wrap.current?.querySelector<HTMLButtonElement>('.hp-tools-pop button:not(:disabled)')?.focus()
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  // a Korean document feature (decision 0091): off, the editor opens without the tools
  if (!korean || !window.hwpApi.hanpanTool) return null

  const run = async (request: HanpanToolRequest) => {
    const tool = request.tool
    const show = (lines: string[]) => setResult({ tool, lines })
    setBusy(true)
    setResult(null)
    setCreditClear((n) => n + 1)
    const answer: HanpanToolResult = await window.hwpApi.hanpanTool!(request).catch(
      (e: unknown) => ({ ok: false as const, error: String(e) }),
    )
    setBusy(false)
    if (!answer.ok) {
      show([t('hpFailed', { error: answer.error })])
      return
    }
    if (answer.findings) {
      show(
        answer.findings.length
          ? answer.findings.map(
              (f) =>
                `${t(FINDING_KEY[f.code] ?? 'hpFailed', { error: f.code })}${f.sample ? ` — ${f.sample}` : ''}`,
            )
          : [t('hpCheckOk')],
      )
    } else if (answer.counts) {
      show([t('hpReviewDone', answer.counts)])
    } else {
      show([answer.changed ? t('hpChanged', { n: answer.changed }) : t('hpNoChange')])
    }
  }

  const prompt = composePrompt({ ...axes, task: axes.task || undefined })

  const NAMES: Record<string, StringKey> = {
    tidy: 'hpTidy',
    check: 'hpCheck',
    tone: 'hpTone',
    review: 'hpReview',
    prompt: 'hpPrompt',
  }
  /** the result of `tool`, where it belongs: right under that tool */
  const resultOf = (tool: string) =>
    result?.tool === tool && (
      <ToolResult title={t('hpResultOf', { tool: t(NAMES[tool]!) })} lines={result.lines} />
    )

  return (
    <div className="hp-tools" ref={wrap}>
      <button
        type="button"
        className={`hp-tools-btn${open ? ' on' : ''}`}
        ref={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        data-action="hanpan-tools"
        onClick={() => setOpen((o) => !o)}
      >
        {t('hpTools')}
      </button>
      {open && (
        <div className="hp-tools-pop" role="menu">
          <button
            type="button"
            disabled={busy}
            data-tool="tidy"
            title={t('hpTidyDesc')}
            onClick={() => void run({ tool: 'tidy' })}
          >
            <ToolLabel name={t('hpTidy')} desc={t('hpTidyDesc')} />
          </button>
          {resultOf('tidy')}
          <button
            type="button"
            disabled={busy}
            data-tool="check"
            title={t('hpCheckDesc')}
            onClick={() => void run({ tool: 'check' })}
          >
            <ToolLabel name={t('hpCheck')} desc={t('hpCheckDesc')} />
          </button>
          {resultOf('check')}
          <div className="hp-tools-row">
            <span title={t('hpToneDesc')}>
              <ToolLabel name={t('hpTone')} desc={t('hpToneDesc')} />
            </span>
            {(['60대', '40대', 'MZ'] as const).map((target) => (
              <button
                key={target}
                type="button"
                disabled={busy}
                data-tool={`tone-${target}`}
                onClick={() => void run({ tool: 'tone', target })}
              >
                {t(target === '60대' ? 'hpTone60' : target === '40대' ? 'hpTone40' : 'hpToneMZ')}
              </button>
            ))}
          </div>
          {resultOf('tone')}
          <button
            type="button"
            disabled={busy}
            data-tool="review"
            title={t('hpReviewDesc')}
            onClick={() => void run({ tool: 'review' })}
          >
            <ToolLabel name={t('hpReview')} desc={t('hpReviewDesc')} />
          </button>
          {resultOf('review')}
          {p.bridge && (
            <CreditCheck
              bridge={p.bridge}
              disabled={busy}
              clear={creditClear}
              onRun={() => setResult(null)}
            />
          )}
          <button
            type="button"
            data-tool="prompt"
            title={t('hpPromptDesc')}
            aria-expanded={promptOpen}
            onClick={() => setPromptOpen((o) => !o)}
          >
            <ToolLabel name={t('hpPrompt')} desc={t('hpPromptDesc')} />
          </button>
          {promptOpen && (
            <div className="hp-prompt">
              <label>
                <span>{t('hpTask')}</span>
                <select
                  value={axes.task}
                  onChange={(e) => setAxes({ ...axes, task: e.target.value as TaskType | '' })}
                >
                  <option value="">—</option>
                  {TASKS.map(([id, key]) => (
                    <option key={id} value={id}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </label>
              {(['role', 'field', 'purpose', 'conditions', 'length'] as const).map((key) => (
                <label key={key}>
                  <span>
                    {t(
                      (
                        {
                          role: 'hpRole',
                          field: 'hpField',
                          purpose: 'hpPurpose',
                          conditions: 'hpConditions',
                          length: 'hpLength',
                        } as const
                      )[key],
                    )}
                  </span>
                  <input
                    value={axes[key]}
                    onChange={(e) => setAxes({ ...axes, [key]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                <span>{t('hpRequest')}</span>
                <textarea
                  rows={3}
                  value={axes.body}
                  onChange={(e) => setAxes({ ...axes, body: e.target.value })}
                />
              </label>
              <pre className="hp-prompt-preview">{prompt}</pre>
              <button
                type="button"
                disabled={!prompt}
                onClick={() =>
                  void navigator.clipboard
                    .writeText(prompt)
                    .then(() => setResult({ tool: 'prompt', lines: [t('hpCopied')] }))
                }
              >
                {t('hpCopy')}
              </button>
            </div>
          )}
          {resultOf('prompt')}
        </div>
      )}
    </div>
  )
}
