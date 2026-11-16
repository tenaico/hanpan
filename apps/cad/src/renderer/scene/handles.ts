/**
 * One drag of a move, rotate or size handle, without three.js.
 *
 * While the pointer is down only the screen moves: `preview` snaps what the
 * handle reports and hands back what to show, and the document is not
 * touched. On release `commit` gives the one change for `history.edit`, so a
 * drag is exactly one undo step. Esc, a lost pointer or a window switch call
 * `cancel`, which leaves no step at all (apps/cad plan, Review Focus 1).
 *
 * What a part cannot do is refused when the drag starts: a locked part with
 * the engine's own `locked` error, and the size handle on anything but a
 * shape with plain dimensions (meshes, drawings, groups, extrusions and text
 * are moved and turned only).
 *
 * Snapping: moves in whole millimetres, turns in 15° steps, sizes in whole
 * millimetres. Holding Alt turns snapping off.
 */
import {
  CadEditError,
  SHAPE_DIMS,
  applyMat,
  eulerFromMatrix,
  findPart,
  moveParts,
  mulMat,
  rotationMatrix,
  tidyVec,
  updatePart,
  worldBounds,
  type CadDocument,
  type Part,
  type ShapeKind,
  type ShapePart,
  type Vec3,
} from '@genoffice/cad-engine'

export type HandleMode = 'move' | 'rotate' | 'scale'

/** What the handle did since the drag began, in the frame of the view. */
export interface HandleDelta {
  /** millimetres along x, y, z */
  move?: Vec3
  /** degrees about the world x, y, z axes through the pivot (applied x, then y, then z) */
  rotate?: Vec3
  /** factors along the part's own x, y, z axes */
  scale?: Vec3
}

export interface PreviewOptions {
  /** snap to the grid and the angle steps; off while Alt is held */
  snap?: boolean
}

export type DocChange = (doc: CadDocument) => CadDocument

export const MOVE_SNAP_MM = 1
export const ROTATE_SNAP_DEG = 15
export const SIZE_SNAP_MM = 1

/** The size handle was refused for a part that has no dimensions to change. */
export class HandleRefusedError extends Error {
  readonly code = 'not-scalable'
  readonly partId: string
  constructor(partId: string) {
    super(`not-scalable: ${partId}`)
    this.name = 'HandleRefusedError'
    this.partId = partId
  }
}

type Axis = 'x' | 'y' | 'z' | 'xy' | 'xyz'

/**
 * Which handle axis each dimension follows. A round section (`xy`) or a ball
 * (`xyz`) stays round: the axis dragged furthest decides. Dimensions not
 * listed (a rounded box's radius, a star's point count) stay as they are.
 */
const DIM_AXES: Record<Exclude<ShapeKind, 'text'>, Record<string, Axis>> = {
  box: { width: 'x', depth: 'y', height: 'z' },
  pyramid: { width: 'x', depth: 'y', height: 'z' },
  wedge: { width: 'x', depth: 'y', height: 'z' },
  triPrism: { width: 'x', depth: 'y', height: 'z' },
  roof: { width: 'x', depth: 'y', height: 'z' },
  roundedBox: { width: 'x', depth: 'y', height: 'z' },
  cylinder: { diameter: 'xy', height: 'z' },
  cone: { diameter: 'xy', height: 'z' },
  hexPrism: { diameter: 'xy', height: 'z' },
  sphere: { diameter: 'xyz' },
  hemisphere: { diameter: 'xyz' },
  tube: { outerDiameter: 'xy', innerDiameter: 'xy', height: 'z' },
  torus: { diameter: 'xy', tubeDiameter: 'z' },
  starPrism: { outerDiameter: 'xy', innerDiameter: 'xy', height: 'z' },
}

function scalable(part: Part): part is ShapePart & { shape: Exclude<ShapeKind, 'text'> } {
  // text is sized from its font outlines, which the size handle cannot redraw
  return part.type === 'shape' && part.shape !== 'text'
}

/** The factor furthest from 1 (a drag that shrinks counts as much as one that grows). */
function furthest(...factors: number[]): number {
  let best = 1
  for (const f of factors) {
    if (f > 0 && Math.abs(Math.log(f)) > Math.abs(Math.log(best))) best = f
  }
  return best
}

function axisFactor(axis: Axis, f: Vec3): number {
  switch (axis) {
    case 'x':
      return f[0]
    case 'y':
      return f[1]
    case 'z':
      return f[2]
    case 'xy':
      return furthest(f[0], f[1])
    case 'xyz':
      return furthest(f[0], f[1], f[2])
  }
}

/** New dimensions for factors `f`, and the factors that shows on screen per axis. */
function scaledDims(
  part: ShapePart & { shape: Exclude<ShapeKind, 'text'> },
  f: Vec3,
  snap: boolean,
): { dims: Record<string, number>; shown: Vec3 } {
  const axes = DIM_AXES[part.shape]
  const dims: Record<string, number> = { ...part.dims }
  const shown: Vec3 = [1, 1, 1]
  const lead: [boolean, boolean, boolean] = [false, false, false]
  for (const name of SHAPE_DIMS[part.shape]) {
    const axis = axes[name]
    const old = part.dims[name]
    if (!axis || old === undefined) continue
    let next = old * axisFactor(axis, f)
    if (snap) next = Math.max(SIZE_SNAP_MM, Math.round(next / SIZE_SNAP_MM) * SIZE_SNAP_MM)
    dims[name] = next
    // the first dimension along an axis decides what the screen shows for it
    for (const k of [0, 1, 2] as const) {
      if (!lead[k] && axis.includes('xyz'[k]!)) {
        lead[k] = true
        shown[k] = next / old
      }
    }
  }
  return { dims, shown }
}

function roundTo(value: number, step: number): number {
  const r = Math.round(value / step) * step
  return Object.is(r, -0) ? 0 : r
}

const isZero = (v: Vec3): boolean => v[0] === 0 && v[1] === 0 && v[2] === 0

export class HandleSession {
  readonly #doc: () => CadDocument
  #ids: string[] | null = null
  #mode: HandleMode = 'move'
  #pivot: Vec3 = [0, 0, 0]
  #delta: HandleDelta = {}
  #snap = true

  /** `doc` reads the document as it is now (the history's current one). */
  constructor(doc: () => CadDocument) {
    this.#doc = doc
  }

  /** A drag is under way. */
  get active(): boolean {
    return this.#ids !== null
  }

  get mode(): HandleMode {
    return this.#mode
  }

  /**
   * Starts a drag of top-level parts. Throws the engine's `CadEditError`
   * (`locked`, `unknown-id`, `too-few`) or `HandleRefusedError` and stays idle
   * when the parts cannot be changed that way.
   */
  begin(ids: readonly string[], mode: HandleMode, pivot?: Vec3): void {
    this.#ids = null
    const doc = this.#doc()
    if (ids.length === 0) throw new CadEditError('too-few')
    const parts: Part[] = []
    for (const id of ids) {
      const part = doc.parts.find((p) => p.id === id)
      if (!part) throw new CadEditError('unknown-id', id)
      // the engine's own check: a locked part refuses any change of place or size
      updatePart(doc, id, { position: part.position })
      if (mode === 'scale' && !scalable(part)) throw new HandleRefusedError(id)
      parts.push(part)
    }
    this.#pivot = pivot ? [...pivot] : defaultPivot(parts)
    this.#mode = mode
    this.#delta = {}
    this.#snap = true
    this.#ids = [...ids]
  }

  /** What the handle did so far; returns the snapped amount the screen should show. */
  preview(delta: HandleDelta, options: PreviewOptions = {}): HandleDelta {
    if (!this.#ids) return {}
    const snap = options.snap ?? true
    this.#snap = snap
    switch (this.#mode) {
      case 'move': {
        const m = delta.move ?? [0, 0, 0]
        this.#delta = {
          move: snap ? ([0, 1, 2].map((k) => roundTo(m[k]!, MOVE_SNAP_MM)) as Vec3) : [...m],
        }
        return { move: [...this.#delta.move!] }
      }
      case 'rotate': {
        const r = delta.rotate ?? [0, 0, 0]
        this.#delta = {
          rotate: snap ? ([0, 1, 2].map((k) => roundTo(r[k]!, ROTATE_SNAP_DEG)) as Vec3) : [...r],
        }
        return { rotate: [...this.#delta.rotate!] }
      }
      case 'scale': {
        const f = delta.scale ?? [1, 1, 1]
        this.#delta = { scale: [...f] }
        const first = this.#doc().parts.find((p) => p.id === this.#ids![0])
        if (!first || !scalable(first)) return { scale: [1, 1, 1] }
        return { scale: scaledDims(first, f, snap).shown }
      }
    }
  }

  /** Ends the drag; the one change to record, or null when nothing would change. */
  commit(): DocChange | null {
    const ids = this.#ids
    if (!ids) return null
    this.#ids = null
    const delta = this.#delta
    const pivot = this.#pivot
    const snap = this.#snap
    switch (this.#mode) {
      case 'move': {
        const d = delta.move
        if (!d || isZero(d)) return null
        return (doc) => moveParts(doc, ids, d)
      }
      case 'rotate': {
        const r = delta.rotate
        if (!r || isZero(r)) return null
        const turn = rotationMatrix(r)
        return (doc) => {
          let out = doc
          for (const id of ids) {
            const part = findPart(out, id)
            if (!part) throw new CadEditError('unknown-id', id)
            const rel: Vec3 = [
              part.position[0] - pivot[0],
              part.position[1] - pivot[1],
              part.position[2] - pivot[2],
            ]
            const moved = applyMat(turn, rel)
            out = updatePart(out, id, {
              position: tidyVec([moved[0] + pivot[0], moved[1] + pivot[1], moved[2] + pivot[2]]),
              rotation: eulerFromMatrix(mulMat(turn, rotationMatrix(part.rotation))),
            })
          }
          return out
        }
      }
      case 'scale': {
        const f = delta.scale
        if (!f) return null
        const doc = this.#doc()
        const changes = ids.flatMap((id) => {
          const part = doc.parts.find((p) => p.id === id)
          if (!part || !scalable(part)) return []
          const { dims } = scaledDims(part, f, snap)
          const same = Object.keys(dims).every((k) => dims[k] === part.dims[k])
          return same ? [] : [{ id, dims }]
        })
        if (changes.length === 0) return null
        return (current) =>
          changes.reduce((out, { id, dims }) => updatePart(out, id, { dims }), current)
      }
    }
  }

  /** Drops the drag: nothing is recorded and the screen goes back to the document. */
  cancel(): void {
    this.#ids = null
    this.#delta = {}
  }
}

/** One part turns about its own origin; several about the middle of their box. */
function defaultPivot(parts: readonly Part[]): Vec3 {
  if (parts.length === 1) return [...parts[0]!.position]
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const part of parts) {
    const b = worldBounds(part)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, b.min[k]!)
      max[k] = Math.max(max[k]!, b.max[k]!)
    }
  }
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
}
