import { useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from 'react'
import type { Lang } from '@genoffice/i18n'
import { useDismissablePopover } from '@genoffice/ui'
import {
  CARD_SIZES,
  sizeKey,
  type BoardCard,
  type BoardCardType,
  type CardSize,
  type HomeBoard,
} from '../../../shared/home-board'
import {
  isRemovable,
  moveCardTo,
  nearestSize,
  removeCard,
  resizeCard,
} from '../../../shared/home-board-edit'
import { homeCustomText } from '../i18n/strings-home-custom'
import {
  boardColumns,
  cardPixels,
  cardSpan,
  narrowOrder,
  columnPixels,
  sizeFromDrag,
  type BoardColumns,
} from './board-geometry'
import './home-board.css'

/** the cards whose settings form WidgetBody draws: their menu offers "설정" */
const WIDGET_TYPES: readonly BoardCardType[] = ['memo', 'favorites', 'folder', 'clock', 'shortcut']
/** what a card drag carries, so a drop elsewhere never mistakes it for a file */
const CARD_DRAG_TYPE = 'application/x-hanpan-card'

/** a corner drag in progress: where it started and the size it shows */
interface Resizing {
  id: string
  type: BoardCardType
  start: CardSize
  x: number
  y: number
  colPx: number
  preview: CardSize
}

/**
 * Home's board (spec 7.2): the cards in their order on a CSS grid, each as
 * wide and as high as its size says. The grid fills gaps with later cards
 * (`row dense`), so the stored order and sizes are all there is to a layout.
 * The board draws the frame; `renderCard` draws what is inside.
 *
 * A card moves by its handle (⋮⋮) at any time (spec 7.8): dropped on another
 * card it takes that card's place. A drag that starts in a card's body (a
 * memo's text) never moves the card.
 *
 * While customizing every card gets a dashed frame, a menu with its sizes
 * (and "설정" for a widget card), an × when it may leave the board and, on
 * twelve columns (plan R15), a corner that resizes it to the nearest allowed
 * size. The card bodies do not take input then (plan R16), except the new
 * card, whose tiles customize themselves, and a card whose settings are open.
 */
export function BoardGrid(props: {
  board: HomeBoard
  cardName: (card: BoardCard) => string
  renderCard: (card: BoardCard) => ReactElement
  customizing: boolean
  update: (change: (prev: HomeBoard) => HomeBoard) => void
  lang: Lang
  /** the card whose settings are open */
  editing: string | null
  onEdit: (id: string | null) => void
}): ReactElement {
  const { customizing, update, lang } = props
  const boardRef = useRef<HTMLElement | null>(null)
  /** the columns the board's width allows (spec 7.9); the stored sizes never change for it */
  const [cols, setCols] = useState<BoardColumns>(12)
  useEffect(() => {
    const el = boardRef.current
    // no ResizeObserver (tests): twelve columns
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const width = entries[entries.length - 1]?.contentRect.width
      if (width !== undefined && width > 0) setCols(boardColumns(width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  /** the card whose menu is open */
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const menuToolsRef = useRef<HTMLDivElement | null>(null)
  const closeMenu = () => setMenuFor(null)
  /** the card being dragged by its handle; a ref, so dragover reads it without a render */
  const dragging = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [resizing, setResizing] = useState<Resizing | null>(null)
  const resizingRef = useRef<Resizing | null>(null)
  resizingRef.current = resizing

  // the menu and a resize go with customizing; a resize also with twelve columns (R15)
  useEffect(() => {
    if (cols !== 12) setResizing(null)
  }, [cols])
  useEffect(() => {
    if (!customizing) {
      setMenuFor(null)
      setResizing(null)
    }
  }, [customizing])

  // outside press, window blur and a press on the tab strip close the menu
  useDismissablePopover(menuFor !== null, closeMenu, { inside: () => [menuToolsRef.current] })

  // Esc closes the menu before anything else hears it (customizing stays on)
  useEffect(() => {
    if (menuFor === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      const opener = menuToolsRef.current?.querySelector<HTMLElement>('[data-card-menu]')
      setMenuFor(null)
      opener?.focus()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [menuFor])

  // the open menu takes focus on its checked size, so the arrow keys work at once
  useEffect(() => {
    if (menuFor === null) return
    const menu = menuToolsRef.current?.querySelector('[role="menu"]')
    const first =
      menu?.querySelector<HTMLElement>('[aria-checked="true"]') ??
      menu?.querySelector<HTMLElement>('button')
    first?.focus()
  }, [menuFor])

  // a corner drag follows the pointer anywhere; release keeps the size, Esc drops it
  const resizeActive = resizing !== null
  useEffect(() => {
    if (!resizeActive) return
    const onMove = (event: PointerEvent) => {
      const now = resizingRef.current
      if (!now) return
      const wanted = sizeFromDrag(
        now.start,
        event.clientX - now.x,
        event.clientY - now.y,
        now.colPx,
      )
      const preview = nearestSize(now.type, wanted)
      if (preview.w !== now.preview.w || preview.h !== now.preview.h) {
        setResizing({ ...now, preview })
      }
    }
    const onUp = () => {
      const now = resizingRef.current
      setResizing(null)
      if (now && (now.preview.w !== now.start.w || now.preview.h !== now.start.h)) {
        update((prev) => resizeCard(prev, now.id, now.preview))
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      resizingRef.current = null
      setResizing(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [resizeActive, update])

  /** ↑↓ move between the menu's items */
  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button'))
    const at = items.indexOf(document.activeElement as HTMLElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    items[(at + step + items.length) % items.length]?.focus()
  }

  const endDrag = () => {
    dragging.current = null
    setDropTarget(null)
  }

  const startDrag = (event: ReactDragEvent<HTMLElement>, card: BoardCard) => {
    dragging.current = card.id
    const frame = event.currentTarget.closest<HTMLElement>('.hb-card')
    event.dataTransfer?.setData(CARD_DRAG_TYPE, card.id)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    if (frame) event.dataTransfer?.setDragImage?.(frame, 24, 16)
  }

  /** a card takes a drop only from another card's handle */
  const dropHandlers = (card: BoardCard) => ({
    onDragOver: (event: ReactDragEvent<HTMLElement>) => {
      if (!dragging.current || dragging.current === card.id) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      if (dropTarget !== card.id) setDropTarget(card.id)
    },
    onDragLeave: (event: ReactDragEvent<HTMLElement>) => {
      const next = event.relatedTarget as Node | null
      if (dropTarget === card.id && !(next && event.currentTarget.contains(next))) {
        setDropTarget(null)
      }
    },
    onDrop: (event: ReactDragEvent<HTMLElement>) => {
      const from = dragging.current
      if (!from || from === card.id) return
      event.preventDefault()
      endDrag()
      update((prev) => moveCardTo(prev, from, card.id))
    },
  })

  const startResize = (event: ReactPointerEvent<HTMLElement>, card: BoardCard) => {
    if (event.button !== undefined && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const width = boardRef.current?.getBoundingClientRect().width ?? 0
    if (width <= 0) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const start = { w: card.w, h: card.h }
    setResizing({
      id: card.id,
      type: card.type,
      start,
      x: event.clientX,
      y: event.clientY,
      colPx: columnPixels(width),
      preview: start,
    })
  }

  function renderTools(card: BoardCard, name: string): ReactElement {
    const open = menuFor === card.id
    return (
      <div
        className="hb-card-tools"
        data-customizing={customizing ? 'true' : undefined}
        ref={open ? menuToolsRef : undefined}
      >
        <button
          type="button"
          className="hb-tool hb-card-handle"
          data-card-handle=""
          draggable
          aria-label={homeCustomText(lang, 'dragHandle', { name })}
          title={homeCustomText(lang, 'dragHandle', { name })}
          onDragStart={(event) => startDrag(event, card)}
          onDragEnd={endDrag}
        >
          ⋮⋮
        </button>
        {customizing && (
          <button
            type="button"
            className="hb-tool"
            data-card-menu=""
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={homeCustomText(lang, 'cardMenu', { name })}
            title={homeCustomText(lang, 'cardMenu', { name })}
            onClick={() => setMenuFor(open ? null : card.id)}
          >
            ⋯
          </button>
        )}
        {customizing && open && (
          <div
            className="hb-card-menu"
            role="menu"
            aria-label={homeCustomText(lang, 'cardMenu', { name })}
            onKeyDown={onMenuKeyDown}
          >
            <p className="hb-card-menu-label">{homeCustomText(lang, 'size')}</p>
            {CARD_SIZES[card.type].map((size) => {
              const key = sizeKey(size)
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitemradio"
                  data-card-size={key}
                  aria-checked={key === sizeKey(card)}
                  onClick={() => {
                    update((prev) => resizeCard(prev, card.id, size))
                    closeMenu()
                  }}
                >
                  {homeCustomText(lang, 'sizeOption', { w: size.w, h: size.h })}
                </button>
              )
            })}
            {WIDGET_TYPES.includes(card.type) && (
              <button
                type="button"
                role="menuitem"
                data-card-menu-settings=""
                onClick={() => {
                  props.onEdit(card.id)
                  closeMenu()
                }}
              >
                {homeCustomText(lang, 'settings')}
              </button>
            )}
          </div>
        )}
        {customizing && isRemovable(card.type) && (
          <button
            type="button"
            className="hb-tool"
            data-card-remove=""
            aria-label={homeCustomText(lang, 'removeCard', { name })}
            title={homeCustomText(lang, 'removeCard', { name })}
            onClick={() => update((prev) => removeCard(prev, card.id))}
          >
            ×
          </button>
        )}
      </div>
    )
  }

  const shownOrder = narrowOrder(
    props.board.cards.map((card) => card.type),
    cols,
  )

  return (
    <section
      ref={boardRef}
      className="hb-board"
      data-home-board=""
      data-cols={cols}
      data-customizing={customizing ? 'true' : undefined}
      style={{ '--cols': cols } as CSSProperties}
    >
      {props.board.cards.map((card, index) => {
        const shownAt = shownOrder?.[index]
        const name = props.cardName(card)
        const quiet = customizing && card.type !== 'apps' && props.editing !== card.id
        const preview = resizing?.id === card.id ? resizing : null
        const ghost = preview ? cardPixels(preview.preview, preview.colPx) : null
        return (
          <section
            key={card.id}
            className="hb-card"
            data-card={card.id}
            data-card-type={card.type}
            data-size={sizeKey(card)}
            data-drop-target={dropTarget === card.id ? '' : undefined}
            data-resize-preview={preview ? sizeKey(preview.preview) : undefined}
            aria-label={name}
            style={
              {
                '--span': cardSpan(card.w, cols),
                '--rows': card.h,
                ...(shownAt === undefined ? {} : { '--order': shownAt }),
              } as CSSProperties
            }
            {...dropHandlers(card)}
          >
            <div className="hb-card-body" inert={quiet}>
              {props.renderCard(card)}
            </div>
            {renderTools(card, name)}
            {customizing && cols === 12 && (
              <div
                className="hb-card-resize"
                data-card-resize=""
                aria-label={homeCustomText(lang, 'resizeCorner', { name })}
                title={homeCustomText(lang, 'resizeCorner', { name })}
                onPointerDown={(event) => startResize(event, card)}
              />
            )}
            {ghost && (
              <div
                className="hb-resize-ghost"
                aria-hidden="true"
                style={{ width: ghost.width, height: ghost.height }}
              />
            )}
          </section>
        )
      })}
    </section>
  )
}
