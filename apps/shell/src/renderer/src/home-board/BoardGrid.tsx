import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react'
import type { Lang } from '@genoffice/i18n'
import { useDismissablePopover } from '@genoffice/ui'
import {
  CARD_SIZES,
  sizeKey,
  type BoardCard,
  type BoardCardType,
  type HomeBoard,
} from '../../../shared/home-board'
import { isRemovable, removeCard, resizeCard } from '../../../shared/home-board-edit'
import { homeCustomText } from '../i18n/strings-home-custom'
import { cardSpan, type BoardColumns } from './board-geometry'
import './home-board.css'

/** the cards whose settings form WidgetBody draws: their menu offers "설정" */
const WIDGET_TYPES: readonly BoardCardType[] = ['memo', 'favorites', 'folder', 'clock', 'shortcut']

/**
 * Home's board (spec 7.2): the cards in their order on a CSS grid, each as
 * wide and as high as its size says. The grid fills gaps with later cards
 * (`row dense`), so the stored order and sizes are all there is to a layout.
 * The board draws the frame; `renderCard` draws what is inside.
 *
 * While customizing (spec 7.8) every card gets a dashed frame, a menu with its
 * sizes (and "설정" for a widget card) and, when it may leave the board, an ×.
 * The card bodies do not take input then (plan R16), except the new card,
 * whose tiles customize themselves, and a card whose settings are open.
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
  // the narrow layouts measure the board later (plan Task 9); twelve columns until then
  const cols: BoardColumns = 12
  /** the card whose menu is open */
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const menuToolsRef = useRef<HTMLDivElement | null>(null)
  const closeMenu = () => setMenuFor(null)

  // the menu goes with customizing
  useEffect(() => {
    if (!customizing) setMenuFor(null)
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

  /** ↑↓ move between the menu's items */
  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button'))
    const at = items.indexOf(document.activeElement as HTMLElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    items[(at + step + items.length) % items.length]?.focus()
  }

  function renderTools(card: BoardCard, name: string): ReactElement {
    const open = menuFor === card.id
    return (
      <div className="hb-card-tools" ref={open ? menuToolsRef : undefined}>
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
        {open && (
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
        {isRemovable(card.type) && (
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

  return (
    <section
      className="hb-board"
      data-home-board=""
      data-cols={cols}
      data-customizing={customizing ? 'true' : undefined}
      style={{ '--cols': cols } as CSSProperties}
    >
      {props.board.cards.map((card) => {
        const name = props.cardName(card)
        const quiet = customizing && card.type !== 'apps' && props.editing !== card.id
        return (
          <section
            key={card.id}
            className="hb-card"
            data-card={card.id}
            data-card-type={card.type}
            data-size={sizeKey(card)}
            aria-label={name}
            style={{ '--span': cardSpan(card.w, cols), '--rows': card.h } as CSSProperties}
          >
            <div className="hb-card-body" inert={quiet}>
              {props.renderCard(card)}
            </div>
            {customizing && renderTools(card, name)}
          </section>
        )
      })}
    </section>
  )
}
