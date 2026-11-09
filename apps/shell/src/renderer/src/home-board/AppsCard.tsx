/**
 * The new card (spec 7.4): the pinned apps in a grid of (w - 1) x h slots,
 * "모든 앱" right after the last pin (or in the last slot with "+N" when the
 * pins do not fit). Blank slots stay empty here; customizing fills them later.
 */
import { cloneElement, isValidElement, type CSSProperties, type ReactElement } from 'react'
import { appSlots, slotGrid, type AppKey } from '../../../shared/home-apps'
import type { CardSize } from '../../../shared/home-board'
import type { HomeAppCard } from '../HomeWidgets'
import { homeCustomText } from '../i18n/strings-home-custom'
import { useI18n } from '../locale'
import './apps-card.css'

/** the Hanpan tiles the e2e tests press by `data-hanpan` (plan R5) */
const HANPAN_TILES: ReadonlySet<string> = new Set(['templates', 'design', 'md-convert'])

/** an app icon that cannot be dragged off its tile */
export function undraggable(icon: ReactElement): ReactElement {
  if (isValidElement(icon) && icon.type === 'img') {
    return cloneElement(icon as ReactElement<{ draggable?: boolean }>, { draggable: false })
  }
  return icon
}

export function AppsCard(props: {
  apps: readonly HomeAppCard[]
  pinned: readonly string[]
  size: CardSize
  unseen: number
  customizing: boolean
  onOpenAll: () => void
  onUnpin?: (key: AppKey) => void
  onMove?: (key: AppKey, toIndex: number) => void
}): ReactElement {
  const { t, lang } = useI18n()
  const byKey = new Map(props.apps.map((app) => [app.key, app]))
  const slots = appSlots(props.pinned, new Set(byKey.keys()), props.size)
  const { cols } = slotGrid(props.size)
  const allIndex = slots.apps.length
  return (
    <section className="hb-apps-card">
      <h2 className="hb-card-title">{homeCustomText(lang, 'cardApps')}</h2>
      <div className="hb-apps" style={{ '--cols': cols } as CSSProperties}>
        {slots.apps.map((key, index) => {
          const app = byKey.get(key)!
          return (
            <div key={key} className="hb-app-slot" data-app-slot={index}>
              <button
                type="button"
                className="quick-card hb-app"
                data-new={key}
                data-hanpan={HANPAN_TILES.has(key) ? key : undefined}
                data-tip={app.sub}
                onClick={() => void app.action()}
              >
                {key === 'xmind' && <span className="hp-start-badge">{t('hpStartBadge')}</span>}
                {undraggable(app.icon)}
                <span className="hb-app-name">{app.title}</span>
              </button>
            </div>
          )
        })}
        <div className="hb-app-slot" data-app-slot={allIndex}>
          <button
            type="button"
            className="hb-all-apps"
            data-all-apps-open
            onClick={props.onOpenAll}
          >
            <span className="hb-app-name">{t('hbAllApps')}</span>
            {slots.more > 0 && (
              <span className="hb-all-apps-more" data-all-apps-more>
                +{slots.more}
              </span>
            )}
            {props.unseen > 0 && (
              <span className="hb-new-mark" data-all-apps-new>
                {t('hbNewApp')}
              </span>
            )}
          </button>
        </div>
        {Array.from({ length: slots.empty }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="hb-app-slot is-empty"
            data-app-slot={allIndex + 1 + i}
          />
        ))}
      </div>
    </section>
  )
}
