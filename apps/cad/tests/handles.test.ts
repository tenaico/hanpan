// @vitest-environment node
/**
 * Dragging a handle: the screen alone moves during the drag, the release makes
 * exactly one undo step, a cancel makes none, and what a part cannot do is
 * refused before the drag starts.
 */
import { describe, expect, it } from 'vitest'
import {
  CadEditError,
  CadHistory,
  addPart,
  addShape,
  createDocument,
  findPart,
  makeMesh,
  newId,
  updatePart,
  type MeshPart,
  type ShapePart,
} from '@genoffice/cad-engine'
import { HandleRefusedError, HandleSession } from '../src/renderer/scene/handles'

function boxHistory() {
  const box = addShape(createDocument(), 'box', { name: 'Box', position: [10, 0, 0] })
  const history = new CadHistory(box.doc)
  return { history, id: box.id, session: new HandleSession(() => history.current()) }
}

const shape = (history: CadHistory, id: string): ShapePart =>
  findPart(history.current(), id) as ShapePart

describe('HandleSession', () => {
  it('a drag that is cancelled leaves no undo step', () => {
    const { history, id, session } = boxHistory()
    const before = history.current()
    session.begin([id], 'move')
    session.preview({ move: [12, 3, 0] })
    session.preview({ move: [20, 5, 0] })
    // the document is not touched while dragging
    expect(history.current()).toBe(before)
    session.cancel()
    expect(session.active).toBe(false)
    expect(session.commit()).toBeNull()
    expect(history.canUndo()).toBe(false)
    expect(history.current()).toBe(before)
  })

  it('a drag that ends makes exactly one undo step', () => {
    const { history, id, session } = boxHistory()
    session.begin([id], 'move')
    session.preview({ move: [1.2, 0, 0] })
    // snapped to the 1 mm grid
    expect(session.preview({ move: [5.4, -2.6, 0] }).move).toEqual([5, -3, 0])
    const change = session.commit()
    expect(change).not.toBeNull()
    expect(session.active).toBe(false)
    history.edit('move', change!)
    expect(shape(history, id).position).toEqual([15, -3, 0])
    expect(history.undo()).toBe(true)
    expect(history.canUndo()).toBe(false)
    expect(shape(history, id).position).toEqual([10, 0, 0])
  })

  it('without snapping (Alt held) the drag keeps its fraction', () => {
    const { history, id, session } = boxHistory()
    session.begin([id], 'move')
    session.preview({ move: [5.4, 0, 0] }, { snap: false })
    history.edit('move', session.commit()!)
    expect(shape(history, id).position[0]).toBeCloseTo(15.4)
  })

  it('a drag back to where it started makes no step', () => {
    const { history, id, session } = boxHistory()
    session.begin([id], 'move')
    session.preview({ move: [0.3, 0, 0] })
    expect(session.commit()).toBeNull()
    expect(history.canUndo()).toBe(false)
  })

  it('rotation snaps to 15 degrees about the pivot', () => {
    const { history, id, session } = boxHistory()
    session.begin([id], 'rotate', [0, 0, 0])
    expect(session.preview({ rotate: [0, 0, 97] }).rotate).toEqual([0, 0, 90])
    history.edit('rotate', session.commit()!)
    const part = shape(history, id)
    expect(part.rotation[2]).toBeCloseTo(90)
    // the box at x = 10 swung round the origin to y = 10
    expect(part.position[0]).toBeCloseTo(0)
    expect(part.position[1]).toBeCloseTo(10)
  })

  it('scale changes the shape dimensions, snapped to 1 mm', () => {
    const { history, id, session } = boxHistory()
    session.begin([id], 'scale')
    const shown = session.preview({ scale: [1.52, 1, 0.5] })
    // 20 mm × 1.52 = 30.4 → 30 mm, so the screen shows 1.5
    expect(shown.scale![0]).toBeCloseTo(1.5)
    history.edit('resize', session.commit()!)
    expect(shape(history, id).dims).toEqual({ width: 30, depth: 20, height: 10 })
  })

  it('a round shape keeps its round section when one side is dragged', () => {
    const cyl = addShape(createDocument(), 'cylinder', { name: 'Cyl' })
    const history = new CadHistory(cyl.doc)
    const session = new HandleSession(() => history.current())
    session.begin([cyl.id], 'scale')
    const shown = session.preview({ scale: [2, 1, 1] })
    expect(shown.scale).toEqual([2, 2, 1])
    history.edit('resize', session.commit()!)
    expect(shape(history, cyl.id).dims).toEqual({ diameter: 40, height: 20 })
  })

  it('scale handle is refused for a mesh part', () => {
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
      mesh: makeMesh([0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 1, 2]),
      closed: false,
    }
    const history = new CadHistory(addPart(createDocument(), mesh))
    const session = new HandleSession(() => history.current())
    expect(() => session.begin([mesh.id], 'scale')).toThrow(HandleRefusedError)
    expect(session.active).toBe(false)
    // moving and turning a mesh are fine
    session.begin([mesh.id], 'move')
    expect(session.active).toBe(true)
    session.cancel()
  })

  it('a locked part refuses the drag with the engine error', () => {
    const { history, id, session } = boxHistory()
    history.edit('lock', (doc) => updatePart(doc, id, { locked: true }))
    let error: unknown
    try {
      session.begin([id], 'move')
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(CadEditError)
    expect((error as CadEditError).code).toBe('locked')
    expect(session.active).toBe(false)
  })
})
