import { isClosedMesh } from './mesh'
import { MAX_FILE_BYTES, MAX_TRIANGLES, type Mesh } from './model'

export type MeshReadResult =
  { status: 'ok'; mesh: Mesh; closed: boolean } | { status: 'empty' | 'too-large' | 'broken' }

/** Lower limits for tests; the defaults are MAX_FILE_BYTES and MAX_TRIANGLES. */
export interface MeshReadOptions {
  maxBytes?: number
  maxTriangles?: number
}

export const DEFAULT_WELD_TOLERANCE = 1e-5

function cellHash(ix: number, iy: number, iz: number): number {
  return (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791)) | 0
}

/**
 * Merges vertices closer than `tolerance` mm, drops triangles that lose a
 * corner and vertices no triangle uses. Vertices are numbered in the order
 * triangles first use them. The input is not changed.
 *
 * Coordinates are quantised to cells four tolerances wide and hashed into an
 * open table; a vertex looks into a neighbouring cell only when it lies within
 * the tolerance of that side, so most vertices cost one lookup.
 */
export function weldMesh(mesh: Mesh, tolerance = DEFAULT_WELD_TOLERANCE): Mesh {
  const src = mesh.positions
  const n = Math.floor(src.length / 3)
  const tol = tolerance > 0 ? tolerance : 0
  const cell = 4 * (tol > 0 ? tol : 1e-9)
  const limit = tol * tol

  let size = 16
  while (size < n * 2) size *= 2
  const mask = size - 1
  // Cells that share a slot share a chain; the distance test keeps them apart.
  const slots = new Int32Array(size).fill(-1)
  const next = new Int32Array(n).fill(-1)
  // Each vertex points at the first vertex of its cluster.
  const cluster = new Int32Array(n)

  const lookup = (h: number, x: number, y: number, z: number): number => {
    for (let j = slots[h & mask]!; j >= 0; j = next[j]!) {
      const dx = src[j * 3]! - x
      const dy = src[j * 3 + 1]! - y
      const dz = src[j * 3 + 2]! - z
      if (dx * dx + dy * dy + dz * dz <= limit) return j
    }
    return -1
  }

  for (let i = 0; i < n; i++) {
    const x = src[i * 3]!
    const y = src[i * 3 + 1]!
    const z = src[i * 3 + 2]!
    const qx = x / cell
    const qy = y / cell
    const qz = z / cell
    const ix = Math.floor(qx)
    const iy = Math.floor(qy)
    const iz = Math.floor(qz)
    const own = cellHash(ix, iy, iz)
    let found = lookup(own, x, y, z)
    if (found < 0) {
      // neighbour cells on the sides this vertex is within the tolerance of
      const x0 = (qx - ix) * cell <= tol ? -1 : 0
      const x1 = (ix + 1 - qx) * cell <= tol ? 1 : 0
      const y0 = (qy - iy) * cell <= tol ? -1 : 0
      const y1 = (iy + 1 - qy) * cell <= tol ? 1 : 0
      const z0 = (qz - iz) * cell <= tol ? -1 : 0
      const z1 = (iz + 1 - qz) * cell <= tol ? 1 : 0
      for (let dx = x0; dx <= x1 && found < 0; dx++) {
        for (let dy = y0; dy <= y1 && found < 0; dy++) {
          for (let dz = z0; dz <= z1 && found < 0; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue
            found = lookup(cellHash(ix + dx, iy + dy, iz + dz), x, y, z)
          }
        }
      }
    }
    if (found >= 0) {
      cluster[i] = found
    } else {
      cluster[i] = i
      next[i] = slots[own & mask]!
      slots[own & mask] = i
    }
  }

  const remap = new Int32Array(n).fill(-1)
  const idx = mesh.indices
  const positions = new Float32Array(n * 3)
  const indices = new Uint32Array(idx.length - (idx.length % 3))
  let vertices = 0
  let used = 0
  for (let t = 0; t + 2 < idx.length; t += 3) {
    const a = idx[t]!
    const b = idx[t + 1]!
    const c = idx[t + 2]!
    if (a >= n || b >= n || c >= n) continue
    const ca = cluster[a]!
    const cb = cluster[b]!
    const cc = cluster[c]!
    if (ca === cb || cb === cc || ca === cc) continue
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? ca : k === 1 ? cb : cc
      if (remap[v]! < 0) {
        remap[v] = vertices
        positions[vertices * 3] = src[v * 3]!
        positions[vertices * 3 + 1] = src[v * 3 + 1]!
        positions[vertices * 3 + 2] = src[v * 3 + 2]!
        vertices++
      }
      indices[used++] = remap[v]!
    }
  }
  return { positions: positions.slice(0, vertices * 3), indices: indices.slice(0, used) }
}

/** Checks the size of a file before it is parsed. */
export function checkReadSize(
  bytes: Uint8Array,
  options?: MeshReadOptions,
): MeshReadResult | undefined {
  if (bytes.byteLength === 0) return { status: 'empty' }
  if (bytes.byteLength > (options?.maxBytes ?? MAX_FILE_BYTES)) return { status: 'too-large' }
  return undefined
}

export function triangleLimit(options?: MeshReadOptions): number {
  return options?.maxTriangles ?? MAX_TRIANGLES
}

/** Welds a parsed triangle soup and decides whether it is closed. */
export function finishMeshRead(mesh: Mesh): MeshReadResult {
  for (const v of mesh.positions) if (!Number.isFinite(v)) return { status: 'broken' }
  const welded = weldMesh(mesh)
  if (welded.indices.length === 0) return { status: 'empty' }
  return { status: 'ok', mesh: welded, closed: isClosedMesh(welded) }
}
