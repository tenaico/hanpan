// @vitest-environment node
/**
 * The tab's evaluator: one manifold kernel and one cache, so a change to one
 * part does not compute the others again (a large imported mesh stays cheap).
 */
import { describe, expect, it, vi } from 'vitest'
import {
  addShape,
  createDocument,
  createKernel,
  groupParts,
  updatePart,
  type Kernel,
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
