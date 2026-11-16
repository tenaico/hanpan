import { describe, expect, it } from 'vitest'
import {
  isClosedMesh,
  makeMesh,
  meshBounds,
  meshVolume,
  transformMesh,
  triangleCount,
} from '../src/mesh'
import { cube } from './helpers'

describe('mesh helpers', () => {
  it('measures a box', () => {
    const box = cube([0, 0, 0], [10, 20, 30])
    expect(triangleCount(box)).toBe(12)
    expect(meshVolume(box)).toBeCloseTo(6000)
    expect(meshBounds(box)).toEqual({ min: [0, 0, 0], max: [10, 20, 30] })
    expect(isClosedMesh(box)).toBe(true)
  })

  it('sees an open or badly wound mesh', () => {
    const box = cube([0, 0, 0], [1, 1, 1])
    const open = makeMesh(Array.from(box.positions), Array.from(box.indices).slice(0, 33))
    expect(isClosedMesh(open)).toBe(false)
    const flipped = Array.from(box.indices)
    ;[flipped[1], flipped[2]] = [flipped[2]!, flipped[1]!]
    expect(isClosedMesh(makeMesh(Array.from(box.positions), flipped))).toBe(false)
  })

  it('gives empty bounds for an empty mesh', () => {
    expect(meshBounds(makeMesh([], []))).toEqual({ min: [0, 0, 0], max: [0, 0, 0] })
  })

  it('turns about z then moves', () => {
    const box = cube([-5, -10, 0], [5, 10, 4])
    const moved = transformMesh(box, [5, 0, 0], [0, 0, 90])
    const b = meshBounds(moved)
    b.min.forEach((v, i) => expect(v).toBeCloseTo([-5, -5, 0][i]!))
    b.max.forEach((v, i) => expect(v).toBeCloseTo([15, 5, 4][i]!))
    expect(meshVolume(moved)).toBeCloseTo(meshVolume(box))
  })

  it('does not change the input mesh', () => {
    const box = cube([0, 0, 0], [1, 1, 1])
    const copy = Float32Array.from(box.positions)
    transformMesh(box, [3, 3, 3], [45, 45, 45])
    expect(box.positions).toEqual(copy)
  })
})
