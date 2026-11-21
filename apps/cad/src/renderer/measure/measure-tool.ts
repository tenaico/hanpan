/**
 * The measuring tool: two clicks read the distance between two points, a
 * click on a DXF line reads its length and a click on a DXF circle or arc
 * reads its diameter. The engine does the measuring (`distance`,
 * `entityMeasure`, `formatMm`) and gives the points a click sticks to
 * (`snapPointsOfMesh`, `snapPointsOfDrawing`); this file only keeps the state
 * of one measurement and tells the screen when it changes.
 *
 * A reading belongs to the drawing as it was when it was taken, so any change
 * of the drawing (an edit, an undo, an AI edit) clears it, and so does Esc
 * (`bindMeasure`). Nothing here changes the document.
 */
import {
  applyTransform,
  distance,
  entityMeasure,
  formatMm,
  nearestSnap,
  snapPointsOfDrawing,
  snapPointsOfMesh,
  transformOf,
  type CadDocument,
  type CadHistory,
  type DrawingEntity,
  type DrawingPart,
  type EvaluatedPart,
  type SnapPoint,
  type Vec3,
} from '@genoffice/cad-engine'

export interface MeasureReading {
  a: Vec3
  b: Vec3
  /** millimetres: the distance, the line's length or the circle's diameter */
  length: number
  kind: 'distance' | 'length' | 'diameter'
  /** "80 mm", or "⌀50 mm" for a diameter */
  label: string
}

/** How far from a click (in millimetres) a snap point or a line still counts, when the view gives none. */
export const DEFAULT_REACH_MM = 1
/** A drawing entity is only hit by clicks this close to the workplane, in millimetres. */
const PLATE_SLACK_MM = 0.5

/** The visible top-level drawings' entities, moved to where each drawing sits on the workplane. */
export function measureEntities(doc: CadDocument): DrawingEntity[] {
  return doc.parts
    .filter((p): p is DrawingPart => p.type === 'drawing' && !p.hidden)
    .flatMap(placeEntities)
}

export function placeEntities(part: DrawingPart): DrawingEntity[] {
  const tr = transformOf(part.position, part.rotation)
  const at = (p: [number, number]): [number, number] => {
    const r = applyTransform(tr, [p[0], p[1], 0])
    return [r[0], r[1]]
  }
  const turn = part.rotation[2]
  return part.entities.map((e): DrawingEntity => {
    switch (e.kind) {
      case 'line':
        return { ...e, a: at(e.a), b: at(e.b) }
      case 'polyline': {
        const points: number[] = []
        for (let i = 0; i + 1 < e.points.length; i += 2) {
          const q = at([e.points[i]!, e.points[i + 1]!])
          points.push(q[0], q[1])
        }
        return { ...e, points }
      }
      case 'circle':
        return { ...e, center: at(e.center) }
      case 'arc':
        return { ...e, center: at(e.center), startDeg: e.startDeg + turn, endDeg: e.endDeg + turn }
      case 'text':
        return { ...e, at: at(e.at) }
    }
  })
}

/**
 * The most snap points all visible drawings give together. A large DXF (tens
 * of thousands of lines, three points each) is sampled evenly down to this,
 * like a mesh is sampled down to 5000 corners, so a click never searches
 * millions of points and the list stays a few megabytes.
 */
export const DRAWING_SNAP_LIMIT = 200_000

/**
 * The points a click sticks to: the corners of every visible top-level
 * result (at most 5000 per part) and the ends, corners and centres of the
 * visible top-level drawings (at most `DRAWING_SNAP_LIMIT` together, an even
 * sample above that). Points are appended one by one: spreading a list of
 * 100,000+ points into `push` overflows the call stack.
 */
export function measureSnaps(
  doc: CadDocument,
  evaluated: readonly Pick<EvaluatedPart, 'id' | 'mesh'>[],
): SnapPoint[] {
  const visible = new Set(doc.parts.filter((p) => !p.hidden).map((p) => p.id))
  const out: SnapPoint[] = []
  for (const result of evaluated) {
    if (!visible.has(result.id) || !result.mesh) continue
    for (const s of snapPointsOfMesh(result.mesh)) out.push(s)
  }
  const drawing: SnapPoint[] = []
  for (const part of doc.parts) {
    if (part.type !== 'drawing' || part.hidden) continue
    for (const s of snapPointsOfDrawing(part)) drawing.push(s)
  }
  const step = drawing.length > DRAWING_SNAP_LIMIT ? drawing.length / DRAWING_SNAP_LIMIT : 1
  const keep = Math.min(DRAWING_SNAP_LIMIT, drawing.length)
  for (let k = 0; k < keep; k++) out.push(drawing[Math.floor(k * step)]!)
  return out
}

function segmentDistance(p: [number, number], a: [number, number], b: [number, number]): number {
  const ux = b[0] - a[0]
  const uy = b[1] - a[1]
  const uu = ux * ux + uy * uy
  const s = uu > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * ux + (p[1] - a[1]) * uy) / uu)) : 0
  return Math.hypot(p[0] - (a[0] + s * ux), p[1] - (a[1] + s * uy))
}

/** True when the angle (degrees) lies on the arc that runs counter-clockwise from start to end. */
function onArc(deg: number, start: number, end: number): boolean {
  const norm = (d: number): number => ((d % 360) + 360) % 360
  const sweep = norm(end - start) || 360
  return norm(deg - start) <= sweep
}

/** How far the point lies from the entity's line work, in the workplane. */
export function entityDistance(e: DrawingEntity, p: [number, number]): number {
  switch (e.kind) {
    case 'line':
      return segmentDistance(p, e.a, e.b)
    case 'polyline': {
      let best = Infinity
      const n = Math.floor(e.points.length / 2)
      const pt = (i: number): [number, number] => [e.points[2 * i]!, e.points[2 * i + 1]!]
      for (let i = 1; i < n; i++) best = Math.min(best, segmentDistance(p, pt(i - 1), pt(i)))
      if (e.closed && n > 2) best = Math.min(best, segmentDistance(p, pt(n - 1), pt(0)))
      return best
    }
    case 'circle':
      return Math.abs(Math.hypot(p[0] - e.center[0], p[1] - e.center[1]) - e.radius)
    case 'arc': {
      const deg = (Math.atan2(p[1] - e.center[1], p[0] - e.center[0]) * 180) / Math.PI
      if (!onArc(deg, e.startDeg, e.endDeg)) return Infinity
      return Math.abs(Math.hypot(p[0] - e.center[0], p[1] - e.center[1]) - e.radius)
    }
    case 'text':
      return Infinity
  }
}

/** The two points a reading of a whole entity is drawn between. */
function entityEnds(e: DrawingEntity): [Vec3, Vec3] {
  switch (e.kind) {
    case 'line':
      return [
        [e.a[0], e.a[1], 0],
        [e.b[0], e.b[1], 0],
      ]
    case 'polyline': {
      const n = e.points.length
      return [
        [e.points[0] ?? 0, e.points[1] ?? 0, 0],
        [e.points[n - 2] ?? 0, e.points[n - 1] ?? 0, 0],
      ]
    }
    case 'circle':
    case 'arc':
      // across the middle, left to right
      return [
        [e.center[0] - e.radius, e.center[1], 0],
        [e.center[0] + e.radius, e.center[1], 0],
      ]
    case 'text':
      return [
        [e.at[0], e.at[1], 0],
        [e.at[0], e.at[1], 0],
      ]
  }
}

export const lengthLabel = (mm: number): string => `${formatMm(mm)} mm`
export const diameterLabel = (mm: number): string => `⌀${formatMm(mm)} mm`

export class MeasureTool {
  readonly #snaps: () => readonly SnapPoint[]
  readonly #entities: () => readonly DrawingEntity[]
  readonly #listeners = new Set<() => void>()
  #first: Vec3 | null = null
  #reading: MeasureReading | null = null
  #hover: SnapPoint | null = null

  constructor(
    snaps: () => readonly SnapPoint[],
    entities: () => readonly DrawingEntity[] = () => [],
  ) {
    this.#snaps = snaps
    this.#entities = entities
  }

  /** The point the first click stuck to, while the second is awaited. */
  first(): Vec3 | null {
    return this.#first
  }

  reading(): MeasureReading | null {
    return this.#reading
  }

  /** The snap point under the pointer now, for the marker. */
  hovered(): SnapPoint | null {
    return this.#hover
  }

  /** The pointer is over `p`: the snap point a click there would stick to, or null. */
  hover(p: Vec3, within = DEFAULT_REACH_MM): SnapPoint | null {
    const next = nearestSnap(this.#snaps(), p, within)
    const same =
      next === this.#hover ||
      (next !== null && this.#hover !== null && next.at.every((v, i) => v === this.#hover!.at[i]))
    if (!same) {
      this.#hover = next
      this.#emit()
    }
    return next
  }

  /**
   * A click at `p`. The first click of a measurement keeps its point (or, on
   * a DXF line, circle or arc away from any corner, reads that entity at
   * once); the second reads the distance. The click after a reading starts a
   * new measurement.
   */
  click(p: Vec3, within = DEFAULT_REACH_MM): MeasureReading | null {
    const snap = nearestSnap(this.#snaps(), p, within)
    const point: Vec3 = snap ? [...snap.at] : [...p]
    if (this.#first === null) {
      // a corner or an end stays a point to measure from; elsewhere a line work click reads it
      const corner = snap !== null && (snap.kind === 'vertex' || snap.kind === 'end')
      const entity = corner ? null : this.#entityAt(p, within)
      if (entity) {
        this.#reading = entity
        this.#emit()
        return entity
      }
      this.#first = point
      this.#reading = null
      this.#emit()
      return null
    }
    const length = distance(this.#first, point)
    const reading: MeasureReading = {
      a: this.#first,
      b: point,
      length,
      kind: 'distance',
      label: lengthLabel(length),
    }
    this.#first = null
    this.#reading = reading
    this.#emit()
    return reading
  }

  /** Forgets the measurement; true when there was something to forget. */
  clear(): boolean {
    const had = this.#first !== null || this.#reading !== null
    this.#first = null
    this.#reading = null
    if (had) this.#emit()
    return had
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  #entityAt(p: Vec3, within: number): MeasureReading | null {
    if (Math.abs(p[2]) > Math.max(within, PLATE_SLACK_MM)) return null
    let best: DrawingEntity | null = null
    let bestDistance = within
    for (const e of this.#entities()) {
      const d = entityDistance(e, [p[0], p[1]])
      if (d <= bestDistance) {
        best = e
        bestDistance = d
      }
    }
    if (!best) return null
    const measured = entityMeasure(best)
    if (!measured) return null
    const [a, b] = entityEnds(best)
    return {
      a,
      b,
      length: measured.value,
      kind: measured.kind,
      label:
        measured.kind === 'diameter' ? diameterLabel(measured.value) : lengthLabel(measured.value),
    }
  }

  #emit(): void {
    for (const listener of [...this.#listeners]) listener()
  }
}

export interface MeasureBinding {
  /** every change of the drawing clears the reading */
  history: Pick<CadHistory, 'subscribe'>
  /** where Esc is listened for */
  keys: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
  /** Esc with nothing left to clear: leave the tool */
  onExit: () => void
}

/** Clears the tool on every change of the drawing and on Esc; returns the undo of that. */
export function bindMeasure(tool: MeasureTool, binding: MeasureBinding): () => void {
  const offHistory = binding.history.subscribe(() => tool.clear())
  const onKey = (event: Event): void => {
    if ((event as KeyboardEvent).key !== 'Escape' || event.defaultPrevented) return
    // Esc in a field (the property panel) puts the field back; it is not for the tool
    const target = event.target as HTMLElement | null
    if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
    if (!tool.clear()) binding.onExit()
  }
  binding.keys.addEventListener('keydown', onKey)
  return () => {
    offHistory()
    binding.keys.removeEventListener('keydown', onKey)
  }
}
