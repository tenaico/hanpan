/**
 * Hanpan: the picture-credit check in the HWP tab (docs/plans/gongu-images.md 4.8). It reads
 * the credit line the app put under each picture and the "picture credits" list at the end,
 * and says which pictures have no credit, carry licence conditions, or are missing from the
 * list. Nothing goes over the network; the only change it makes is adding a line to the list
 * when the user asks.
 */
import { useEffect, useState } from 'react'
import { licenseName, type PictureCreditIssue } from '@genoffice/hanpan-core/renderer'
import type { AgentBridge } from '../ai/agent-bridge'
import { addToCreditList, checkCredits, type CreditCheckResult } from './credit-list'
import { uiLang, useI18n } from '../i18n/locale'

export function CreditCheck(p: {
  bridge: AgentBridge
  disabled: boolean
  /** bumped when another tool runs: this result goes, so two results never mix */
  clear?: number
  /** this check starts: the other tools' result goes */
  onRun?: () => void
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CreditCheckResult | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    setResult(null)
    setFailed(null)
  }, [p.clear])

  const run = async () => {
    p.onRun?.()
    setBusy(true)
    setFailed(null)
    try {
      setResult(await checkCredits(p.bridge, uiLang()))
    } catch (error) {
      setResult(null)
      setFailed(String(error))
    } finally {
      setBusy(false)
    }
  }

  const lineOf = (issue: PictureCreditIssue): string => {
    switch (issue.kind) {
      case 'no-credit':
        return t('hpCreditNoCredit', { n: issue.picture })
      case 'conditions':
        return t('hpCreditConditions', {
          n: issue.picture,
          title: issue.title,
          license: licenseName(issue.license, uiLang()),
        })
      case 'not-listed':
        return t('hpCreditNotListed', { n: issue.picture, title: issue.title })
    }
  }

  const go = (issue: PictureCreditIssue) => {
    const picture = result?.pictures[issue.picture - 1]
    if (picture) void p.bridge.reveal(picture.place).catch(() => {})
  }

  const list = async (line: string) => {
    setBusy(true)
    const added = await addToCreditList(p.bridge, line, uiLang()).catch(() => ({
      ok: false,
      changed: false,
    }))
    setBusy(false)
    if (added.ok) await run()
    else setFailed(t('hpCreditListFailed'))
  }

  return (
    <>
      <button
        type="button"
        disabled={busy || p.disabled}
        data-tool="credits"
        title={t('hpCreditsDesc')}
        onClick={() => void run()}
      >
        <span className="hp-tools-name">{t('hpCredits')}</span>
        <small className="hp-tools-desc">{t('hpCreditsDesc')}</small>
      </button>
      {failed && (
        <div className="hp-tools-result" role="status">
          <strong className="hp-tools-result-title">
            {t('hpResultOf', { tool: t('hpCredits') })}
          </strong>
          <ul>
            <li>{t('hpFailed', { error: failed })}</li>
          </ul>
        </div>
      )}
      {result && (
        <div className="hp-tools-result" role="status">
          <strong className="hp-tools-result-title">
            {t('hpResultOf', { tool: t('hpCredits') })}
          </strong>
          <ul className="hp-credit-result" data-credit-issues={result.issues.length}>
            {result.pictures.length === 0 && <li>{t('hpCreditsNone')}</li>}
            {result.pictures.length > 0 && result.issues.length === 0 && (
              <li>{t('hpCreditsOk', { n: result.pictures.length })}</li>
            )}
            {result.issues.map((issue, index) => (
              <li key={index} data-credit-kind={issue.kind}>
                <span>{lineOf(issue)}</span>
                <span className="hp-credit-actions">
                  <button type="button" onClick={() => go(issue)}>
                    {t('hpCreditGo')}
                  </button>
                  {issue.kind === 'not-listed' && (
                    <button type="button" disabled={busy} onClick={() => void list(issue.line)}>
                      {t('hpCreditAddToList')}
                    </button>
                  )}
                </span>
              </li>
            ))}
            {result.pictures.length > 0 && (
              <li className="hp-credit-scope">{t('hpCreditsScope')}</li>
            )}
          </ul>
        </div>
      )}
    </>
  )
}
