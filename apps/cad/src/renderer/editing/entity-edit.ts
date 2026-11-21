/**
 * Editing an opened DXF or DWG by hand (the "Edit lines" tool): a click picks
 * the nearest line, polyline, circle, arc or text of a visible top-level
 * drawing, Shift or Ctrl adds or removes one more, and the bar under the 3D
 * view deletes the pick, moves it or changes its text. Each change is one
 * `history.edit`, so one Ctrl+Z puts it back.
 *
 * A pick is a drawing part id and entity indices. Any change of the drawing
 * that this tool did not make (an undo, an AI edit, another tool) drops the
 * pick, because the indices may no longer name the same lines.
 */
import {
  deleteDrawingEntities,
  moveDrawingEntities,
  updateDrawingEntities,
  type CadDocument,
  type CadHistory,
  type DrawingEntity,
  type DrawingPart,
  type Vec3,
} from '@genoffice/cad-engine'
import { entityDistance, placeEntities } from '../measure/measure-tool'

export interface EntityPick {
  partId: string
  /** ascending entity indices of that drawing */
  indices: number[]
}

/** Text boxes are this wide per character, as a share of the text height (as the 3D view draws them). */
const TEXT_WIDTH_PER_CHAR = 0.6

/** How far the point is from a text's box (0 inside it). */
function textDistance(e: Extract<DrawingEntity, { kind: 'text' }>, p: [number, number]): number {
  const r = (-e.rotationDeg * Math.PI) / 180
  const dx = p[0] - e.at[0]
  const dy = p[1] - e.at[1]
  // the point in the text's own frame
  const x = dx * Math.cos(r) - dy * Math.sin(r)
  const y = dx * Math.sin(r) + dy * Math.cos(r)
  const w = e.height * TEXT_WIDTH_PER_CHAR * e.value.length
  const ox = x < 0 ? -x : x > w ? x - w : 0
  const oy = y < 0 ? -y : y > e.height ? y - e.height : 0
  return Math.hypot(ox, oy)
}

function distanceTo(e: DrawingEntity, p: [number, number]): number {
  return e.kind === 'text' ? textDistance(e, p) : entityDistance(e, p)
}

type History = Pick<CadHistory, 'current' | 'edit' | 'subscribe'>

export class EntityEditTool {
  readonly #history: History
  readonly #listeners = new Set<() => void>()
  #pick: EntityPick | null = null
  /** the change this tool is making: its history notice keeps the pick */
  #ownChange = false
  readonly #off: () => void

  constructor(history: History) {
    this.#history = history
    this.#off = history.subscribe(() => {
      if (this.#ownChange) return
      this.clear()
    })
  }

  pick(): EntityPick | null {
    return this.#pick
  }

  /** The picked drawing part as it is now, or null. */
  pickedPart(): DrawingPart | null {
    if (!this.#pick) return null
    const id = this.#pick.partId
    const part = this.#history.current().parts.find((p) => p.id === id)
    return part?.type === 'drawing' ? part : null
  }

  /** The picked entities as they are now (in the drawing's own frame). */
  pickedEntities(): DrawingEntity[] {
    const part = this.pickedPart()
    if (!part || !this.#pick) return []
    return this.#pick.indices.map((i) => part.entities[i]!).filter(Boolean)
  }

  /** A click at `p` (workplane millimetres); `add` (Shift/Ctrl) adds or removes one entity. */
  click(p: Vec3, reach: number, add: boolean): void {
    const hit = this.#hitAt(this.#history.current(), p, reach)
    if (!hit) {
      if (!add) this.#set(null)
      return
    }
    const current = this.#pick
    if (add && current && current.partId === hit.partId) {
      const has = current.indices.includes(hit.index)
      const indices = has
        ? current.indices.filter((i) => i !== hit.index)
        : [...current.indices, hit.index].sort((a, b) => a - b)
      this.#set(indices.length > 0 ? { partId: hit.partId, indices } : null)
      return
    }
    this.#set({ partId: hit.partId, indices: [hit.index] })
  }

  /** Forgets the pick; true when there was one. */
  clear(): boolean {
    if (!this.#pick) return false
    this.#set(null)
    return true
  }

  /** Deletes the picked entities (one undo step) and forgets them. Throws an engine refusal. */
  deletePicked(): void {
    const pick = this.#pick
    if (!pick) return
    this.#history.edit('Delete lines', (doc) =>
      deleteDrawingEntities(doc, pick.partId, pick.indices),
    )
    this.#set(null)
  }

  /** Moves the picked entities by dx, dy millimetres in the drawing's frame; they stay picked. */
  movePicked(dx: number, dy: number): void {
    const pick = this.#pick
    if (!pick || (dx === 0 && dy === 0)) return
    this.#own(() =>
      this.#history.edit('Move lines', (doc) =>
        moveDrawingEntities(doc, pick.partId, pick.indices, [dx, dy]),
      ),
    )
    this.#emit()
  }

  /** Changes the text of the one picked text entity; it stays picked. */
  setPickedText(value: string): void {
    const pick = this.#pick
    if (!pick || pick.indices.length !== 1) return
    this.#own(() =>
      this.#history.edit('Change text', (doc) =>
        updateDrawingEntities(doc, pick.partId, [{ index: pick.indices[0]!, text: value }]),
      ),
    )
    this.#emit()
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  dispose(): void {
    this.#off()
    this.#listeners.clear()
  }

  #own(run: () => void): void {
    this.#ownChange = true
    try {
      run()
    } finally {
      this.#ownChange = false
    }
  }

  #hitAt(doc: CadDocument, p: Vec3, reach: number): { partId: string; index: number } | null {
    let best: { partId: string; index: number } | null = null
    let bestDistance = reach
    for (const part of doc.parts) {
      if (part.type !== 'drawing' || part.hidden) continue
      const placed = placeEntities(part)
      placed.forEach((e, index) => {
        const d = distanceTo(e, [p[0], p[1]])
        if (d <= bestDistance) {
          best = { partId: part.id, index }
          bestDistance = d
        }
      })
    }
    return best
  }

  #set(next: EntityPick | null): void {
    this.#pick = next
    this.#emit()
  }

  #emit(): void {
    for (const listener of [...this.#listeners]) listener()
  }
}

export interface EntityEditBinding {
  /** where Delete and Esc are listened for */
  keys: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
  /** Esc with nothing picked: leave the tool */
  onExit: () => void
  /** an engine refusal of Delete (a locked drawing) */
  onRefused: (err: unknown) => void
}

/** Delete removes the pick, Esc forgets it (then leaves the tool); returns the undo of that. */
export function bindEntityEdit(tool: EntityEditTool, binding: EntityEditBinding): () => void {
  const onKey = (event: Event): void => {
    const key = (event as KeyboardEvent).key
    if (event.defaultPrevented) return
    const target = event.target as HTMLElement | null
    if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
    if (key === 'Escape') {
      if (!tool.clear()) binding.onExit()
    } else if ((key === 'Delete' || key === 'Backspace') && tool.pick()) {
      event.preventDefault()
      try {
        tool.deletePicked()
      } catch (err) {
        binding.onRefused(err)
      }
    }
  }
  binding.keys.addEventListener('keydown', onKey)
  return () => binding.keys.removeEventListener('keydown', onKey)
}
