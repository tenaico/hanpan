import earcut from 'earcut'
import { CadEditError } from './model'
import type { Mesh } from './model'

/** Twice the signed area of a flat ring [x0, y0, x1, y1, ...]; positive when counter-clockwise. */
export function ringArea2(ring: readonly number[]): number {
  let sum = 0
  const n = Math.floor(ring.length / 2)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    sum += ring[i * 2]! * ring[j * 2 + 1]! - ring[j * 2]! * ring[i * 2 + 1]!
  }
  return sum
}

/**
 * Drops repeated points (a closing point equal to the first one included) and
 * points that sit exactly on the line through their neighbours. earcut drops
 * those on its own, which would leave a crack between the cap and the side.
 */
function cleanRing(ring: readonly number[]): number[] {
  const pts: [number, number][] = []
  for (let i = 0; i + 1 < ring.length; i += 2) {
    const x = ring[i]!
    const y = ring[i + 1]!
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new CadEditError('bad-number', 'ring')
    const last = pts[pts.length - 1]
    if (!last || last[0] !== x || last[1] !== y) pts.push([x, y])
  }
  while (pts.length > 1) {
    const first = pts[0]!
    const last = pts[pts.length - 1]!
    if (first[0] !== last[0] || first[1] !== last[1]) break
    pts.pop()
  }
  let changed = true
  while (changed && pts.length >= 3) {
    changed = false
    for (let i = 0; i < pts.length && pts.length >= 3; i++) {
      const prev = pts[(i + pts.length - 1) % pts.length]!
      const p = pts[i]!
      const next = pts[(i + 1) % pts.length]!
      const cross = (p[0] - prev[0]) * (next[1] - p[1]) - (p[1] - prev[1]) * (next[0] - p[0])
      if (cross === 0) {
        pts.splice(i, 1)
        changed = true
        i--
      }
    }
  }
  if (pts.length < 3) throw new CadEditError('bad-number', 'a ring needs 3 points')
  return pts.flat()
}

function reversed(ring: readonly number[]): number[] {
  const out: number[] = []
  for (let i = ring.length - 2; i >= 0; i -= 2) out.push(ring[i]!, ring[i + 1]!)
  return out
}

/** One polygon: an outer ring and its holes. */
export type Polygon = number[][]

/**
 * Extrudes polygons from z = 0 to `height`. In each polygon the first ring is
 * the outside and the rest are holes; ring direction does not matter.
 */
export function extrudePolygons(polygons: readonly Polygon[], height: number): Mesh {
  if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
    throw new CadEditError('bad-number', 'height')
  }
  const positions: number[] = []
  const indices: number[] = []
  for (const polygon of polygons) {
    if (polygon.length === 0) throw new CadEditError('bad-number', 'no rings')
    // outer counter-clockwise, holes clockwise: then every side faces outwards
    const rings = polygon.map((raw, i) => {
      const ring = cleanRing(raw)
      const ccw = ringArea2(ring) > 0
      return (i === 0) === ccw ? ring : reversed(ring)
    })
    const flat = rings.flat()
    const holes: number[] = []
    let count = 0
    for (let i = 0; i < rings.length; i++) {
      if (i > 0) holes.push(count)
      count += rings[i]!.length / 2
    }
    const base = positions.length / 3
    for (let i = 0; i < count; i++) positions.push(flat[i * 2]!, flat[i * 2 + 1]!, 0)
    for (let i = 0; i < count; i++) positions.push(flat[i * 2]!, flat[i * 2 + 1]!, height)
    const tris = earcut(flat, holes.length > 0 ? holes : null)
    for (let t = 0; t + 2 < tris.length; t += 3) {
      let a = tris[t]!
      let b = tris[t + 1]!
      const c = tris[t + 2]!
      const ax = flat[a * 2]!
      const ay = flat[a * 2 + 1]!
      const cross =
        (flat[b * 2]! - ax) * (flat[c * 2 + 1]! - ay) -
        (flat[b * 2 + 1]! - ay) * (flat[c * 2]! - ax)
      if (cross < 0) [a, b] = [b, a]
      indices.push(base + count + a, base + count + b, base + count + c) // top, facing +z
      indices.push(base + c, base + b, base + a) // bottom, facing -z
    }
    let start = 0
    for (const ring of rings) {
      const n = ring.length / 2
      for (let i = 0; i < n; i++) {
        const a = base + start + i
        const b = base + start + ((i + 1) % n)
        indices.push(a, b, b + count, a, b + count, a + count)
      }
      start += n
    }
  }
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) }
}

/** Rings [x0, y0, x1, y1, ...]: the first is the outside, the rest are holes. z runs from 0 to height. */
export function extrudeMesh(rings: number[][], height: number): Mesh {
  if (rings.length === 0) throw new CadEditError('bad-number', 'no rings')
  return extrudePolygons([rings], height)
}
