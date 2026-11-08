/**
 * Hanpan: the toolbar's "send to a document" button, a menu of the three
 * targets (HWP report, PowerPoint, Word report). Built like the export menu:
 * the shared popover, Escape closes it, pressing it keeps the map's keyboard.
 * With the Korean document features off (decision 0091) only PowerPoint and
 * Word stay: the HWP report, design board, sync and picture credits go.
 */
import { useEffect, useRef, useState } from 'react'
import { useDismissablePopover, useKoreanDocFeatures } from '@genoffice/ui'
import type { SendTarget } from '@genoffice/hanpan-core/renderer'
import { useI18n } from '../i18n/locale'

/** One board with three sheets fanning out of it: one map, many documents. Drawn on the 20-unit icon grid. */
export const IconSendTo = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="3" y="7.5" width="5" height="5" rx="1" />
    <path d="M8 10h3M11 10l2-4.25h3.25M11 10h5.25M11 10l2 4.25h3.25" />
  </svg>
)

const ITEMS = [
  { target: 'hwp', label: 'sendHwp' },
  { target: 'slides', label: 'sendSlides' },
  { target: 'docx', label: 'sendDocx' },
] as const

export function SendMenu(p: {
  disabled: boolean
  onPick(target: SendTarget): void
  onSync?(): void
  onDesign?(): void
  onCredits?(): void
}) {
  const { t, lang } = useI18n()
  const korean = useKoreanDocFeatures(lang)
  const items = korean ? ITEMS : ITEMS.filter((item) => item.target !== 'hwp')
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  useDismissablePopover(open, () => setOpen(false), { inside: () => [wrap.current] })
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])
  return (
    <span ref={wrap} className="gs-dd hp-send-menu">
      <button
        type="button"
        className={`rb-btn mm-tool hp-send-button${open ? ' active' : ''}`}
        data-action="send-to"
        data-tip={open ? undefined : t('tbSendTo')}
        aria-label={t('tbSendTo')}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={p.disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((was) => !was)}
      >
        <IconSendTo />
        <span className="hp-send-button-label">{t('tbSendToLabel')}</span>
      </button>
      {open && (
        <div className="gs-dd-pop" role="menu" aria-label={t('tbSendTo')}>
          {items.map((item) => (
            <button
              key={item.target}
              type="button"
              role="menuitem"
              className="gs-dd-item"
              data-send={item.target}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false)
                p.onPick(item.target)
              }}
            >
              {t(item.label)}
            </button>
          ))}
          {korean && p.onDesign && (
            <button
              type="button"
              role="menuitem"
              className="gs-dd-item"
              data-send="design"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false)
                p.onDesign?.()
              }}
            >
              {t('sendDesign')}
            </button>
          )}
          {korean && p.onSync && (
            <button
              type="button"
              role="menuitem"
              className="gs-dd-item hp-send-sync"
              data-send="sync"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false)
                p.onSync?.()
              }}
            >
              {t('sendSync')}
            </button>
          )}
          {korean && p.onCredits && (
            <button
              type="button"
              role="menuitem"
              className="gs-dd-item"
              data-send="credits"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false)
                p.onCredits?.()
              }}
            >
              {t('mmCredits')}
            </button>
          )}
        </div>
      )}
    </span>
  )
}
