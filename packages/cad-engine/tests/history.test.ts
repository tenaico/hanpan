import { describe, expect, it, vi } from 'vitest'
import { HISTORY_LIMIT, CadHistory } from '../src/history'
import { createDocument } from '../src/model'
import { addShape, setWorkplane } from '../src/ops'
import type { CadDocument } from '../src/model'

const widen = (doc: CadDocument): CadDocument =>
  setWorkplane(doc, { width: doc.workplane.width + 1 })

describe('CadHistory', () => {
  it('records an edit and undoes and redoes it', () => {
    const start = createDocument()
    const h = new CadHistory(start)
    h.edit('add', (d) => addShape(d, 'box').doc)
    expect(h.current().parts).toHaveLength(1)
    expect(h.undoLabel()).toBe('add')
    expect(h.undo()).toBe(true)
    expect(h.current()).toBe(start)
    expect(h.redo()).toBe(true)
    expect(h.current().parts).toHaveLength(1)
  })

  it('counts every change that lands, undo and redo included', () => {
    const h = new CadHistory(createDocument())
    expect(h.revision()).toBe(0)
    h.edit('w', widen)
    h.undo()
    h.redo()
    expect(h.revision()).toBe(3)
  })

  it('records nothing when the change returns the same document', () => {
    const h = new CadHistory(createDocument())
    h.edit('noop', (d) => d)
    expect(h.canUndo()).toBe(false)
    expect(h.revision()).toBe(0)
  })

  it('leaves everything as it was when the change throws', () => {
    const start = createDocument()
    const h = new CadHistory(start)
    expect(() =>
      h.edit('bad', () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')
    expect(h.current()).toBe(start)
    expect(h.canUndo()).toBe(false)
  })

  it('undoes a whole group with one undo and redoes it with one redo', () => {
    const start = createDocument()
    const h = new CadHistory(start)
    h.openGroup('ai')
    h.edit('a', widen)
    h.edit('b', widen)
    h.edit('c', widen)
    h.closeGroup()
    expect(h.current().workplane.width).toBe(203)
    expect(h.undoLabel()).toBe('ai')
    h.undo()
    expect(h.current()).toBe(start)
    expect(h.canUndo()).toBe(false)
    h.redo()
    expect(h.current().workplane.width).toBe(203)
    expect(h.canRedo()).toBe(false)
  })

  it('closes only at the outermost closeGroup', () => {
    const h = new CadHistory(createDocument())
    h.openGroup('outer')
    h.edit('a', widen)
    h.openGroup('inner')
    h.edit('b', widen)
    h.closeGroup()
    h.edit('c', widen)
    h.closeGroup()
    h.undo()
    expect(h.current().workplane.width).toBe(200)
  })

  it('records nothing for an empty group and ignores a stray closeGroup', () => {
    const h = new CadHistory(createDocument())
    h.openGroup('empty')
    h.closeGroup()
    h.closeGroup()
    expect(h.canUndo()).toBe(false)
  })

  it('closes an open group before undoing it', () => {
    const start = createDocument()
    const h = new CadHistory(start)
    h.openGroup('ai')
    h.edit('a', widen)
    h.edit('b', widen)
    expect(h.undo()).toBe(true)
    expect(h.current()).toBe(start)
    h.edit('c', widen)
    h.undo()
    expect(h.current()).toBe(start)
  })

  it('clears redo after a new edit', () => {
    const h = new CadHistory(createDocument())
    h.edit('a', widen)
    h.undo()
    h.edit('b', widen)
    expect(h.canRedo()).toBe(false)
    expect(h.redo()).toBe(false)
  })

  it(`keeps at most ${HISTORY_LIMIT} steps`, () => {
    const h = new CadHistory(createDocument())
    for (let i = 0; i < HISTORY_LIMIT + 1; i++) h.edit(`e${i}`, widen)
    let undone = 0
    while (h.undo()) undone++
    expect(undone).toBe(HISTORY_LIMIT)
    expect(h.current().workplane.width).toBe(201)
  })

  it('tells subscribers about each change and stops when asked', () => {
    const h = new CadHistory(createDocument())
    const listener = vi.fn()
    const stop = h.subscribe(listener)
    h.edit('a', widen)
    h.undo()
    stop()
    h.redo()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
