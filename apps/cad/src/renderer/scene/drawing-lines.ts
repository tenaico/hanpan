/**
 * A DXF drawing part as polylines in the frame that holds it: lines and
 * polylines as they are, circles and arcs cut into short segments, text as the
 * outline of the box it takes (the 3D view has no font for it).
 *
 * Each polyline keeps its entity colour. White (DXF colour 7, "white on a
 * dark screen, black on paper") and entities without a colour are drawn in the
 * theme ink, so they show on both the light and the dark workplane.
 */
import {
  IDENTITY,
  applyTransform,
  compose,
  transformOf,
  type DrawingEntity,
  type DrawingPart,
  type Transform,
  type Vec3,
} from '@genoffice/cad-engine'
import type { CanvasColors } from './canvas-colors'

export interface DrawingLine {
  /** x, y, z of each point, in millimetres */
  points: number[]
  /** the entity colour (#rrggbb), or null for the theme ink */
  color: string | null
}

/** Segments of a whole circle. */
const CIRCLE_SEGMENTS = 64
/** Text boxes are this wide per character, as a share of the text height (as the engine's bounds). */
const TEXT_WIDTH_PER_CHAR = 0.6

const WHITE = '#ffffff'

/** The colour a drawing line is painted in, for this theme. */
export function lineColor(color: string | null | undefined, colors: CanvasColors): string {
  if (!color || color.toLowerCase() === WHITE) return colors.ink
  return color
}

function arcPoints(
  center: [number, number],
  radius: number,
  startDeg: number,
  sweepDeg: number,
): [number, number][] {
  const segments = Math.max(2, Math.ceil((CIRCLE_SEGMENTS * Math.abs(sweepDeg)) / 360))
  const out: [number, number][] = []
  for (let s = 0; s <= segments; s++) {
    const a = ((startDeg + (sweepDeg * s) / segments) * Math.PI) / 180
    out.push([center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)])
  }
  return out
}

/** The 2D points of one entity, in drawing order. */
function entityPoints(e: DrawingEntity): [number, number][] {
  switch (e.kind) {
    case 'line':
      return [e.a, e.b]
    case 'polyline': {
      const out: [number, number][] = []
      for (let i = 0; i + 1 < e.points.length; i += 2) out.push([e.points[i]!, e.points[i + 1]!])
      if (e.closed && out.length > 2) out.push(out[0]!)
      return out
    }
    case 'circle': {
      const ring = arcPoints(e.center, e.radius, 0, 360)
      // the last point is the first one again, exactly
      ring[ring.length - 1] = ring[0]!
      return ring
    }
    case 'arc': {
      let sweep = e.endDeg - e.startDeg
      while (sweep <= 0) sweep += 360
      return arcPoints(e.center, e.radius, e.startDeg, sweep)
    }
    case 'text': {
      const w = e.height * TEXT_WIDTH_PER_CHAR * e.value.length
      const h = e.height
      const r = (e.rotationDeg * Math.PI) / 180
      const c = Math.cos(r)
      const s = Math.sin(r)
      const corner = (x: number, y: number): [number, number] => [
        e.at[0] + x * c - y * s,
        e.at[1] + x * s + y * c,
      ]
      return [corner(0, 0), corner(w, 0), corner(w, h), corner(0, h), corner(0, 0)]
    }
  }
}

/** The part's entities as polylines; `parent` places the frame the part sits in. */
export function drawingLines(part: DrawingPart, parent: Transform = IDENTITY): DrawingLine[] {
  const tr = compose(parent, transformOf(part.position, part.rotation))
  const out: DrawingLine[] = []
  for (const entity of part.entities) {
    const flat = entityPoints(entity)
    if (flat.length < 2) continue
    const points: number[] = []
    for (const [x, y] of flat) {
      const p: Vec3 = applyTransform(tr, [x, y, 0])
      points.push(p[0], p[1], p[2])
    }
    out.push({ points, color: entity.color ?? null })
  }
  return out
}
