import { useEffect, useState, useSyncExternalStore } from 'react'
import { useI18n } from '../i18n/locale'
import type { EntityEditTool } from './entity-edit'

export interface EntityEditBarProps {
  tool: EntityEditTool
  /** leave the tool */
  onDone: () => void
  /** an engine refusal (a locked drawing, a bad number) */
  onRefused: (err: unknown) => void
}

/**
 * The bar under the 3D view while editing the lines of an opened DXF or DWG:
 * what to click, how many entities are picked and on which layer, and the
 * three changes: delete, move by X/Y millimetres, and new text for one picked
 * text.
 */
export function EntityEditBar({ tool, onDone, onRefused }: EntityEditBarProps) {
  const { t } = useI18n()
  // the pick is replaced on every change, never changed in place
  const pick = useSyncExternalStore(
    (listener) => tool.subscribe(listener),
    () => tool.pick(),
  )
  const picked = pick ? tool.pickedEntities() : []
  const layers = [...new Set(picked.map((e) => e.layer))]
  const onlyText = picked.length === 1 && picked[0]!.kind === 'text' ? picked[0]! : null
  const [dx, setDx] = useState('0')
  const [dy, setDy] = useState('0')
  const [text, setText] = useState<string | null>(null)
  // a new pick shows its own text, not what was typed for the last one
  useEffect(() => setText(null), [pick])
  const run = (change: () => void): void => {
    try {
      change()
    } catch (err) {
      onRefused(err)
    }
  }
  const move = (): void => {
    const x = Number(dx)
    const y = Number(dy)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    run(() => tool.movePicked(x, y))
  }
  return (
    <div className="cad-measure-bar cad-lines-bar" role="toolbar" aria-label={t('editLines')}>
      <strong className="cad-sketch-title">{t('editLines')}</strong>
      {!pick ? (
        <span className="cad-sketch-hint">{t('editLinesHint')}</span>
      ) : (
        <>
          <output className="cad-measure-reading" data-cad-lines-count="" aria-live="polite">
            {t('editLinesPicked', { n: picked.length, layer: layers.join(', ') })}
          </output>
          <button
            type="button"
            className="cad-button"
            data-cad-lines-delete=""
            onClick={() => run(() => tool.deletePicked())}
          >
            {t('editLinesDelete')}
          </button>
          <label className="cad-lines-field">
            X
            <input
              className="cad-lines-number"
              inputMode="decimal"
              value={dx}
              aria-label={t('editLinesMoveX')}
              onChange={(e) => setDx(e.target.value)}
            />
          </label>
          <label className="cad-lines-field">
            Y
            <input
              className="cad-lines-number"
              inputMode="decimal"
              value={dy}
              aria-label={t('editLinesMoveY')}
              onChange={(e) => setDy(e.target.value)}
            />
          </label>
          <button type="button" className="cad-button" data-cad-lines-move="" onClick={move}>
            {t('editLinesMove')}
          </button>
          {onlyText && onlyText.kind === 'text' && (
            <>
              <input
                className="cad-lines-text"
                data-cad-lines-text=""
                value={text ?? onlyText.value}
                aria-label={t('editLinesText')}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && text !== null) {
                    run(() => tool.setPickedText(text))
                    setText(null)
                  }
                }}
              />
              <button
                type="button"
                className="cad-button"
                data-cad-lines-apply-text=""
                disabled={text === null || text === onlyText.value}
                onClick={() => {
                  if (text === null) return
                  run(() => tool.setPickedText(text))
                  setText(null)
                }}
              >
                {t('editLinesApplyText')}
              </button>
            </>
          )}
        </>
      )}
      <button type="button" className="cad-button" data-cad-lines-done="" onClick={onDone}>
        {t('measureDone')}
      </button>
    </div>
  )
}
