import { describe, expect, it } from 'vitest'
import { CadEditError, createDocument } from '../src/model'
import { addShape, duplicateParts, findPart, groupParts, moveParts, updatePart } from '../src/ops'

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (error) {
    if (error instanceof CadEditError) return error.code
    throw error
  }
  return undefined
}

describe('duplicateParts', () => {
  it('gives new ids, numbers the name and offsets the copy', () => {
    const a = addShape(createDocument(), 'box', { name: 'Box', position: [10, 0, 0] })
    const { doc, ids } = duplicateParts(a.doc, [a.id], [5, 5, 0])
    expect(ids).toHaveLength(1)
    expect(ids[0]).not.toBe(a.id)
    const copy = findPart(doc, ids[0]!)!
    expect(copy.name).toBe('Box 2')
    expect(copy.position).toEqual([15, 5, 0])
    expect(doc.parts).toHaveLength(2)
  })

  it('gives every child of a copied group a new id', () => {
    const a = addShape(createDocument(), 'box')
    const b = addShape(a.doc, 'cylinder')
    const g = groupParts(b.doc, [a.id, b.id])
    const { doc, ids } = duplicateParts(g.doc, [g.id], [0, 0, 0])
    const copy = findPart(doc, ids[0]!)!
    if (copy.type !== 'group') throw new Error('not a group')
    const childIds = copy.children.map((c) => c.id)
    expect(childIds).not.toContain(a.id)
    expect(childIds).not.toContain(b.id)
    expect(new Set(childIds).size).toBe(2)
  })

  it('refuses an unknown id', () => {
    expect(codeOf(() => duplicateParts(createDocument(), ['nope'], [0, 0, 0]))).toBe('unknown-id')
  })
})

describe('moveParts', () => {
  it('moves every given part by the delta', () => {
    const a = addShape(createDocument(), 'box', { position: [1, 2, 3] })
    const b = addShape(a.doc, 'box', { position: [0, 0, 0] })
    const doc = moveParts(b.doc, [a.id, b.id], [10, 0, -1])
    expect(findPart(doc, a.id)!.position).toEqual([11, 2, 2])
    expect(findPart(doc, b.id)!.position).toEqual([10, 0, -1])
  })

  it('refuses a locked part and changes nothing', () => {
    const a = addShape(createDocument(), 'box')
    const locked = updatePart(a.doc, a.id, { locked: true })
    expect(codeOf(() => moveParts(locked, [a.id], [1, 0, 0]))).toBe('locked')
  })

  it('refuses a move that would leave the size range', () => {
    const a = addShape(createDocument(), 'box')
    expect(codeOf(() => moveParts(a.doc, [a.id], [2e6, 0, 0]))).toBe('bad-number')
  })

  it('returns the same document for a zero move', () => {
    const a = addShape(createDocument(), 'box')
    expect(moveParts(a.doc, [a.id], [0, 0, 0])).toBe(a.doc)
  })
})
