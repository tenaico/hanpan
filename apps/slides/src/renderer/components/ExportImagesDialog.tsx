/**
 * 이미지로 내보내기 대화상자: 형식(PNG/JPG), 범위(모든 슬라이드/지금 슬라이드), 크기(보통/크게)를
 * 고른 뒤 폴더를 고른다. 폴더만 고르면 바로 모든 장을 쏟아내던 것을 대신한다.
 */
import { useState } from 'react'
import { useI18n } from '../i18n/locale'
import type { ExportImagesOptions } from '../file-actions'
import { useModalDialog } from './modal-dialog'

export function ExportImagesDialog({
  visibleCount,
  slideWidthPx,
  slideHeightPx,
  onExport,
  onClose,
}: {
  /** 숨기지 않은 슬라이드 수 */
  visibleCount: number
  slideWidthPx: number
  slideHeightPx: number
  onExport: (opts: ExportImagesOptions) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const { titleId, dialogProps } = useModalDialog(onClose)
  const [format, setFormat] = useState<ExportImagesOptions['format']>('png')
  const [range, setRange] = useState<ExportImagesOptions['range']>(
    visibleCount > 0 ? 'all' : 'current',
  )
  const [scale, setScale] = useState<ExportImagesOptions['scale']>(2)
  const dims = (s: number) => ({
    w: Math.round(slideWidthPx * s),
    h: Math.round(slideHeightPx * s),
  })

  const radio = <T extends string | number>(
    name: string,
    value: T,
    current: T,
    set: (v: T) => void,
    label: string,
    disabled = false,
  ) => (
    <label className="print-radio">
      <input
        type="radio"
        name={name}
        checked={current === value}
        disabled={disabled}
        onChange={() => set(value)}
      />
      {label}
    </label>
  )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        {...dialogProps}
        className="modal export-images-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>{t('appExportImgTitle')}</h2>
        <div className="print-options export-images-options">
          <fieldset>
            <legend>{t('appExportImgFormat')}</legend>
            {radio('xi-format', 'png', format, setFormat, t('appExportImgPng'))}
            {radio('xi-format', 'jpg', format, setFormat, t('appExportImgJpg'))}
          </fieldset>
          <fieldset>
            <legend>{t('appExportImgRange')}</legend>
            {radio(
              'xi-range',
              'all',
              range,
              setRange,
              t('appExportImgAll', { n: visibleCount }),
              visibleCount === 0,
            )}
            {radio('xi-range', 'current', range, setRange, t('appExportImgCurrent'))}
          </fieldset>
          <fieldset>
            <legend>{t('appExportImgSize')}</legend>
            {radio<1 | 2>('xi-scale', 1, scale, setScale, t('appExportImgSize1', dims(1)))}
            {radio<1 | 2>('xi-scale', 2, scale, setScale, t('appExportImgSize2', dims(2)))}
          </fieldset>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>{t('appSettingsCancel')}</button>
          <button className="primary" onClick={() => onExport({ format, range, scale })}>
            {t('appExportImgGo')}
          </button>
        </div>
      </div>
    </div>
  )
}
