/**
 * Print, like the other editors: a preview of exactly the page that prints
 * (the sheet on screen on one landscape A4 page), the printer and the number
 * of copies. A printer picked here prints without the system's print dialog,
 * which holds the whole app while it is open; that dialog is still one choice
 * in the printer list (and the default on macOS, whose print sheet carries the
 * options itself).
 *
 * The preview is the page document in a sandboxed frame: no scripts, and the
 * page's own content policy lets it load nothing but `data:` pictures.
 */
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/locale'
import type { PrinterInfo, PrintJob, PrintResult } from '../../shared/ipc'

/** The printer list's values that are not printer names ('' is the system's default printer). */
const DEFAULT_PRINTER = ''
const SYSTEM_DIALOG = '\u0000system-dialog'
const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

/** The page in CSS pixels: landscape A4. */
const PAGE_W = 1123
const PAGE_H = 794
const PREVIEW_W = 560

export function PrintDialog(p: {
  html: string
  onPrint(job: PrintJob): Promise<PrintResult>
  onClose(): void
}) {
  const { t } = useI18n()
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [device, setDevice] = useState(IS_MAC ? SYSTEM_DIALOG : DEFAULT_PRINTER)
  const [copies, setCopies] = useState(1)
  const [printing, setPrinting] = useState(false)
  const [failed, setFailed] = useState(false)
  const goRef = useRef<HTMLButtonElement>(null)
  const systemDialog = device === SYSTEM_DIALOG
  const onClose = p.onClose

  useEffect(() => {
    let alive = true
    window.mindmapApi
      .listPrinters?.()
      .then((list) => {
        if (alive) setPrinters(list)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => goRef.current?.focus(), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const go = async (): Promise<void> => {
    if (printing) return
    setPrinting(true)
    setFailed(false)
    try {
      const result = await p.onPrint(
        systemDialog ? { deviceName: null } : { deviceName: device, copies },
      )
      if (!result.ok) setFailed(true)
      // closing the system dialog without printing keeps this one open
      else if (!('canceled' in result)) p.onClose()
    } finally {
      setPrinting(false)
    }
  }

  const scale = PREVIEW_W / PAGE_W
  return (
    <div
      className="mm-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) p.onClose()
      }}
    >
      <div
        className="mm-modal mm-print"
        role="dialog"
        aria-modal="true"
        aria-label={t('printTitle')}
        data-dialog="print"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 className="mm-modal-title">{t('printTitle')}</h2>
        <div className="mm-print-body">
          <div
            className="mm-print-preview"
            style={{ width: PREVIEW_W, height: Math.round(PAGE_H * scale) }}
          >
            <iframe
              title={t('printTitle')}
              sandbox=""
              srcDoc={p.html}
              width={PAGE_W}
              height={PAGE_H}
              style={{ transform: `scale(${scale})` }}
            />
          </div>
          <div className="mm-print-options">
            <label className="mm-print-field">
              <span>{t('printPrinter')}</span>
              <select
                className="mm-field"
                data-field="printer"
                value={device}
                disabled={printing}
                onChange={(e) => setDevice(e.target.value)}
              >
                <option value={DEFAULT_PRINTER}>{t('printDefaultPrinter')}</option>
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.displayName}
                  </option>
                ))}
                <option value={SYSTEM_DIALOG}>{t('printSystemDialog')}</option>
              </select>
            </label>
            <label className="mm-print-field">
              <span>{t('printCopies')}</span>
              <input
                type="number"
                className="mm-field"
                data-field="copies"
                min={1}
                max={999}
                value={copies}
                disabled={printing || systemDialog}
                onChange={(e) =>
                  setCopies(Math.min(999, Math.max(1, Math.round(Number(e.target.value)) || 1)))
                }
              />
            </label>
            <p className="mm-modal-hint">{t('printPageNote')}</p>
            {failed && <p className="mm-modal-hint error">{t('printFailed')}</p>}
          </div>
        </div>
        <div className="mm-modal-actions">
          <button type="button" className="mm-btn" data-action="print-cancel" onClick={p.onClose}>
            {t('cancel')}
          </button>
          <button
            ref={goRef}
            type="button"
            className="mm-btn primary"
            data-action="print-go"
            disabled={printing}
            onClick={() => void go()}
          >
            {printing ? t('printing') : t('printTitle')}
          </button>
        </div>
      </div>
    </div>
  )
}
