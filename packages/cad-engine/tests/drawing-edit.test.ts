import { describe, expect, it } from 'vitest'
import {
  addDrawingEntities,
  deleteDrawingEntities,
  drawingLayers,
  moveDrawingEntities,
  updateDrawingEntities,
} from '../src/drawing-edit'
import { CadEditError, createDocument } from '../src/model'
import type { CadDocument, DrawingEntity, DrawingPart } from '../src/model'
import { addPart } from '../src/ops'

const ENTITIES: DrawingEntity[] = [
  { kind: 'line', a: [0, 0], b: [100, 0], layer: 'WALL' },
  { kind: 'circle', center: [50, 50], radius: 10, layer: 'DOOR' },
  { kind: 'text', at: [10, 10], height: 5, rotationDeg: 0, value: '회의실', layer: 'TEXT' },
  { kind: 'polyline', points: [0, 0, 10, 0, 10, 10], closed: false, layer: 'WALL' },
]

function drawingDoc(locked = false): { doc: CadDocument; part: DrawingPart } {
  const part: DrawingPart = {
    id: 'd1',
    type: 'drawing',
    name: '도면',
    role: 'solid',
    color: '#888888',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked,
    entities: ENTITIES,
  }
  return { doc: addPart(createDocument(), part), part }
}

const entitiesOf = (doc: CadDocument): DrawingEntity[] => (doc.parts[0] as DrawingPart).entities

describe('drawing entity edits', () => {
  it('deletes the chosen entities and keeps the rest in order', () => {
    const { doc } = drawingDoc()
    const next = deleteDrawingEntities(doc, 'd1', [0, 2])
    expect(entitiesOf(next).map((e) => e.kind)).toEqual(['circle', 'polyline'])
    // the input document is not changed
    expect(entitiesOf(doc)).toHaveLength(4)
  })

  it('moves the chosen entities by dx, dy in millimetres', () => {
    const { doc } = drawingDoc()
    const next = entitiesOf(moveDrawingEntities(doc, 'd1', [0, 1, 2, 3], [5, -5]))
    expect(next[0]).toMatchObject({ a: [5, -5], b: [105, -5] })
    expect(next[1]).toMatchObject({ center: [55, 45] })
    expect(next[2]).toMatchObject({ at: [15, 5] })
    expect(next[3]).toMatchObject({ points: [5, -5, 15, -5, 15, 5] })
  })

  it('changes text, colour and layer', () => {
    const { doc } = drawingDoc()
    const next = entitiesOf(
      updateDrawingEntities(doc, 'd1', [
        { index: 2, text: '소회의실', color: '#ff0000' },
        { index: 0, layer: 'OLD' },
      ]),
    )
    expect(next[2]).toMatchObject({ value: '소회의실', color: '#ff0000', layer: 'TEXT' })
    expect(next[0]).toMatchObject({ layer: 'OLD' })
  })

  it('adds lines, circles and text after the existing entities', () => {
    const { doc } = drawingDoc()
    const next = entitiesOf(
      addDrawingEntities(doc, 'd1', [
        { kind: 'line', a: [0, 0], b: [0, 50], layer: 'NEW' },
        { kind: 'text', at: [1, 1], height: 3, rotationDeg: 0, value: '창', layer: 'NEW' },
      ]),
    )
    expect(next).toHaveLength(6)
    expect(next[4]).toEqual({ kind: 'line', a: [0, 0], b: [0, 50], layer: 'NEW' })
  })

  it('refuses a bad index, text on a non-text entity, bad numbers and a locked drawing', () => {
    const { doc } = drawingDoc()
    const code = (fn: () => unknown): string | undefined => {
      try {
        fn()
      } catch (err) {
        return err instanceof CadEditError ? err.code : 'other'
      }
      return undefined
    }
    expect(code(() => deleteDrawingEntities(doc, 'd1', [9]))).toBe('unknown-id')
    expect(code(() => updateDrawingEntities(doc, 'd1', [{ index: 0, text: 'x' }]))).toBe(
      'bad-number',
    )
    expect(code(() => moveDrawingEntities(doc, 'd1', [0], [Number.NaN, 0]))).toBe('bad-number')
    expect(
      code(() =>
        addDrawingEntities(doc, 'd1', [{ kind: 'circle', center: [0, 0], radius: -1, layer: '0' }]),
      ),
    ).toBe('bad-number')
    expect(code(() => deleteDrawingEntities(doc, 'nope', [0]))).toBe('unknown-id')
    const locked = drawingDoc(true).doc
    expect(code(() => deleteDrawingEntities(locked, 'd1', [0]))).toBe('locked')
  })

  it('lists layers with how many entities each holds', () => {
    const { part } = drawingDoc()
    expect(drawingLayers(part)).toEqual([
      { layer: 'WALL', count: 2 },
      { layer: 'DOOR', count: 1 },
      { layer: 'TEXT', count: 1 },
    ])
  })
})
