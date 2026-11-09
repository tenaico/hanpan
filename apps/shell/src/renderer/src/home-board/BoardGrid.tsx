import type { CSSProperties, ReactElement } from 'react'
import { sizeKey, type BoardCard, type HomeBoard } from '../../../shared/home-board'
import { cardSpan, type BoardColumns } from './board-geometry'
import './home-board.css'

/**
 * Home's board (spec 7.2): the cards in their order on a CSS grid, each as
 * wide and as high as its size says. The grid fills gaps with later cards
 * (`row dense`), so the stored order and sizes are all there is to a layout.
 * The board draws the frame; `renderCard` draws what is inside.
 */
export function BoardGrid(props: {
  board: HomeBoard
  cardName: (card: BoardCard) => string
  renderCard: (card: BoardCard) => ReactElement
}): ReactElement {
  // the narrow layouts measure the board later (plan Task 9); twelve columns until then
  const cols: BoardColumns = 12
  return (
    <section
      className="hb-board"
      data-home-board=""
      data-cols={cols}
      style={{ '--cols': cols } as CSSProperties}
    >
      {props.board.cards.map((card) => (
        <section
          key={card.id}
          className="hb-card"
          data-card={card.id}
          data-card-type={card.type}
          data-size={sizeKey(card)}
          aria-label={props.cardName(card)}
          style={{ '--span': cardSpan(card.w, cols), '--rows': card.h } as CSSProperties}
        >
          <div className="hb-card-body">{props.renderCard(card)}</div>
        </section>
      ))}
    </section>
  )
}
