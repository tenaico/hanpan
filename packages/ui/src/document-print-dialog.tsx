/**
 * 문서 인쇄 대화상자(AI 마크다운, AI 웹 문서). 워드의 앱 안 인쇄 창과 같은 모양:
 * 왼쪽은 인쇄할 문서 그대로의 미리보기, 오른쪽은 프린터·매수와 [인쇄]·[취소].
 * 프린터를 고르면 시스템 창 없이 바로 보내고, "시스템 인쇄 대화 상자…"를 고르면
 * 운영체제 창으로 넘긴다. 실제 인쇄는 앱의 메인 프로세스가 한다(탭은 멈추지 않는다).
 * 문구는 앱이 `labels`로 준다.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'

export interface DocumentPrintDialogLabels {
  title: string
  printer: string
  defaultPrinter: string
  systemDialog: string
  copies: string
  print: string
  cancel: string
  /** 미리보기를 만드는 동안 */
  preparing: string
  /** 보내는 동안 */
  printing: string
}

export interface DocumentPrinter {
  name: string
  displayName: string
  isDefault?: boolean
}

/** deviceName: '' = 운영체제 기본 프린터, null = 시스템 인쇄 대화 상자 */
export interface DocumentPrintJob {
  deviceName: string | null
  copies: number
}

export interface DocumentPrintDialogProps {
  /** 인쇄할 HTML. null이면 아직 만드는 중 */
  html: string | null
  printers: DocumentPrinter[]
  labels: DocumentPrintDialogLabels
  /** 끝나면(취소 포함) 돌아온다 */
  onPrint(job: DocumentPrintJob): Promise<void> | void
  onClose(): void
  /** 오류 같은 한 줄 */
  message?: string | null
}

const SYSTEM_DIALOG = '\u0000system-dialog'
const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
const PAGE_WIDTH_PX = 794 // A4 폭(96dpi)
const PREVIEW_WIDTH_PX = 420
const PREVIEW_ZOOM = PREVIEW_WIDTH_PX / PAGE_WIDTH_PX

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10_000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,.45)',
}
const panel: CSSProperties = {
  display: 'flex',
  gap: 20,
  padding: 20,
  borderRadius: 10,
  background: 'var(--surface, #fff)',
  color: 'var(--text, #111)',
  boxShadow: 'var(--shadow-modal-strong, 0 10px 40px rgba(0,0,0,.35))',
  maxWidth: 'calc(100vw - 40px)',
  maxHeight: 'calc(100vh - 40px)',
  boxSizing: 'border-box',
}
const previewBox: CSSProperties = {
  width: PREVIEW_WIDTH_PX + 24,
  height: 'min(560px, calc(100vh - 80px))',
  overflow: 'hidden',
  border: '1px solid var(--border, #ccc)',
  background: '#8a8f98',
  display: 'flex',
  justifyContent: 'center',
  padding: 12,
  boxSizing: 'border-box',
}
const side: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 240 }
const field: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }
const control: CSSProperties = {
  height: 30,
  padding: '0 8px',
  border: '1px solid var(--border, #c8ccd2)',
  borderRadius: 6,
  background: 'var(--surface, #fff)',
  color: 'inherit',
  font: 'inherit',
}
const button: CSSProperties = {
  ...control,
  minWidth: 72,
  padding: '0 14px',
  cursor: 'pointer',
}
const primaryButton: CSSProperties = {
  ...button,
  border: '1px solid var(--accent, #2563eb)',
  background: 'var(--accent, #2563eb)',
  color: '#fff',
}

/** 화면 미리보기에만 종이 여백을 그린다(인쇄 때는 @page 여백이 맡는다) */
export function withPreviewMargins(html: string): string {
  const style = '<style>@media screen { body { padding: 0.6in; } }</style>'
  return html.includes('</head>') ? html.replace('</head>', `${style}</head>`) : style + html
}

export function DocumentPrintDialog({
  html,
  printers,
  labels,
  onPrint,
  onClose,
  message,
}: DocumentPrintDialogProps): ReactElement {
  const [printing, setPrinting] = useState(false)
  // macOS의 시트에는 매수·용지가 이미 있어 그쪽이 기본, Windows는 앱 안에서 바로 보낸다
  const [device, setDevice] = useState(IS_MAC ? SYSTEM_DIALOG : '')
  const [copies, setCopies] = useState(1)
  const printButton = useRef<HTMLButtonElement>(null)
  const systemDialog = device === SYSTEM_DIALOG

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  useEffect(() => {
    if (html) printButton.current?.focus()
  }, [html])

  const print = async () => {
    if (printing || !html) return
    setPrinting(true)
    try {
      await onPrint({ deviceName: systemDialog ? null : device, copies })
    } finally {
      setPrinting(false)
    }
  }

  // 기본 프린터는 "기본 프린터" 한 줄로 이미 있다
  const named = printers.filter((p) => !p.isDefault)
  const defaultName = printers.find((p) => p.isDefault)?.displayName

  return (
    <div
      style={overlay}
      data-hanpan="document-print"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !printing) onClose()
      }}
    >
      <div style={panel} role="dialog" aria-modal="true" aria-label={labels.title}>
        <div style={previewBox}>
          {html ? (
            <iframe
              title={labels.title}
              srcDoc={withPreviewMargins(html)}
              // 스크립트 없이 보기만 한다
              sandbox="allow-same-origin"
              data-hanpan="document-print-preview"
              style={{
                width: PAGE_WIDTH_PX,
                height: `calc((min(560px, 100vh - 80px) - 24px) / ${PREVIEW_ZOOM})`,
                border: 0,
                background: '#fff',
                zoom: PREVIEW_ZOOM,
                boxShadow: '0 2px 8px rgba(0,0,0,.3)',
              }}
            />
          ) : (
            <span style={{ color: '#fff', alignSelf: 'center' }}>{labels.preparing}</span>
          )}
        </div>
        <div style={side}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{labels.title}</h2>
          <label style={field}>
            {labels.printer}
            <select
              style={control}
              value={device}
              disabled={printing}
              onChange={(event) => setDevice(event.target.value)}
              data-hanpan="document-print-printer"
            >
              <option value="">
                {defaultName ? `${labels.defaultPrinter} (${defaultName})` : labels.defaultPrinter}
              </option>
              {named.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName}
                </option>
              ))}
              <option value={SYSTEM_DIALOG}>{labels.systemDialog}</option>
            </select>
          </label>
          <label style={field}>
            {labels.copies}
            <input
              style={control}
              type="number"
              min={1}
              max={999}
              value={copies}
              disabled={printing || systemDialog}
              onChange={(event) => {
                const n = Math.round(Number(event.target.value))
                setCopies(Number.isFinite(n) ? Math.min(999, Math.max(1, n)) : 1)
              }}
              data-hanpan="document-print-copies"
            />
          </label>
          {message && (
            <span role="alert" style={{ color: 'var(--danger, #b91c1c)', fontSize: 13 }}>
              {message}
            </span>
          )}
          {printing && <span style={{ fontSize: 13 }}>{labels.printing}</span>}
          <div style={{ marginTop: 'auto', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              style={button}
              onClick={onClose}
              data-action="document-print-cancel"
            >
              {labels.cancel}
            </button>
            <button
              ref={printButton}
              type="button"
              className="primary"
              style={{ ...primaryButton, opacity: !html || printing ? 0.6 : 1 }}
              disabled={!html || printing}
              onClick={() => void print()}
              data-action="document-print-go"
            >
              {labels.print}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
