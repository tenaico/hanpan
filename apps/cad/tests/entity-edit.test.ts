// @vitest-environment node
/**
 * Editing an opened DXF or DWG by hand: a click picks the nearest line,
 * circle or text of a visible drawing, Shift adds more, and delete, move and
 * text change are each one undo step. Any other change of the drawing drops
 * the pick, because the indices may no longer mean the same lines.
 */
import { describe, expect, it } from 'vitest'
import { addPart, createDocument, type DrawingPart } from '@genoffice/cad-engine'
import { CadSession } from '../src/renderer/document/session'
import { EntityEditTool } from '../src/renderer/editing/entity-edit'

function setup(position: [number, number, number] = [0, 0, 0]) {
  const part: DrawingPart = {
    id: 'plan',
    type: 'drawing',
    name: 'plan',
    role: 'solid',
    color: '#888888',
    position,
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    entities: [
      { kind: 'line', a: [0, 0], b: [100, 0], layer: 'WALL' },
      { kind: 'circle', center: [50, 50], radius: 10, layer: 'DOOR' },
      { kind: 'text', at: [0, 80], height: 10, rotationDeg: 0, value: 'ROOM', layer: 'TEXT' },
    ],
  }
  const session = new CadSession(addPart(createDocument(), part), { title: 'T' })
  const tool = new EntityEditTool(session.history)
  return { session, tool }
}

const entities = (s: CadSession) => (s.history.current().parts[0] as DrawingPart).entities

describe('EntityEditTool', () => {
  it('picks the nearest entity, and Shift adds another', () => {
    const { tool } = setup()
    tool.click([30, 0.5, 0], 2, false)
    expect(tool.pick()).toEqual({ partId: 'plan', indices: [0] })
    tool.click([60, 50, 0], 2, true)
    expect(tool.pick()).toEqual({ partId: 'plan', indices: [0, 1] })
    // a click on empty space without Shift drops the pick
    tool.click([500, 500, 0], 2, false)
    expect(tool.pick()).toBeNull()
  })

  it('picks text by its box, and follows where the drawing was moved', () => {
    const { tool } = setup([1000, 0, 0])
    tool.click([1005, 84, 0], 1, false)
    expect(tool.pick()).toEqual({ partId: 'plan', indices: [2] })
  })

  it('deletes the pick in one undo step and forgets it', () => {
    const { session, tool } = setup()
    tool.click([30, 0, 0], 2, false)
    tool.deletePicked()
    expect(entities(session).map((e) => e.kind)).toEqual(['circle', 'text'])
    expect(tool.pick()).toBeNull()
    session.history.undo()
    expect(entities(session)).toHaveLength(3)
  })

  it('moves the pick and keeps it picked; changes text', () => {
    const { session, tool } = setup()
    tool.click([30, 0, 0], 2, false)
    tool.movePicked(0, 25)
    expect(entities(session)[0]).toMatchObject({ a: [0, 25], b: [100, 25] })
    expect(tool.pick()).toEqual({ partId: 'plan', indices: [0] })
    tool.click([5, 84, 0], 1, false)
    tool.setPickedText('MEETING')
    expect(entities(session)[2]).toMatchObject({ value: 'MEETING' })
  })

  it('drops the pick when the drawing changes some other way', () => {
    const { session, tool } = setup()
    tool.click([30, 0, 0], 2, false)
    session.history.undo() // nothing to undo: no change, the pick stays
    expect(tool.pick()).not.toBeNull()
    session.history.edit('rename', (doc) => ({ ...doc, title: { ...doc.title, name: 'x' } }))
    expect(tool.pick()).toBeNull()
  })

  it('does not edit a locked drawing', () => {
    const { session, tool } = setup()
    session.history.edit('lock', (doc) => ({
      ...doc,
      parts: doc.parts.map((p) => ({ ...p, locked: true })),
    }))
    tool.click([30, 0, 0], 2, false)
    expect(() => tool.deletePicked()).toThrow()
    expect(entities(session)).toHaveLength(3)
  })
})
