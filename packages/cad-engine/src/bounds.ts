import { applyTransform, compose, IDENTITY, transformOf } from './geometry'
import type { Transform } from './geometry'
import { meshBounds } from './mesh'
import type { DrawingEntity, Part, ShapePart, Vec3 } from './model'

export interface Box3 {
  min: Vec3
  max: Vec3
}

function ringBox(rings: readonly number[][]): { min: [number, number]; max: [number, number] } {
  const min: [number, number] = [Infinity, Infinity]
  const max: [number, number] = [-Infinity, -Infinity]
  for (const ring of rings) {
    for (let i = 0; i + 1 < ring.length; i += 2) {
      min[0] = Math.min(min[0], ring[i]!)
      min[1] = Math.min(min[1], ring[i + 1]!)
      max[0] = Math.max(max[0], ring[i]!)
      max[1] = Math.max(max[1], ring[i + 1]!)
    }
  }
  if (!Number.isFinite(min[0])) return { min: [0, 0], max: [0, 0] }
  return { min, max }
}

function shapeBox(part: ShapePart): Box3 {
  const d = part.dims
  const half = (w: number, dep: number, h: number): Box3 => ({
    min: [-w / 2, -dep / 2, 0],
    max: [w / 2, dep / 2, h],
  })
  switch (part.shape) {
    case 'box':
    case 'pyramid':
    case 'wedge':
    case 'triPrism':
    case 'roundedBox':
    case 'roof':
      return half(d.width!, d.depth!, d.height!)
    case 'cylinder':
    case 'cone':
      return half(d.diameter!, d.diameter!, d.height!)
    case 'sphere':
      return half(d.diameter!, d.diameter!, d.diameter!)
    case 'hemisphere':
      return half(d.diameter!, d.diameter!, d.diameter! / 2)
    case 'tube':
      return half(d.outerDiameter!, d.outerDiameter!, d.height!)
    case 'torus':
      return half(d.diameter!, d.diameter!, d.tubeDiameter!)
    case 'hexPrism':
      // corners at 0°, 60°, ...: full width across corners on x, across flats on y
      return half(d.diameter!, (d.diameter! * Math.sqrt(3)) / 2, d.height!)
    case 'starPrism':
      // a box around the outer circle; slightly larger than the star itself
      return half(d.outerDiameter!, d.outerDiameter!, d.height!)
    case 'text': {
      const r = ringBox(part.text?.outlines ?? [])
      return { min: [r.min[0], r.min[1], 0], max: [r.max[0], r.max[1], d.height!] }
    }
  }
}

function entityPoints(e: DrawingEntity): [number, number][] {
  switch (e.kind) {
    case 'line':
      return [e.a, e.b]
    case 'polyline': {
      const out: [number, number][] = []
      for (let i = 0; i + 1 < e.points.length; i += 2) out.push([e.points[i]!, e.points[i + 1]!])
      return out
    }
    case 'circle':
    case 'arc':
      return [
        [e.center[0] - e.radius, e.center[1] - e.radius],
        [e.center[0] + e.radius, e.center[1] + e.radius],
      ]
    case 'text':
      return [e.at, [e.at[0] + e.height * 0.6 * e.value.length, e.at[1] + e.height]]
  }
}

/** The part box in its own frame (before its position and rotation). Groups are handled by worldBounds. */
export function localBounds(part: Exclude<Part, { type: 'group' }>): Box3 {
  switch (part.type) {
    case 'shape':
      return shapeBox(part)
    case 'extrude': {
      const r = ringBox(part.rings.slice(0, 1))
      return { min: [r.min[0], r.min[1], 0], max: [r.max[0], r.max[1], part.height] }
    }
    case 'mesh':
      return meshBounds(part.mesh)
    case 'drawing': {
      const pts = part.entities.flatMap(entityPoints)
      const r = ringBox([pts.flat()])
      return { min: [r.min[0], r.min[1], 0], max: [r.max[0], r.max[1], 0] }
    }
  }
}

function corners(box: Box3): Vec3[] {
  const out: Vec3[] = []
  for (const x of [box.min[0], box.max[0]])
    for (const y of [box.min[1], box.max[1]])
      for (const z of [box.min[2], box.max[2]]) out.push([x, y, z])
  return out
}

function grow(into: Box3, p: Vec3): void {
  for (let k = 0; k < 3; k++) {
    if (p[k]! < into.min[k]!) into.min[k] = p[k]!
    if (p[k]! > into.max[k]!) into.max[k] = p[k]!
  }
}

/**
 * The axis-aligned box of a part in the frame that holds it (`parent` places
 * that frame). A group box is the union of its children boxes, each turned with
 * its own and every enclosing rotation, so ungrouping never moves the result.
 */
export function worldBounds(part: Part, parent: Transform = IDENTITY): Box3 {
  const tr = compose(parent, transformOf(part.position, part.rotation))
  const out: Box3 = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  if (part.type === 'group') {
    for (const child of part.children) {
      const b = worldBounds(child, tr)
      grow(out, b.min)
      grow(out, b.max)
    }
  } else {
    for (const c of corners(localBounds(part))) grow(out, applyTransform(tr, c))
  }
  if (!Number.isFinite(out.min[0])) return { min: [...tr.t], max: [...tr.t] }
  return out
}
