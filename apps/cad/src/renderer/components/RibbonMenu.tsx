/**
 * A big ribbon button that opens a popover under it (the shape gallery, the
 * align menu, the text prompt, the shortcut list). The popover is the app's
 * shared one (`gs-dd-pop`, @genoffice/ui/dropdown.css), like the mind map
 * editor's RibbonMenu: a press outside, a press on the shell's chrome or Esc
 * closes it.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDismissablePopover } from '@genoffice/ui'

export function RibbonMenu(p: {
  action: string
  label: string
  icon: ReactNode
  disabled: boolean
  /** opened from outside (the gallery's Text opens the text prompt) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** extra class of the popover */
  popClass?: string
  /** the popover's content; `close` shuts it */
  children: (close: () => void) => ReactNode
}) {
  const [ownOpen, setOwnOpen] = useState(false)
  const open = p.open ?? ownOpen
  const setOpen = (next: boolean): void => {
    setOwnOpen(next)
    p.onOpenChange?.(next)
  }
  const setOpenRef = useRef(setOpen)
  setOpenRef.current = setOpen
  const wrap = useRef<HTMLSpanElement>(null)
  useDismissablePopover(open, () => setOpenRef.current(false), { inside: () => [wrap.current] })
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      setOpenRef.current(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])
  return (
    <span ref={wrap} className="gs-dd cad-ribbon-menu">
      <button
        type="button"
        className={`rb-big${open ? ' active' : ''}`}
        data-action={p.action}
        data-tip={p.label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={p.disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
      >
        <span className="rb-big-icon">{p.icon}</span>
        <span>{p.label} ▾</span>
      </button>
      {open && (
        <div className={`gs-dd-pop${p.popClass ? ` ${p.popClass}` : ''}`} aria-label={p.label}>
          {p.children(() => setOpen(false))}
        </div>
      )}
    </span>
  )
}
