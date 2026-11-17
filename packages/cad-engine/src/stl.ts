import { triangleCount } from './mesh'
import type { Mesh } from './model'
import {
  checkReadSize,
  finishMeshRead,
  triangleLimit,
  type MeshReadOptions,
  type MeshReadResult,
} from './weld'

const HEADER = 80
const RECORD = 50

function startsWithSolid(bytes: Uint8Array): boolean {
  let i = 0
  while (i < bytes.length && (bytes[i] === 0x20 || (bytes[i]! >= 0x09 && bytes[i]! <= 0x0d))) i++
  const word = new TextDecoder().decode(bytes.subarray(i, i + 5))
  return word.toLowerCase() === 'solid'
}

function readBinary(bytes: Uint8Array, maxTriangles: number): MeshReadResult {
  if (bytes.byteLength < HEADER + 4) return { status: 'broken' }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = view.getUint32(HEADER, true)
  if (HEADER + 4 + RECORD * count !== bytes.byteLength) return { status: 'broken' }
  if (count > maxTriangles) return { status: 'too-large' }
  const positions = new Float32Array(count * 9)
  for (let t = 0; t < count; t++) {
    const at = HEADER + 4 + t * RECORD + 12 // skip the stored normal
    for (let k = 0; k < 9; k++) positions[t * 9 + k] = view.getFloat32(at + k * 4, true)
  }
  return finishMeshRead(soup(positions))
}

const ASCII_KEYWORDS = new Set(['facet', 'outer', 'vertex', 'endloop', 'endfacet', 'endsolid'])

function readAscii(bytes: Uint8Array, maxTriangles: number): MeshReadResult {
  const lines = new TextDecoder().decode(bytes).split(/\r\n|\r|\n/)
  const positions: number[] = []
  let loop: number[] = [] // corners of the facet being read, x y z each
  let inFacet = false
  let triangles = 0
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') continue
    const words = line.split(/\s+/)
    const key = words[0]!.toLowerCase()
    if (key === 'solid') {
      if (inFacet) return { status: 'broken' }
      continue // the rest of the line is the solid's name
    }
    if (!ASCII_KEYWORDS.has(key)) return { status: 'broken' }
    if (key === 'facet') {
      if (inFacet) return { status: 'broken' }
      inFacet = true
      loop = []
    } else if (key === 'vertex') {
      if (!inFacet || words.length < 4) return { status: 'broken' }
      for (let k = 1; k <= 3; k++) {
        const v = Number(words[k])
        if (!Number.isFinite(v)) return { status: 'broken' }
        loop.push(v)
      }
    } else if (key === 'endfacet') {
      if (!inFacet || loop.length < 9) return { status: 'broken' }
      // a facet with more than three corners is fan-triangulated
      for (let c = 2; c * 3 < loop.length; c++) {
        if (++triangles > maxTriangles) return { status: 'too-large' }
        positions.push(...loop.slice(0, 3), ...loop.slice((c - 1) * 3, c * 3 + 3))
      }
      inFacet = false
    } else if (key === 'endsolid') {
      if (inFacet) return { status: 'broken' }
    }
  }
  if (inFacet) return { status: 'broken' }
  return finishMeshRead(soup(Float32Array.from(positions)))
}

/** Three new corners per triangle; welding joins them afterwards. */
function soup(positions: Float32Array): Mesh {
  const indices = new Uint32Array(positions.length / 3)
  for (let i = 0; i < indices.length; i++) indices[i] = i
  return { positions, indices }
}

/**
 * Reads a binary or ASCII STL. A file is binary when its length matches the
 * triangle count at byte 80, even when its header starts with "solid".
 */
export function readStl(bytes: Uint8Array, options?: MeshReadOptions): MeshReadResult {
  const refused = checkReadSize(bytes, options)
  if (refused) return refused
  const maxTriangles = triangleLimit(options)
  if (bytes.byteLength >= HEADER + 4) {
    const count = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      HEADER,
      true,
    )
    if (HEADER + 4 + RECORD * count === bytes.byteLength) return readBinary(bytes, maxTriangles)
  }
  if (startsWithSolid(bytes)) return readAscii(bytes, maxTriangles)
  return readBinary(bytes, maxTriangles)
}

/** Binary STL with an 80-byte "Hanpan" header, face normals and attribute 0. */
export function writeStl(mesh: Mesh): Uint8Array {
  const count = triangleCount(mesh)
  const out = new Uint8Array(HEADER + 4 + RECORD * count)
  out.set(new TextEncoder().encode('Hanpan'))
  const view = new DataView(out.buffer)
  view.setUint32(HEADER, count, true)
  const p = mesh.positions
  const idx = mesh.indices
  for (let t = 0; t < count; t++) {
    const corners: number[] = []
    for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k]!
      corners.push(p[v * 3] ?? 0, p[v * 3 + 1] ?? 0, p[v * 3 + 2] ?? 0)
    }
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = corners as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ]
    const ux = bx - ax
    const uy = by - ay
    const uz = bz - az
    const vx = cx - ax
    const vy = cy - ay
    const vz = cz - az
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const len = Math.hypot(nx, ny, nz)
    if (len > 0 && Number.isFinite(len)) {
      nx /= len
      ny /= len
      nz /= len
    } else {
      nx = ny = nz = 0
    }
    const at = HEADER + 4 + t * RECORD
    view.setFloat32(at, nx, true)
    view.setFloat32(at + 4, ny, true)
    view.setFloat32(at + 8, nz, true)
    for (let k = 0; k < 9; k++) view.setFloat32(at + 12 + k * 4, corners[k]!, true)
    // the attribute byte count (at + 48) stays 0
  }
  return out
}
