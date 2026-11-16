import type { DxfReadResult } from './dxf'
import { newId } from './ids'
import { DEFAULT_SOLID_COLOR } from './model'
import type { DrawingPart } from './model'

/** Segments used when a circle becomes a ring. */
const RING_SEGMENTS = 64

/** One drawing part holding everything a DXF file had, placed at the origin. */
export function drawingPartFromDxf(
  result: Extract<DxfReadResult, { status: 'ok' }>,
  name: string,
): DrawingPart {
  return {
    id: newId(),
    type: 'drawing',
    name,
    role: 'solid',
    color: DEFAULT_SOLID_COLOR,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    entities: result.entities,
  }
}

function signedArea(ring: number[]): number {
  let sum = 0
  for (let i = 0; i < ring.length; i += 2) {
    const j = (i + 2) % ring.length
    sum += ring[i]! * ring[j + 1]! - ring[j]! * ring[i + 1]!
  }
  return sum / 2
}

function reversed(ring: number[]): number[] {
  const out: number[] = []
  for (let i = ring.length - 2; i >= 0; i -= 2) out.push(ring[i]!, ring[i + 1]!)
  return out
}

/**
 * Closed outlines of a drawing as counter-clockwise rings [x0, y0, x1, y1, ...], for
 * extruding: closed polylines and circles. Lines, open polylines, arcs and text give none.
 */
export function closedOutlines(part: DrawingPart): number[][] {
  const rings: number[][] = []
  for (const entity of part.entities) {
    if (entity.kind === 'polyline' && entity.closed && entity.points.length >= 6) {
      const area = signedArea(entity.points)
      if (area > 0) rings.push(entity.points.slice())
      else if (area < 0) rings.push(reversed(entity.points))
    } else if (entity.kind === 'circle' && entity.radius > 0) {
      const ring: number[] = []
      for (let s = 0; s < RING_SEGMENTS; s++) {
        const t = (2 * Math.PI * s) / RING_SEGMENTS
        ring.push(
          entity.center[0] + entity.radius * Math.cos(t),
          entity.center[1] + entity.radius * Math.sin(t),
        )
      }
      rings.push(ring)
    }
  }
  return rings
}
