/**
 * What the AI's eight tools do to the open drawing. The prompt and the JSON
 * schemas the model sees are in `cad-skill.ts`.
 *
 * Every tool call that changes the model is exactly one `session.history.edit`
 * (apps/cad/AGENTS.md); grouping a whole AI request into one undo step with
 * `openGroup`/`closeGroup` is the panel's job. The input is checked here for
 * its shape (unknown keys are ignored, a wrong type is an error result); the
 * engine checks the numbers again. A refusal of either kind leaves the drawing
 * as it was: the engine throws before the history records anything.
 */
import {
  CadEditError,
  SHAPE_DIMS,
  addShape,
  alignParts,
  groupParts,
  removeParts,
  setWorkplane,
  ungroupPart,
  updatePart,
  worldBounds,
  type CadDocument,
  type CadEditErrorCode,
  type Part,
  type PartPatch,
  type ShapeInit,
  type ShapeKind,
  type Vec3,
} from '@genoffice/cad-engine'
import { SUMMARY_PART_LIMIT, type CadSession } from '../document/session'

export const CAD_TOOL_NAMES = {
  readModel: 'read_model',
  addShapes: 'add_shapes',
  updateShapes: 'update_shapes',
  deleteShapes: 'delete_shapes',
  groupShapes: 'group_shapes',
  ungroupShapes: 'ungroup_shapes',
  alignShapes: 'align_shapes',
  setWorkplane: 'set_workplane',
} as const

export type CadToolName = (typeof CAD_TOOL_NAMES)[keyof typeof CAD_TOOL_NAMES]

export type CadToolResult =
  { ok: true; data: unknown } | { ok: false; error: string; code?: CadEditErrorCode }

/** The most shapes one add_shapes call places, and the most edits one update_shapes call makes. */
export const AI_BATCH_LIMIT = 50

/** The shape kinds, in the engine's order. */
export const SHAPE_KINDS = Object.keys(SHAPE_DIMS) as ShapeKind[]

/**
 * Kinds the AI cannot place: a text shape needs outlines made with a font in
 * the renderer, and a tool call is synchronous.
 */
export const AI_UNSUPPORTED_KINDS: readonly ShapeKind[] = ['text']

const AXES = ['x', 'y', 'z'] as const
const ANCHORS = ['min', 'center', 'max'] as const

/** What each engine refusal means, in words the model can act on. */
const CODE_HINT: Record<CadEditErrorCode, string> = {
  'unknown-id': 'no part has this id; call read_model for the current ids',
  'bad-number':
    'a value is out of range (sizes 0.001 to 1000000 mm, a colour as #rrggbb, a tube or star inner diameter below the outer one)',
  locked: 'the part is locked; unlock it with update_shapes { locked: false } first',
  'too-few': 'this needs at least two different parts',
  'not-group': 'the part is not a group',
}

/** A malformed input: reported as an error result without a code. */
class InputError extends Error {}

type Obj = Record<string, unknown>

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function need(cond: boolean, what: string): asserts cond {
  if (!cond) throw new InputError(what)
}

function str(value: unknown, what: string): string {
  need(typeof value === 'string', `${what} must be a string`)
  return value
}

function optStr(value: unknown, what: string): string | undefined {
  return value === undefined ? undefined : str(value, what)
}

function num(value: unknown, what: string): number {
  need(typeof value === 'number', `${what} must be a number`)
  return value
}

function optVec(value: unknown, what: string): Vec3 | undefined {
  if (value === undefined) return undefined
  need(
    Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number'),
    `${what} must be [x, y, z] (three numbers)`,
  )
  return [value[0], value[1], value[2]]
}

function optBool(value: unknown, what: string): boolean | undefined {
  if (value === undefined) return undefined
  need(typeof value === 'boolean', `${what} must be true or false`)
  return value
}

function optRole(value: unknown, what: string): 'solid' | 'hole' | undefined {
  if (value === undefined) return undefined
  need(value === 'solid' || value === 'hole', `${what} must be "solid" or "hole"`)
  return value
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], what: string): T {
  need(
    typeof value === 'string' && (allowed as readonly string[]).includes(value),
    `${what} must be one of ${allowed.join(', ')}`,
  )
  return value as T
}

/** Ids: a non-empty list of strings, at most `max`. */
function idList(value: unknown, what: string, max = Infinity): string[] {
  need(Array.isArray(value) && value.length > 0, `${what} must be a non-empty list of ids`)
  need(value.length <= max, `${what} has ${value.length} entries; at most ${max} per call`)
  return value.map((v, i) => str(v, `${what}[${i}]`))
}

/**
 * Dimensions by name. Only names the kind has are allowed (a typo such as
 * "radius" on a cylinder is refused instead of silently ignored); when the
 * kind is not known yet (an update of a group) every name must be a number.
 */
function optDims(
  value: unknown,
  kind: ShapeKind | null,
  what: string,
): Record<string, number> | undefined {
  if (value === undefined) return undefined
  need(isObj(value), `${what} must be an object of numbers`)
  const out: Record<string, number> = {}
  for (const [name, v] of Object.entries(value)) {
    if (kind) {
      need(
        SHAPE_DIMS[kind].includes(name),
        `${what}.${name} is not a dimension of ${kind}; it has ${SHAPE_DIMS[kind].join(', ')}`,
      )
    }
    out[name] = num(v, `${what}.${name}`)
  }
  return out
}

interface ShapeOrder {
  kind: ShapeKind
  init: ShapeInit
}

function parseShape(value: unknown, what: string): ShapeOrder {
  need(isObj(value), `${what} must be an object`)
  const kind = oneOf(value.kind, SHAPE_KINDS, `${what}.kind`)
  need(
    !AI_UNSUPPORTED_KINDS.includes(kind),
    `${what}.kind "${kind}" cannot be placed by the assistant; the user places text from the ribbon`,
  )
  const init: ShapeInit = {}
  const name = optStr(value.name, `${what}.name`)
  if (name !== undefined) init.name = name
  const dims = optDims(value.dims, kind, `${what}.dims`)
  if (dims) init.dims = dims
  const position = optVec(value.position, `${what}.position`)
  if (position) init.position = position
  const rotation = optVec(value.rotation, `${what}.rotation`)
  if (rotation) init.rotation = rotation
  const role = optRole(value.role, `${what}.role`)
  if (role) init.role = role
  const color = optStr(value.color, `${what}.color`)
  if (color !== undefined) init.color = color
  return { kind, init }
}

function parseUpdate(doc: CadDocument, value: unknown, what: string): [string, PartPatch] {
  need(isObj(value), `${what} must be an object`)
  const id = str(value.id, `${what}.id`)
  const patch: PartPatch = {}
  const name = optStr(value.name, `${what}.name`)
  if (name !== undefined) patch.name = name
  const role = optRole(value.role, `${what}.role`)
  if (role) patch.role = role
  const color = optStr(value.color, `${what}.color`)
  if (color !== undefined) patch.color = color
  const position = optVec(value.position, `${what}.position`)
  if (position) patch.position = position
  const rotation = optVec(value.rotation, `${what}.rotation`)
  if (rotation) patch.rotation = rotation
  const hidden = optBool(value.hidden, `${what}.hidden`)
  if (hidden !== undefined) patch.hidden = hidden
  const locked = optBool(value.locked, `${what}.locked`)
  if (locked !== undefined) patch.locked = locked
  if (value.height !== undefined) patch.height = num(value.height, `${what}.height`)
  const part = findAnywhere(doc.parts, id)
  const dims = optDims(value.dims, part?.type === 'shape' ? part.shape : null, `${what}.dims`)
  if (dims) patch.dims = dims
  need(Object.keys(patch).length > 0, `${what} changes nothing; give at least one field`)
  return [id, patch]
}

function findAnywhere(parts: readonly Part[], id: string): Part | undefined {
  for (const p of parts) {
    if (p.id === id) return p
    if (p.type === 'group') {
      const found = findAnywhere(p.children, id)
      if (found) return found
    }
  }
  return undefined
}

/** Millimetres with at most two decimals. */
function mm(value: number): number {
  const rounded = Math.round(value * 100) / 100
  return Object.is(rounded, -0) ? 0 : rounded
}

/** The box around every visible top-level part; null for an empty drawing. */
function modelSize(doc: CadDocument): { width: number; depth: number; height: number } | null {
  const visible = doc.parts.filter((p) => !p.hidden)
  if (visible.length === 0) return null
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const part of visible) {
    const box = worldBounds(part)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, box.min[k]!)
      max[k] = Math.max(max[k]!, box.max[k]!)
    }
  }
  return {
    width: mm(max[0]! - min[0]!),
    depth: mm(max[1]! - min[1]!),
    height: mm(max[2]! - min[2]!),
  }
}

interface PartRef {
  id: string
  name: string
  children?: { id: string; name: string }[]
}

function refOf(part: Part): PartRef {
  const ref: PartRef = { id: part.id, name: part.name }
  if (part.type === 'group') ref.children = part.children.map((c) => ({ id: c.id, name: c.name }))
  return ref
}

function readModel(session: CadSession): unknown {
  const doc = session.history.current()
  return {
    summary: session.summary(),
    // the ids of the parts the summary lists, in the same order
    parts: doc.parts.slice(0, SUMMARY_PART_LIMIT).map(refOf),
    workplane: { ...doc.workplane },
    size: modelSize(doc),
  }
}

/**
 * Runs one tool on the drawing. Never throws for a bad input or an engine
 * refusal; those come back as `{ ok: false }` with the drawing unchanged.
 */
export function runCadTool(session: CadSession, name: string, input: unknown): CadToolResult {
  // the index of the entry being applied, so an engine refusal names it
  let at = -1
  let where = ''
  try {
    const args: Obj = isObj(input) ? input : {}
    switch (name) {
      case CAD_TOOL_NAMES.readModel:
        return { ok: true, data: readModel(session) }

      case CAD_TOOL_NAMES.addShapes: {
        const list = args.shapes
        need(Array.isArray(list) && list.length > 0, 'shapes must be a non-empty list')
        need(
          list.length <= AI_BATCH_LIMIT,
          `shapes has ${list.length} entries; at most ${AI_BATCH_LIMIT} per call, split the work into several calls`,
        )
        const orders = list.map((s, i) => parseShape(s, `shapes[${i}]`))
        const ids: string[] = []
        where = 'shapes'
        session.history.edit('AI add shapes', (doc) => {
          let out = doc
          orders.forEach((order, i) => {
            at = i
            const made = addShape(out, order.kind, order.init)
            ids.push(made.id)
            out = made.doc
          })
          return out
        })
        return { ok: true, data: { ids } }
      }

      case CAD_TOOL_NAMES.updateShapes: {
        const list = args.updates
        need(Array.isArray(list) && list.length > 0, 'updates must be a non-empty list')
        need(
          list.length <= AI_BATCH_LIMIT,
          `updates has ${list.length} entries; at most ${AI_BATCH_LIMIT} per call`,
        )
        const doc0 = session.history.current()
        const patches = list.map((u, i) => parseUpdate(doc0, u, `updates[${i}]`))
        where = 'updates'
        session.history.edit('AI update shapes', (doc) =>
          patches.reduce((out, [id, patch], i) => {
            at = i
            return updatePart(out, id, patch)
          }, doc),
        )
        return { ok: true, data: { updated: patches.length } }
      }

      case CAD_TOOL_NAMES.deleteShapes: {
        const ids = idList(args.ids, 'ids')
        session.history.edit('AI delete shapes', (doc) => removeParts(doc, ids))
        return { ok: true, data: { deleted: ids.length } }
      }

      case CAD_TOOL_NAMES.groupShapes: {
        const ids = idList(args.ids, 'ids')
        const groupName = optStr(args.name, 'name')
        let id = ''
        session.history.edit('AI group', (doc) => {
          const made = groupParts(doc, ids)
          id = made.id
          return groupName === undefined ? made.doc : updatePart(made.doc, id, { name: groupName })
        })
        return { ok: true, data: { id } }
      }

      case CAD_TOOL_NAMES.ungroupShapes: {
        const id = str(args.id, 'id')
        const group = session.history.current().parts.find((p) => p.id === id)
        const children = group?.type === 'group' ? group.children.map((c) => c.id) : []
        session.history.edit('AI ungroup', (doc) => ungroupPart(doc, id))
        return { ok: true, data: { ids: children } }
      }

      case CAD_TOOL_NAMES.alignShapes: {
        const ids = idList(args.ids, 'ids')
        const axis = oneOf(args.axis, AXES, 'axis')
        const anchor = oneOf(args.anchor, ANCHORS, 'anchor')
        session.history.edit('AI align', (doc) => alignParts(doc, ids, axis, anchor))
        return { ok: true, data: { aligned: ids.length } }
      }

      case CAD_TOOL_NAMES.setWorkplane: {
        const wp: Partial<CadDocument['workplane']> = {}
        for (const key of ['width', 'depth', 'grid'] as const) {
          if (args[key] !== undefined) wp[key] = num(args[key], key)
        }
        need(Object.keys(wp).length > 0, 'give at least one of width, depth, grid')
        session.history.edit('AI workplane', (doc) => setWorkplane(doc, wp))
        return { ok: true, data: { workplane: { ...session.history.current().workplane } } }
      }

      default:
        return { ok: false, error: `unknown tool: ${name}` }
    }
  } catch (err) {
    if (err instanceof InputError) return { ok: false, error: `invalid input: ${err.message}` }
    if (err instanceof CadEditError) {
      const entry = where && at >= 0 ? `${where}[${at}]: ` : ''
      return {
        ok: false,
        code: err.code,
        error: `${entry}${err.message} (${CODE_HINT[err.code]}). Nothing was changed.`,
      }
    }
    console.error(`[cad] AI tool ${name} failed:`, err)
    return { ok: false, error: `the tool failed: ${String(err)}. Nothing was changed.` }
  }
}
