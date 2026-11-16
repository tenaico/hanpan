// @vitest-environment node
/**
 * The ribbon's and the shortcuts' edits: each is one `history.edit` (one undo
 * step), and what the engine refuses comes back as a status-line message with
 * the drawing left as it was.
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  SHAPE_DIMS,
  createDocument,
  createKernel,
  evaluateDocument,
  meshVolume,
  worldBounds,
  type ShapeKind,
} from '@genoffice/cad-engine'
import { CadSession } from '../src/renderer/document/session'
import {
  alignSelected,
  deleteSelected,
  duplicateSelected,
  groupSelected,
  nudge,
  placeShape,
  selectAll,
  setProperty,
  toggleHole,
  ungroupSelected,
} from '../src/renderer/editing/commands'
import { selection } from '../src/renderer/editing/selection'

const KINDS = Object.keys(SHAPE_DIMS) as ShapeKind[]

const fresh = (): CadSession => new CadSession(createDocument(), { title: 'Untitled' })
const parts = (s: CadSession) => s.history.current().parts
const steps = (s: CadSession): number => {
  let n = 0
  while (s.history.canUndo()) {
    s.history.undo()
    n++
  }
  for (let i = 0; i < n; i++) s.history.redo()
  return n
}

afterEach(() => selection.clear())

describe('the editing commands', () => {
  it('placing each of the 15 shapes adds one part and one undo step', () => {
    expect(KINDS).toHaveLength(15)
    for (const kind of KINDS) {
      const s = fresh()
      const text =
        kind === 'text'
          ? {
              text: {
                value: 'A',
                outlines: [[0, 0, 10, 0, 10, 10, 0, 10]],
              },
            }
          : undefined
      expect(placeShape(s, kind, text), kind).toEqual({ ok: true })
      expect(parts(s), kind).toHaveLength(1)
      expect(steps(s), kind).toBe(1)
      const part = parts(s)[0]!
      expect(part.type === 'shape' && part.shape).toBe(kind)
      // it stands on the workplane, in the middle of it
      const box = worldBounds(part)
      expect(box.min[2], kind).toBeCloseTo(0, 6)
      expect((box.min[0] + box.max[0]) / 2, kind).toBeCloseTo(0, 6)
      expect((box.min[1] + box.max[1]) / 2, kind).toBeCloseTo(0, 6)
      // the new part is the one selected
      expect(selection.ids()).toEqual([part.id])
    }
  })

  it('toggle hole, then group, then evaluate cuts the hole', async () => {
    const s = fresh()
    placeShape(s, 'box')
    const box = selection.ids()[0]!
    placeShape(s, 'cylinder', { dims: { diameter: 8, height: 30 } })
    const hole = selection.ids()[0]!
    expect(toggleHole(s)).toEqual({ ok: true })
    expect(parts(s).find((p) => p.id === hole)!.role).toBe('hole')
    selection.set([box, hole])
    expect(groupSelected(s)).toEqual({ ok: true })
    expect(parts(s)).toHaveLength(1)
    expect(parts(s)[0]!.type).toBe('group')
    expect(selection.ids()).toEqual([parts(s)[0]!.id])
    const kernel = await createKernel()
    try {
      const [result] = evaluateDocument(s.history.current(), kernel)
      const volume = meshVolume(result!.mesh!)
      const cut = Math.PI * 4 * 4 * 20
      expect(volume).toBeLessThan(8000 - cut * 0.9)
      expect(volume).toBeGreaterThan(8000 - cut * 1.1)
    } finally {
      kernel.dispose()
    }
    // H again turns it back into a solid group
    expect(toggleHole(s)).toEqual({ ok: true })
    expect(parts(s)[0]!.role).toBe('hole')
    expect(toggleHole(s)).toEqual({ ok: true })
    expect(parts(s)[0]!.role).toBe('solid')
  })

  it('ungroup puts the children back and selects them', () => {
    const s = fresh()
    placeShape(s, 'box')
    const a = selection.ids()[0]!
    placeShape(s, 'sphere')
    const b = selection.ids()[0]!
    selection.set([a, b])
    groupSelected(s)
    expect(ungroupSelected(s)).toEqual({ ok: true })
    expect(parts(s).map((p) => p.id)).toEqual([a, b])
    expect(selection.ids()).toEqual([a, b])
    // a part that is not a group cannot be taken apart
    selection.set([a])
    expect(ungroupSelected(s)).toEqual({ ok: false, message: 'editNotGroup' })
  })

  it('align centres two parts on x', () => {
    const s = fresh()
    placeShape(s, 'box')
    const a = selection.ids()[0]!
    setProperty(s, [a], { position: [-30, 0, 0] })
    placeShape(s, 'cylinder', { dims: { diameter: 10, height: 5 } })
    const b = selection.ids()[0]!
    setProperty(s, [b], { position: [42, 15, 0] })
    selection.set([a, b])
    const before = steps(s)
    expect(alignSelected(s, 'x', 'center')).toEqual({ ok: true })
    expect(steps(s)).toBe(before + 1)
    const doc = s.history.current()
    const centre = (id: string): number => {
      const box = worldBounds(doc.parts.find((p) => p.id === id)!)
      return (box.min[0] + box.max[0]) / 2
    }
    expect(centre(b)).toBeCloseTo(centre(a), 6)
    // only x moved
    expect(doc.parts.find((p) => p.id === b)!.position[1]).toBe(15)
    // one part is not enough to line up
    selection.set([a])
    expect(alignSelected(s, 'x', 'min')).toEqual({ ok: false, message: 'editTooFew' })
  })

  it('nudge moves by the grid; shift moves ten', () => {
    const s = fresh()
    placeShape(s, 'box')
    const id = selection.ids()[0]!
    expect(nudge(s, 1, 0)).toEqual({ ok: true })
    expect(parts(s)[0]!.position).toEqual([1, 0, 0])
    expect(nudge(s, 0, -10)).toEqual({ ok: true })
    expect(parts(s)[0]!.position).toEqual([1, -10, 0])
    expect(parts(s)[0]!.id).toBe(id)
    expect(steps(s)).toBe(3)
  })

  it('editing a locked part shows the locked message and changes nothing', () => {
    const s = fresh()
    placeShape(s, 'box')
    const id = selection.ids()[0]!
    setProperty(s, [id], { locked: true })
    const doc = s.history.current()
    const before = steps(s)
    expect(nudge(s, 1, 0)).toEqual({ ok: false, message: 'editLocked' })
    expect(setProperty(s, [id], { dims: { width: 40 } })).toEqual({
      ok: false,
      message: 'editLocked',
    })
    expect(setProperty(s, [id], { position: [5, 5, 0] })).toEqual({
      ok: false,
      message: 'editLocked',
    })
    expect(deleteSelected(s)).toEqual({ ok: false, message: 'editLocked' })
    expect(s.history.current()).toBe(doc)
    expect(steps(s)).toBe(before)
    // unlocking is allowed, and then the move lands
    expect(setProperty(s, [id], { locked: false })).toEqual({ ok: true })
    expect(nudge(s, 1, 0)).toEqual({ ok: true })
  })

  it('a value the engine refuses says so and keeps the drawing', () => {
    const s = fresh()
    placeShape(s, 'box')
    const id = selection.ids()[0]!
    const doc = s.history.current()
    expect(setProperty(s, [id], { dims: { width: -5 } })).toEqual({
      ok: false,
      message: 'editBadNumber',
    })
    expect(s.history.current()).toBe(doc)
  })

  it('a property set on several parts is one undo step, and a function patch sees each part', () => {
    const s = fresh()
    placeShape(s, 'box')
    const a = selection.ids()[0]!
    placeShape(s, 'box')
    const b = selection.ids()[0]!
    setProperty(s, [b], { position: [30, 0, 0] })
    const before = steps(s)
    expect(
      setProperty(s, [a, b], (part) => ({
        position: [part.position[0], 7, part.position[2]],
      })),
    ).toEqual({ ok: true })
    expect(steps(s)).toBe(before + 1)
    expect(parts(s).map((p) => p.position)).toEqual([
      [0, 7, 0],
      [30, 7, 0],
    ])
  })

  it('duplicate copies beside the original and selects the copy; delete removes', () => {
    const s = fresh()
    placeShape(s, 'box')
    const id = selection.ids()[0]!
    expect(duplicateSelected(s)).toEqual({ ok: true })
    expect(parts(s)).toHaveLength(2)
    const copy = parts(s)[1]!
    expect(selection.ids()).toEqual([copy.id])
    expect(copy.id).not.toBe(id)
    expect(copy.position).toEqual([10, 10, 0])
    selectAll(s)
    expect(selection.ids()).toEqual([id, copy.id])
    expect(deleteSelected(s)).toEqual({ ok: true })
    expect(parts(s)).toHaveLength(0)
    expect(selection.ids()).toEqual([])
  })

  it('commands that need a selection say so when nothing is selected', () => {
    const s = fresh()
    for (const run of [
      () => deleteSelected(s),
      () => duplicateSelected(s),
      () => toggleHole(s),
      () => nudge(s, 1, 0),
      () => ungroupSelected(s),
    ]) {
      expect(run()).toEqual({ ok: false, message: 'selectFirst' })
    }
    expect(groupSelected(s)).toEqual({ ok: false, message: 'editTooFew' })
    expect(steps(s)).toBe(0)
  })
})
