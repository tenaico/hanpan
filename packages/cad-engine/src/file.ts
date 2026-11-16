// .ttukcad files: UTF-8 JSON `{ format, version, document }`.
// Saving is deterministic (fixed key order, 2-space indent, one trailing newline) so that
// save(open(save(doc))) gives the same bytes. Opening is strict: anything malformed is
// reported as 'broken' rather than half-read.

import { decodeBase64, encodeBase64 } from './base64'
import { CadEditError, MAX_FILE_BYTES, MAX_TRIANGLES, SHAPE_DIMS } from './model'
import type {
  CadDocument,
  DrawingEntity,
  Mesh,
  Part,
  PartRole,
  ShapeKind,
  TextShape,
  Vec3,
} from './model'
import { checkDims } from './ops'
import { CAD_FILE_FORMAT, CAD_FILE_VERSION } from './version'

export type OpenStatus = 'ok' | 'empty' | 'too-large' | 'unsupported' | 'broken'

export type OpenFailReason =
  'newer-version' | 'standalone-file' | 'not-json' | 'bad-shape' | 'size' | 'triangles' | 'empty'

export type OpenResult =
  | { status: 'ok'; document: CadDocument }
  | { status: Exclude<OpenStatus, 'ok'>; reason: OpenFailReason }

export interface OpenOptions {
  /** Defaults to MAX_FILE_BYTES. */
  maxBytes?: number
  /** Defaults to MAX_TRIANGLES; counts the triangles of every mesh part in the file. */
  maxTriangles?: number
}

type Json = Record<string, unknown>

const DOC_KEYS = ['workplane', 'title', 'parts'] as const
const BASE_KEYS = [
  'id',
  'type',
  'name',
  'role',
  'color',
  'position',
  'rotation',
  'hidden',
  'locked',
] as const
const TYPE_KEYS: Record<Part['type'], readonly string[]> = {
  shape: ['shape', 'dims', 'text'],
  extrude: ['rings', 'height'],
  mesh: ['mesh', 'closed'],
  drawing: ['entities'],
  group: ['children'],
}

// ---------------------------------------------------------------- save

function f32ToBase64(values: Float32Array): string {
  const bytes = new Uint8Array(values.length * 4)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < values.length; i++) view.setFloat32(i * 4, values[i]!, true)
  return encodeBase64(bytes)
}

function u32ToBase64(values: Uint32Array): string {
  const bytes = new Uint8Array(values.length * 4)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < values.length; i++) view.setUint32(i * 4, values[i]!, true)
  return encodeBase64(bytes)
}

/** Copies `extra` after the known keys, never letting it replace one of them. */
function withExtra(
  out: Json,
  extra: Record<string, unknown> | undefined,
  known: Set<string>,
): Json {
  if (!extra) return out
  for (const [key, value] of Object.entries(extra)) {
    if (!known.has(key) && !(key in out)) out[key] = value
  }
  return out
}

function entityJson(e: DrawingEntity): Json {
  const out = entityShapeJson(e)
  return e.color === undefined ? out : { ...out, color: e.color }
}

function entityShapeJson(e: DrawingEntity): Json {
  switch (e.kind) {
    case 'line':
      return { kind: e.kind, a: e.a, b: e.b, layer: e.layer }
    case 'polyline':
      return { kind: e.kind, points: e.points, closed: e.closed, layer: e.layer }
    case 'circle':
      return { kind: e.kind, center: e.center, radius: e.radius, layer: e.layer }
    case 'arc':
      return {
        kind: e.kind,
        center: e.center,
        radius: e.radius,
        startDeg: e.startDeg,
        endDeg: e.endDeg,
        layer: e.layer,
      }
    case 'text':
      return {
        kind: e.kind,
        at: e.at,
        height: e.height,
        rotationDeg: e.rotationDeg,
        value: e.value,
        layer: e.layer,
      }
  }
}

function partJson(p: Part): Json {
  const out: Json = {
    id: p.id,
    type: p.type,
    name: p.name,
    role: p.role,
    color: p.color,
    position: p.position,
    rotation: p.rotation,
    hidden: p.hidden,
    locked: p.locked,
  }
  switch (p.type) {
    case 'shape':
      out.shape = p.shape
      out.dims = p.dims
      if (p.text !== undefined) out.text = { value: p.text.value, outlines: p.text.outlines }
      break
    case 'extrude':
      out.rings = p.rings
      out.height = p.height
      break
    case 'mesh':
      out.mesh = { positions: f32ToBase64(p.mesh.positions), indices: u32ToBase64(p.mesh.indices) }
      out.closed = p.closed
      break
    case 'drawing':
      out.entities = p.entities.map(entityJson)
      break
    case 'group':
      out.children = p.children.map(partJson)
      break
  }
  return withExtra(out, p.extra, new Set([...BASE_KEYS, ...TYPE_KEYS[p.type]]))
}

export function saveCadFile(doc: CadDocument): Uint8Array {
  const document: Json = {
    workplane: {
      width: doc.workplane.width,
      depth: doc.workplane.depth,
      grid: doc.workplane.grid,
    },
    title: { name: doc.title.name, date: doc.title.date, scale: doc.title.scale },
    parts: doc.parts.map(partJson),
  }
  withExtra(document, doc.extra, new Set(DOC_KEYS))
  const file = { format: CAD_FILE_FORMAT, version: CAD_FILE_VERSION, document }
  const bytes = new TextEncoder().encode(JSON.stringify(file, null, 2) + '\n')
  // Last line of defence: never hand back bytes this engine would refuse to
  // open, or the user would lose the whole document at the next open.
  const check = openCadFile(bytes)
  if (check.status !== 'ok') {
    throw new CadEditError('bad-number', `the document would not reopen (${check.reason})`)
  }
  return bytes
}

// ---------------------------------------------------------------- open

class BadFile extends Error {
  constructor(
    readonly status: 'broken' | 'too-large',
    readonly reason: 'bad-shape' | 'triangles',
  ) {
    super(reason)
  }
}

const bad = (): never => {
  throw new BadFile('broken', 'bad-shape')
}

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

function obj(v: unknown): Json {
  return isObject(v) ? v : bad()
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : bad()
}

function bool(v: unknown): boolean {
  return typeof v === 'boolean' ? v : bad()
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : bad()
}

function positive(v: unknown): number {
  const n = num(v)
  return n > 0 ? n : bad()
}

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : bad()
}

function nums(v: unknown, length?: number): number[] {
  const out = list(v).map(num)
  if (length !== undefined && out.length !== length) bad()
  return out
}

function vec3(v: unknown): Vec3 {
  const [x, y, z] = nums(v, 3)
  return [x!, y!, z!]
}

function vec2(v: unknown): [number, number] {
  const [x, y] = nums(v, 2)
  return [x!, y!]
}

/** A flat [x0, y0, x1, y1, ...] list. */
function ring(v: unknown): number[] {
  const out = nums(v)
  return out.length % 2 === 0 ? out : bad()
}

function role(v: unknown): PartRole {
  return v === 'solid' || v === 'hole' ? v : bad()
}

function extraOf(raw: Json, known: Set<string>): Record<string, unknown> | undefined {
  let extra: Record<string, unknown> | undefined
  for (const [key, value] of Object.entries(raw)) {
    if (known.has(key)) continue
    extra ??= {}
    extra[key] = value
  }
  return extra
}

function entity(v: unknown): DrawingEntity {
  const e = obj(v)
  const shape = entityShape(e)
  // A colour that is not #rrggbb is dropped, not refused: the entity still draws.
  return typeof e.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(e.color)
    ? { ...shape, color: e.color.toLowerCase() }
    : shape
}

function entityShape(e: Record<string, unknown>): DrawingEntity {
  const layer = str(e.layer)
  switch (e.kind) {
    case 'line':
      return { kind: 'line', a: vec2(e.a), b: vec2(e.b), layer }
    case 'polyline':
      return { kind: 'polyline', points: ring(e.points), closed: bool(e.closed), layer }
    case 'circle':
      return { kind: 'circle', center: vec2(e.center), radius: num(e.radius), layer }
    case 'arc':
      return {
        kind: 'arc',
        center: vec2(e.center),
        radius: num(e.radius),
        startDeg: num(e.startDeg),
        endDeg: num(e.endDeg),
        layer,
      }
    case 'text':
      return {
        kind: 'text',
        at: vec2(e.at),
        height: num(e.height),
        rotationDeg: num(e.rotationDeg),
        value: str(e.value),
        layer,
      }
    default:
      return bad()
  }
}

function textShape(v: unknown): TextShape {
  const t = obj(v)
  return { value: str(t.value), outlines: list(t.outlines).map(ring) }
}

interface Reader {
  ids: Set<string>
  triangles: number
  maxTriangles: number
}

function meshOf(v: unknown, reader: Reader): Mesh {
  const m = obj(v)
  let posBytes: Uint8Array
  let idxBytes: Uint8Array
  try {
    posBytes = decodeBase64(str(m.positions))
    idxBytes = decodeBase64(str(m.indices))
  } catch (err) {
    if (err instanceof BadFile) throw err
    return bad()
  }
  if (posBytes.length % 12 !== 0 || idxBytes.length % 12 !== 0) bad()
  const triangles = idxBytes.length / 12
  reader.triangles += triangles
  if (reader.triangles > reader.maxTriangles) throw new BadFile('too-large', 'triangles')
  const posView = new DataView(posBytes.buffer, posBytes.byteOffset, posBytes.byteLength)
  const positions = new Float32Array(posBytes.length / 4)
  for (let i = 0; i < positions.length; i++) {
    const value = posView.getFloat32(i * 4, true)
    if (!Number.isFinite(value)) bad()
    positions[i] = value
  }
  const vertices = positions.length / 3
  const idxView = new DataView(idxBytes.buffer, idxBytes.byteOffset, idxBytes.byteLength)
  const indices = new Uint32Array(idxBytes.length / 4)
  for (let i = 0; i < indices.length; i++) {
    const index = idxView.getUint32(i * 4, true)
    if (index >= vertices) bad()
    indices[i] = index
  }
  return { positions, indices }
}

function part(v: unknown, reader: Reader): Part {
  const raw = obj(v)
  const id = str(raw.id)
  if (reader.ids.has(id)) bad()
  reader.ids.add(id)
  const type = raw.type
  if (typeof type !== 'string' || !Object.hasOwn(TYPE_KEYS, type)) return bad()
  const common = {
    id,
    name: str(raw.name),
    role: role(raw.role),
    color: str(raw.color),
    position: vec3(raw.position),
    rotation: vec3(raw.rotation),
    hidden: bool(raw.hidden),
    locked: bool(raw.locked),
  }
  let out: Part
  switch (type as Part['type']) {
    case 'shape': {
      const shape = str(raw.shape)
      if (!Object.hasOwn(SHAPE_DIMS, shape)) bad()
      const rawDims = obj(raw.dims)
      const dims: Record<string, number> = {}
      for (const [key, value] of Object.entries(rawDims)) dims[key] = num(value)
      try {
        checkDims(shape as ShapeKind, dims)
      } catch {
        bad()
      }
      out = { ...common, type: 'shape', shape: shape as ShapeKind, dims }
      if (raw.text !== undefined) out.text = textShape(raw.text)
      break
    }
    case 'extrude':
      out = {
        ...common,
        type: 'extrude',
        rings: list(raw.rings).map(ring),
        height: positive(raw.height),
      }
      break
    case 'mesh':
      out = { ...common, type: 'mesh', mesh: meshOf(raw.mesh, reader), closed: bool(raw.closed) }
      break
    case 'drawing':
      out = { ...common, type: 'drawing', entities: list(raw.entities).map(entity) }
      break
    case 'group':
      out = {
        ...common,
        type: 'group',
        children: list(raw.children).map((child) => part(child, reader)),
      }
      break
  }
  const extra = extraOf(raw, new Set([...BASE_KEYS, ...TYPE_KEYS[out.type]]))
  if (extra) out.extra = extra
  return out
}

function documentOf(v: unknown, reader: Reader): CadDocument {
  const raw = obj(v)
  const wp = obj(raw.workplane)
  const title = obj(raw.title)
  return {
    workplane: { width: positive(wp.width), depth: positive(wp.depth), grid: positive(wp.grid) },
    title: { name: str(title.name), date: str(title.date), scale: str(title.scale) },
    parts: list(raw.parts).map((p) => part(p, reader)),
    extra: extraOf(raw, new Set(DOC_KEYS)) ?? {},
  }
}

export function openCadFile(bytes: Uint8Array, options: OpenOptions = {}): OpenResult {
  const maxBytes = options.maxBytes ?? MAX_FILE_BYTES
  if (bytes.length === 0) return { status: 'empty', reason: 'empty' }
  if (bytes.length > maxBytes) return { status: 'too-large', reason: 'size' }
  let parsed: unknown
  try {
    // fatal: bytes that are not UTF-8 are refused; a leading BOM is dropped.
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (text.trim() === '') return { status: 'empty', reason: 'empty' }
    parsed = JSON.parse(text)
  } catch {
    return { status: 'broken', reason: 'not-json' }
  }
  if (!isObject(parsed)) return { status: 'broken', reason: 'bad-shape' }
  if (parsed.format !== CAD_FILE_FORMAT) return { status: 'unsupported', reason: 'standalone-file' }
  const version = parsed.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { status: 'broken', reason: 'bad-shape' }
  }
  if (version > CAD_FILE_VERSION) return { status: 'unsupported', reason: 'newer-version' }
  const reader: Reader = {
    ids: new Set(),
    triangles: 0,
    maxTriangles: options.maxTriangles ?? MAX_TRIANGLES,
  }
  try {
    return { status: 'ok', document: documentOf(parsed.document, reader) }
  } catch (err) {
    if (err instanceof BadFile) return { status: err.status, reason: err.reason }
    // e.g. a group nested deeper than the call stack allows
    return { status: 'broken', reason: 'bad-shape' }
  }
}
