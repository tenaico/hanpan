import { worldBounds } from './bounds'
import { compose, eulerFromMatrix, tidyVec, transformOf } from './geometry'
import { newId } from './ids'
import {
  CadEditError,
  DEFAULT_HOLE_COLOR,
  DEFAULT_SOLID_COLOR,
  SHAPE_DEFAULTS,
  SHAPE_DIMS,
} from './model'
import type {
  CadDocument,
  GroupPart,
  Part,
  PartRole,
  ShapeKind,
  ShapePart,
  TextShape,
  Vec3,
} from './model'

export interface ShapeInit {
  name?: string
  role?: PartRole
  color?: string
  position?: Vec3
  rotation?: Vec3
  dims?: Record<string, number>
  text?: TextShape
}

export interface PartPatch {
  name?: string
  role?: PartRole
  color?: string
  position?: Vec3
  rotation?: Vec3
  hidden?: boolean
  locked?: boolean
  /** Shapes only; merged into the current dimensions. */
  dims?: Record<string, number>
  /** Extruded parts only. */
  height?: number
  /** The text shape only. */
  text?: TextShape
}

/**
 * Sizes and positions stay between a micrometre and a kilometre, so every
 * coordinate fits a Float32 mesh with room to spare.
 */
export const MIN_SIZE_MM = 1e-3
export const MAX_SIZE_MM = 1e6

function positive(value: unknown, what: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < MIN_SIZE_MM ||
    value > MAX_SIZE_MM
  ) {
    throw new CadEditError('bad-number', what)
  }
  return value
}

function vec(value: Vec3 | undefined, what: string): Vec3 | undefined {
  if (value === undefined) return undefined
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_SIZE_MM)
  ) {
    throw new CadEditError('bad-number', what)
  }
  return [value[0], value[1], value[2]]
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new CadEditError('bad-number', what)
  return value
}

function flag(value: unknown, what: string): boolean {
  if (typeof value !== 'boolean') throw new CadEditError('bad-number', what)
  return value
}

function role(value: unknown): PartRole {
  if (value !== 'solid' && value !== 'hole') throw new CadEditError('bad-number', 'role')
  return value
}

function colour(value: unknown): string {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new CadEditError('bad-number', 'color')
  }
  return value
}

function textShape(value: TextShape): TextShape {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof value.value !== 'string' ||
    !Array.isArray(value.outlines) ||
    !value.outlines.every(
      (ring) =>
        Array.isArray(ring) &&
        ring.length % 2 === 0 &&
        ring.every(
          (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_SIZE_MM,
        ),
    )
  ) {
    throw new CadEditError('bad-number', 'text')
  }
  return { value: value.value, outlines: value.outlines.map((ring) => [...ring]) }
}

/** Checks that every dimension of the shape is usable; returns a clean copy. */
export function checkDims(shape: ShapeKind, dims: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const name of SHAPE_DIMS[shape]) out[name] = positive(dims[name], `${shape}.${name}`)
  const bad = (why: string): never => {
    throw new CadEditError('bad-number', `${shape}: ${why}`)
  }
  if (shape === 'tube' && out.innerDiameter! >= out.outerDiameter!) bad('inner >= outer')
  if (shape === 'starPrism') {
    if (out.innerDiameter! >= out.outerDiameter!) bad('inner >= outer')
    if (!Number.isInteger(out.points) || out.points! < 3 || out.points! > 32) bad('points')
  }
  if (shape === 'torus' && out.diameter! <= 2 * out.tubeDiameter!) bad('tube too thick')
  if (shape === 'roundedBox' && out.radius! * 2 >= Math.min(out.width!, out.depth!)) bad('radius')
  return out
}

export function findPart(doc: CadDocument, id: string): Part | undefined {
  const walk = (parts: readonly Part[]): Part | undefined => {
    for (const p of parts) {
      if (p.id === id) return p
      if (p.type === 'group') {
        const found = walk(p.children)
        if (found) return found
      }
    }
    return undefined
  }
  return walk(doc.parts)
}

/** Replaces the part with `id` wherever it sits; throws when it is not there. */
function replacePart(
  doc: CadDocument,
  id: string,
  change: (part: Part) => Part[] | Part,
): CadDocument {
  let found = false
  // Returns the same array when nothing under it changed, so untouched groups
  // keep their identity and caches keyed by part objects stay valid.
  const walk = (parts: Part[]): Part[] => {
    const out: Part[] = []
    let changed = false
    for (const p of parts) {
      if (p.id === id) {
        found = true
        changed = true
        const next = change(p)
        if (Array.isArray(next)) out.push(...next)
        else out.push(next)
      } else if (p.type === 'group') {
        const children = walk(p.children)
        if (children !== p.children) changed = true
        out.push(children === p.children ? p : { ...p, children })
      } else {
        out.push(p)
      }
    }
    return changed ? out : parts
  }
  const parts = walk(doc.parts)
  if (!found) throw new CadEditError('unknown-id', id)
  return { ...doc, parts }
}

export function addPart(doc: CadDocument, part: Part): CadDocument {
  return { ...doc, parts: [...doc.parts, part] }
}

export function addShape(
  doc: CadDocument,
  shape: ShapeKind,
  init: ShapeInit = {},
): { doc: CadDocument; id: string } {
  const partRole = role(init.role ?? 'solid')
  const part: ShapePart = {
    id: newId(),
    type: 'shape',
    shape,
    name: text(init.name ?? shape, 'name'),
    role: partRole,
    color: colour(init.color ?? (partRole === 'hole' ? DEFAULT_HOLE_COLOR : DEFAULT_SOLID_COLOR)),
    position: vec(init.position, 'position') ?? [0, 0, 0],
    rotation: vec(init.rotation, 'rotation') ?? [0, 0, 0],
    hidden: false,
    locked: false,
    dims: checkDims(shape, { ...SHAPE_DEFAULTS[shape], ...init.dims }),
    ...(shape === 'text' ? { text: textShape(init.text ?? { value: '', outlines: [] }) } : {}),
  }
  return { doc: addPart(doc, part), id: part.id }
}

const MOVES: readonly (keyof PartPatch)[] = ['position', 'rotation', 'dims', 'height', 'text']

export function updatePart(doc: CadDocument, id: string, patch: PartPatch): CadDocument {
  return replacePart(doc, id, (part) => {
    const unlocking = patch.locked === false
    if (part.locked && !unlocking && MOVES.some((key) => patch[key] !== undefined)) {
      throw new CadEditError('locked', id)
    }
    const next: Part = { ...part }
    if (patch.name !== undefined) next.name = text(patch.name, 'name')
    if (patch.role !== undefined) next.role = role(patch.role)
    if (patch.color !== undefined) next.color = colour(patch.color)
    if (patch.hidden !== undefined) next.hidden = flag(patch.hidden, 'hidden')
    if (patch.locked !== undefined) next.locked = flag(patch.locked, 'locked')
    if (patch.position !== undefined) next.position = vec(patch.position, 'position')!
    if (patch.rotation !== undefined) next.rotation = vec(patch.rotation, 'rotation')!
    if (patch.dims !== undefined) {
      if (next.type !== 'shape') throw new CadEditError('bad-number', 'dims on a non-shape')
      next.dims = checkDims(next.shape, { ...next.dims, ...patch.dims })
    }
    if (patch.height !== undefined) {
      if (next.type !== 'extrude') throw new CadEditError('bad-number', 'height on a non-extrude')
      next.height = positive(patch.height, 'height')
    }
    if (patch.text !== undefined) {
      if (next.type !== 'shape' || next.shape !== 'text') {
        throw new CadEditError('bad-number', 'text on a non-text shape')
      }
      next.text = textShape(patch.text)
    }
    return next
  })
}

export function removeParts(doc: CadDocument, ids: readonly string[]): CadDocument {
  let out = doc
  for (const id of ids) {
    out = replacePart(out, id, (part) => {
      if (part.locked) throw new CadEditError('locked', id)
      return []
    })
  }
  return out
}

export function groupParts(
  doc: CadDocument,
  ids: readonly string[],
): { doc: CadDocument; id: string } {
  const wanted = new Set(ids)
  if (wanted.size < 2) throw new CadEditError('too-few')
  for (const id of wanted) {
    if (!doc.parts.some((p) => p.id === id)) throw new CadEditError('unknown-id', id)
  }
  const children = doc.parts.filter((p) => wanted.has(p.id))
  const group: GroupPart = {
    id: newId(),
    type: 'group',
    name: 'group',
    role: 'solid',
    color: children[0]!.color,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    children,
  }
  const at = doc.parts.findIndex((p) => wanted.has(p.id))
  const rest = doc.parts.filter((p) => !wanted.has(p.id))
  const parts = [...rest.slice(0, at), group, ...rest.slice(at)]
  return { doc: { ...doc, parts }, id: group.id }
}

/** Puts the children back in the group's place; each keeps where it is in the world. */
export function ungroupPart(doc: CadDocument, id: string): CadDocument {
  return replacePart(doc, id, (part) => {
    if (part.type !== 'group') throw new CadEditError('not-group', id)
    const outer = transformOf(part.position, part.rotation)
    return part.children.map((child) => {
      const tr = compose(outer, transformOf(child.position, child.rotation))
      return { ...child, position: tidyVec(tr.t), rotation: eulerFromMatrix(tr.m) }
    })
  })
}

const AXIS = { x: 0, y: 1, z: 2 } as const

/** Moves every part after the first so its box lines up with the first part box. */
export function alignParts(
  doc: CadDocument,
  ids: readonly string[],
  axis: 'x' | 'y' | 'z',
  anchor: 'min' | 'center' | 'max',
): CadDocument {
  if (new Set(ids).size < 2) throw new CadEditError('too-few')
  const k = AXIS[axis]
  const pick = (part: Part): number => {
    const b = worldBounds(part)
    if (anchor === 'min') return b.min[k]!
    if (anchor === 'max') return b.max[k]!
    return (b.min[k]! + b.max[k]!) / 2
  }
  const top = (id: string): Part => {
    const p = doc.parts.find((q) => q.id === id)
    if (!p) throw new CadEditError('unknown-id', id)
    return p
  }
  const target = pick(top(ids[0]!))
  let out = doc
  for (const id of ids.slice(1)) {
    const part = top(id)
    const position: Vec3 = [...part.position]
    position[k] = position[k]! + (target - pick(part))
    out = updatePart(out, id, { position })
  }
  return out
}

export function setWorkplane(doc: CadDocument, wp: Partial<CadDocument['workplane']>): CadDocument {
  const next = { ...doc.workplane }
  if (wp.width !== undefined) next.width = positive(wp.width, 'workplane.width')
  if (wp.depth !== undefined) next.depth = positive(wp.depth, 'workplane.depth')
  if (wp.grid !== undefined) next.grid = positive(wp.grid, 'workplane.grid')
  return { ...doc, workplane: next }
}

/** A copy of a part with new ids all the way down. */
function withNewIds(part: Part): Part {
  if (part.type === 'group')
    return { ...part, id: newId(), children: part.children.map(withNewIds) }
  return { ...part, id: newId() }
}

/** "Box" becomes "Box 2", "Box 2" becomes "Box 3". */
function nextName(name: string): string {
  const m = /^(.*) (\d+)$/.exec(name)
  return m ? `${m[1]} ${Number(m[2]) + 1}` : `${name} 2`
}

/** Copies top-level parts beside the originals, moved by `offset`; the copies come last. */
export function duplicateParts(
  doc: CadDocument,
  ids: readonly string[],
  offset: Vec3,
): { doc: CadDocument; ids: string[] } {
  const delta = vec(offset, 'offset')!
  const copies: Part[] = []
  for (const id of ids) {
    const part = doc.parts.find((p) => p.id === id)
    if (!part) throw new CadEditError('unknown-id', id)
    const position = vec(
      [part.position[0] + delta[0], part.position[1] + delta[1], part.position[2] + delta[2]],
      'position',
    )!
    copies.push({ ...withNewIds(part), name: nextName(part.name), position, locked: false })
  }
  return { doc: { ...doc, parts: [...doc.parts, ...copies] }, ids: copies.map((p) => p.id) }
}

/** Moves parts by `delta`. A locked part refuses the whole move. */
export function moveParts(doc: CadDocument, ids: readonly string[], delta: Vec3): CadDocument {
  const d = vec(delta, 'delta')!
  if (d[0] === 0 && d[1] === 0 && d[2] === 0) return doc
  let out = doc
  for (const id of ids) {
    const part = findPart(out, id)
    if (!part) throw new CadEditError('unknown-id', id)
    out = updatePart(out, id, {
      position: [part.position[0] + d[0], part.position[1] + d[1], part.position[2] + d[2]],
    })
  }
  return out
}
