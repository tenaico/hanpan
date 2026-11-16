/**
 * The edits the ribbon, the shortcuts, the menu and the property panel make.
 *
 * Every command is at most one `session.history.edit` (one undo step), the
 * only way the screen changes the model (apps/cad/AGENTS.md). What the engine
 * refuses (`CadEditError`: a locked part, a value out of range) comes back as
 * the key of a one-line status message, and the drawing stays as it was: the
 * engine throws before the history records anything.
 *
 * The commands work on the selected top-level parts (editing/selection.ts) and
 * leave the selection on what they made: a new shape, the copies, the group,
 * the children of an ungrouped group.
 */
import {
  CadEditError,
  addShape,
  alignParts,
  duplicateParts,
  groupParts,
  moveParts,
  removeParts,
  ungroupPart,
  updatePart,
  worldBounds,
  type CadDocument,
  type CadHistory,
  type Part,
  type PartPatch,
  type ShapeInit,
  type ShapeKind,
} from '@genoffice/cad-engine'
import { t, type StringKey } from '../i18n/locale'
import { MOVE_SNAP_MM } from '../scene/handles'
import { selection } from './selection'

export type CommandResult = { ok: true } | { ok: false; message: StringKey }

/** What a command needs of the open drawing. */
export interface EditTarget {
  history: CadHistory
}

/** The arrow keys move this far per step (the position snap). */
export const NUDGE_MM = MOVE_SNAP_MM

/** The name key of each of the 15 shapes, in the engine's order. */
export const SHAPE_LABEL: Record<ShapeKind, StringKey> = {
  box: 'shapeBox',
  cylinder: 'shapeCylinder',
  sphere: 'shapeSphere',
  cone: 'shapeCone',
  pyramid: 'shapePyramid',
  wedge: 'shapeWedge',
  hemisphere: 'shapeHemisphere',
  tube: 'shapeTube',
  torus: 'shapeTorus',
  triPrism: 'shapeTriPrism',
  hexPrism: 'shapeHexPrism',
  roundedBox: 'shapeRoundedBox',
  starPrism: 'shapeStarPrism',
  roof: 'shapeRoof',
  text: 'shapeText',
}

const OK: CommandResult = { ok: true }

/** The status-line key for an error the engine (or a command) threw. */
export function messageFor(err: unknown): StringKey {
  if (err instanceof CadEditError) {
    switch (err.code) {
      case 'locked':
        return 'editLocked'
      case 'too-few':
        return 'editTooFew'
      case 'not-group':
        return 'editNotGroup'
      case 'bad-number':
        return 'editBadNumber'
      default:
        return 'editRefused'
    }
  }
  return 'editRefused'
}

/** Runs one edit; a refusal becomes a message and records nothing. */
function run(
  target: EditTarget,
  label: string,
  change: (doc: CadDocument) => CadDocument,
): CommandResult {
  try {
    target.history.edit(label, change)
    return OK
  } catch (err) {
    if (!(err instanceof CadEditError)) console.error(`[cad] ${label} failed:`, err)
    return { ok: false, message: messageFor(err) }
  }
}

const NOTHING_SELECTED: CommandResult = { ok: false, message: 'selectFirst' }

/** Selected ids that are still top-level parts of the drawing. */
function selectedIn(doc: CadDocument): string[] {
  const top = new Set(doc.parts.map((p) => p.id))
  return selection.ids().filter((id) => top.has(id))
}

/**
 * A new shape in the middle of the workplane, standing on it, and selected.
 * `init` sets dimensions or a text shape's outlines.
 */
export function placeShape(
  target: EditTarget,
  kind: ShapeKind,
  init: ShapeInit = {},
): CommandResult {
  let made: string | null = null
  const result = run(target, `place ${kind}`, (doc) => {
    const added = addShape(doc, kind, { name: t(SHAPE_LABEL[kind]), ...init })
    made = added.id
    const part = added.doc.parts.at(-1)!
    // centred on the plate and resting on it, whatever the shape's own origin
    const box = worldBounds(part)
    const position: Part['position'] = [
      part.position[0] - (box.min[0] + box.max[0]) / 2,
      part.position[1] - (box.min[1] + box.max[1]) / 2,
      part.position[2] - box.min[2],
    ]
    if (position.every((v, k) => Math.abs(v - part.position[k]!) < 1e-9)) return added.doc
    return updatePart(added.doc, added.id, { position })
  })
  if (result.ok && made) selection.set([made])
  return result
}

/** Every visible top-level part. */
export function selectAll(target: EditTarget): void {
  selection.set(
    target.history
      .current()
      .parts.filter((p) => !p.hidden)
      .map((p) => p.id),
  )
}

export function deleteSelected(target: EditTarget): CommandResult {
  const ids = selectedIn(target.history.current())
  if (ids.length === 0) return NOTHING_SELECTED
  const result = run(target, 'delete', (doc) => removeParts(doc, ids))
  if (result.ok) selection.clear()
  return result
}

/** Copies beside the originals, one grid square away, and selects the copies. */
export function duplicateSelected(target: EditTarget): CommandResult {
  const ids = selectedIn(target.history.current())
  if (ids.length === 0) return NOTHING_SELECTED
  let copies: string[] = []
  const result = run(target, 'duplicate', (doc) => {
    const step = doc.workplane.grid
    const made = duplicateParts(doc, ids, [step, step, 0])
    copies = made.ids
    return made.doc
  })
  if (result.ok) selection.set(copies)
  return result
}

export function groupSelected(target: EditTarget): CommandResult {
  const ids = selectedIn(target.history.current())
  if (ids.length < 2) return { ok: false, message: 'editTooFew' }
  let group: string | null = null
  const result = run(target, 'group', (doc) => {
    const made = groupParts(doc, ids)
    group = made.id
    return made.doc
  })
  if (result.ok && group) selection.set([group])
  return result
}

/** Takes the selected groups apart; their children come back selected. */
export function ungroupSelected(target: EditTarget): CommandResult {
  const doc = target.history.current()
  const ids = selectedIn(doc)
  if (ids.length === 0) return NOTHING_SELECTED
  const groups = doc.parts.filter((p) => ids.includes(p.id) && p.type === 'group')
  if (groups.length === 0) return { ok: false, message: 'editNotGroup' }
  const children = groups.flatMap((g) => (g.type === 'group' ? g.children.map((c) => c.id) : []))
  const kept = ids.filter((id) => !groups.some((g) => g.id === id))
  const result = run(target, 'ungroup', (current) =>
    groups.reduce((out, g) => ungroupPart(out, g.id), current),
  )
  if (result.ok) selection.set([...kept, ...children])
  return result
}

/**
 * H: the selection becomes holes; when every selected part is already a hole,
 * they become solids again.
 */
export function toggleHole(target: EditTarget): CommandResult {
  const doc = target.history.current()
  const ids = selectedIn(doc)
  if (ids.length === 0) return NOTHING_SELECTED
  const allHoles = doc.parts.filter((p) => ids.includes(p.id)).every((p) => p.role === 'hole')
  const role = allHoles ? 'solid' : 'hole'
  return run(target, 'toggle hole', (current) =>
    ids.reduce((out, id) => updatePart(out, id, { role }), current),
  )
}

/** Lines the selection up with the part selected first. */
export function alignSelected(
  target: EditTarget,
  axis: 'x' | 'y' | 'z',
  anchor: 'min' | 'center' | 'max',
): CommandResult {
  const ids = selectedIn(target.history.current())
  if (ids.length < 2) return { ok: false, message: 'editTooFew' }
  return run(target, 'align', (doc) => alignParts(doc, ids, axis, anchor))
}

/** Moves the selection by whole snap steps on the workplane (the arrow keys). */
export function nudge(target: EditTarget, dx: number, dy: number): CommandResult {
  const ids = selectedIn(target.history.current())
  if (ids.length === 0) return NOTHING_SELECTED
  return run(target, 'nudge', (doc) => moveParts(doc, ids, [dx * NUDGE_MM, dy * NUDGE_MM, 0]))
}

/**
 * The property panel: one patch for every part in `ids`, as one undo step. A
 * function patch is asked once per part (an edited axis of a position keeps
 * each part's other axes).
 */
export function setProperty(
  target: EditTarget,
  ids: readonly string[],
  patch: PartPatch | ((part: Part) => PartPatch),
): CommandResult {
  if (ids.length === 0) return NOTHING_SELECTED
  return run(target, 'properties', (doc) =>
    ids.reduce((out, id) => {
      const part = out.parts.find((p) => p.id === id)
      if (!part) throw new CadEditError('unknown-id', id)
      return updatePart(out, id, typeof patch === 'function' ? patch(part) : patch)
    }, doc),
  )
}
