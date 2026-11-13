import { useCallback, useEffect, useState } from 'react'
import { Dropdown } from '@genoffice/ui'
import type { SecureKeyAction, SecureKeySettings } from '../../shared/home-api'

/**
 * Settings › General › Security key (spec 2026-11-12 5-5): where the key is,
 * a spare stick, moving it between a stick and this PC, and a new key. Shown
 * only while a key is in use (Windows with the key on). The words come from
 * the main process, in the UI language.
 */
export function SecureKeySettingsCard({ lang }: { lang: string }) {
  const [info, setInfo] = useState<SecureKeySettings | null>(null)
  const [letter, setLetter] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [confirm, setConfirm] = useState<'to-pc' | 'reset' | null>(null)
  const [agreed, setAgreed] = useState(false)

  const load = useCallback(async () => {
    const next = (await window.aiOffice.secureKeyInfo?.()) ?? null
    setInfo(next)
    setLetter((cur) => (next && !next.usbLetters.includes(cur) ? (next.usbLetters[0] ?? '') : cur))
  }, [])

  useEffect(() => {
    void load()
  }, [load, lang])

  if (!info) return null
  const s = (key: string) => info.strings[key] ?? key

  const act = async (action: SecureKeyAction, ticked = false) => {
    setBusy(true)
    setMessage(null)
    try {
      const error = await window.aiOffice.secureKeyAct?.(action, letter || undefined, ticked)
      setMessage(error ? { text: error, error: true } : { text: s('skDone'), error: false })
      setConfirm(null)
      setAgreed(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const onUsb = info.where === 'usb'

  return (
    <div className="set-field set-securekey" data-securekey-settings>
      <div className="set-field-text">
        <label className="set-field-label">{s('skSettingsTitle')}</label>
        <span className="set-field-hint">
          {onUsb ? s('skSettingsOnUsb') : s('skSettingsOnPc')} · {s('skSettingsMade')}
          {onUsb ? ` · ${s('skSettingsSticks')}` : ''}
        </span>
      </div>
      {confirm === null ? (
        <div className="set-securekey-row">
          {info.usbLetters.length > 0 ? (
            <Dropdown
              className="set-dd"
              value={letter}
              ariaLabel={s('skPickUsbFor')}
              options={info.usbLetters.map((l) => ({
                value: l,
                label: s('skUsbDrive').replace('{letter}', l),
              }))}
              onPick={(v) => setLetter(v)}
            />
          ) : (
            <span className="set-field-hint">{s('skNoUsb')}</span>
          )}
          <button
            type="button"
            className="set-btn"
            disabled={busy || !letter}
            onClick={() => void act(onUsb ? 'spare' : 'to-usb')}
          >
            {onUsb ? s('skSpare') : s('skMoveToUsb')}
          </button>
          {onUsb && (
            <button
              type="button"
              className="set-btn"
              disabled={busy}
              onClick={() => setConfirm('to-pc')}
            >
              {s('skMoveToPc')}
            </button>
          )}
          <button
            type="button"
            className="set-btn danger"
            disabled={busy}
            onClick={() => setConfirm('reset')}
          >
            {s('skNewKey')}
          </button>
        </div>
      ) : (
        <div className="set-securekey-confirm" role="group" data-securekey-confirm={confirm}>
          {confirm === 'to-pc' ? (
            <p className="set-field-hint">{s('skPcWarn')}</p>
          ) : (
            <ul className="set-field-hint set-securekey-list">
              {['skReset1', 'skReset2', 'skReset3', 'skReset4', 'skResetRestart'].map((k) => (
                <li key={k}>{s(k)}</li>
              ))}
            </ul>
          )}
          <label className="set-securekey-agree">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>{confirm === 'to-pc' ? s('skPcAgree') : s('skResetAgree')}</span>
          </label>
          <div className="set-securekey-row">
            <button
              type="button"
              className="set-btn"
              disabled={busy}
              onClick={() => {
                setConfirm(null)
                setAgreed(false)
              }}
            >
              {s('skCancel')}
            </button>
            <button
              type="button"
              className="set-btn primary"
              disabled={busy || !agreed}
              onClick={() => void act(confirm, agreed)}
            >
              {confirm === 'to-pc' ? s('skMoveToPc') : s('skResetGo')}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p
          className={message.error ? 'set-field-hint set-securekey-error' : 'set-field-hint'}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
