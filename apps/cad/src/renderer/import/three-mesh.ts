/**
 * 3MF, GLB and PLY files, read with three's readers and turned into one
 * engine mesh. These readers need a DOM (XML parsing, images), so they live
 * in the renderer and not in the engine.
 *
 * Every mesh in the file is joined into one triangle soup in world space,
 * then welded like an STL. Colours, materials, textures, points and lines are
 * dropped. Units: 3MF follows its model's `unit` (millimetre when absent;
 * three reads it but does not apply it), GLB is metres with +Y up (the glTF
 * rule), both turned into millimetres with +Z up; PLY is taken as it is.
 */
import { Group, Mesh as ThreeMesh, Vector3 } from 'three'
import type { BufferGeometry, Matrix4, Object3D } from 'three'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import { strFromU8, unzipSync } from 'three/examples/jsm/libs/fflate.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import {
  MAX_FILE_BYTES,
  MAX_TRIANGLES,
  isClosedMesh,
  weldMesh,
  type Mesh,
  type MeshReadOptions,
  type MeshReadResult,
} from '@genoffice/cad-engine'

/** The files three reads for this editor. */
export type ThreeExt = '3mf' | 'glb' | 'ply'

export function isThreeExt(ext: string): ext is ThreeExt {
  return ext === '3mf' || ext === 'glb' || ext === 'ply'
}

/** glTF lengths are metres. */
const GLB_TO_MM = 1000

/** Millimetres per 3MF unit (3MF core spec, the model element's `unit`). */
const THREE_MF_UNIT_MM: Readonly<Record<string, number>> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
}

/** How much of the model part is searched for the root element's `unit`. */
const MODEL_HEAD_BYTES = 64 * 1024

/**
 * Millimetres per unit of a 3MF package: the `unit` of the root model's
 * `<model>` element. The root model is the one `_rels/.rels` points at
 * (normally `3D/3dmodel.model`); only that part is unzipped, and only its
 * head is decoded. An absent or unknown unit is a millimetre.
 */
export function threeMfScale(bytes: Uint8Array): number {
  const rels = unzipSync(bytes, { filter: (f) => f.name === '_rels/.rels' })['_rels/.rels']
  const target = rels
    ? /Target\s*=\s*["']\/?([^"']+\.model)["']/i.exec(strFromU8(rels))?.[1]
    : undefined
  const name = target ?? '3D/3dmodel.model'
  const model = unzipSync(bytes, { filter: (f) => f.name === name })[name]
  if (!model) return 1
  const head = strFromU8(model.subarray(0, MODEL_HEAD_BYTES))
  const unit = /<(?:[\w-]+:)?model\b[^>]*?\sunit\s*=\s*["']([^"']*)["']/.exec(head)?.[1]
  return (unit && THREE_MF_UNIT_MM[unit.trim().toLowerCase()]) || 1
}

function isMesh(node: Object3D): node is ThreeMesh {
  return (node as ThreeMesh).isMesh === true
}

/** Triangles a geometry draws; a non-indexed one draws its corners three by three. */
function geometryTriangles(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position')
  if (!position) return 0
  return Math.floor((geometry.index ? geometry.index.count : position.count) / 3)
}

/** Every triangle `meshFromThree` would take, counted before any copy is made. */
export function countThreeTriangles(object: Object3D): number {
  let total = 0
  object.traverse((node) => {
    if (isMesh(node)) total += geometryTriangles(node.geometry)
  })
  return total
}

/**
 * All meshes under `object` as one engine mesh in world space. World
 * transforms are baked in; a mirroring transform has its triangles turned
 * back so they still face outwards. Vertices are not shared between meshes
 * and not welded here.
 */
export function meshFromThree(object: Object3D): Mesh {
  object.updateWorldMatrix(true, true)
  const total = countThreeTriangles(object)
  const positions: number[] = []
  const indices = new Uint32Array(total * 3)
  let used = 0
  const corner = new Vector3()
  object.traverse((node) => {
    if (!isMesh(node)) return
    const geometry = node.geometry
    const position = geometry.getAttribute('position')
    const triangles = geometryTriangles(geometry)
    if (!position || triangles === 0) return
    const matrix: Matrix4 = node.matrixWorld
    const base = positions.length / 3
    for (let i = 0; i < position.count; i++) {
      corner.fromBufferAttribute(position, i).applyMatrix4(matrix)
      positions.push(corner.x, corner.y, corner.z)
    }
    const flip = matrix.determinant() < 0
    const index = geometry.index
    for (let t = 0; t < triangles; t++) {
      const a = index ? index.getX(t * 3) : t * 3
      const b = index ? index.getX(t * 3 + 1) : t * 3 + 1
      const c = index ? index.getX(t * 3 + 2) : t * 3 + 2
      indices[used++] = base + a
      indices[used++] = base + (flip ? c : b)
      indices[used++] = base + (flip ? b : c)
    }
  })
  return { positions: Float32Array.from(positions), indices: indices.slice(0, used) }
}

/** The bytes as an ArrayBuffer of their own, as three's readers take them. */
function arrayBufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer
}

/** The file as three objects, in the file's own units and axes; throws when it does not parse. */
async function parse(bytes: Uint8Array, ext: ThreeExt): Promise<Object3D | null> {
  switch (ext) {
    case '3mf': {
      const group = new ThreeMFLoader().parse(arrayBufferOf(bytes))
      const scale = threeMfScale(bytes)
      if (scale === 1) return group
      const root = new Group()
      root.scale.setScalar(scale)
      root.add(group)
      return root
    }
    case 'ply': {
      const geometry = new PLYLoader().parse(arrayBufferOf(bytes))
      // a PLY without faces is a point cloud: nothing to build a solid from
      if (!geometry.index) return null
      return new ThreeMesh(geometry)
    }
    case 'glb': {
      const gltf = await new GLTFLoader().parseAsync(arrayBufferOf(bytes), '')
      // metres with +Y up become millimetres with +Z up: a quarter turn about X
      const root = new Group()
      root.rotation.x = Math.PI / 2
      root.scale.setScalar(GLB_TO_MM)
      root.add(gltf.scene)
      return root
    }
  }
}

/**
 * Reads a 3MF, GLB or PLY file into one welded mesh, with the same answers
 * as the engine's STL and OBJ readers: `too-large` over the file size or the
 * triangle limit, `empty` when it holds no triangles, `broken` when it does
 * not parse.
 */
export async function readThreeMesh(
  bytes: Uint8Array,
  ext: ThreeExt,
  options?: MeshReadOptions,
): Promise<MeshReadResult> {
  if (bytes.byteLength === 0) return { status: 'empty' }
  if (bytes.byteLength > (options?.maxBytes ?? MAX_FILE_BYTES)) return { status: 'too-large' }
  let object: Object3D | null
  try {
    object = await parse(bytes, ext)
  } catch {
    return { status: 'broken' }
  }
  if (!object) return { status: 'empty' }
  const triangles = countThreeTriangles(object)
  if (triangles > (options?.maxTriangles ?? MAX_TRIANGLES)) return { status: 'too-large' }
  if (triangles === 0) return { status: 'empty' }
  const soup = meshFromThree(object)
  for (const v of soup.positions) if (!Number.isFinite(v)) return { status: 'broken' }
  const mesh = weldMesh(soup)
  if (mesh.indices.length === 0) return { status: 'empty' }
  return { status: 'ok', mesh, closed: isClosedMesh(mesh) }
}
