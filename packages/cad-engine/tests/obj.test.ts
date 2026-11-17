import { describe, expect, it } from 'vitest'
import { meshVolume, triangleCount } from '../src/mesh'
import type { Mesh } from '../src/model'
import { readObj, writeObj } from '../src/obj'
import { cube } from './helpers'

const text = (s: string) => new TextEncoder().encode(s)

function okMesh(result: ReturnType<typeof readObj>): { mesh: Mesh; closed: boolean } {
  if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`)
  return result
}

function corners(mesh: Mesh, from: number): number[][] {
  const p = mesh.positions
  return Array.from(mesh.indices.subarray(from, from + 3)).map((i) => [p[i * 3]!, p[i * 3 + 1]!])
}

describe('OBJ', () => {
  it('fan-triangulates a quad written with v/t/n entries', () => {
    const src = [
      '# a square',
      'mtllib x.mtl',
      'o square',
      'v 0 0 0',
      'v 1 0 0',
      'v 1 1 0',
      'v 0 1 0',
      'vt 0 0',
      'vn 0 0 1',
      'g g1',
      's off',
      'usemtl m',
      'f 1/1/1 2/2/2 3/3/3 4/4/4',
    ].join('\r\n')
    const { mesh, closed } = okMesh(readObj(text(src)))
    expect(triangleCount(mesh)).toBe(2)
    expect(Array.from(mesh.indices)).toEqual([0, 1, 2, 0, 2, 3])
    expect(closed).toBe(false)
  })

  it('accepts i/t and i//n entries', () => {
    const src = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1/1 2//1 3\n'
    expect(triangleCount(okMesh(readObj(text(src))).mesh)).toBe(1)
  })

  it('resolves negative indices against the vertices read so far', () => {
    const src = 'v 9 9 9\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\nv 5 5 5\nf -4 -3 -2\n'
    const { mesh } = okMesh(readObj(text(src)))
    expect(triangleCount(mesh)).toBe(2)
    const expected = [
      [0, 0],
      [1, 0],
      [0, 1],
    ]
    expect(corners(mesh, 0)).toEqual(expected)
    expect(corners(mesh, 3)).toEqual(expected)
  })

  it('calls an index out of range or 0 broken', () => {
    const tri = 'v 0 0 0\nv 1 0 0\nv 0 1 0\n'
    expect(readObj(text(`${tri}f 1 2 4\n`)).status).toBe('broken')
    expect(readObj(text(`${tri}f 0 1 2\n`)).status).toBe('broken')
    expect(readObj(text(`${tri}f -4 1 2\n`)).status).toBe('broken')
    expect(readObj(text(`${tri}f 1 2\n`)).status).toBe('broken')
    expect(readObj(text('v 0 0 x\nf 1 1 1\n')).status).toBe('broken')
  })

  it('round-trips a box', () => {
    const box = cube([0, 0, 0], [10, 20, 30.5])
    const bytes = writeObj(box)
    const src = new TextDecoder().decode(bytes)
    expect(src.split('\n')[0]).toBe('# Hanpan')
    expect(src).toContain('v 10 20 30.5\n')
    expect(src).toContain('f 1 4 3\n')
    const { mesh, closed } = okMesh(readObj(bytes))
    expect(closed).toBe(true)
    expect(meshVolume(mesh)).toBeCloseTo(meshVolume(box), 6)
  })

  it('reads a single open triangle as open', () => {
    const { closed } = okMesh(readObj(text('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n')))
    expect(closed).toBe(false)
  })

  it('calls 0 bytes empty and applies the limits', () => {
    expect(readObj(new Uint8Array(0)).status).toBe('empty')
    expect(readObj(text('# nothing here\nv 0 0 0\n')).status).toBe('empty')
    const bytes = writeObj(cube([0, 0, 0], [1, 1, 1]))
    expect(readObj(bytes, { maxBytes: 10 }).status).toBe('too-large')
    expect(readObj(bytes, { maxTriangles: 11 }).status).toBe('too-large')
    expect(readObj(bytes, { maxTriangles: 12 }).status).toBe('ok')
  })
})
