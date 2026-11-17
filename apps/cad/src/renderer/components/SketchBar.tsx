import { useEffect, useState, useSyncExternalStore } from 'react'
import { CadEditError } from '@genoffice/cad-engine'
import type { ExtrudePart } from '@genoffice/cad-engine'
import type { SketchTool } from '../editing/sketch'
import { useI18n, type StringKey } from '../i18n/locale'

export interface SketchBarProps {
  /** the outline being drawn; the 3D view adds its points on workplane clicks */
  tool: SketchTool
  /** a closed outline turned into a part; the caller adds it with one history edit */
  onFinish: (part: ExtrudePart) => void
  /** the sketch was given up; the tool's points are already cleared */
  onCancel: () => void
}

const DEFAULT_HEIGHT_MM = '10'

/**
 * The bar shown while an outline is drawn on the workplane: how many points
 * there are, the height of the solid it makes, and Close shape / Undo point /
 * Cancel. An outline that cannot make a solid (too few points, edges that
 * cross) or an unusable height shows why, and nothing is made.
 */
export function SketchBar({ tool, onFinish, onCancel }: SketchBarProps) {
  const { t } = useI18n()
  const points = useSyncExternalStore(
    (listener) => tool.subscribe(listener),
    () => tool.points(),
  )
  const [height, setHeight] = useState(DEFAULT_HEIGHT_MM)
  const [refusal, setRefusal] = useState<StringKey | null>(null)

  // a refusal is about the outline as it was; any change to it clears the message
  useEffect(() => setRefusal(null), [points])

  const close = (): void => {
    const result = tool.close()
    if (!result.ok) {
      setRefusal(result.reason === 'too-few' ? 'sketchTooFew' : 'sketchSelfCrossing')
      return
    }
    let part: ExtrudePart
    try {
      part = tool.toPart(result.ring, height.trim() === '' ? Number.NaN : Number(height))
    } catch (error) {
      if (error instanceof CadEditError) {
        setRefusal('sketchBadHeight')
        return
      }
      throw error
    }
    setRefusal(null)
    onFinish(part)
  }

  const cancel = (): void => {
    tool.cancel()
    onCancel()
  }

  return (
    <div className="cad-sketch-bar" role="toolbar" aria-label={t('sketchTitle')}>
      <strong className="cad-sketch-title">{t('sketchTitle')}</strong>
      <span className="cad-sketch-hint">{t('sketchHint')}</span>
      <span className="cad-sketch-points">
        {t('sketchPoints')} <span className="cad-sketch-count">{points.length}</span>
      </span>
      <label className="cad-sketch-height">
        {t('sketchHeight')}
        <input
          className="cad-input"
          type="number"
          min="0.001"
          step="1"
          value={height}
          onChange={(e) => {
            setHeight(e.target.value)
            setRefusal(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              close()
            }
          }}
        />
      </label>
      <button type="button" className="cad-button" onClick={close}>
        {t('sketchClose')}
      </button>
      <button
        type="button"
        className="cad-button"
        onClick={() => tool.undoPoint()}
        disabled={points.length === 0}
      >
        {t('sketchUndoPoint')}
      </button>
      <button type="button" className="cad-button" onClick={cancel}>
        {t('sketchCancel')}
      </button>
      {refusal && (
        <span className="cad-sketch-refusal" role="alert">
          {t(refusal)}
        </span>
      )}
    </div>
  )
}
