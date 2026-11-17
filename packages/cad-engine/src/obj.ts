import type { Mesh } from './model'
import {
  checkReadSize,
  finishMeshRead,
  triangleLimit,
  type MeshReadOptions,
  type MeshReadResult,
} from './weld'

const INDEX = /^-?\d+$/

/**
 * Reads the `v` and `f` lines of an OBJ file; everything else (vt, vn, o, g, s,
 * usemtl, mtllib, comments) is ignored. Polygons are fan-triangulated and
 * negative indices count back from the vertices read so far.
 */
export function readObj(bytes: Uint8Array, options?: MeshReadOptions): MeshReadResult {
  const refused = checkReadSize(bytes, options)
  if (refused) return refused
  const maxTriangles = triangleLimit(options)
  const lines = new TextDecoder().decode(bytes).split(/\r\n|\r|\n/)
  const positions: number[] = []
  const indices: number[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const words = line.split(/\s+/)
    const key = words[0]
    if (key === 'v') {
      if (words.length < 4) return { status: 'broken' }
      for (let k = 1; k <= 3; k++) {
        const v = Number(words[k])
        if (!Number.isFinite(v)) return { status: 'broken' }
        positions.push(v)
      }
    } else if (key === 'f') {
      if (words.length < 4) return { status: 'broken' }
      const count = positions.length / 3
      const face: number[] = []
      for (let k = 1; k < words.length; k++) {
        const text = words[k]!.split('/')[0]!
        if (!INDEX.test(text)) return { status: 'broken' }
        const i = Number(text)
        if (i === 0) return { status: 'broken' }
        const at = i < 0 ? count + i : i - 1
        // positive indices may point at vertices further down; checked at the end
        if (at < 0) return { status: 'broken' }
        face.push(at)
      }
      for (let c = 2; c < face.length; c++) {
        if (indices.length / 3 >= maxTriangles) return { status: 'too-large' }
        indices.push(face[0]!, face[c - 1]!, face[c]!)
      }
    }
  }
  const count = positions.length / 3
  for (const i of indices) if (i >= count) return { status: 'broken' }
  const mesh: Mesh = { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) }
  return finishMeshRead(mesh)
}

/** The shortest decimal that reads back as the same 32-bit float. */
function formatNumber(v: number): string {
  if (v === 0 || !Number.isFinite(v)) return '0'
  for (let digits = 1; digits < 9; digits++) {
    const s = String(Number(v.toPrecision(digits)))
    if (Math.fround(Number(s)) === v) return s
  }
  return String(Number(v.toPrecision(9)))
}

export function writeObj(mesh: Mesh): Uint8Array {
  const out: string[] = ['# Hanpan']
  const p = mesh.positions
  for (let i = 0; i + 2 < p.length; i += 3) {
    out.push(`v ${formatNumber(p[i]!)} ${formatNumber(p[i + 1]!)} ${formatNumber(p[i + 2]!)}`)
  }
  const idx = mesh.indices
  for (let t = 0; t + 2 < idx.length; t += 3) {
    out.push(`f ${idx[t]! + 1} ${idx[t + 1]! + 1} ${idx[t + 2]! + 1}`)
  }
  return new TextEncoder().encode(out.join('\n') + '\n')
}
