/** Millimetres. +Z is up. */
export type Vec3 = [number, number, number]

export type ShapeKind =
  | 'box'
  | 'cylinder'
  | 'sphere'
  | 'cone'
  | 'pyramid'
  | 'wedge'
  | 'hemisphere'
  | 'tube'
  | 'torus'
  | 'triPrism'
  | 'hexPrism'
  | 'roundedBox'
  | 'starPrism'
  | 'roof'
  | 'text'

export type PartRole = 'solid' | 'hole'

export interface PartBase {
  id: string
  name: string
  /** A hole cuts the solids of the group it sits in; on its own it is drawn like a solid. */
  role: PartRole
  /** Document content colour (#rrggbb). The same in light and dark themes. */
  color: string
  position: Vec3
  /** Degrees, applied X first, then Y, then Z (R = Rz * Ry * Rx). */
  rotation: Vec3
  hidden: boolean
  locked: boolean
  /** Fields this engine does not know, kept for the next save. */
  extra?: Record<string, unknown>
}

export interface TextShape {
  value: string
  /** Closed rings in millimetres, [x0, y0, x1, y1, ...]. Counter-clockwise rings are outer. */
  outlines: number[][]
}

export interface ShapePart extends PartBase {
  type: 'shape'
  shape: ShapeKind
  dims: Record<string, number>
  /** Only for the 'text' shape. The renderer turns the value into outlines with a font. */
  text?: TextShape
}

export interface ExtrudePart extends PartBase {
  type: 'extrude'
  /** Rings [x0, y0, x1, y1, ...]. The first ring is the outside, the rest are holes. */
  rings: number[][]
  height: number
}

export interface Mesh {
  positions: Float32Array
  indices: Uint32Array
}

export interface MeshPart extends PartBase {
  type: 'mesh'
  mesh: Mesh
  /** Every edge is shared by exactly two triangles; only closed meshes take part in holes. */
  closed: boolean
}

/** 2D entities in millimetres on the workplane, as read from a DXF file. */
export type DrawingEntity =
  | { kind: 'line'; a: [number, number]; b: [number, number]; layer: string }
  | { kind: 'polyline'; points: number[]; closed: boolean; layer: string }
  | { kind: 'circle'; center: [number, number]; radius: number; layer: string }
  | {
      kind: 'arc'
      center: [number, number]
      radius: number
      startDeg: number
      endDeg: number
      layer: string
    }
  | {
      kind: 'text'
      at: [number, number]
      height: number
      rotationDeg: number
      value: string
      layer: string
    }

export interface DrawingPart extends PartBase {
  type: 'drawing'
  entities: DrawingEntity[]
}

export interface GroupPart extends PartBase {
  type: 'group'
  /** Children are placed relative to the group. */
  children: Part[]
}

export type Part = ShapePart | ExtrudePart | MeshPart | DrawingPart | GroupPart

export interface CadDocument {
  workplane: { width: number; depth: number; grid: number }
  parts: Part[]
  /** The sheet title block. */
  title: { name: string; date: string; scale: string }
  /** Fields this engine does not know, kept for the next save. */
  extra: Record<string, unknown>
}

/** Over this many triangles a part is not drawn or saved. */
export const MAX_TRIANGLES = 2_000_000

/** Files larger than this are not opened. */
export const MAX_FILE_BYTES = 100 * 1024 * 1024

export const SHAPE_DIMS: Record<ShapeKind, readonly string[]> = {
  box: ['width', 'depth', 'height'],
  cylinder: ['diameter', 'height'],
  sphere: ['diameter'],
  cone: ['diameter', 'height'],
  pyramid: ['width', 'depth', 'height'],
  wedge: ['width', 'depth', 'height'],
  hemisphere: ['diameter'],
  tube: ['outerDiameter', 'innerDiameter', 'height'],
  torus: ['diameter', 'tubeDiameter'],
  triPrism: ['width', 'depth', 'height'],
  hexPrism: ['diameter', 'height'],
  roundedBox: ['width', 'depth', 'height', 'radius'],
  starPrism: ['outerDiameter', 'innerDiameter', 'points', 'height'],
  roof: ['width', 'depth', 'height'],
  text: ['size', 'height'],
}

export const SHAPE_DEFAULTS: Record<ShapeKind, Record<string, number>> = {
  box: { width: 20, depth: 20, height: 20 },
  cylinder: { diameter: 20, height: 20 },
  sphere: { diameter: 20 },
  cone: { diameter: 20, height: 20 },
  pyramid: { width: 20, depth: 20, height: 20 },
  wedge: { width: 20, depth: 20, height: 20 },
  hemisphere: { diameter: 20 },
  tube: { outerDiameter: 20, innerDiameter: 14, height: 20 },
  torus: { diameter: 20, tubeDiameter: 6 },
  triPrism: { width: 20, depth: 20, height: 20 },
  hexPrism: { diameter: 20, height: 20 },
  roundedBox: { width: 20, depth: 20, height: 20, radius: 2 },
  starPrism: { outerDiameter: 20, innerDiameter: 10, points: 5, height: 5 },
  roof: { width: 20, depth: 20, height: 10 },
  text: { size: 10, height: 3 },
}

export const DEFAULT_SOLID_COLOR = '#5b9bd5'
export const DEFAULT_HOLE_COLOR = '#b0b4ba'

export type CadEditErrorCode = 'unknown-id' | 'bad-number' | 'locked' | 'too-few' | 'not-group'

export class CadEditError extends Error {
  readonly code: CadEditErrorCode
  constructor(code: CadEditErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'CadEditError'
    this.code = code
  }
}

export function createDocument(): CadDocument {
  return {
    workplane: { width: 200, depth: 200, grid: 10 },
    parts: [],
    title: { name: '', date: '', scale: '' },
    extra: {},
  }
}
