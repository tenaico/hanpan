/**
 * The dimension sheet dialog: the engine's A4 sheet as a picture, the title
 * block's cells, "Copy picture", "Send to Hangul / Word" and Close.
 *
 * Only the title and the date can be typed; the scale is the one the engine
 * drew at, shown for reference. The preview follows the cells as they are
 * typed, and the cells reach the drawing as one edit of `doc.title` when the
 * dialog is left or before the sheet is copied or sent (one undo step).
 *
 * The sheet is paper: black on white in both themes. Only the frame around
 * it follows the theme.
 */
import { useId, useMemo, useRef, useState } from 'react'
import { useModalKeys } from '@genoffice/ui'
import type { CadDocument, SheetInput } from '@genoffice/cad-engine'
import { useI18n, type StringKey } from '../i18n/locale'
import { sheetBlocked, type SendTarget } from './send'
import { sheetFor, sheetLabels, todayIso } from './sheet-png'
import { useSendTarget } from './use-send-target'

export interface SheetDialogProps {
  doc: CadDocument
  evaluated: readonly SheetInput[]
  /** fills an empty title cell */
  tabTitle: string
  /** the title block as typed: one edit of the drawing */
  onTitle: (title: CadDocument['title']) => void
  /** copies the sheet picture; the sentence to show, or null for none (another send or copy runs) */
  onCopy: () => Promise<StringKey | null>
  /** sends the sheet; the sentence to show, or null for none (sent, or another send or copy runs) */
  onSend: (target: SendTarget) => Promise<StringKey | null>
  onClose: () => void
}

export function SheetDialog(p: SheetDialogProps) {
  const { t, lang } = useI18n()
  const titleId = useId()
  const send = useSendTarget()
  const [name, setName] = useState(p.doc.title.name)
  const [date, setDate] = useState(p.doc.title.date)
  const [status, setStatus] = useState<StringKey | null>(null)
  const [busy, setBusy] = useState(false)
  const today = useMemo(() => todayIso(), [])
  /** what the drawing's title block holds now, as far as this dialog knows */
  const kept = useRef({ name: p.doc.title.name, date: p.doc.title.date })

  const blocked = sheetBlocked(p.doc)
  const sheet = useMemo(
    () =>
      blocked
        ? null
        : sheetFor(
            { ...p.doc, title: { ...p.doc.title, name, date } },
            p.evaluated,
            sheetLabels((key) => t(key)),
            { title: p.tabTitle, today },
          ),
    // `t` changes every render; the language is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blocked, p.doc, p.evaluated, p.tabTitle, name, date, today, lang],
  )

  /** The typed cells into the drawing, once, when they differ from what it holds. */
  const commit = (): void => {
    if (name === kept.current.name && date === kept.current.date) return
    kept.current = { name, date }
    p.onTitle({ ...p.doc.title, name, date })
  }

  const close = (): void => {
    commit()
    p.onClose()
  }
  const keys = useModalKeys(close, { restoreFocus: true })

  const run = async (job: () => Promise<StringKey | null>): Promise<void> => {
    commit()
    setBusy(true)
    setStatus(null)
    try {
      setStatus(await job())
    } finally {
      setBusy(false)
    }
  }

  const off = busy || blocked !== null
  return (
    <div className="cad-modal-backdrop" ref={keys.ref} onKeyDown={keys.onKeyDown}>
      <div
        className="cad-modal cad-sheet-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 className="cad-modal-title" id={titleId}>
          {t('sheet')}
        </h2>
        <div className="cad-sheet-body">
          <div className="cad-sheet-paper">
            {sheet ? (
              <img
                className="cad-sheet-preview"
                data-sheet-preview=""
                alt={t('sheet')}
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sheet.svg)}`}
              />
            ) : (
              <p className="cad-sheet-empty" data-sheet-empty="">
                {t(blocked ?? 'sheetEmpty')}
              </p>
            )}
          </div>
          <div className="cad-sheet-fields">
            <label className="cad-sheet-field">
              <span>{t('sheetFieldTitle')}</span>
              <input
                className="cad-input"
                data-sheet-field="name"
                value={name}
                placeholder={p.tabTitle}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="cad-sheet-field">
              <span>{t('sheetFieldDate')}</span>
              <input
                className="cad-input"
                data-sheet-field="date"
                value={date}
                placeholder={today}
                maxLength={40}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="cad-sheet-field">
              <span>{t('sheetFieldScale')}</span>
              <input
                className="cad-input"
                data-sheet-field="scale"
                value={sheet?.scale ?? ''}
                readOnly
                tabIndex={-1}
              />
            </label>
          </div>
        </div>
        <p className="cad-sheet-status" data-sheet-status="" role="status">
          {status ? t(status) : ''}
        </p>
        <div className="cad-modal-actions">
          <button
            type="button"
            className="cad-button"
            data-sheet-copy=""
            disabled={off}
            onClick={() => void run(p.onCopy)}
          >
            {t('copyPicture')}
          </button>
          <button
            type="button"
            className="cad-button cad-button-primary"
            data-sheet-send=""
            disabled={off}
            onClick={() => void run(() => p.onSend(send.target))}
          >
            {t(send.label)}
          </button>
          <button type="button" className="cad-button" data-sheet-close="" onClick={close}>
            {t('sheetClose')}
          </button>
        </div>
      </div>
    </div>
  )
}
