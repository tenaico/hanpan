/**
 * The tab's unsaved mark (0.17 UI/UX review v2, G1/G2): the app's own document
 * turning clean is not a save. Only a file Hanpan wrote clears the mark, so a
 * close always asks while nothing of the edits is on disk.
 */
import { describe, expect, it, vi } from 'vitest'
import { createDirtyState } from '../src/renderer/doc/dirty-state'

describe('the tab unsaved mark', () => {
  it('stays on when the app says clean after an edit (its own save wrote nothing)', () => {
    const setDirty = vi.fn()
    const dirty = createDirtyState(setDirty)
    dirty.fromApp(true)
    dirty.fromApp(false)
    expect(dirty.current()).toBe(true)
    expect(setDirty).toHaveBeenLastCalledWith(true)
  })

  it('clears only after a host save wrote the file', () => {
    const setDirty = vi.fn()
    const dirty = createDirtyState(setDirty)
    dirty.fromApp(true)
    dirty.saved()
    expect(dirty.current()).toBe(false)
    expect(setDirty).toHaveBeenLastCalledWith(false)
    // the app reporting the same clean state afterwards keeps it clean
    dirty.fromApp(false)
    expect(dirty.current()).toBe(false)
    dirty.fromApp(true)
    expect(dirty.current()).toBe(true)
  })

  it('a document opened clean is not marked', () => {
    const setDirty = vi.fn()
    const dirty = createDirtyState(setDirty)
    dirty.fromApp(false)
    expect(dirty.current()).toBe(false)
  })
})
