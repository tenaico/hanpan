import { describe, expect, it, vi } from 'vitest'
import { createEvalCache, evaluateDocument, evaluatePart } from '../src/evaluate'
import type { Kernel } from '../src/kernel'
import { isClosedMesh, meshBounds, meshVolume, triangleCount } from '../src/mesh'
import { createDocument } from '../src/model'
import type { CadDocument, DrawingPart, GroupPart, MeshPart, Part, ShapePart } from '../src/model'
import { addPart, addShape, groupParts, updatePart } from '../src/ops'
import { cube, sharedKernel } from './helpers'

const HOLE_VOLUME = 1000 - Math.PI * 4 * 10

/** Counts the calls that reach the real kernel. */
async function countingKernel(): Promise<
  Kernel & { union: ReturnType<typeof vi.fn> } & {
    subtract: ReturnType<typeof vi.fn>
  }
> {
  const k = await sharedKernel()
  return { union: vi.fn(k.union), subtract: vi.fn(k.subtract), dispose: () => {} }
}

/** A 10 mm box with a d = 4 cylinder hole through it, grouped. */
function drilledBox(doc: CadDocument, at: [number, number, number] = [0, 0, 0]) {
  const a = addShape(doc, 'box', { dims: { width: 10, depth: 10, height: 10 }, position: at })
  const b = addShape(a.doc, 'cylinder', {
    role: 'hole',
    dims: { diameter: 4, height: 12 },
    position: [at[0], at[1], at[2] - 1],
  })
  return groupParts(b.doc, [a.id, b.id])
}

function base(id: string) {
  return {
    id,
    name: id,
    role: 'solid' as const,
    color: '#5b9bd5',
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    hidden: false,
    locked: false,
  }
}

function group(id: string, children: Part[], extra: Partial<GroupPart> = {}): GroupPart {
  return { ...base(id), type: 'group', children, ...extra }
}

function boxPart(id: string, size: number, extra: Partial<ShapePart> = {}): ShapePart {
  return {
    ...base(id),
    type: 'shape',
    shape: 'box',
    dims: { width: size, depth: size, height: size },
    ...extra,
  }
}

describe('evaluatePart', () => {
  it('cuts the hole children out of the solid children', async () => {
    const k = await sharedKernel()
    const { doc, id } = drilledBox(createDocument())
    const out = evaluatePart(
      doc.parts.find((p) => p.id === id)!,
      k,
    )
    expect(out.id).toBe(id)
    expect(out.issue).toBeNull()
    expect(Math.abs(meshVolume(out.mesh!) - HOLE_VOLUME)).toBeLessThan(1)
    expect(isClosedMesh(out.mesh!)).toBe(true)
  })

  it('gives an empty mesh for a group of holes only', async () => {
    const k = await sharedKernel()
    const g = group('g', [
      boxPart('a', 10, { role: 'hole' }),
      boxPart('b', 5, { role: 'hole', position: [20, 0, 0] }),
    ])
    const out = evaluatePart(g, k)
    expect(out.issue).toBe('empty')
    expect(out.mesh).not.toBeNull()
    expect(triangleCount(out.mesh!)).toBe(0)
  })

  it('does not compute a group that holds an open mesh', async () => {
    const k = await countingKernel()
    const open: MeshPart = {
      ...base('m'),
      type: 'mesh',
      mesh: {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        indices: new Uint32Array([0, 1, 2]),
      },
      closed: false,
    }
    const out = evaluatePart(group('g', [boxPart('a', 10), open]), k)
    expect(out).toEqual({ id: 'g', mesh: null, issue: 'open-mesh' })
    // nested one level down as well
    const nested = evaluatePart(
      group('h', [boxPart('a', 10), group('g', [open, boxPart('b', 1)])]),
      k,
    )
    expect(nested.issue).toBe('open-mesh')
    expect(k.union).not.toHaveBeenCalled()
    expect(k.subtract).not.toHaveBeenCalled()
  })

  it('draws an open mesh on its own without the kernel', async () => {
    const k = await countingKernel()
    const open: MeshPart = {
      ...base('m'),
      type: 'mesh',
      mesh: {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        indices: new Uint32Array([0, 1, 2]),
      },
      closed: false,
      position: [1, 2, 3],
    }
    const out = evaluatePart(open, k)
    expect(out.issue).toBeNull()
    expect(meshBounds(out.mesh!).min).toEqual([1, 2, 3])
  })

  it('draws a lone hole as its own mesh', async () => {
    const k = await sharedKernel()
    const out = evaluatePart(boxPart('h', 10, { role: 'hole' }), k)
    expect(out.issue).toBeNull()
    expect(meshVolume(out.mesh!)).toBeCloseTo(1000, 3)
  })

  it('uses a nested group result as a hole or a solid by its role', async () => {
    const k = await sharedKernel()
    const inner = drilledBox(createDocument()).doc.parts[0] as GroupPart
    // a 20 mm box minus the drilled box (the drilled hole stays filled) = 8000 - (1000 - hole)
    const asHole = group('outer', [
      boxPart('big', 20, { position: [0, 0, 0] }),
      { ...inner, role: 'hole', position: [0, 0, 5] },
    ])
    const cut = evaluatePart(asHole, k)
    expect(cut.issue).toBeNull()
    expect(Math.abs(meshVolume(cut.mesh!) - (8000 - HOLE_VOLUME))).toBeLessThan(1)
    // as a solid beside a lone box: 1000 + (1000 - hole)
    const asSolid = group('outer', [boxPart('other', 10, { position: [30, 0, 0] }), inner])
    const sum = evaluatePart(asSolid, k)
    expect(Math.abs(meshVolume(sum.mesh!) - (1000 + HOLE_VOLUME))).toBeLessThan(1)
  })

  it('places children inside the group frame and the group in the world', async () => {
    const k = await sharedKernel()
    const g = group(
      'g',
      [boxPart('a', 10, { position: [10, 0, 0] }), boxPart('b', 10, { position: [15, 0, 0] })],
      { position: [100, 0, 0], rotation: [0, 0, 90] },
    )
    const { min, max } = meshBounds(evaluatePart(g, k).mesh!)
    // children span x 5..20 in the group; turned 90° about z they span y 5..20, x -5..5
    const want = { min: [95, 5, 0], max: [105, 20, 10] }
    for (let i = 0; i < 3; i++) {
      expect(min[i]).toBeCloseTo(want.min[i]!, 3)
      expect(max[i]).toBeCloseTo(want.max[i]!, 3)
    }
  })

  it('gives too-large above the triangle limit', async () => {
    const k = await sharedKernel()
    const { doc, id } = drilledBox(createDocument())
    const g = doc.parts.find((p) => p.id === id)!
    expect(evaluatePart(g, k, undefined, { maxTriangles: 10 })).toEqual({
      id,
      mesh: null,
      issue: 'too-large',
    })
    expect(evaluatePart(boxPart('b', 1), k, undefined, { maxTriangles: 10 }).issue).toBe(
      'too-large',
    )
  })

  it('gives a drawing no mesh and no issue', async () => {
    const k = await sharedKernel()
    const drawing: DrawingPart = {
      ...base('d'),
      type: 'drawing',
      entities: [{ kind: 'line', a: [0, 0], b: [10, 0], layer: '0' }],
    }
    expect(evaluatePart(drawing, k)).toEqual({ id: 'd', mesh: null, issue: null })
  })

  it('uses a mesh part that is closed inside a group', async () => {
    const k = await sharedKernel()
    const m: MeshPart = {
      ...base('m'),
      type: 'mesh',
      mesh: cube([0, 0, 0], [4, 4, 4]),
      closed: true,
    }
    const out = evaluatePart(group('g', [boxPart('a', 10), { ...m, role: 'hole' }]), k)
    expect(meshVolume(out.mesh!)).toBeCloseTo(1000 - 64, 2)
  })
})

describe('evaluateDocument', () => {
  it('skips hidden top-level parts', async () => {
    const k = await sharedKernel()
    let doc = addPart(createDocument(), boxPart('a', 10))
    doc = addPart(doc, boxPart('b', 10, { hidden: true }))
    expect(evaluateDocument(doc, k).map((r) => r.id)).toEqual(['a'])
  })

  it('does not compute the same document twice', async () => {
    const k = await countingKernel()
    const { doc } = drilledBox(createDocument())
    const cache = createEvalCache()
    const first = evaluateDocument(doc, k, cache)
    const second = evaluateDocument(doc, k, cache)
    expect(k.subtract).toHaveBeenCalledTimes(1)
    expect(second[0]!.mesh).toBe(first[0]!.mesh)
  })

  it('recomputes only the part that changed', async () => {
    const k = await countingKernel()
    const one = drilledBox(createDocument())
    const two = drilledBox(one.doc, [40, 0, 0])
    const cache = createEvalCache()
    const before = evaluateDocument(two.doc, k, cache)
    expect(k.subtract).toHaveBeenCalledTimes(2)
    const hole = (two.doc.parts[0] as GroupPart).children[1]!
    const wider = updatePart(two.doc, hole.id, { dims: { diameter: 6 } })
    const after = evaluateDocument(wider, k, cache)
    expect(k.subtract).toHaveBeenCalledTimes(3)
    expect(after[1]!.mesh).toBe(before[1]!.mesh)
    expect(Math.abs(meshVolume(after[0]!.mesh!) - (1000 - Math.PI * 9 * 10))).toBeLessThan(1)
  })

  it('moves a group without redoing its boolean', async () => {
    const k = await countingKernel()
    const { doc, id } = drilledBox(createDocument())
    const cache = createEvalCache()
    evaluateDocument(doc, k, cache)
    const moved = updatePart(doc, id, { position: [0, 30, 0] })
    const after = evaluateDocument(moved, k, cache)
    expect(k.subtract).toHaveBeenCalledTimes(1)
    expect(meshBounds(after[0]!.mesh!).min[1]).toBeCloseTo(25, 3)
  })
})
