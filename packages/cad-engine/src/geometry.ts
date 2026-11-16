import type { Vec3 } from './model'

/** Row-major 3x3 matrix. */
export type Mat3 = [number, number, number, number, number, number, number, number, number]

export interface Transform {
  m: Mat3
  t: Vec3
}

export const IDENTITY: Transform = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] }

const RAD = Math.PI / 180

/** R = Rz * Ry * Rx from degrees. */
export function rotationMatrix(deg: Vec3): Mat3 {
  const a = deg[0] * RAD
  const b = deg[1] * RAD
  const c = deg[2] * RAD
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const cb = Math.cos(b)
  const sb = Math.sin(b)
  const cc = Math.cos(c)
  const sc = Math.sin(c)
  return [
    cc * cb,
    cc * sb * sa - sc * ca,
    cc * sb * ca + sc * sa,
    sc * cb,
    sc * sb * sa + cc * ca,
    sc * sb * ca - cc * sa,
    -sb,
    cb * sa,
    cb * ca,
  ]
}

export function mulMat(a: Mat3, b: Mat3): Mat3 {
  const out: number[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out.push(a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!)
    }
  }
  return out as Mat3
}

export function applyMat(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

export function applyTransform(tr: Transform, v: Vec3): Vec3 {
  const r = applyMat(tr.m, v)
  return [r[0] + tr.t[0], r[1] + tr.t[1], r[2] + tr.t[2]]
}

export function transformOf(position: Vec3, rotation: Vec3): Transform {
  return { m: rotationMatrix(rotation), t: [position[0], position[1], position[2]] }
}

/** The child frame placed inside the parent frame. */
export function compose(parent: Transform, child: Transform): Transform {
  return { m: mulMat(parent.m, child.m), t: applyTransform(parent, child.t) }
}

function tidy(value: number): number {
  const rounded = Math.round(value * 1e9) / 1e9
  return Object.is(rounded, -0) ? 0 : rounded
}

/** Degrees (X, Y, Z) for R = Rz * Ry * Rx. */
export function eulerFromMatrix(m: Mat3): Vec3 {
  const sb = Math.max(-1, Math.min(1, -m[6]))
  const b = Math.asin(sb)
  let a: number
  let c: number
  if (Math.abs(Math.cos(b)) > 1e-9) {
    a = Math.atan2(m[7], m[8])
    c = Math.atan2(m[3], m[0])
  } else {
    c = 0
    a = Math.atan2(-m[5], m[4])
  }
  return [tidy(a / RAD), tidy(b / RAD), tidy(c / RAD)]
}

export function tidyVec(v: Vec3): Vec3 {
  return [tidy(v[0]), tidy(v[1]), tidy(v[2])]
}
