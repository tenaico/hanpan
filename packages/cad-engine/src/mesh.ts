import { applyTransform, transformOf } from './geometry'
import type { Mesh, Vec3 } from './model'

export function makeMesh(positions: ArrayLike<number>, indices: ArrayLike<number>): Mesh {
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) }
}

export function triangleCount(mesh: Mesh): number {
  return Math.floor(mesh.indices.length / 3)
}

function vertex(mesh: Mesh, i: number): Vec3 {
  const p = mesh.positions
  return [p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!]
}

/** Signed volume in mm³; positive when the triangles face outwards. */
export function meshVolume(mesh: Mesh): number {
  let sum = 0
  const idx = mesh.indices
  for (let t = 0; t + 2 < idx.length; t += 3) {
    const [ax, ay, az] = vertex(mesh, idx[t]!)
    const [bx, by, bz] = vertex(mesh, idx[t + 1]!)
    const [cx, cy, cz] = vertex(mesh, idx[t + 2]!)
    sum += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)
  }
  return sum / 6
}

export function meshBounds(mesh: Mesh): { min: Vec3; max: Vec3 } {
  const p = mesh.positions
  if (p.length < 3) return { min: [0, 0, 0], max: [0, 0, 0] }
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i + 2 < p.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = p[i + k]!
      if (v < min[k]!) min[k] = v
      if (v > max[k]!) max[k] = v
    }
  }
  return { min, max }
}

/**
 * True when every directed edge appears once and its reverse appears once, so
 * each edge joins exactly two triangles that agree on which side is outside.
 * Edges are packed into one sorted Float64Array (a * n + b stays an exact
 * integer below 2^53), which is several times faster than a Map on big meshes.
 */
export function isClosedMesh(mesh: Mesh): boolean {
  const idx = mesh.indices
  if (idx.length < 3 || idx.length % 3 !== 0) return false
  const n = mesh.positions.length / 3
  const keys = new Float64Array(idx.length)
  for (let t = 0; t < idx.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = idx[t + k]!
      const b = idx[t + ((k + 1) % 3)]!
      if (a === b || a >= n || b >= n) return false
      keys[t + k] = a * n + b
    }
  }
  keys.sort()
  for (let i = 1; i < keys.length; i++) if (keys[i] === keys[i - 1]) return false
  for (let i = 0; i < keys.length; i++) {
    const a = Math.floor(keys[i]! / n)
    const b = keys[i]! - a * n
    const reverse = b * n + a
    let lo = 0
    let hi = keys.length - 1
    let found = false
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      const v = keys[mid]!
      if (v === reverse) {
        found = true
        break
      }
      if (v < reverse) lo = mid + 1
      else hi = mid - 1
    }
    if (!found) return false
  }
  return true
}

/** Rotates (X, then Y, then Z, in degrees) and then moves. The input is not changed. */
export function transformMesh(mesh: Mesh, position: Vec3, rotationDeg: Vec3): Mesh {
  const tr = transformOf(position, rotationDeg)
  const src = mesh.positions
  const out = new Float32Array(src.length)
  for (let i = 0; i + 2 < src.length; i += 3) {
    const [x, y, z] = applyTransform(tr, [src[i]!, src[i + 1]!, src[i + 2]!])
    out[i] = x
    out[i + 1] = y
    out[i + 2] = z
  }
  return { positions: out, indices: mesh.indices }
}
