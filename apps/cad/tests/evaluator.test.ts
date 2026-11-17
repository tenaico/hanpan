// @vitest-environment node
/**
 * The tab's evaluator: one manifold kernel and one cache, so a change to one
 * part does not compute the others again (a large imported mesh stays cheap).
 */
import { describe, expect, it, vi } from 'vitest'
import {
  addPart,
  addShape,
  makeMesh,
  newId,
  createDocument,
  createKernel,
  groupParts,
  updatePart,
  type Kernel,
  type MeshPart,
  type Part,
} from '@genoffice/cad-engine'
import { DocEvaluator } from '../src/renderer/scene/evaluator'

/** A kernel that counts its boolean operations. */
async function countingKernel(): Promise<{ kernel: Kernel; calls: () => number }> {
  const real = await createKernel()
  let calls = 0
  return {
    kernel: {
      union: (meshes) => {
        calls++
        return real.union(meshes)
      },
      subtract: (base, cutters) => {
        calls++
        return real.subtract(base, cutters)
      },
      dispose: () => real.dispose(),
    },
    calls: () => calls,
  }
}

describe('DocEvaluator', () => {
  it('unchanged parts are not evaluated twice', async () => {
    const { kernel, calls } = await countingKernel()
    const a = addShape(createDocument(), 'box', { name: 'A', position: [-40, 0, 0] })
    const b = addShape(a.doc, 'box', { name: 'B', position: [40, 0, 0] })
    const c = addShape(b.doc, 'cylinder', {
      name: 'C',
      role: 'hole',
      position: [40, 0, 0],
      dims: { diameter: 8, height: 30 },
    })
    const g = groupParts(c.doc, [b.id, c.id])
    const doc = g.doc

    const evaluator = new DocEvaluator(kernel)
    const first = evaluator.update(doc)
    expect(first.map((p) => p.id)).toEqual([a.id, g.id])
    expect(first.every((p) => p.issue === null && p.mesh !== null)).toBe(true)
    const booleans = calls()
    expect(booleans).toBeGreaterThan(0)

    // moving A leaves the group's object as it was: its boolean is not redone
    const moved = updatePart(doc, a.id, { position: [-50, 0, 0] })
    const second = evaluator.update(moved)
    expect(calls()).toBe(booleans)
    expect(second[1]!.mesh).toBe(first[1]!.mesh)
    expect(second[0]!.mesh).not.toBe(first[0]!.mesh)

    // the same document again computes nothing at all
    const third = evaluator.update(moved)
    expect(calls()).toBe(booleans)
    expect(third[0]!.mesh).toBe(second[0]!.mesh)
    evaluator.dispose()
  })

  it('the cache keeps results only for the parts of the current document', async () => {
    const { kernel } = await countingKernel()
    const mesh: MeshPart = {
      id: newId(),
      type: 'mesh',
      name: 'scan',
      role: 'solid',
      color: '#888888',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      hidden: false,
      locked: false,
      mesh: makeMesh([0, 0, 0, 10, 0, 0, 0, 10, 0], [0, 1, 2]),
      closed: false,
    }
    const box = addShape(addPart(createDocument(), mesh), 'box', { name: 'B' })
    const hole = addShape(box.doc, 'cylinder', { name: 'H', role: 'hole' })
    const grouped = groupParts(hole.doc, [box.id, hole.id])
    let doc = grouped.doc
    const evaluator = new DocEvaluator(kernel)
    evaluator.update(doc)
    // the undo stack keeps every older document, and with it every moved copy's part object
    const older: Part[] = []
    for (let i = 1; i <= 5; i++) {
      older.push(doc.parts.find((p) => p.id === mesh.id)!)
      doc = updatePart(doc, mesh.id, { position: [i * 10, 0, 0] })
      evaluator.update(doc)
    }
    for (const old of older) expect(evaluator.holds(old)).toBe(false)
    for (const part of doc.parts) expect(evaluator.holds(part)).toBe(true)
    // the group's children are kept too, so the group's boolean is not redone
    const group = doc.parts.find((p) => p.id === grouped.id)!
    expect(group.type === 'group' && group.children.every((c) => evaluator.holds(c))).toBe(true)
    evaluator.dispose()
  })

  it('a part that cannot be computed is reported and the rest still comes out', async () => {
    const { kernel } = await countingKernel()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const a = addShape(createDocument(), 'box', { name: 'A' })
    const b = addShape(a.doc, 'sphere', { name: 'B', position: [30, 0, 0] })
    // a shape the engine's checks would never let through, put in by hand
    const broken = {
      ...b.doc,
      parts: b.doc.parts.map((p) =>
        p.id === a.id && p.type === 'shape' ? { ...p, shape: 'nonsense' as 'box' } : p,
      ),
    }
    const evaluated = new DocEvaluator(kernel).update(broken)
    expect(evaluated).toHaveLength(2)
    expect(evaluated.find((p) => p.id === a.id)!.mesh).toBeNull()
    expect(evaluated.find((p) => p.id === b.id)!.mesh).not.toBeNull()
    vi.restoreAllMocks()
  })
})
