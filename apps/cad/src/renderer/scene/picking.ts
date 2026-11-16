/**
 * Which part a click lands on: the nearest top-level item along the ray from
 * the camera through the pointer. Items are top-level parts, so a click on a
 * part inside a group gives the group (groups are taken apart to edit their
 * children, apps/cad plan Global Constraints).
 *
 * Triangles are hit from either side; drawing lines are hit within a
 * tolerance; a part that could not be computed is hit on its outline box.
 * Each item's box is tested first, so a click far from a large mesh does not
 * walk its triangles.
 */
import type { Box3, Mesh, Vec3 } from '@genoffice/cad-engine'
import type { SceneItem } from './scene-model'

export interface Ray {
  origin: Vec3
  /** need not be unit length */
  direction: Vec3
}

export interface PickOptions {
  /** how close to a drawing line counts as on it, in millimetres */
  lineTolerance?: number
}

const EPS = 1e-12

/** Distance along the ray (in units of its direction) where it enters the box, or null. */
function hitBox(ray: Ray, box: Box3, pad = 0): number | null {
  let near = -Infinity
  let far = Infinity
  for (let k = 0; k < 3; k++) {
    const o = ray.origin[k]!
    const d = ray.direction[k]!
    const lo = box.min[k]! - pad
    const hi = box.max[k]! + pad
    if (Math.abs(d) < EPS) {
      if (o < lo || o > hi) return null
      continue
    }
    let t0 = (lo - o) / d
    let t1 = (hi - o) / d
    if (t0 > t1) [t0, t1] = [t1, t0]
    near = Math.max(near, t0)
    far = Math.min(far, t1)
    if (near > far) return null
  }
  if (far < 0) return null
  return Math.max(near, 0)
}

/** Nearest triangle hit (Möller–Trumbore, both sides), or null. */
function hitMesh(ray: Ray, mesh: Mesh): number | null {
  const p = mesh.positions
  const idx = mesh.indices
  const [ox, oy, oz] = ray.origin
  const [dx, dy, dz] = ray.direction
  let best: number | null = null
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = idx[i]! * 3
    const b = idx[i + 1]! * 3
    const c = idx[i + 2]! * 3
    const e1x = p[b]! - p[a]!
    const e1y = p[b + 1]! - p[a + 1]!
    const e1z = p[b + 2]! - p[a + 2]!
    const e2x = p[c]! - p[a]!
    const e2y = p[c + 1]! - p[a + 1]!
    const e2z = p[c + 2]! - p[a + 2]!
    const hx = dy * e2z - dz * e2y
    const hy = dz * e2x - dx * e2z
    const hz = dx * e2y - dy * e2x
    const det = e1x * hx + e1y * hy + e1z * hz
    if (Math.abs(det) < EPS) continue
    const inv = 1 / det
    const sx = ox - p[a]!
    const sy = oy - p[a + 1]!
    const sz = oz - p[a + 2]!
    const u = (sx * hx + sy * hy + sz * hz) * inv
    if (u < 0 || u > 1) continue
    const qx = sy * e1z - sz * e1y
    const qy = sz * e1x - sx * e1z
    const qz = sx * e1y - sy * e1x
    const v = (dx * qx + dy * qy + dz * qz) * inv
    if (v < 0 || u + v > 1) continue
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv
    if (t >= 0 && (best === null || t < best)) best = t
  }
  return best
}

/** Where along the ray it passes within `tolerance` of a polyline segment, nearest first, or null. */
function hitLines(ray: Ray, points: readonly number[], tolerance: number): number | null {
  const [ox, oy, oz] = ray.origin
  const [dx, dy, dz] = ray.direction
  const dd = dx * dx + dy * dy + dz * dz
  let best: number | null = null
  for (let i = 0; i + 5 < points.length; i += 3) {
    const ax = points[i]!
    const ay = points[i + 1]!
    const az = points[i + 2]!
    const ux = points[i + 3]! - ax
    const uy = points[i + 4]! - ay
    const uz = points[i + 5]! - az
    // closest points between the ray o + t d and the segment a + s u
    const wx = ox - ax
    const wy = oy - ay
    const wz = oz - az
    const b = dx * ux + dy * uy + dz * uz
    const c = ux * ux + uy * uy + uz * uz
    const d = dx * wx + dy * wy + dz * wz
    const e = ux * wx + uy * wy + uz * wz
    const denom = dd * c - b * b
    let s = denom > EPS ? (dd * e - b * d) / denom : 0
    s = c > EPS ? Math.min(1, Math.max(0, s)) : 0
    const t = Math.max(0, (b * s - d) / dd)
    const px = ox + t * dx - (ax + s * ux)
    const py = oy + t * dy - (ay + s * uy)
    const pz = oz + t * dz - (az + s * uz)
    if (px * px + py * py + pz * pz <= tolerance * tolerance && (best === null || t < best)) {
      best = t
    }
  }
  return best
}

/** The id of the top-level part under the ray, or null for empty space. */
export function pickPart(
  items: readonly SceneItem[],
  ray: Ray,
  options: PickOptions = {},
): string | null {
  const tolerance = options.lineTolerance ?? 1
  let bestId: string | null = null
  let bestT = Infinity
  const take = (id: string, t: number | null): void => {
    if (t !== null && t < bestT) {
      bestId = id
      bestT = t
    }
  }
  for (const item of items) {
    if (!item.selectable) continue
    const enter = hitBox(ray, item.box, tolerance)
    if (enter === null || enter > bestT) continue
    if (item.mesh) take(item.id, hitMesh(ray, item.mesh))
    else if (item.issue) take(item.id, hitBox(ray, item.box))
    if (item.lines) {
      for (const line of item.lines) take(item.id, hitLines(ray, line.points, tolerance))
    }
  }
  return bestId
}

/**
 * Where a ray meets the workplane (z = 0) in front of the camera, as [x, y],
 * or null when it runs along the plate or away from it. Sketching places its
 * points here.
 */
export function rayToWorkplane(ray: Ray): [number, number] | null {
  const [ox, oy, oz] = ray.origin
  const [dx, dy, dz] = ray.direction
  if (Math.abs(dz) < EPS) return null
  const t = -oz / dz
  if (t < 0) return null
  return [ox + dx * t, oy + dy * t]
}
