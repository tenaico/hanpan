/**
 * The export dialog of a graphics tab: the format, and for a picture the size
 * (the picture's own to start with, the ratio kept unless let go), a scale
 * preset and, for JPG, the quality. Where the file goes is asked next, by the
 * system's save dialog.
 */
import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { EXPORT_FORMATS, type GraphicsKind } from '../../shared/kinds'
import { useI18n, type StringKey } from '../i18n/locale'
import type { ExportChoice, ExportFormatChoice } from './quick-actions'
import { keepRatio, scaleSize, MAX_EXPORT_SIDE, type PixelSize } from './resize'

/** A scale preset: a factor of the picture's own size, labeled by the factor or by a key. */
interface ScalePreset {
  id: string
  factor: number
  label?: StringKey
}

/**
 * A photo is already pixels: half, its own size, double. An illustration's
 * page is exported at 72 dpi (A4 is 595×842), so it gets double and print
 * size (300 dpi) too.
 */
const SCALES: Record<GraphicsKind, readonly ScalePreset[]> = {
  photo: [
    { id: '0.5', factor: 0.5 },
    { id: '1', factor: 1 },
    { id: '2', factor: 2 },
  ],
  illust: [
    { id: '1', factor: 1 },
    { id: '2', factor: 2 },
    { id: 'print', factor: 300 / 72, label: 'exportScalePrint' },
  ],
}

const DEFAULT_QUALITY = 90

/** a chain link: whole while the ratio is kept, broken while it is let go */
const LINK_PATH =
  'M7 4.5l1.2-1.2a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5l-1.2 1.2a2.5 2.5 0 0 1-3.5-3.5L5.5 8'

function clampSide(value: number): number {
  return Math.min(MAX_EXPORT_SIDE, Math.max(1, Math.round(value)))
}

function clampSize(size: PixelSize): PixelSize {
  return { width: clampSide(size.width), height: clampSide(size.height) }
}

export function ExportDialog({
  kind,
  size,
  onDone,
}: {
  kind: GraphicsKind
  size: PixelSize
  onDone: (choice: ExportChoice | null) => void
}): ReactElement {
  const { t } = useI18n()
  const formats = EXPORT_FORMATS[kind] as readonly ExportFormatChoice[]
  const [format, setFormat] = useState<ExportFormatChoice>(formats[0]!)
  const [dims, setDims] = useState<PixelSize>(size)
  const [locked, setLocked] = useState(true)
  /** the ratio the lock keeps: the picture's, or the size at the moment the lock went back on */
  const [ratioBase, setRatioBase] = useState<PixelSize>(size)
  const [quality, setQuality] = useState(DEFAULT_QUALITY)
  const firstRef = useRef<HTMLButtonElement | null>(null)
  const sized = format !== 'svg'

  useEffect(() => firstRef.current?.focus(), [])

  const confirm = () => {
    if (!sized) return onDone({ format })
    const choice: ExportChoice = { format, width: dims.width, height: dims.height }
    if (format === 'jpg') choice.quality = quality / 100
    onDone(choice)
  }

  const changeSide = (side: 'width' | 'height', raw: string) => {
    const value = Number(raw)
    if (!(value > 0)) return
    const clamped = clampSide(value)
    if (!locked) {
      setDims((d) => ({ ...d, [side]: clamped }))
      return
    }
    setDims(
      clampSize(keepRatio(ratioBase, side === 'width' ? { width: clamped } : { height: clamped })),
    )
  }

  const presetOn = (preset: ScalePreset) => {
    const scaled = clampSize(scaleSize(size, preset.factor))
    return scaled.width === dims.width && scaled.height === dims.height
  }

  return (
    <div className="gx-dialog-backdrop" role="presentation">
      <form
        className="gx-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('exportDialogTitle')}
        onSubmit={(e) => {
          e.preventDefault()
          confirm()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onDone(null)
        }}
      >
        <h2 className="gx-dialog-title">{t('exportDialogTitle')}</h2>

        <div className="gx-dialog-row">
          <span id="gx-export-format">{t('exportFormat')}</span>
          <div className="gx-seg" role="radiogroup" aria-labelledby="gx-export-format">
            {formats.map((f, i) => (
              <button
                key={f}
                ref={i === 0 ? firstRef : undefined}
                type="button"
                role="radio"
                aria-checked={format === f}
                className="gx-seg-btn"
                data-format={f}
                onClick={() => setFormat(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {sized && (
          <>
            <div className="gx-dialog-row">
              <span id="gx-export-scale">{t('exportSize')}</span>
              <div className="gx-seg" role="group" aria-labelledby="gx-export-scale">
                {SCALES[kind].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="gx-seg-btn"
                    data-scale={preset.id}
                    aria-pressed={presetOn(preset)}
                    onClick={() => {
                      setDims(clampSize(scaleSize(size, preset.factor)))
                      setRatioBase(size)
                    }}
                  >
                    {preset.label ? t(preset.label) : `${preset.factor}×`}
                  </button>
                ))}
              </div>
            </div>

            <div className="gx-dialog-size">
              <label className="gx-dialog-field">
                <span>{t('exportWidth')}</span>
                <input
                  name="width"
                  type="number"
                  min={1}
                  max={MAX_EXPORT_SIDE}
                  value={dims.width}
                  onChange={(e) => changeSide('width', e.target.value)}
                />
              </label>
              <button
                type="button"
                className="gx-ratio-lock"
                data-action="export-ratio"
                aria-pressed={locked}
                onClick={() => {
                  if (!locked) setRatioBase(dims)
                  setLocked(!locked)
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d={LINK_PATH}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  {locked && (
                    <path
                      d="M6.5 9.5 9.5 6.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <span>{t('exportKeepRatio')}</span>
              </button>
              <label className="gx-dialog-field">
                <span>{t('exportHeight')}</span>
                <input
                  name="height"
                  type="number"
                  min={1}
                  max={MAX_EXPORT_SIDE}
                  value={dims.height}
                  onChange={(e) => changeSide('height', e.target.value)}
                />
              </label>
            </div>
          </>
        )}

        {format === 'jpg' && (
          <label className="gx-dialog-row">
            <span>{t('exportQuality')}</span>
            <span className="gx-dialog-quality">
              <input
                name="quality"
                type="range"
                min={50}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
              <output>{quality}%</output>
            </span>
          </label>
        )}

        <div className="gx-dialog-actions">
          <button
            type="button"
            className="gx-dialog-btn"
            data-action="export-cancel"
            onClick={() => onDone(null)}
          >
            {t('exportCancel')}
          </button>
          <button type="submit" className="gx-dialog-btn primary" data-action="export-ok">
            {t('exportConfirm')}
          </button>
        </div>
      </form>
    </div>
  )
}
