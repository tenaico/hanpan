import { describe, expect, it } from 'vitest'
import { extrudeMesh } from '../src/extrude'
import { isClosedMesh, meshBounds, meshVolume } from '../src/mesh'
import { CadEditError } from '../src/model'

const OUTER = [0, 0, 10, 0, 10, 10, 0, 10]
const HOLE = [3, 3, 3, 7, 7, 7, 7, 3]

function code(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (e) {
    return e instanceof CadEditError ? e.code : 'other'
  }
  return undefined
}

describe('extrudeMesh', () => {
  it('extrudes a square with a square hole', () => {
    const mesh = extrudeMesh([OUTER, HOLE], 5)
    expect(isClosedMesh(mesh)).toBe(true)
    expect(meshVolume(mesh)).toBeCloseTo(420, 3)
    expect(meshBounds(mesh)).toEqual({ min: [0, 0, 0], max: [10, 10, 5] })
  })

  it('gives the same positive volume for a clockwise outer ring', () => {
    const cw = [0, 0, 0, 10, 10, 10, 10, 0]
    const holeCcw = [3, 3, 7, 3, 7, 7, 3, 7]
    expect(meshVolume(extrudeMesh([cw], 5))).toBeCloseTo(500, 3)
    expect(meshVolume(extrudeMesh([cw, holeCcw], 5))).toBeCloseTo(420, 3)
    expect(isClosedMesh(extrudeMesh([cw, holeCcw], 5))).toBe(true)
  })

  it('drops a repeated closing point and collinear points', () => {
    const ring = [0, 0, 5, 0, 10, 0, 10, 10, 0, 10, 0, 0]
    const mesh = extrudeMesh([ring], 1)
    expect(isClosedMesh(mesh)).toBe(true)
    expect(meshVolume(mesh)).toBeCloseTo(100, 3)
  })

  it('refuses fewer than 3 points or a height <= 0', () => {
    expect(code(() => extrudeMesh([[0, 0, 1, 1]], 5))).toBe('bad-number')
    expect(code(() => extrudeMesh([], 5))).toBe('bad-number')
    expect(code(() => extrudeMesh([OUTER], 0))).toBe('bad-number')
    expect(code(() => extrudeMesh([OUTER], -1))).toBe('bad-number')
    expect(code(() => extrudeMesh([OUTER], NaN))).toBe('bad-number')
  })
})
