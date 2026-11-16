import type { Mesh, Vec3 } from './model'

export type SheetView = 'front' | 'top' | 'side'

/** Unit vector from the model towards the viewer, and the paper axes (u right, v up). */
const VIEWS: Record<SheetView, { toViewer: Vec3; u: 0 | 1 | 2; v: 0 | 1 | 2 }> = {
  // seen from the front (-y), x to the right, z up
  front: { toViewer: [0, -1, 0], u: 0, v: 2 },
  // seen from above, x to the right, y up
  top: { toViewer: [0, 0, 1], u: 0, v: 1 },
  // seen from the right (+x), y to the right, z up
  side: { toViewer: [1, 0, 0], u: 1, v: 2 },
}

const SHARP_COS = Math.cos((30 * Math.PI) / 180)
const FACING_EPS = 1e-6

function faceNormal(p: Float32Array, a: number, b: number, c: number): Vec3 {
  const ux = p[b * 3]! - p[a * 3]!
  const uy = p[b * 3 + 1]! - p[a * 3 + 1]!
  const uz = p[b * 3 + 2]! - p[a * 3 + 2]!
  const vx = p[c * 3]! - p[a * 3]!
  const vy = p[c * 3 + 1]! - p[a * 3 + 1]!
  const vz = p[c * 3 + 2]! - p[a * 3 + 2]!
  const n: Vec3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
  const len = Math.hypot(n[0], n[1], n[2])
  return len > 0 ? [n[0] / len, n[1] / len, n[2] / len] : [0, 0, 0]
}

function facing(n: Vec3, toViewer: Vec3): -1 | 0 | 1 {
  const d = n[0] * toViewer[0] + n[1] * toViewer[1] + n[2] * toViewer[2]
  return d > FACING_EPS ? 1 : d < -FACING_EPS ? -1 : 0
}

/**
 * The lines a view draws: edges where the surface bends by more than 30°,
 * edges where it turns away from the viewer, and open edges. Hidden lines are
 * kept. Each segment is [u0, v0, u1, v1] in millimetres on the paper axes;
 * segments that collapse to a point or repeat another are dropped.
 */
export function viewOutline(mesh: Mesh, view: SheetView): number[][] {
  const { toViewer, u, v } = VIEWS[view]
  const p = mesh.positions
  const idx = mesh.indices
  const triCount = Math.floor(idx.length / 3)
  const normals: Vec3[] = []
  for (let t = 0; t < triCount; t++) {
    normals.push(faceNormal(p, idx[t * 3]!, idx[t * 3 + 1]!, idx[t * 3 + 2]!))
  }
  const n = p.length / 3
  const edgeFaces = new Map<number, number[]>()
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const a = idx[t * 3 + k]!
      const b = idx[t * 3 + ((k + 1) % 3)]!
      const key = Math.min(a, b) * n + Math.max(a, b)
      const list = edgeFaces.get(key)
      if (list) list.push(t)
      else edgeFaces.set(key, [t])
    }
  }
  const out: number[][] = []
  const seen = new Set<string>()
  const round = (x: number): number => Math.round(x * 1e4) / 1e4
  for (const [key, faces] of edgeFaces) {
    let keep = faces.length !== 2
    if (!keep) {
      const n0 = normals[faces[0]!]!
      const n1 = normals[faces[1]!]!
      const cos = n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]
      const f0 = facing(n0, toViewer)
      const f1 = facing(n1, toViewer)
      keep = cos < SHARP_COS || (f0 !== 0 && f1 !== 0 && f0 !== f1)
    }
    if (!keep) continue
    const a = Math.floor(key / n)
    const b = key - a * n
    let s = [round(p[a * 3 + u]!), round(p[a * 3 + v]!), round(p[b * 3 + u]!), round(p[b * 3 + v]!)]
    if (s[0] === s[2] && s[1] === s[3]) continue
    if (s[0]! > s[2]! || (s[0] === s[2] && s[1]! > s[3]!)) s = [s[2]!, s[3]!, s[0]!, s[1]!]
    const id = s.join(',')
    if (seen.has(id)) continue
    seen.add(id)
    out.push(s)
  }
  return out
}
