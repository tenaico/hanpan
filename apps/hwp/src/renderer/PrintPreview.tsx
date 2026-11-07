/**
 * 인쇄 미리 보기(0.17): 인쇄할 쪽을 인쇄되는 모양(인쇄용 SVG) 그대로 보여 주고, 사용자가
 * "인쇄"를 눌러야 시스템 인쇄 창으로 넘어간다. 전에는 Ctrl+P가 곧장 인쇄 창을 열었다.
 */
import { useEffect, useRef } from 'react'
import { useI18n } from './i18n/locale'
import { pageImageUrl } from './print-flow'
import type { PrintJob } from '../shared/ipc'

interface PrintPreviewProps {
  readonly job: PrintJob
  readonly onPrint: () => void
  readonly onCancel: () => void
}

export function PrintPreview({ job, onPrint, onCancel }: PrintPreviewProps) {
  const { t } = useI18n()
  const printRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    printRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onCancel()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onCancel])
  return (
    <div className="hwp-preview-backdrop">
      <div
        className="hwp-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hwp-preview-title"
      >
        <div className="hwp-preview-head">
          <span id="hwp-preview-title" className="hwp-preview-title">
            {t('previewTitle')}
          </span>
          <span className="hwp-preview-count">
            {t('previewPages', { count: job.pages.length })}
          </span>
          <span className="hwp-preview-actions">
            <button type="button" data-preview="cancel" onClick={onCancel}>
              {t('previewCancel')}
            </button>
            <button
              ref={printRef}
              type="button"
              className="primary"
              data-preview="print"
              onClick={onPrint}
            >
              {t('previewPrint')}
            </button>
          </span>
        </div>
        <div className="hwp-preview-pages">
          {job.pages.map((page, index) => (
            <img
              key={index}
              className="hwp-preview-page"
              src={pageImageUrl(job, index)}
              width={Math.round(page.width)}
              height={Math.round(page.height)}
              loading="lazy"
              alt={t('previewPageAlt', { page: index + 1 })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
