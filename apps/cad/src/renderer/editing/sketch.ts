import {
  CadEditError,
  DEFAULT_SOLID_COLOR,
  MAX_SIZE_MM,
  MIN_SIZE_MM,
  newId,
  ringArea2,
} from '@genoffice/cad-engine'
import type { ExtrudePart } from '@genoffice/cad-engine'

export type SketchCloseResult =
  { ok: true; ring: number[] } | { ok: false; reason: 'too-few' | 'self-crossing' }

type Point = [number, number]

/** Snaps one coordinate to the grid; never gives -0. */
function snap(value: number, grid: number): number {
  const out = grid > 0 ? Math.round(value / grid) * grid : value
  return out === 0 ? 0 : out
}

function same(a: Point, b: Point): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

/** Sign of the turn a -> b -> c: positive counter-clockwise, 0 on one line. */
function orient(a: Point, b: Point, c: Point): number {
  return Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
}

/** True when c lies on the segment a-b, given that the three are on one line. */
function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    Math.min(a[0], b[0]) <= c[0] &&
    c[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= c[1] &&
    c[1] <= Math.max(a[1], b[1])
  )
}

/** True when the closed segments p1-p2 and q1-q2 share any point (touching counts). */
function segmentsMeet(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const o1 = orient(p1, p2, q1)
  const o2 = orient(p1, p2, q2)
  const o3 = orient(q1, q2, p1)
  const o4 = orient(q1, q2, p2)
  if (o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) return true
  return (
    (o1 === 0 && onSegment(p1, p2, q1)) ||
    (o2 === 0 && onSegment(p1, p2, q2)) ||
    (o3 === 0 && onSegment(q1, q2, p1)) ||
    (o4 === 0 && onSegment(q1, q2, p2))
  )
}

/**
 * True when the closed outline is not a simple polygon: two edges that do not
 * share a corner meet anywhere, or an edge turns straight back over the one
 * before it.
 */
function selfCrossing(pts: readonly Point[]): boolean {
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % n]!
    const c = pts[(i + 2) % n]!
    // neighbouring edges: they share b, so they only fail by folding back
    if (
      orient(a, b, c) === 0 &&
      (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) < 0
    ) {
      return true
    }
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue // the closing edge is a neighbour of the first
      if (segmentsMeet(a, b, pts[j]!, pts[(j + 1) % n]!)) return true
    }
  }
  return false
}

/**
 * Draws an outline on the workplane, point by point, for an extruded part.
 * Points are in millimetres on the workplane and snap to the grid. The tool
 * holds no document: the screen adds the part from `toPart` with one edit.
 */
export class SketchTool {
  private readonly grid: number
  private pts: Point[] = []
  private readonly listeners = new Set<() => void>()

  constructor(grid: number) {
    this.grid = Number.isFinite(grid) && grid > 0 ? grid : 0
  }

  /** Adds a point snapped to the grid; a point equal to the last one is ignored. */
  addPoint(p: [number, number]): void {
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) return
    const next: Point = [snap(p[0], this.grid), snap(p[1], this.grid)]
    const last = this.pts[this.pts.length - 1]
    if (last && same(last, next)) return
    this.pts = [...this.pts, next]
    this.changed()
  }

  points(): readonly [number, number][] {
    return this.pts
  }

  undoPoint(): void {
    if (this.pts.length === 0) return
    this.pts = this.pts.slice(0, -1)
    this.changed()
  }

  cancel(): void {
    if (this.pts.length === 0) return
    this.pts = []
    this.changed()
  }

  /**
   * The outline as a counter-clockwise ring [x0, y0, x1, y1, ...], or why it
   * cannot make a solid. The points stay, so a refused outline can be fixed
   * with undoPoint.
   */
  close(): SketchCloseResult {
    const pts = [...this.pts]
    // a last click back on the first point closes the outline
    while (pts.length > 1 && same(pts[0]!, pts[pts.length - 1]!)) pts.pop()
    const distinct = new Set(pts.map((p) => `${p[0]},${p[1]}`))
    // points that all sit on one line enclose nothing, however many there are
    if (distinct.size < 3 || pts.every((p) => orient(pts[0]!, pts[1]!, p) === 0)) {
      return { ok: false, reason: 'too-few' }
    }
    if (selfCrossing(pts)) return { ok: false, reason: 'self-crossing' }
    const ring = pts.flat()
    if (ringArea2(ring) > 0) return { ok: true, ring }
    const reversed: number[] = []
    for (let i = pts.length - 1; i >= 0; i--) reversed.push(pts[i]![0], pts[i]![1])
    return { ok: true, ring: reversed }
  }

  /** A new solid extruded from z = 0 to `heightMm`; refuses an unusable height with 'bad-number'. */
  toPart(ring: number[], heightMm: number): ExtrudePart {
    if (
      typeof heightMm !== 'number' ||
      !Number.isFinite(heightMm) ||
      heightMm < MIN_SIZE_MM ||
      heightMm > MAX_SIZE_MM
    ) {
      throw new CadEditError('bad-number', 'height')
    }
    return {
      id: newId(),
      type: 'extrude',
      name: 'sketch',
      role: 'solid',
      color: DEFAULT_SOLID_COLOR,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      hidden: false,
      locked: false,
      rings: [[...ring]],
      height: heightMm,
    }
  }

  /** Calls `listener` after every change of the points; returns the unsubscribe. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private changed(): void {
    for (const listener of [...this.listeners]) listener()
  }
}
