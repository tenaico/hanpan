import { extrudeMesh, extrudePolygons, ringArea2 } from './extrude'
import type { Polygon } from './extrude'
import type { Mesh, ShapePart, TextShape } from './model'

const TAU = Math.PI * 2

/** A regular ring of `n` points on a circle, counter-clockwise, the first at angle 0. */
function circleRing(radius: number, n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const a = (TAU * i) / n
    out.push(radius * Math.cos(a), radius * Math.sin(a))
  }
  return out
}

function rectRing(w: number, d: number): number[] {
  return [-w / 2, -d / 2, w / 2, -d / 2, w / 2, d / 2, -w / 2, d / 2]
}

/** A rectangle with quarter-circle corners; only the vertical edges of the solid are round. */
function roundedRectRing(w: number, d: number, r: number, segments: number): number[] {
  const steps = Math.max(1, Math.round(segments / 4))
  const cx = w / 2 - r
  const cy = d / 2 - r
  const centres: [number, number][] = [
    [cx, -cy],
    [cx, cy],
    [-cx, cy],
    [-cx, -cy],
  ]
  const out: number[] = []
  centres.forEach(([x, y], corner) => {
    const from = -Math.PI / 2 + (corner * Math.PI) / 2
    for (let i = 0; i <= steps; i++) {
      const a = from + (Math.PI / 2) * (i / steps)
      out.push(x + r * Math.cos(a), y + r * Math.sin(a))
    }
  })
  return out
}

/** Outer and inner points in turn; the first outer point points to +y. */
function starRing(outer: number, inner: number, points: number): number[] {
  const out: number[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / points
    const r = i % 2 === 0 ? outer : inner
    out.push(r * Math.cos(a), r * Math.sin(a))
  }
  return out
}

/**
 * Extrudes a profile drawn in the x/z plane along y, centred on y = 0.
 * (u, v, w) -> (u, depth/2 - w, v) is a proper rotation, so the winding is kept.
 */
function profileAlongY(profile: number[], depth: number): Mesh {
  const mesh = extrudeMesh([profile], depth)
  const p = mesh.positions
  for (let i = 0; i < p.length; i += 3) {
    const v = p[i + 1]!
    const w = p[i + 2]!
    p[i + 1] = depth / 2 - w
    p[i + 2] = v
  }
  return mesh
}

/**
 * Turns a profile of (radius, z) points around the z axis. The profile runs
 * counter-clockwise in the (r, z) plane; points with radius 0 become poles.
 * A closed profile (the torus) also joins its last point to its first.
 */
function lathe(profile: [number, number][], segments: number, closed: boolean): Mesh {
  const positions: number[] = []
  const rings: number[][] = []
  for (const [r, z] of profile) {
    const base = positions.length / 3
    if (r === 0) {
      positions.push(0, 0, z)
      rings.push(new Array<number>(segments).fill(base))
    } else {
      const ring: number[] = []
      for (let j = 0; j < segments; j++) {
        const a = (TAU * j) / segments
        positions.push(r * Math.cos(a), r * Math.sin(a), z)
        ring.push(base + j)
      }
      rings.push(ring)
    }
  }
  const indices: number[] = []
  const spans = closed ? profile.length : profile.length - 1
  for (let i = 0; i < spans; i++) {
    const lo = rings[i]!
    const hi = rings[(i + 1) % rings.length]!
    for (let j = 0; j < segments; j++) {
      const k = (j + 1) % segments
      const a = lo[j]!
      const b = lo[k]!
      const c = hi[k]!
      const d = hi[j]!
      if (a !== b) indices.push(a, b, c)
      if (c !== d) indices.push(a, c, d)
    }
  }
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) }
}

/** (r, z) points on a circle arc from `fromDeg` to `toDeg`; ±90° land exactly on the axis. */
function arc(
  radius: number,
  centreZ: number,
  fromDeg: number,
  toDeg: number,
  steps: number,
): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const deg = fromDeg + ((toDeg - fromDeg) * i) / steps
    const a = (deg * Math.PI) / 180
    if (deg === 90) out.push([0, centreZ + radius])
    else if (deg === -90) out.push([0, centreZ - radius])
    else out.push([radius * Math.cos(a), centreZ + radius * Math.sin(a)])
  }
  return out
}

function pyramidMesh(w: number, d: number, h: number): Mesh {
  const positions = [
    [-w / 2, -d / 2, 0],
    [w / 2, -d / 2, 0],
    [w / 2, d / 2, 0],
    [-w / 2, d / 2, 0],
    [0, 0, h],
  ].flat()
  const indices = [0, 2, 1, 0, 3, 2, 0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) }
}

function pointInRing(x: number, y: number, ring: readonly number[]): boolean {
  let inside = false
  const n = Math.floor(ring.length / 2)
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2]!
    const yi = ring[i * 2 + 1]!
    const xj = ring[j * 2]!
    const yj = ring[j * 2 + 1]!
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Groups glyph rings into polygons: counter-clockwise rings are outsides, and
 * each clockwise ring becomes a hole of the smallest outside that holds it.
 * A hole that no outside holds is dropped.
 */
function textPolygons(text: TextShape | undefined): Polygon[] {
  const rings = (text?.outlines ?? []).filter((r) => r.length >= 6 && ringArea2(r) !== 0)
  const outers = rings.filter((r) => ringArea2(r) > 0)
  const polygons: Polygon[] = outers.map((r) => [r])
  for (const hole of rings.filter((r) => ringArea2(r) < 0)) {
    let best = -1
    let bestArea = Infinity
    outers.forEach((outer, i) => {
      const area = ringArea2(outer)
      if (area < bestArea && pointInRing(hole[0]!, hole[1]!, outer)) {
        best = i
        bestArea = area
      }
    })
    if (best >= 0) polygons[best]!.push(hole)
  }
  return polygons
}

/**
 * The shape in its own frame: the base centred on the origin, sitting on z = 0,
 * wound counter-clockwise seen from outside. Round shapes use `segments` steps
 * around a full turn.
 */
export function shapeMesh(part: ShapePart, segments = 48): Mesh {
  const n = Math.max(3, Math.round(segments))
  const d = part.dims
  switch (part.shape) {
    case 'box':
      return extrudeMesh([rectRing(d.width!, d.depth!)], d.height!)
    case 'cylinder':
      return extrudeMesh([circleRing(d.diameter! / 2, n)], d.height!)
    case 'tube':
      return extrudeMesh(
        [circleRing(d.outerDiameter! / 2, n), circleRing(d.innerDiameter! / 2, n)],
        d.height!,
      )
    case 'hexPrism':
      // corners at 0°, 60°, ...
      return extrudeMesh([circleRing(d.diameter! / 2, 6)], d.height!)
    case 'triPrism': {
      const w = d.width!
      const dep = d.depth!
      return extrudeMesh([[-w / 2, -dep / 2, w / 2, -dep / 2, 0, dep / 2]], d.height!)
    }
    case 'roundedBox':
      return extrudeMesh([roundedRectRing(d.width!, d.depth!, d.radius!, n)], d.height!)
    case 'starPrism':
      return extrudeMesh(
        [starRing(d.outerDiameter! / 2, d.innerDiameter! / 2, Math.round(d.points!))],
        d.height!,
      )
    case 'wedge': {
      // full height at -x, sloping down to nothing at +x
      const w = d.width!
      return profileAlongY([-w / 2, 0, w / 2, 0, -w / 2, d.height!], d.depth!)
    }
    case 'roof': {
      // a gable roof with its ridge along y
      const w = d.width!
      return profileAlongY([-w / 2, 0, w / 2, 0, 0, d.height!], d.depth!)
    }
    case 'pyramid':
      return pyramidMesh(d.width!, d.depth!, d.height!)
    case 'cone':
      return lathe(
        [
          [0, 0],
          [d.diameter! / 2, 0],
          [0, d.height!],
        ],
        n,
        false,
      )
    case 'sphere': {
      const r = d.diameter! / 2
      return lathe(arc(r, r, -90, 90, Math.max(2, Math.round(n / 2))), n, false)
    }
    case 'hemisphere': {
      const r = d.diameter! / 2
      return lathe([[0, 0], ...arc(r, 0, 0, 90, Math.max(1, Math.round(n / 4)))], n, false)
    }
    case 'torus': {
      // `diameter` is the overall outer diameter; the tube sits on z = 0
      const tube = d.tubeDiameter! / 2
      const major = d.diameter! / 2 - tube
      const profile: [number, number][] = []
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (TAU * i) / n
        profile.push([major + tube * Math.cos(a), tube + tube * Math.sin(a)])
      }
      profile[0] = [major, 0]
      return lathe(profile, n, true)
    }
    case 'text': {
      const polygons = textPolygons(part.text)
      if (polygons.length === 0) {
        return { positions: new Float32Array(0), indices: new Uint32Array(0) }
      }
      return extrudePolygons(polygons, d.height!)
    }
  }
}
