import { describe, expect, it } from 'vitest'
import { worldBounds } from '../src/bounds'
import { newId } from '../src/ids'
import { CadEditError, createDocument, SHAPE_DEFAULTS, SHAPE_DIMS } from '../src/model'
import type { CadDocument, GroupPart, ShapeKind, ShapePart } from '../src/model'
import {
  addShape,
  alignParts,
  findPart,
  groupParts,
  removeParts,
  setWorkplane,
  ungroupPart,
  updatePart,
} from '../src/ops'

const KINDS = Object.keys(SHAPE_DIMS) as ShapeKind[]

function close(a: readonly number[], b: readonly number[], digits = 6): void {
  expect(a.length).toBe(b.length)
  a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, digits))
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (error) {
    if (error instanceof CadEditError) return error.code
    throw error
  }
  return undefined
}

describe('model', () => {
  it('starts with a 200 mm workplane and no parts', () => {
    const doc = createDocument()
    expect(doc.workplane).toEqual({ width: 200, depth: 200, grid: 10 })
    expect(doc.parts).toEqual([])
    expect(doc.extra).toEqual({})
  })

  it('makes 12-hex ids', () => {
    expect(newId()).toMatch(/^[0-9a-f]{12}$/)
    expect(newId()).not.toBe(newId())
  })

  it('has fifteen shapes, each with defaults for every dimension', () => {
    expect(KINDS).toHaveLength(15)
    for (const kind of KINDS) {
      for (const dim of SHAPE_DIMS[kind]) {
        expect(SHAPE_DEFAULTS[kind][dim], `${kind}.${dim}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('addShape', () => {
  it('fills missing dimensions from the defaults', () => {
    const { doc, id } = addShape(createDocument(), 'box', { dims: { width: 30 } })
    expect(findPart(doc, id)).toMatchObject({
      type: 'shape',
      shape: 'box',
      role: 'solid',
      dims: { width: 30, depth: 20, height: 20 },
      hidden: false,
      locked: false,
    })
  })

  it.each(KINDS)('accepts the defaults of %s', (kind) => {
    expect(() => addShape(createDocument(), kind)).not.toThrow()
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects width %s', (width) => {
    expect(codeOf(() => addShape(createDocument(), 'box', { dims: { width } }))).toBe('bad-number')
  })

  it('rejects a tube whose inner diameter is not smaller than the outer one', () => {
    expect(
      codeOf(() =>
        addShape(createDocument(), 'tube', { dims: { outerDiameter: 10, innerDiameter: 10 } }),
      ),
    ).toBe('bad-number')
  })

  it('rejects a torus too thick for its diameter', () => {
    expect(
      codeOf(() => addShape(createDocument(), 'torus', { dims: { diameter: 10, tubeDiameter: 5 } })),
    ).toBe('bad-number')
  })

  it('rejects a non-finite position', () => {
    expect(
      codeOf(() => addShape(createDocument(), 'box', { position: [0, Number.NaN, 0] })),
    ).toBe('bad-number')
  })

  it('leaves the input document untouched', () => {
    const doc = createDocument()
    addShape(doc, 'box')
    expect(doc.parts).toEqual([])
  })
})

describe('updatePart', () => {
  it('returns a new document and keeps the old one', () => {
    const { doc, id } = addShape(createDocument(), 'box')
    const before = doc.parts
    const next = updatePart(doc, id, { role: 'hole' })
    expect(next).not.toBe(doc)
    expect(doc.parts).toBe(before)
    expect(findPart(doc, id)?.role).toBe('solid')
    expect(findPart(next, id)?.role).toBe('hole')
  })

  it('merges dimensions and checks them', () => {
    const { doc, id } = addShape(createDocument(), 'cylinder')
    const next = updatePart(doc, id, { dims: { height: 50 } })
    expect((findPart(next, id) as ShapePart).dims).toEqual({ diameter: 20, height: 50 })
    expect(codeOf(() => updatePart(doc, id, { dims: { height: -2 } }))).toBe('bad-number')
  })

  it('rejects an unknown id', () => {
    expect(codeOf(() => updatePart(createDocument(), 'nope', { name: 'x' }))).toBe('unknown-id')
  })

  it('keeps a locked part in place but lets it be unlocked', () => {
    const added = addShape(createDocument(), 'box')
    const locked = updatePart(added.doc, added.id, { locked: true })
    expect(codeOf(() => updatePart(locked, added.id, { position: [1, 0, 0] }))).toBe('locked')
    expect(codeOf(() => removeParts(locked, [added.id]))).toBe('locked')
    const unlocked = updatePart(locked, added.id, { locked: false, position: [1, 0, 0] })
    expect(findPart(unlocked, added.id)?.position).toEqual([1, 0, 0])
  })

  it('finds and updates a part inside a group', () => {
    let doc: CadDocument = createDocument()
    const a = addShape(doc, 'box')
    const b = addShape(a.doc, 'sphere')
    const g = groupParts(b.doc, [a.id, b.id])
    doc = updatePart(g.doc, b.id, { name: 'ball' })
    expect(findPart(doc, b.id)?.name).toBe('ball')
  })
})

describe('removeParts', () => {
  it('removes top-level and nested parts', () => {
    const a = addShape(createDocument(), 'box')
    const b = addShape(a.doc, 'sphere')
    const c = addShape(b.doc, 'cone')
    const g = groupParts(c.doc, [a.id, b.id])
    const next = removeParts(g.doc, [b.id, c.id])
    expect(findPart(next, b.id)).toBeUndefined()
    expect(findPart(next, c.id)).toBeUndefined()
    expect(findPart(next, a.id)).toBeDefined()
  })

  it('rejects an unknown id', () => {
    expect(codeOf(() => removeParts(createDocument(), ['nope']))).toBe('unknown-id')
  })
})

describe('groupParts and ungroupPart', () => {
  it('needs at least two top-level parts', () => {
    const a = addShape(createDocument(), 'box')
    expect(codeOf(() => groupParts(a.doc, [a.id]))).toBe('too-few')
  })

  it('puts the group where the first grouped part was', () => {
    const a = addShape(createDocument(), 'box')
    const b = addShape(a.doc, 'sphere')
    const g = groupParts(b.doc, [a.id, b.id])
    expect(g.doc.parts.map((p) => p.id)).toEqual([g.id])
    const group = findPart(g.doc, g.id) as GroupPart
    expect(group.type).toBe('group')
    expect(group.children.map((p) => p.id)).toEqual([a.id, b.id])
  })

  it('keeps world bounds through a moved and turned group and back out', () => {
    const a = addShape(createDocument(), 'box', {
      dims: { width: 10, depth: 20, height: 30 },
      position: [5, 0, 0],
      rotation: [0, 0, 30],
    })
    const b = addShape(a.doc, 'cylinder', { position: [-20, 4, 2], rotation: [10, 0, 0] })
    const before = [worldBounds(findPart(b.doc, a.id)!), worldBounds(findPart(b.doc, b.id)!)]
    const g = groupParts(b.doc, [a.id, b.id])
    const moved = updatePart(g.doc, g.id, { position: [100, 50, 7], rotation: [0, 20, 45] })
    const groupBounds = worldBounds(findPart(moved, g.id)!)
    const out = ungroupPart(moved, g.id)
    const after = [worldBounds(findPart(out, a.id)!), worldBounds(findPart(out, b.id)!)]
    // ungrouping keeps the children where the moved group had put them
    const union = {
      min: [0, 1, 2].map((i) => Math.min(after[0]!.min[i]!, after[1]!.min[i]!)),
      max: [0, 1, 2].map((i) => Math.max(after[0]!.max[i]!, after[1]!.max[i]!)),
    }
    close(union.min, groupBounds.min, 4)
    close(union.max, groupBounds.max, 4)
    // and grouping alone moves nothing
    const still = ungroupPart(g.doc, g.id)
    close(worldBounds(findPart(still, a.id)!).min, before[0]!.min)
    close(worldBounds(findPart(still, b.id)!).max, before[1]!.max)
  })

  it('rejects ungrouping something that is not a group', () => {
    const a = addShape(createDocument(), 'box')
    expect(codeOf(() => ungroupPart(a.doc, a.id))).toBe('not-group')
  })
})

describe('alignParts', () => {
  it('lines the other parts up with the first one', () => {
    const a = addShape(createDocument(), 'box', { position: [0, 0, 0] })
    const b = addShape(a.doc, 'box', { dims: { width: 40 }, position: [100, 30, 0] })
    const next = alignParts(b.doc, [a.id, b.id], 'x', 'min')
    expect(findPart(next, a.id)?.position).toEqual([0, 0, 0])
    expect(worldBounds(findPart(next, b.id)!).min[0]).toBeCloseTo(-10)
    const centred = alignParts(b.doc, [a.id, b.id], 'y', 'center')
    expect(findPart(centred, b.id)?.position[1]).toBeCloseTo(0)
    expect(findPart(centred, b.id)?.position[0]).toBe(100)
  })

  it('needs two parts', () => {
    const a = addShape(createDocument(), 'box')
    expect(codeOf(() => alignParts(a.doc, [a.id], 'x', 'min'))).toBe('too-few')
  })
})

describe('setWorkplane', () => {
  it('changes only the given fields and checks them', () => {
    const doc = setWorkplane(createDocument(), { width: 5000 })
    expect(doc.workplane).toEqual({ width: 5000, depth: 200, grid: 10 })
    expect(codeOf(() => setWorkplane(doc, { grid: 0 }))).toBe('bad-number')
  })
})
