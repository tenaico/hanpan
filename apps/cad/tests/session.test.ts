/**
 * One open drawing: its undo history, when it counts as unsaved, the bytes a
 * save writes and the summary the in-app MCP server reads.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addShape, createDocument, openCadFile } from '@genoffice/cad-engine'
import { CadSession } from '../src/renderer/document/session'
import {
  AUTO_SAVE_IDLE_MS,
  AUTO_SAVE_INTERVAL_MS,
  startAutoSave,
} from '../src/renderer/document/autosave'

function withBoxes(count: number) {
  let doc = createDocument()
  for (let i = 0; i < count; i++) {
    doc = addShape(doc, 'box', {
      name: `Box ${i + 1}`,
      position: [i * 10, 5, 0],
      dims: { width: 20, depth: 30, height: 40 },
    }).doc
  }
  return doc
}

describe('CadSession', () => {
  it('new session is clean; an edit makes it dirty; markSaved cleans it', () => {
    const session = new CadSession(createDocument(), { title: 'Untitled Drawing' })
    expect(session.dirty()).toBe(false)
    session.history.edit('add', (doc) => addShape(doc, 'box').doc)
    expect(session.dirty()).toBe(true)
    session.markSaved()
    expect(session.dirty()).toBe(false)
    // an undo back to the saved state still counts as a change (the conservative rule)
    session.history.undo()
    expect(session.dirty()).toBe(true)
  })

  it('a save marks the revision it wrote, not an edit made while it ran', () => {
    const session = new CadSession(createDocument(), { title: 'Untitled Drawing' })
    session.history.edit('add', (doc) => addShape(doc, 'box').doc)
    const written = session.history.revision()
    session.history.edit('add', (doc) => addShape(doc, 'cone').doc)
    session.markSaved(written)
    expect(session.dirty()).toBe(true)
  })

  it('a session that starts dirty (a recovery copy) is unsaved until a save', () => {
    const session = new CadSession(createDocument(), { title: 'x', dirty: true })
    expect(session.dirty()).toBe(true)
    session.markSaved()
    expect(session.dirty()).toBe(false)
  })

  it('saveBytes reopens ok', () => {
    const session = new CadSession(withBoxes(2), { title: 'Two boxes' })
    const opened = openCadFile(session.saveBytes())
    expect(opened.status).toBe('ok')
    if (opened.status === 'ok') expect(opened.document.parts).toHaveLength(2)
  })

  it('takes its title from the path and follows a new path', () => {
    const session = new CadSession(createDocument(), {
      title: 'ignored',
      path: 'C:\\models\\bracket.ttukcad',
    })
    expect(session.title()).toBe('bracket')
    expect(session.path()).toBe('C:\\models\\bracket.ttukcad')
    session.setPath('/home/me/plate v2.ttukcad')
    expect(session.title()).toBe('plate v2')
    expect(session.path()).toBe('/home/me/plate v2.ttukcad')
  })

  it('summary lists parts with sizes and caps at 50', () => {
    const small = new CadSession(withBoxes(1), { title: 'Bracket' })
    expect(small.summary()).toBe(
      ['AI Drawing "Bracket": 1 parts', '- Box 1 (box) 20×30×40 mm at (0, 5, 0)'].join('\n'),
    )
    const big = new CadSession(withBoxes(53), { title: 'Many' })
    const lines = big.summary().split('\n')
    expect(lines[0]).toBe('AI Drawing "Many": 53 parts')
    expect(lines).toHaveLength(1 + 50 + 1)
    expect(lines[50]).toBe('- Box 50 (box) 20×30×40 mm at (490, 5, 0)')
    expect(lines.at(-1)).toBe('… and 3 more')
  })

  it('counts the triangles of its mesh parts', () => {
    const session = new CadSession(createDocument(), { title: 'x' })
    expect(session.triangles()).toBe(0)
    session.history.edit('mesh', (doc) => ({
      ...doc,
      parts: [
        {
          id: 'm1',
          type: 'mesh',
          name: 'tri',
          role: 'solid',
          color: '#5b9bd5',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          hidden: false,
          locked: false,
          closed: false,
          mesh: {
            positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
            indices: new Uint32Array([0, 1, 2, 0, 1, 3]),
          },
        },
      ],
    }))
    expect(session.triangles()).toBe(2)
  })
})

describe('auto-save', () => {
  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('saves every 30 seconds and when the window is hidden, only when there are changes', () => {
    vi.useFakeTimers()
    const state = { dirty: false, saving: false, saves: 0 }
    const stop = startAutoSave({
      dirty: () => state.dirty,
      saving: () => state.saving,
      save: () => void state.saves++,
    })
    vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS)
    expect(state.saves).toBe(0)
    state.dirty = true
    vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS)
    expect(state.saves).toBe(1)
    state.saving = true
    vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS)
    expect(state.saves).toBe(1)
    state.saving = false
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(state.saves).toBe(2)
    stop()
    vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(state.saves).toBe(2)
  })

  it('saves a big drawing only after 2 s without input, and never while a pointer is held', () => {
    vi.useFakeTimers()
    const state = { dirty: true, saves: 0 }
    const stop = startAutoSave({
      dirty: () => state.dirty,
      saving: () => false,
      save: () => void state.saves++,
      big: () => true,
    })
    // the user is working when the tick comes: no save yet
    vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS - 500)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    vi.advanceTimersByTime(500)
    expect(state.saves).toBe(0)
    // 2 s after the last key it saves, once
    vi.advanceTimersByTime(AUTO_SAVE_IDLE_MS)
    expect(state.saves).toBe(1)
    // a handle drag: the pointer is held across several ticks, nothing is saved
    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS * 3)
    expect(state.saves).toBe(1)
    // let go: one save once the user has been quiet for 2 s
    window.dispatchEvent(new Event('pointerup'))
    vi.advanceTimersByTime(AUTO_SAVE_IDLE_MS - 1)
    expect(state.saves).toBe(1)
    vi.advanceTimersByTime(1)
    expect(state.saves).toBe(2)
    stop()
    vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS * 2)
    expect(state.saves).toBe(2)
  })

  it('a small drawing still saves on the tick while the user works', () => {
    vi.useFakeTimers()
    const state = { saves: 0 }
    const stop = startAutoSave({
      dirty: () => true,
      saving: () => false,
      save: () => void state.saves++,
      big: () => false,
    })
    vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS - 10)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    vi.advanceTimersByTime(10)
    expect(state.saves).toBe(1)
    stop()
  })
})
