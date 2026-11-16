/**
 * "Align": nine lines, three per axis (left / centre / right, front / centre /
 * back, bottom / centre / top). Every part lines up with the one selected
 * first (the engine's `alignParts`), so the menu says so at its top.
 */
import type { StringKey } from '../i18n/locale'
import { useI18n } from '../i18n/locale'
import { IconAlign } from './icons'
import { RibbonMenu } from './RibbonMenu'

export type AlignAxis = 'x' | 'y' | 'z'
export type AlignAnchor = 'min' | 'center' | 'max'

const LINES: readonly { axis: AlignAxis; anchor: AlignAnchor; label: StringKey }[] = [
  { axis: 'x', anchor: 'min', label: 'alignLeft' },
  { axis: 'x', anchor: 'center', label: 'alignCenterX' },
  { axis: 'x', anchor: 'max', label: 'alignRight' },
  { axis: 'y', anchor: 'min', label: 'alignFront' },
  { axis: 'y', anchor: 'center', label: 'alignCenterY' },
  { axis: 'y', anchor: 'max', label: 'alignBack' },
  { axis: 'z', anchor: 'min', label: 'alignBottom' },
  { axis: 'z', anchor: 'center', label: 'alignCenterZ' },
  { axis: 'z', anchor: 'max', label: 'alignTop' },
]

export function AlignMenu(p: {
  disabled: boolean
  onAlign(axis: AlignAxis, anchor: AlignAnchor): void
}) {
  const { t } = useI18n()
  return (
    <RibbonMenu action="align" label={t('align')} icon={<IconAlign />} disabled={p.disabled}>
      {(close) => (
        <div role="menu" aria-label={t('align')}>
          <div className="cad-menu-hint">{t('alignHint')}</div>
          {LINES.map((line, i) => (
            <button
              key={`${line.axis}-${line.anchor}`}
              type="button"
              role="menuitem"
              className={`gs-dd-item cad-menu-item${i > 0 && i % 3 === 0 ? ' cad-menu-break' : ''}`}
              data-align={`${line.axis}-${line.anchor}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                close()
                p.onAlign(line.axis, line.anchor)
              }}
            >
              {t(line.label)}
            </button>
          ))}
        </div>
      )}
    </RibbonMenu>
  )
}
