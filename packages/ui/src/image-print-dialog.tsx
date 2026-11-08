/**
 * 그림 인쇄 미리보기(디자인 보드, AI 포토, AI 일러스트). 왼쪽은 인쇄될 페이지 그대로
 * (`buildImagePrintHtml`이 만든 HTML을 줄여 보인 것), 오른쪽은 앱이 넣는 선택지와
 * [인쇄]·[취소]. [인쇄]는 시스템 인쇄 대화상자로 넘기는 일이고, 그 일은 앱이 한다.
 * 문구는 앱이 `labels`로 준다.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { buildImagePrintHtml, type PrintPicture, type PrintSheet } from './image-print'

export interface ImagePrintDialogLabels {
  title: string
  print: string
  cancel: string
  /** 그림을 받는 동안 */
  preparing: string
  /** 페이지 수: "3쪽" */
  pages: (count: number) => string
}

export interface ImagePrintDialogProps {
  /** null: 아직 그림을 받는 중 */
  pictures: PrintPicture[] | null
  sheet: PrintSheet
  labels: ImagePrintDialogLabels
  /** 시스템 인쇄 대화상자까지: 끝나면(취소 포함) 돌아온다 */
  onPrint(): Promise<void> | void
  onClose(): void
  /** 앱의 선택지(방향, 범위) */
  children?: ReactNode
  /** 오류 같은 한 줄 */
  message?: string | null
}

const PREVIEW_WIDTH_PX = 460
const PREVIEW_HEIGHT_PX = 520
const PX_PER_MM = 96 / 25.4

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
}
const side: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }
const frame: CSSProperties = {
  width: PREVIEW_WIDTH_PX,
  height: PREVIEW_HEIGHT_PX,
  border: '1px solid var(--border, #ccc)',
  background: '#8a8f98',
}

export function ImagePrintDialog({
  pictures,
  sheet,
  labels,
  onPrint,
  onClose,
  children,
  message,
}: ImagePrintDialogProps): ReactElement {
  const [printing, setPrinting] = useState(false)
  const printButton = useRef<HTMLButtonElement>(null)

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
    if (pictures) printButton.current?.focus()
  }, [pictures])

  // 한 장이 미리보기 안에 통째로 보이게(여러 장은 아래로 이어진다)
  const zoom = Math.min(
    1,
    (PREVIEW_WIDTH_PX - 40) / (sheet.widthMm * PX_PER_MM),
    (PREVIEW_HEIGHT_PX - 40) / (sheet.heightMm * PX_PER_MM),
  )
  const html = useMemo(
    () => (pictures?.length ? buildImagePrintHtml(pictures, sheet, { previewZoom: zoom }) : ''),
    [pictures, sheet, zoom],
  )

  const print = async () => {
    if (printing) return
    setPrinting(true)
    try {
      await onPrint()
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div
      style={overlay}
      data-hanpan="image-print"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div style={panel} role="dialog" aria-modal="true" aria-label={labels.title}>
        {html ? (
          <iframe
            title={labels.title}
            style={frame}
            srcDoc={html}
            sandbox="allow-same-origin"
            data-hanpan="image-print-preview"
          />
        ) : (
          <div
            style={{ ...frame, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            data-hanpan="image-print-preparing"
          >
            <span style={{ color: '#fff' }}>{labels.preparing}</span>
          </div>
        )}
        <div style={side}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{labels.title}</h2>
          {pictures && (
            <span style={{ color: 'var(--text-muted, #666)' }}>
              {labels.pages(pictures.length)}
            </span>
          )}
          {children}
          {message && (
            <span role="alert" style={{ color: 'var(--danger, #b91c1c)' }}>
              {message}
            </span>
          )}
          <div style={{ marginTop: 'auto', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} data-action="image-print-cancel">
              {labels.cancel}
            </button>
            <button
              ref={printButton}
              type="button"
              className="primary"
              disabled={!pictures?.length || printing}
              onClick={() => void print()}
              data-action="image-print-go"
            >
              {labels.print}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
