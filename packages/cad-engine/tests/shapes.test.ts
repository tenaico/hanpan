import { describe, expect, it } from 'vitest'
import { isClosedMesh, meshBounds, meshVolume, transformMesh, triangleCount } from '../src/mesh'
import { SHAPE_DEFAULTS } from '../src/model'
import type { ShapeKind, ShapePart } from '../src/model'
import { shapeMesh } from '../src/shapes'

const KINDS = Object.keys(SHAPE_DEFAULTS) as ShapeKind[]

/** A counter-clockwise 10 x 10 square, as the renderer would hand over for a glyph. */
const SQUARE = [0, 0, 10, 0, 10, 10, 0, 10]

function partOf(shape: ShapeKind, dims: Record<string, number> = {}): ShapePart {
  return {
    id: shape,
    type: 'shape',
    shape,
    name: shape,
    role: 'solid',
    color: '#5b9bd5',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    dims: { ...SHAPE_DEFAULTS[shape], ...dims },
    ...(shape === 'text' ? { text: { value: 'A', outlines: [SQUARE] } } : {}),
  }
}

const box = (width: number, depth: number, height: number) =>
  partOf('box', { width, depth, height })
const cylinder = (diameter: number, height: number) => partOf('cylinder', { diameter, height })
const pyramid = (width: number, depth: number, height: number) =>
  partOf('pyramid', { width, depth, height })
const wedge = (width: number, depth: number, height: number) =>
  partOf('wedge', { width, depth, height })
const tube = (outerDiameter: number, innerDiameter: number, height: number) =>
  partOf('tube', { outerDiameter, innerDiameter, height })

describe('shapeMesh', () => {
  it('covers all 15 shapes', () => {
    expect(KINDS).toHaveLength(15)
  })

  it.each(KINDS)('%s is a closed, outward-facing solid sitting on z = 0', (kind) => {
    const mesh = shapeMesh(partOf(kind))
    expect(isClosedMesh(mesh)).toBe(true)
    expect(meshVolume(mesh)).toBeGreaterThan(0)
    expect(meshBounds(mesh).min[2]).toBeCloseTo(0, 5)
  })

  it.each(KINDS.filter((k) => k !== 'text' && k !== 'starPrism'))(
    '%s fills the box that localBounds gives it',
    async (kind) => {
      const { localBounds } = await import('../src/bounds')
      const part = partOf(kind)
      const got = meshBounds(shapeMesh(part))
      const want = localBounds(part)
      for (let k = 0; k < 3; k++) {
        expect(got.min[k]).toBeCloseTo(want.min[k]!, 4)
        expect(got.max[k]).toBeCloseTo(want.max[k]!, 4)
      }
    },
  )

  it('gives exact volumes', () => {
    expect(meshVolume(shapeMesh(box(10, 20, 30)))).toBeCloseTo(6000, 3)
    expect(meshVolume(shapeMesh(cylinder(20, 10), 256))).toBeCloseTo(Math.PI * 100 * 10, 0)
    expect(meshVolume(shapeMesh(pyramid(30, 30, 10)))).toBeCloseTo(3000, 3)
    expect(meshVolume(shapeMesh(wedge(10, 10, 10)))).toBeCloseTo(500, 3)
    expect(meshVolume(shapeMesh(tube(20, 10, 10), 256))).toBeCloseTo(Math.PI * (100 - 25) * 10, 0)
  })

  it('centres the base on the origin', () => {
    expect(meshBounds(shapeMesh(box(10, 20, 30)))).toEqual({ min: [-5, -10, 0], max: [5, 10, 30] })
  })

  it('puts the wedge full height at -x and the first star point at +y', () => {
    const w = shapeMesh(wedge(10, 10, 10))
    const p = w.positions
    for (let i = 0; i < p.length; i += 3) {
      if (p[i + 2]! > 9.999) expect(p[i]).toBeCloseTo(-5, 5)
    }
    const star = meshBounds(shapeMesh(partOf('starPrism')))
    expect(star.max[1]).toBeCloseTo(10, 4)
    expect(star.min[1]).toBeGreaterThan(-10)
  })

  it('extrudes text outlines to the text height', () => {
    expect(meshVolume(shapeMesh(partOf('text', { height: 3 })))).toBeCloseTo(300, 3)
  })

  it('cuts text holes that sit inside an outer ring', () => {
    const part = partOf('text', { height: 2 })
    // outer 10 x 10 counter-clockwise, hole 4 x 4 clockwise, and a second letter beside it
    part.text = {
      value: 'OI',
      outlines: [SQUARE, [3, 3, 3, 7, 7, 7, 7, 3], [20, 0, 22, 0, 22, 10, 20, 10]],
    }
    const mesh = shapeMesh(part)
    expect(isClosedMesh(mesh)).toBe(true)
    expect(meshVolume(mesh)).toBeCloseTo((100 - 16 + 20) * 2, 3)
  })

  it('gives an empty mesh for text without outlines', () => {
    const part = partOf('text')
    part.text = { value: '', outlines: [] }
    expect(triangleCount(shapeMesh(part))).toBe(0)
  })

  it('turns and moves a mesh with transformMesh', () => {
    const { min, max } = meshBounds(
      transformMesh(shapeMesh(box(10, 20, 30)), [5, 0, 0], [0, 0, 90]),
    )
    const want = { min: [-5, -5, 0], max: [15, 5, 30] }
    for (let k = 0; k < 3; k++) {
      expect(min[k]).toBeCloseTo(want.min[k]!, 4)
      expect(max[k]).toBeCloseTo(want.max[k]!, 4)
    }
  })
})
