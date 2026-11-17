import { describe, expect, it } from 'vitest'
import { createKernel } from '../src/kernel'
import { isClosedMesh, meshVolume, transformMesh, triangleCount } from '../src/mesh'
import type { ShapePart } from '../src/model'
import { shapeMesh } from '../src/shapes'
import { cube, sharedKernel } from './helpers'

function cylinder(diameter: number, height: number): ShapePart {
  return {
    id: 'c',
    type: 'shape',
    shape: 'cylinder',
    name: 'c',
    role: 'hole',
    color: '#b0b4ba',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    dims: { diameter, height },
  }
}

describe('Kernel', () => {
  it('unions two 10 mm boxes that overlap by half', async () => {
    const k = await sharedKernel()
    const out = k.union([cube([0, 0, 0], [10, 10, 10]), cube([5, 0, 0], [15, 10, 10])])
    expect(meshVolume(out)).toBeCloseTo(1500, 3)
    expect(isClosedMesh(out)).toBe(true)
  })

  it('cuts a through-cylinder out of a box', async () => {
    const k = await sharedKernel()
    const hole = transformMesh(shapeMesh(cylinder(4, 12)), [5, 5, -1], [0, 0, 0])
    const out = k.subtract(cube([0, 0, 0], [10, 10, 10]), [hole])
    expect(Math.abs(meshVolume(out) - (1000 - Math.PI * 4 * 10))).toBeLessThan(1)
    expect(isClosedMesh(out)).toBe(true)
  })

  it('gives an empty mesh for an empty union and the base back without cutters', async () => {
    const k = await sharedKernel()
    expect(triangleCount(k.union([]))).toBe(0)
    expect(meshVolume(k.subtract(cube([0, 0, 0], [2, 2, 2]), []))).toBeCloseTo(8, 4)
  })

  it('refuses work after dispose', async () => {
    const k = await createKernel()
    k.dispose()
    expect(() => k.union([cube([0, 0, 0], [1, 1, 1])])).toThrow()
  })
})
