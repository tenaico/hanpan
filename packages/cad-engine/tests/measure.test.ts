import { describe, expect, it } from 'vitest'
import {
  distance,
  entityMeasure,
  formatMm,
  nearestSnap,
  partSize,
  snapPointsOfDrawing,
  snapPointsOfMesh,
} from '../src/measure'
import type { DrawingPart } from '../src/model'
import { cube } from './helpers'

function drawing(over: Partial<DrawingPart> = {}): DrawingPart {
  return {
    id: 'd1',
    type: 'drawing',
    name: 'plan',
    role: 'solid',
    color: '#000000',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    entities: [
      { kind: 'line', a: [0, 0], b: [10, 0], layer: '0' },
      { kind: 'circle', center: [50, 50], radius: 5, layer: '0' },
      { kind: 'polyline', points: [0, 0, 3, 0, 3, 4], closed: false, layer: '0' },
      { kind: 'text', at: [1, 1], height: 2, rotationDeg: 0, value: 'A', layer: '0' },
    ],
    ...over,
  }
}

describe('distance and formatting', () => {
  it('measures straight-line distance', () => {
    expect(distance([0, 0, 0], [3, 4, 12])).toBe(13)
  })

  it.each([
    [12, '12'],
    [12.5, '12.5'],
    [12.345, '12.35'],
    [12.3, '12.3'],
    [0.004, '0'],
    [-3.1, '-3.1'],
  ])('formats %s as %s', (value, text) => {
    expect(formatMm(value)).toBe(text)
  })
})

describe('entityMeasure', () => {
  it('gives lengths and diameters', () => {
    expect(entityMeasure({ kind: 'line', a: [0, 0], b: [3, 4], layer: '0' })).toEqual({
      kind: 'length',
      value: 5,
    })
    expect(
      entityMeasure({ kind: 'polyline', points: [0, 0, 3, 0, 3, 4], closed: false, layer: '0' }),
    ).toEqual({ kind: 'length', value: 7 })
    expect(
      entityMeasure({ kind: 'polyline', points: [0, 0, 3, 0, 3, 4], closed: true, layer: '0' }),
    ).toEqual({ kind: 'length', value: 12 })
    expect(entityMeasure({ kind: 'circle', center: [0, 0], radius: 5, layer: '0' })).toEqual({
      kind: 'diameter',
      value: 10,
    })
    expect(
      entityMeasure({
        kind: 'arc',
        center: [0, 0],
        radius: 2,
        startDeg: 0,
        endDeg: 90,
        layer: '0',
      }),
    ).toEqual({ kind: 'diameter', value: 4 })
    expect(
      entityMeasure({
        kind: 'text',
        at: [0, 0],
        height: 1,
        rotationDeg: 0,
        value: 'x',
        layer: '0',
      }),
    ).toBeNull()
  })
})

describe('snap points', () => {
  it('collects line ends and middles, centres and polyline corners', () => {
    const pts = snapPointsOfDrawing(drawing())
    const has = (x: number, y: number, kind: string) =>
      pts.some(
        (p) =>
          p.kind === kind &&
          Math.abs(p.at[0] - x) < 1e-9 &&
          Math.abs(p.at[1] - y) < 1e-9 &&
          p.at[2] === 0,
      )
    expect(has(0, 0, 'end')).toBe(true)
    expect(has(10, 0, 'end')).toBe(true)
    expect(has(5, 0, 'mid')).toBe(true)
    expect(has(50, 50, 'center')).toBe(true)
    expect(has(3, 4, 'vertex')).toBe(true)
  })

  it('follows the drawing position and rotation', () => {
    const pts = snapPointsOfDrawing(drawing({ position: [100, 0, 0], rotation: [0, 0, 90] }))
    const end = pts.find((p) => p.kind === 'end' && Math.abs(p.at[1] - 10) < 1e-9)
    expect(end).toBeDefined()
    expect(end!.at[0]).toBeCloseTo(100)
  })

  it('takes each mesh vertex once and thins large meshes', () => {
    const box = cube([0, 0, 0], [1, 1, 1])
    expect(snapPointsOfMesh(box)).toHaveLength(8)
    expect(snapPointsOfMesh(box, 4)).toHaveLength(4)
    expect(snapPointsOfMesh(box).every((p) => p.kind === 'vertex')).toBe(true)
  })

  it('finds the nearest point within range', () => {
    const pts = snapPointsOfDrawing(drawing())
    expect(nearestSnap(pts, [9.8, 0.1, 0], 1)?.at).toEqual([10, 0, 0])
    expect(nearestSnap(pts, [30, 30, 0], 1)).toBeNull()
  })
})

describe('partSize', () => {
  it('reads width, depth and height from the evaluated mesh', () => {
    expect(partSize({ mesh: cube([0, 0, 0], [40, 20, 10]) })).toEqual({
      width: 40,
      depth: 20,
      height: 10,
    })
    expect(partSize({ mesh: null })).toBeNull()
  })
})
