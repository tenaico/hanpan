/**
 * Where the camera stands for the view buttons (top, front, side) and for
 * "fit", which frames the whole model. +Z is up; the front of the model faces
 * -Y, so the front view looks along +Y and the side view looks from +X.
 *
 * Pure math: the view applies the pose to its three.js camera.
 */
import type { Box3, Vec3 } from '@genoffice/cad-engine'

export type ViewName = 'top' | 'front' | 'side' | 'iso'

export interface ViewDirection {
  /** unit vector from the target towards the camera */
  direction: Vec3
  /** what points up on screen */
  up: Vec3
}

export interface CameraPose {
  position: Vec3
  target: Vec3
  up: Vec3
}

export interface FitOptions {
  /** from the target towards the camera; defaults to the iso view */
  direction?: Vec3
  /** vertical field of view in degrees */
  fovDeg?: number
  /** width / height of the view */
  aspect?: number
  /** room left around the model, as a factor of its size */
  margin?: number
}

const Z_UP: Vec3 = [0, 0, 1]

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

export function viewDirection(view: ViewName): ViewDirection {
  switch (view) {
    case 'top':
      // looking straight down, the back of the plate (+Y) is up on screen
      return { direction: [0, 0, 1], up: [0, 1, 0] }
    case 'front':
      return { direction: [0, -1, 0], up: Z_UP }
    case 'side':
      return { direction: [1, 0, 0], up: Z_UP }
    case 'iso':
      return { direction: normalize([1, -1.4, 1.1]), up: Z_UP }
  }
}

/** The camera pose that shows the whole box from `direction`. */
export function fitTo(box: Box3, options: FitOptions = {}): CameraPose {
  const direction = normalize(options.direction ?? viewDirection('iso').direction)
  const fov = ((options.fovDeg ?? 45) * Math.PI) / 180
  const aspect = options.aspect ?? 1
  const margin = options.margin ?? 1.1
  const target: Vec3 = [
    (box.min[0] + box.max[0]) / 2,
    (box.min[1] + box.max[1]) / 2,
    (box.min[2] + box.max[2]) / 2,
  ]
  const up = Math.abs(direction[2]) > 0.999 ? viewDirection('top').up : Z_UP
  // the screen axes: right = forward × up, screen up = right × forward (forward = -direction)
  const right = normalize(cross([-direction[0], -direction[1], -direction[2]], up))
  const screenUp = cross(right, [-direction[0], -direction[1], -direction[2]])
  const tanV = Math.tan(fov / 2)
  const tanH = tanV * aspect
  // every corner must sit inside the view cone: |x| <= (d - z) tanH and |y| <= (d - z) tanV
  let distance = 1
  for (const x of [box.min[0], box.max[0]])
    for (const y of [box.min[1], box.max[1]])
      for (const z of [box.min[2], box.max[2]]) {
        const c: Vec3 = [x - target[0], y - target[1], z - target[2]]
        const along = dot(c, direction)
        distance = Math.max(
          distance,
          along + (margin * Math.abs(dot(c, right))) / tanH,
          along + (margin * Math.abs(dot(c, screenUp))) / tanV,
          along + 1,
        )
      }
  return {
    position: [
      target[0] + direction[0] * distance,
      target[1] + direction[1] * distance,
      target[2] + direction[2] * distance,
    ],
    target,
    up,
  }
}

/**
 * The direction the orbiting camera looks from: straight down is nudged a hair
 * towards the front, so the orbit keeps +Z up and +Y away. `direction` points
 * from the target towards the camera and need not be a unit vector ("fit"
 * passes the camera's offset from the target).
 */
export function orbitDirection(direction: Vec3): Vec3 {
  const unit = normalize(direction)
  return Math.abs(unit[2]) > 0.999 ? [0, -1e-3, 1] : unit
}
