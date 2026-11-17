import { useSyncExternalStore } from 'react'
import { useI18n } from '../i18n/locale'
import type { MeasureTool } from './measure-tool'

export interface MeasureOverlayProps {
  tool: MeasureTool
  /** leave the measuring tool */
  onDone: () => void
}

/**
 * The bar shown over the 3D view while measuring: what to click, the reading
 * (also drawn beside the line in the view) and Done. The reading is plain
 * text, so it can be read aloud and copied.
 */
export function MeasureOverlay({ tool, onDone }: MeasureOverlayProps) {
  const { t } = useI18n()
  // the reading and the first point are replaced, never changed in place: either is the snapshot
  useSyncExternalStore(
    (listener) => tool.subscribe(listener),
    () => tool.reading() ?? tool.first(),
  )
  const reading = tool.reading()
  const waiting = !reading && tool.first() !== null
  return (
    <div className="cad-measure-bar" role="toolbar" aria-label={t('measure')}>
      <strong className="cad-sketch-title">{t('measure')}</strong>
      <span className="cad-sketch-hint">{waiting ? t('measureFirst') : t('measureHint')}</span>
      <output className="cad-measure-reading" data-cad-measure-reading="" aria-live="polite">
        {reading?.label ?? ''}
      </output>
      <button type="button" className="cad-button" data-cad-measure-done="" onClick={onDone}>
        {t('measureDone')}
      </button>
    </div>
  )
}
