import { applyTransform, transformOf } from './geometry'
import { meshBounds, triangleCount } from './mesh'
import type { DrawingEntity, DrawingPart, Mesh, Vec3 } from './model'

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
}

export interface SnapPoint {
  at: Vec3
  kind: 'vertex' | 'end' | 'center' | 'mid'
}

function flatPoints(points: readonly number[]): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i + 1 < points.length; i += 2) out.push([points[i]!, points[i + 1]!])
  return out
}

function entitySnaps(e: DrawingEntity): { at: [number, number]; kind: SnapPoint['kind'] }[] {
  switch (e.kind) {
    case 'line':
      return [
        { at: e.a, kind: 'end' },
        { at: e.b, kind: 'end' },
        { at: [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2], kind: 'mid' },
      ]
    case 'polyline':
      return flatPoints(e.points).map((at) => ({ at, kind: 'vertex' as const }))
    case 'circle':
      return [{ at: e.center, kind: 'center' }]
    case 'arc': {
      const rad = Math.PI / 180
      const end = (deg: number): [number, number] => [
        e.center[0] + e.radius * Math.cos(deg * rad),
        e.center[1] + e.radius * Math.sin(deg * rad),
      ]
      return [
        { at: e.center, kind: 'center' },
        { at: end(e.startDeg), kind: 'end' },
        { at: end(e.endDeg), kind: 'end' },
      ]
    }
    case 'text':
      return []
  }
}

/** Points a measuring click can stick to, placed where the drawing sits on the workplane. */
export function snapPointsOfDrawing(part: DrawingPart): SnapPoint[] {
  const tr = transformOf(part.position, part.rotation)
  return part.entities.flatMap(entitySnaps).map((s) => ({
    at: applyTransform(tr, [s.at[0], s.at[1], 0]),
    kind: s.kind,
  }))
}

/** Each distinct vertex once; above `limit` an even sample of them. */
export function snapPointsOfMesh(mesh: Mesh, limit = 5000): SnapPoint[] {
  const seen = new Set<string>()
  const unique: Vec3[] = []
  const p = mesh.positions
  for (let i = 0; i + 2 < p.length; i += 3) {
    const v: Vec3 = [p[i]!, p[i + 1]!, p[i + 2]!]
    const key = v.join(',')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(v)
  }
  const step = unique.length > limit ? unique.length / limit : 1
  const out: SnapPoint[] = []
  for (let k = 0; out.length < Math.min(limit, unique.length); k++) {
    out.push({ at: unique[Math.floor(k * step)]!, kind: 'vertex' })
  }
  return out
}

export function nearestSnap(
  points: readonly SnapPoint[],
  to: Vec3,
  within: number,
): SnapPoint | null {
  let best: SnapPoint | null = null
  let bestDistance = within
  for (const p of points) {
    const d = distance(p.at, to)
    if (d <= bestDistance) {
      best = p
      bestDistance = d
    }
  }
  return best
}

function pathLength(points: [number, number][], closed: boolean): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) {
    sum += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1])
  }
  if (closed && points.length > 2) {
    const first = points[0]!
    const last = points[points.length - 1]!
    sum += Math.hypot(first[0] - last[0], first[1] - last[1])
  }
  return sum
}

/** What clicking one drawing entity reports: a length, a diameter, or nothing for text. */
export function entityMeasure(
  entity: DrawingEntity,
): { kind: 'length' | 'diameter'; value: number } | null {
  switch (entity.kind) {
    case 'line':
      return { kind: 'length', value: pathLength([entity.a, entity.b], false) }
    case 'polyline':
      return { kind: 'length', value: pathLength(flatPoints(entity.points), entity.closed) }
    case 'circle':
    case 'arc':
      return { kind: 'diameter', value: entity.radius * 2 }
    case 'text':
      return null
  }
}

/** Overall width (x), depth (y) and height (z) of an evaluated part, or null when it has no mesh. */
export function partSize(evaluated: {
  mesh: Mesh | null
}): { width: number; depth: number; height: number } | null {
  if (!evaluated.mesh || triangleCount(evaluated.mesh) === 0) return null
  const b = meshBounds(evaluated.mesh)
  return { width: b.max[0] - b.min[0], depth: b.max[1] - b.min[1], height: b.max[2] - b.min[2] }
}

/** At most two decimals, no trailing zeros: 12, 12.5, 12.35. */
export function formatMm(value: number): string {
  const rounded = Math.round(value * 100) / 100
  if (rounded === 0) return '0'
  return String(rounded)
}
