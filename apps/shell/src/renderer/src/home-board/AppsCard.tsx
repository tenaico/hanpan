/**
 * The new card (spec 7.4): the pinned apps in a grid of (w - 1) x h slots,
 * "모든 앱" right after the last pin (or in the last slot with "+N" when the
 * pins do not fit). Blank slots stay empty; while customizing (spec 7.8) they
 * offer "앱 추가", each tile gets an × that unpins it and a tile no longer
 * starts its app (plan R16): it is dragged instead, onto another app's slot
 * on this card, never out of it. Without customizing a tile only starts its
 * app, so a press can never move one.
 */
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react'
import { appSlots, slotGrid, type AppKey } from '../../../shared/home-apps'
import type { CardSize } from '../../../shared/home-board'
import type { HomeAppCard } from '../HomeWidgets'
import { homeCustomText } from '../i18n/strings-home-custom'
import { useI18n } from '../locale'
import './apps-card.css'

/** the Hanpan tiles the e2e tests press by `data-hanpan` (plan R5) */
const HANPAN_TILES: ReadonlySet<string> = new Set(['templates', 'design', 'md-convert'])

/** how far the pointer goes before a press on a tile becomes a drag */
const DRAG_START_PX = 4

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
  const gridRef = useRef<HTMLDivElement | null>(null)
  /** a press on a tile while customizing: it becomes a drag past DRAG_START_PX */
  const [held, setHeld] = useState<{ key: AppKey; x: number; y: number } | null>(null)
  const [dropSlot, setDropSlot] = useState<number | null>(null)
  const latest = useRef({ dropSlot, apps: slots.apps, pinned: props.pinned, onMove: props.onMove })
  latest.current = { dropSlot, apps: slots.apps, pinned: props.pinned, onMove: props.onMove }

  // a drag ends with customizing
  useEffect(() => {
    if (!props.customizing) {
      setHeld(null)
      setDropSlot(null)
    }
  }, [props.customizing])

  // the drag follows the pointer; release over an app slot moves the app, Esc drops the drag
  useEffect(() => {
    if (!held) return
    let moving = false
    const finish = () => {
      setHeld(null)
      setDropSlot(null)
    }
    const onMove = (event: PointerEvent) => {
      if (!moving && Math.hypot(event.clientX - held.x, event.clientY - held.y) <= DRAG_START_PX) {
        return
      }
      moving = true
      const slot = document
        .elementFromPoint?.(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-app-slot]')
      const index = slot && gridRef.current?.contains(slot) ? Number(slot.dataset.appSlot) : NaN
      // only the app slots take a drop: not "모든 앱", not a blank slot
      setDropSlot(index >= 0 && index < latest.current.apps.length ? index : null)
    }
    const onUp = () => {
      const { dropSlot: at, apps, pinned, onMove: move } = latest.current
      finish()
      const target = at === null ? undefined : apps[at]
      // the app takes the place of the pin it is dropped on (hidden pins keep theirs)
      if (moving && target && target !== held.key) move?.(held.key, pinned.indexOf(target))
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      finish()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', finish)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', finish)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [held])

  const press = (event: ReactPointerEvent<HTMLButtonElement>, key: AppKey) => {
    if (!props.customizing || (event.button !== undefined && event.button !== 0)) return
    setHeld({ key, x: event.clientX, y: event.clientY })
  }

  return (
    <section className="hb-apps-card">
      <h2 className="hb-card-title">{homeCustomText(lang, 'cardApps')}</h2>
      <div
        ref={gridRef}
        className="hb-apps"
        data-app-dragging={held ? 'true' : undefined}
        style={{ '--cols': cols } as CSSProperties}
      >
        {slots.apps.map((key, index) => {
          const app = byKey.get(key)!
          return (
            <div
              key={key}
              className="hb-app-slot"
              data-app-slot={index}
              data-drop-slot={dropSlot === index ? '' : undefined}
            >
              <button
                type="button"
                className="quick-card hb-app"
                data-new={key}
                data-hanpan={HANPAN_TILES.has(key) ? key : undefined}
                data-tip={app.sub}
                onPointerDown={props.customizing ? (event) => press(event, key) : undefined}
                onClick={() => {
                  if (!props.customizing) void app.action()
                }}
              >
                {key === 'xmind' && <span className="hp-start-badge">{t('hpStartBadge')}</span>}
                {undraggable(app.icon)}
                <span className="hb-app-name">{app.title}</span>
              </button>
              {props.customizing && (
                <button
                  type="button"
                  className="hb-app-unpin"
                  data-app-unpin={key}
                  aria-label={homeCustomText(lang, 'unpinApp', { name: app.title })}
                  title={homeCustomText(lang, 'unpinApp', { name: app.title })}
                  onClick={() => props.onUnpin?.(key)}
                >
                  ×
                </button>
              )}
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
          <div key={`empty-${i}`} className="hb-app-slot is-empty" data-app-slot={allIndex + 1 + i}>
            {props.customizing && (
              <button
                type="button"
                className="hb-app-add"
                data-app-slot-add=""
                onClick={props.onOpenAll}
              >
                {homeCustomText(lang, 'addAppSlot')}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
