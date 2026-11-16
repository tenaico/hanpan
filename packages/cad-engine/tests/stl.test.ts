import { describe, expect, it } from 'vitest'
import { makeMesh, meshVolume, triangleCount } from '../src/mesh'
import type { Mesh } from '../src/model'
import { readStl, writeStl } from '../src/stl'
import { weldMesh } from '../src/weld'
import { cube } from './helpers'

function okMesh(result: ReturnType<typeof readStl>): { mesh: Mesh; closed: boolean } {
  if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`)
  return result
}

const text = (s: string) => new TextEncoder().encode(s)

/** A tetrahedron with outward, counter-clockwise faces. */
const TET: number[][][] = [
  [
    [0, 0, 0],
    [0, 1, 0],
    [1, 0, 0],
  ],
  [
    [0, 0, 0],
    [1, 0, 0],
    [0, 0, 1],
  ],
  [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
  ],
  [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
]

/** Builds a binary STL by hand, with a chosen header and count field. */
function binaryStl(header: string, tris: number[][][], count = tris.length): Uint8Array {
  const out = new Uint8Array(84 + 50 * tris.length)
  out.set(text(header).subarray(0, 80))
  const view = new DataView(out.buffer)
  view.setUint32(80, count, true)
  tris.forEach((tri, t) => {
    const at = 84 + t * 50 + 12
    tri.forEach((v, k) => v.forEach((c, i) => view.setFloat32(at + (k * 3 + i) * 4, c, true)))
  })
  return out
}

describe('STL', () => {
  it('round-trips a box', () => {
    const box = cube([0, 0, 0], [10, 20, 30])
    const bytes = writeStl(box)
    expect(bytes.byteLength).toBe(84 + 50 * 12)
    expect(new TextDecoder().decode(bytes.subarray(0, 6))).toBe('Hanpan')
    expect(bytes[6]).toBe(0)
    const { mesh, closed } = okMesh(readStl(bytes))
    expect(closed).toBe(true)
    expect(triangleCount(mesh)).toBe(12)
    expect(mesh.positions.length).toBe(8 * 3)
    expect(Math.abs(meshVolume(mesh) - meshVolume(box))).toBeLessThan(1e-3)
  })

  it('writes face normals and a zero attribute', () => {
    const view = new DataView(writeStl(cube([0, 0, 0], [1, 1, 1])).buffer)
    // the first triangle is on the bottom, facing -z
    const normal = [view.getFloat32(84, true), view.getFloat32(88, true), view.getFloat32(92, true)]
    expect(normal.map((c) => c + 0)).toEqual([0, 0, -1])
    expect(view.getUint16(84 + 48, true)).toBe(0)
  })

  it('reads an ASCII tetrahedron with CRLF, tabs and uppercase keywords', () => {
    const facets = TET.map(
      (tri) =>
        '  FACET NORMAL 0 0 0\r\n\tOUTER LOOP\r\n' +
        tri.map((v) => `\t\tVERTEX   ${v.join('  ')}\r\n`).join('') +
        '\tENDLOOP\r\n  ENDFACET\r\n',
    )
    const src = `  solid tet\r\n${facets.join('')}endsolid tet\r\n`
    const { mesh, closed } = okMesh(readStl(text(src)))
    expect(triangleCount(mesh)).toBe(4)
    expect(mesh.positions.length).toBe(4 * 3)
    expect(closed).toBe(true)
    expect(meshVolume(mesh)).toBeCloseTo(1 / 6)
  })

  it('reads a binary STL whose header starts with "solid" as binary', () => {
    const bytes = binaryStl('solid but binary', TET)
    expect(bytes.byteLength).toBe(84 + 50 * 4)
    const { mesh, closed } = okMesh(readStl(bytes))
    expect(triangleCount(mesh)).toBe(4)
    expect(closed).toBe(true)
  })

  it('calls a binary STL broken when the count says more than the bytes hold', () => {
    expect(readStl(binaryStl('binary', TET, 9)).status).toBe('broken')
  })

  it('calls broken ASCII broken', () => {
    const short = 'solid x\nfacet normal 0 0 0\nouter loop\nvertex 1 2\n'
    expect(readStl(text(short)).status).toBe('broken')
    expect(readStl(text('solid x\nvertex 0 0 0\nvertex 1 0 0\n')).status).toBe('broken')
  })

  it('calls 0 bytes, or a file without triangles, empty', () => {
    expect(readStl(new Uint8Array(0)).status).toBe('empty')
    expect(readStl(text('solid x\nendsolid x\n')).status).toBe('empty')
    expect(readStl(binaryStl('none', [])).status).toBe('empty')
  })

  it('refuses files and meshes over the limits', () => {
    const bytes = writeStl(cube([0, 0, 0], [1, 1, 1]))
    expect(readStl(bytes, { maxBytes: 100 }).status).toBe('too-large')
    expect(readStl(bytes, { maxTriangles: 11 }).status).toBe('too-large')
    expect(readStl(bytes, { maxTriangles: 12 }).status).toBe('ok')
  })

  it('reads a single open triangle as open', () => {
    const { mesh, closed } = okMesh(readStl(binaryStl('one', [TET[0]!])))
    expect(triangleCount(mesh)).toBe(1)
    expect(closed).toBe(false)
  })

  it('drops facets that collapse after welding', () => {
    const flat = [
      [0, 0, 0],
      [0, 0, 0],
      [1, 0, 0],
    ]
    const { mesh } = okMesh(readStl(binaryStl('degenerate', [TET[0]!, flat])))
    expect(triangleCount(mesh)).toBe(1)
  })
})

describe('weldMesh', () => {
  it('welds two triangles that share an edge to 4 vertices', () => {
    const soup = makeMesh(
      [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0],
      [0, 1, 2, 3, 4, 5],
    )
    const welded = weldMesh(soup)
    expect(welded.positions.length).toBe(4 * 3)
    expect(Array.from(welded.indices)).toEqual([0, 1, 2, 0, 2, 3])
  })

  it('merges vertices within the tolerance, also across a cell boundary', () => {
    const soup = makeMesh(
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 1e-6, -1e-6, 0, 1, 0, 0, 0, 0, 1],
      [0, 1, 2, 3, 4, 5],
    )
    expect(weldMesh(soup).positions.length).toBe(4 * 3)
    expect(weldMesh(soup, 1e-9).positions.length).toBe(5 * 3)
  })

  it('does not change its input', () => {
    const box = cube([0, 0, 0], [1, 1, 1])
    const before = Array.from(box.positions)
    weldMesh(box)
    expect(Array.from(box.positions)).toEqual(before)
  })
})
