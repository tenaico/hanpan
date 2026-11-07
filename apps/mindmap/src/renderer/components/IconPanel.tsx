/**
 * The icon panel: the markers a topic can carry, family by family.
 *
 * Pressing an icon puts it on every selected topic, in the place of one of the
 * same family; pressing one they all carry takes it off. Each family has its
 * own "remove", and one button takes every marker off. The pictures are the
 * map's own glyphs (`map/markers.ts`): document content, in the same plain
 * colours as on the map. The panel around them is chrome and takes the app's
 * tokens.
 */
import { useLayoutEffect, useRef } from 'react'
import { useI18n, type StringKey } from '../i18n/locale'
import { mapStrings } from '../i18n/map-strings'
import { markerName } from '../map/decorate'
import { MARKER_GROUPS, type MarkerFamily } from '../map/marker-families'
import { markerElement } from '../map/markers'
import { IconClose } from './icons'
import { useEscapeToClose } from './dialogs'

export interface IconPanelProps {
  /** the markers every selected topic carries; empty without a selection */
  common: readonly string[]
  /** at least one topic is selected */
  hasTopic: boolean
  /** markers of each family some selected topic carries */
  present: ReadonlySet<MarkerFamily>
  anyMarker: boolean
  onToggle(id: string): void
  /** takes the markers of a family off the selected topics, or all of them (null) */
  onRemove(family: MarkerFamily | null): void
  onClose(): void
}

export const FAMILY_NAME: Readonly<Record<MarkerFamily, StringKey>> = {
  priority: 'iconsPriority',
  progress: 'iconsProgress',
  flag: 'iconsFlags',
  star: 'iconsStars',
  smiley: 'iconsSmileys',
  arrow: 'iconsArrows',
}

export function IconPanel(p: IconPanelProps) {
  const { lang, t } = useI18n()
  useEscapeToClose(p.onClose)
  const names = mapStrings(lang).decoration
  const off = !p.hasTopic
  return (
    <aside className="mm-theme-panel mm-icon-panel" aria-label={t('iconsTitle')}>
      <header className="mm-theme-head">
        <h2 className="mm-theme-title">{t('iconsTitle')}</h2>
        <button
          type="button"
          className="mm-theme-close"
          data-action="icons-close"
          aria-label={t('btnClose')}
          data-tip={t('btnClose')}
          onClick={p.onClose}
        >
          <IconClose />
        </button>
      </header>
      <div className="mm-theme-body">
        <p className="mm-theme-hint">{t('iconsHint')}</p>
        {MARKER_GROUPS.map((group) => (
          <section key={group.family} className="mm-theme-group" data-icon-group={group.family}>
            <div className="mm-icon-head">
              <h3 className="mm-theme-label">{t(FAMILY_NAME[group.family])}</h3>
              <button
                type="button"
                className="mm-icon-remove"
                data-icon-remove={group.family}
                disabled={off || !p.present.has(group.family)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => p.onRemove(group.family)}
              >
                {t('iconsRemove')}
              </button>
            </div>
            <div className="mm-icon-options" role="group" aria-label={t(FAMILY_NAME[group.family])}>
              {group.ids.map((id) => {
                const name = markerName(names, id)
                const on = p.common.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={`mm-icon-option${on ? ' on' : ''}`}
                    data-icon-pick={id}
                    aria-pressed={on}
                    aria-label={name}
                    data-tip={name}
                    disabled={off}
                    // the map keeps the keyboard, as with the toolbar
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => p.onToggle(id)}
                  >
                    <Glyph id={id} />
                  </button>
                )
              })}
            </div>
          </section>
        ))}
        <button
          type="button"
          className="mm-icon-clear"
          data-icon-remove="all"
          disabled={off || !p.anyMarker}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => p.onRemove(null)}
        >
          {t('iconsClear')}
        </button>
      </div>
    </aside>
  )
}

/** The map's own glyph for `id`. The button carries the name, so the picture is hidden from assistive technology. */
export function Glyph(p: { id: string }) {
  const box = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const svg = markerElement(el.ownerDocument, p.id, '')
    svg.removeAttribute('role')
    svg.removeAttribute('aria-label')
    svg.setAttribute('aria-hidden', 'true')
    el.replaceChildren(svg)
  }, [p.id])
  return <span ref={box} className="mm-icon-glyph" />
}
