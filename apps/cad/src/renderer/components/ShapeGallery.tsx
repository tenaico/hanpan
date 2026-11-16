/**
 * "More": all 15 shapes in the engine's order, a picture over each name.
 * Picking one places it; Text first asks for the words (the ribbon's text
 * prompt), so it hands back `onText` instead.
 */
import { SHAPE_DIMS, type ShapeKind } from '@genoffice/cad-engine'
import { SHAPE_LABEL } from '../editing/commands'
import { useI18n } from '../i18n/locale'
import { IconMore, ShapeIcon } from './icons'
import { RibbonMenu } from './RibbonMenu'

export const ALL_SHAPES = Object.keys(SHAPE_DIMS) as ShapeKind[]

export function ShapeGallery(p: {
  disabled: boolean
  onPlace(kind: ShapeKind): void
  /** the Text shape: ask for the words first */
  onText(): void
}) {
  const { t } = useI18n()
  return (
    <RibbonMenu
      action="more-shapes"
      label={t('moreShapes')}
      icon={<IconMore />}
      disabled={p.disabled}
      popClass="cad-gallery"
    >
      {(close) => (
        <div className="cad-gallery-grid" role="menu" aria-label={t('groupPlace')}>
          {ALL_SHAPES.map((kind) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              className="cad-gallery-item"
              data-shape={kind}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                close()
                if (kind === 'text') p.onText()
                else p.onPlace(kind)
              }}
            >
              <ShapeIcon kind={kind} />
              <span>{t(SHAPE_LABEL[kind])}</span>
            </button>
          ))}
        </div>
      )}
    </RibbonMenu>
  )
}
