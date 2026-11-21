/**
 * Edits of the entities inside one drawing part (a DXF or DWG that was opened):
 * delete, move, change text, colour or layer, and add new entities. Entities
 * are addressed by their index in `part.entities`; an edit returns a new
 * document and never changes the one it was given. A locked drawing refuses
 * every edit, like a locked part refuses a move.
 */
import { CadEditError } from './model'
import type { CadDocument, DrawingEntity, DrawingPart, Part } from './model'

/** One change of one entity; only the fields given change. */
export interface EntityPatch {
  index: number
  /** text entities only */
  text?: string
  /** #rrggbb, or null to draw it in the theme ink again */
  color?: string | null
  layer?: string
}

const HEX = /^#[0-9a-f]{6}$/i
/** Coordinates beyond this (mm) are refused, like part positions. */
const MAX_COORD_MM = 1e9

function finite(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > MAX_COORD_MM) {
    throw new CadEditError('bad-number', what)
  }
  return value
}

function point(value: unknown, what: string): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) throw new CadEditError('bad-number', what)
  return [finite(value[0], what), finite(value[1], what)]
}

function layerName(value: unknown): string {
  if (typeof value !== 'string' || value.length > 255) throw new CadEditError('bad-number', 'layer')
  return value
}

function textValue(value: unknown): string {
  if (typeof value !== 'string' || value.length > 10_000)
    throw new CadEditError('bad-number', 'text')
  return value
}

/** A checked copy of an entity given from outside (the AI, the screen). */
export function checkEntity(raw: DrawingEntity): DrawingEntity {
  const e = raw as DrawingEntity & Record<string, unknown>
  const style: { layer: string; color?: string } = { layer: layerName(e.layer ?? '0') }
  if (e.color !== undefined && e.color !== null) {
    if (typeof e.color !== 'string' || !HEX.test(e.color))
      throw new CadEditError('bad-number', 'color')
    style.color = e.color.toLowerCase()
  }
  switch (e.kind) {
    case 'line':
      return { kind: 'line', a: point(e.a, 'a'), b: point(e.b, 'b'), ...style }
    case 'polyline': {
      if (!Array.isArray(e.points) || e.points.length < 4 || e.points.length % 2 !== 0) {
        throw new CadEditError('bad-number', 'points')
      }
      return {
        kind: 'polyline',
        points: e.points.map((v) => finite(v, 'points')),
        closed: e.closed === true,
        ...style,
      }
    }
    case 'circle': {
      const radius = finite(e.radius, 'radius')
      if (radius <= 0) throw new CadEditError('bad-number', 'radius')
      return { kind: 'circle', center: point(e.center, 'center'), radius, ...style }
    }
    case 'arc': {
      const radius = finite(e.radius, 'radius')
      if (radius <= 0) throw new CadEditError('bad-number', 'radius')
      return {
        kind: 'arc',
        center: point(e.center, 'center'),
        radius,
        startDeg: finite(e.startDeg, 'startDeg'),
        endDeg: finite(e.endDeg, 'endDeg'),
        ...style,
      }
    }
    case 'text': {
      const height = finite(e.height, 'height')
      if (height <= 0) throw new CadEditError('bad-number', 'height')
      return {
        kind: 'text',
        at: point(e.at, 'at'),
        height,
        rotationDeg: finite(e.rotationDeg ?? 0, 'rotationDeg'),
        value: textValue(e.value),
        ...style,
      }
    }
    default:
      throw new CadEditError('bad-number', 'kind')
  }
}

function findDrawing(parts: readonly Part[], id: string): DrawingPart | undefined {
  for (const p of parts) {
    if (p.id === id && p.type === 'drawing') return p
    if (p.type === 'group') {
      const found = findDrawing(p.children, id)
      if (found) return found
    }
  }
  return undefined
}

/** The drawing part with this id, anywhere in the document. */
export function findDrawingPart(doc: CadDocument, id: string): DrawingPart | undefined {
  return findDrawing(doc.parts, id)
}

/** Replaces the drawing's entity list; refuses an unknown id and a locked drawing. */
function withEntities(
  doc: CadDocument,
  id: string,
  change: (entities: readonly DrawingEntity[]) => DrawingEntity[],
): CadDocument {
  const part = findDrawingPart(doc, id)
  if (!part) throw new CadEditError('unknown-id', id)
  if (part.locked) throw new CadEditError('locked', id)
  const entities = change(part.entities)
  const walk = (parts: Part[]): Part[] =>
    parts.map((p) => {
      if (p === part) return { ...part, entities }
      if (p.type === 'group') {
        const children = walk(p.children)
        return children.some((c, i) => c !== p.children[i]) ? { ...p, children } : p
      }
      return p
    })
  return { ...doc, parts: walk(doc.parts) }
}

function checkIndices(indices: readonly number[], count: number): Set<number> {
  const out = new Set<number>()
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= count) {
      throw new CadEditError('unknown-id', `entity ${String(i)}`)
    }
    out.add(i)
  }
  return out
}

export function deleteDrawingEntities(
  doc: CadDocument,
  partId: string,
  indices: readonly number[],
): CadDocument {
  return withEntities(doc, partId, (entities) => {
    const gone = checkIndices(indices, entities.length)
    return entities.filter((_, i) => !gone.has(i))
  })
}

function shifted(e: DrawingEntity, dx: number, dy: number): DrawingEntity {
  const move = (p: [number, number]): [number, number] => [p[0] + dx, p[1] + dy]
  switch (e.kind) {
    case 'line':
      return { ...e, a: move(e.a), b: move(e.b) }
    case 'polyline':
      return { ...e, points: e.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) }
    case 'circle':
    case 'arc':
      return { ...e, center: move(e.center) }
    case 'text':
      return { ...e, at: move(e.at) }
  }
}

export function moveDrawingEntities(
  doc: CadDocument,
  partId: string,
  indices: readonly number[],
  delta: readonly [number, number],
): CadDocument {
  const dx = finite(delta[0], 'dx')
  const dy = finite(delta[1], 'dy')
  return withEntities(doc, partId, (entities) => {
    const chosen = checkIndices(indices, entities.length)
    return entities.map((e, i) => (chosen.has(i) ? shifted(e, dx, dy) : e))
  })
}

export function updateDrawingEntities(
  doc: CadDocument,
  partId: string,
  patches: readonly EntityPatch[],
): CadDocument {
  return withEntities(doc, partId, (entities) => {
    const out = entities.slice()
    for (const patch of patches) {
      checkIndices([patch.index], entities.length)
      let next: DrawingEntity = { ...out[patch.index]! }
      if (patch.text !== undefined) {
        if (next.kind !== 'text') throw new CadEditError('bad-number', 'text on a non-text entity')
        next = { ...next, value: textValue(patch.text) }
      }
      if (patch.layer !== undefined) next.layer = layerName(patch.layer)
      if (patch.color === null) delete next.color
      else if (patch.color !== undefined) {
        if (!HEX.test(patch.color)) throw new CadEditError('bad-number', 'color')
        next.color = patch.color.toLowerCase()
      }
      out[patch.index] = next
    }
    return out
  })
}

export function addDrawingEntities(
  doc: CadDocument,
  partId: string,
  added: readonly DrawingEntity[],
): CadDocument {
  const checked = added.map(checkEntity)
  return withEntities(doc, partId, (entities) => [...entities, ...checked])
}

/** Each layer once, in first-use order, with how many entities it holds. */
export function drawingLayers(part: DrawingPart): { layer: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const e of part.entities) counts.set(e.layer, (counts.get(e.layer) ?? 0) + 1)
  return [...counts].map(([layer, count]) => ({ layer, count }))
}
