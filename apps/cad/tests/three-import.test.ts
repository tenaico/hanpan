/**
 * 3MF, GLB and PLY files: three's readers turn them into one engine mesh in
 * millimetres with +Z up, colours and materials dropped. The test files are
 * made here (a zip written with three's own fflate copy, three's GLB and PLY
 * exporters); no sample file is kept in the repository.
 */
import { describe, expect, it } from 'vitest'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh as ThreeMesh,
  MeshStandardMaterial,
  Scene,
} from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js'
import { strToU8, zipSync } from 'three/examples/jsm/libs/fflate.module.js'
import { meshBounds, meshVolume, triangleCount, type MeshPart } from '@genoffice/cad-engine'
import { openResult, openResultToSession } from '../src/renderer/document/open'
import { meshFromThree, readThreeMesh } from '../src/renderer/import/three-mesh'

const UNTITLED = 'Untitled Drawing'

/** Corners and outward-facing triangles of an axis-aligned box. */
function box(min: [number, number, number], max: [number, number, number]) {
  const [x0, y0, z0] = min
  const [x1, y1, z1] = max
  const vertices = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ]
  const quads = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [1, 2, 6, 5],
    [3, 0, 4, 7],
  ]
  const triangles: number[][] = []
  for (const [a, b, c, d] of quads) triangles.push([a!, b!, c!], [a!, c!, d!])
  return { vertices, triangles }
}

/** A 3MF package with one object per box; each build item may move its object. */
function make3mf(items: Array<{ size: number; transform?: string }>): Uint8Array {
  const objects = items
    .map(({ size }, i) => {
      const { vertices, triangles } = box([0, 0, 0], [size, size, size])
      const vs = vertices.map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join('')
      const ts = triangles.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join('')
      return `<object id="${i + 1}" type="model"><mesh><vertices>${vs}</vertices><triangles>${ts}</triangles></mesh></object>`
    })
    .join('')
  const build = items
    .map(({ transform }, i) =>
      transform
        ? `<item objectid="${i + 1}" transform="${transform}"/>`
        : `<item objectid="${i + 1}"/>`,
    )
    .join('')
  const model = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources>${objects}</resources><build>${build}</build></model>`
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
    ),
    '3D/3dmodel.model': strToU8(model),
  })
}

async function makeGlb(scene: Scene): Promise<Uint8Array> {
  const out = await new GLTFExporter().parseAsync(scene, { binary: true })
  return new Uint8Array(out as ArrayBuffer)
}

function makePly(mesh: ThreeMesh): Uint8Array {
  // the exporter returns the file at once; its callback waits for an animation frame
  const text = new PLYExporter().parse(mesh, () => {}, { binary: false }) as string
  return new TextEncoder().encode(text)
}

const only = (parts: unknown[]): MeshPart => {
  expect(parts).toHaveLength(1)
  return parts[0] as MeshPart
}

describe('reading 3MF, GLB and PLY', () => {
  it('a 3MF made in the test opens as one mesh part', async () => {
    const bytes = make3mf([{ size: 10 }, { size: 5, transform: '1 0 0 0 1 0 0 0 1 20 0 0' }])
    const opened = await openResult(
      { status: 'import', bytes, name: 'Bracket', ext: '3mf' },
      UNTITLED,
      '/x/Bracket.3mf',
    )
    expect(opened.notice).toBeNull()
    expect(opened.session.title()).toBe('Bracket')
    expect(opened.session.path()).toBeUndefined()
    const part = only(opened.session.history.current().parts)
    expect(part.type).toBe('mesh')
    expect(part.name).toBe('Bracket')
    // two closed boxes side by side, in millimetres, the second moved by its build item
    expect(part.closed).toBe(true)
    expect(triangleCount(part.mesh)).toBe(24)
    expect(meshVolume(part.mesh)).toBeCloseTo(1000 + 125, 3)
    expect(meshBounds(part.mesh)).toEqual({ min: [0, 0, 0], max: [25, 10, 10] })
  })

  it('a GLB with two meshes becomes one mesh, metres to millimetres and +Y up to +Z up', async () => {
    const scene = new Scene()
    const material = new MeshStandardMaterial({ color: 0xff0000 })
    // 1 m wide, 2 m tall (glTF +Y), 3 m deep (glTF +Z)
    scene.add(new ThreeMesh(new BoxGeometry(1, 2, 3), material))
    const second = new ThreeMesh(new BoxGeometry(1, 1, 1), material)
    second.position.set(2, 0, 0)
    scene.add(second)
    const read = await readThreeMesh(await makeGlb(scene), 'glb')
    expect(read.status).toBe('ok')
    if (read.status !== 'ok') return
    expect(triangleCount(read.mesh)).toBe(24)
    const { min, max } = meshBounds(read.mesh)
    // x: -0.5 m to 2.5 m; height (glTF y) becomes z; glTF z becomes -y
    expect(min[0]).toBeCloseTo(-500, 3)
    expect(max[0]).toBeCloseTo(2500, 3)
    expect(min[2]).toBeCloseTo(-1000, 3)
    expect(max[2]).toBeCloseTo(1000, 3)
    expect(min[1]).toBeCloseTo(-1500, 3)
    expect(max[1]).toBeCloseTo(1500, 3)
    expect(read.closed).toBe(true)
    // turning the axes keeps the triangles facing outwards
    expect(meshVolume(read.mesh) / 7e9).toBeCloseTo(1, 5)
  })

  it('a PLY opens', async () => {
    const bytes = makePly(new ThreeMesh(new BoxGeometry(10, 10, 10)))
    const opened = await openResult(
      { status: 'import', bytes, name: 'cube', ext: 'ply' },
      UNTITLED,
      '/x/cube.ply',
    )
    expect(opened.notice).toBeNull()
    const part = only(opened.session.history.current().parts)
    // the exporter splits the corners per face; welding closes the box again
    expect(part.closed).toBe(true)
    expect(meshVolume(part.mesh)).toBeCloseTo(1000, 3)
    expect(meshBounds(part.mesh)).toEqual({ min: [-5, -5, -5], max: [5, 5, 5] })
  })

  it('a PLY of points only has nothing to open', async () => {
    const text =
      'ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nend_header\n0 0 0\n1 0 0\n0 1 0\n'
    expect(await readThreeMesh(new TextEncoder().encode(text), 'ply')).toEqual({
      status: 'empty',
    })
  })

  it('a file over the triangle limit is refused and the screen says it is too large', async () => {
    const bytes = make3mf([{ size: 10 }])
    expect(await readThreeMesh(bytes, '3mf', { maxTriangles: 11 })).toEqual({
      status: 'too-large',
    })
    expect((await readThreeMesh(bytes, '3mf', { maxTriangles: 12 })).status).toBe('ok')
  })

  it.each(['3mf', 'glb', 'ply'] as const)(
    'a damaged .%s opens an empty drawing that says why',
    async (ext) => {
      const opened = await openResult(
        { status: 'import', bytes: new TextEncoder().encode('not a model at all'), name: 'x', ext },
        UNTITLED,
        `/x/x.${ext}`,
      )
      expect(opened.notice).toBe('import-failed')
      expect(opened.session.history.current().parts).toEqual([])
      expect(opened.session.title()).toBe(UNTITLED)
    },
  )

  it('openResult answers every other result as openResultToSession does', async () => {
    const opened = await openResult({ status: 'too-large' }, UNTITLED, '/x/a.ttukcad')
    expect(opened.notice).toBe('too-large')
  })
})

describe('meshFromThree', () => {
  it('bakes world transforms and joins indexed and non-indexed geometry', () => {
    const outer = new Group()
    outer.position.set(100, 0, 0)
    outer.scale.set(2, 2, 2)
    const indexed = new ThreeMesh(new BoxGeometry(1, 1, 1))
    indexed.position.set(0, 0, 10)
    outer.add(indexed)
    const soup = new BufferGeometry()
    soup.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
    )
    outer.add(new ThreeMesh(soup))
    const mesh = meshFromThree(outer)
    expect(triangleCount(mesh)).toBe(13)
    const { min, max } = meshBounds(mesh)
    expect(min).toEqual([99, -1, 0])
    expect(max).toEqual([102, 2, 21])
  })

  it('a mirrored mesh keeps its triangles facing outwards', () => {
    const mirrored = new ThreeMesh(new BoxGeometry(2, 2, 2))
    mirrored.scale.set(-1, 1, 1)
    expect(meshVolume(meshFromThree(mirrored))).toBeCloseTo(8, 5)
  })
})

describe('the guide', () => {
  it('a CAD file the editor cannot read opens an empty drawing with the guide', () => {
    const opened = openResultToSession(
      { status: 'guide', ext: 'dwg', name: 'Floor Plan' },
      UNTITLED,
      '/x/Floor Plan.dwg',
    )
    expect(opened.guide).toEqual({ ext: 'dwg', name: 'Floor Plan' })
    expect(opened.notice).toBeNull()
    expect(opened.session.history.current().parts).toEqual([])
    expect(opened.session.path()).toBeUndefined()
  })
})
