/**
 * The keyboard shortcuts: which key does what, and that nothing happens while
 * the user types into a box (the property panel, the text prompt).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  installShortcuts,
  shortcutFor,
  type ShortcutAction,
} from '../src/renderer/editing/shortcuts'

const key = (k: string, mods: Partial<Record<'ctrl' | 'shift' | 'alt' | 'meta', boolean>> = {}) =>
  shortcutFor({
    key: k,
    ctrlKey: !!mods.ctrl,
    shiftKey: !!mods.shift,
    altKey: !!mods.alt,
    metaKey: !!mods.meta,
  })

afterEach(() => {
  document.body.innerHTML = ''
})

describe('shortcuts', () => {
  it('map the keys of the plan', () => {
    expect(key('z', { ctrl: true })).toEqual({ kind: 'undo' })
    expect(key('Z', { ctrl: true, shift: true })).toEqual({ kind: 'redo' })
    expect(key('y', { ctrl: true })).toEqual({ kind: 'redo' })
    expect(key('Delete')).toEqual({ kind: 'delete' })
    expect(key('a', { ctrl: true })).toEqual({ kind: 'select-all' })
    expect(key('d', { ctrl: true })).toEqual({ kind: 'duplicate' })
    expect(key('g', { ctrl: true })).toEqual({ kind: 'group' })
    expect(key('G', { ctrl: true, shift: true })).toEqual({ kind: 'ungroup' })
    expect(key('h')).toEqual({ kind: 'toggle-hole' })
    expect(key('H')).toEqual({ kind: 'toggle-hole' })
    expect(key('ArrowRight')).toEqual({ kind: 'nudge', dx: 1, dy: 0 })
    expect(key('ArrowLeft')).toEqual({ kind: 'nudge', dx: -1, dy: 0 })
    expect(key('ArrowUp')).toEqual({ kind: 'nudge', dx: 0, dy: 1 })
    expect(key('ArrowDown', { shift: true })).toEqual({ kind: 'nudge', dx: 0, dy: -10 })
    // keys the drawing does not take
    expect(key('x')).toBeNull()
    expect(key('h', { ctrl: true })).toBeNull()
    expect(key('s', { ctrl: true })).toBeNull()
    expect(key('ArrowRight', { ctrl: true })).toBeNull()
  })

  it('shortcuts are ignored while an input has focus', () => {
    const run = vi.fn<(action: ShortcutAction) => void>()
    const off = installShortcuts(window, run)
    const input = document.createElement('input')
    const area = document.createElement('textarea')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.append(input, area, editable)
    for (const target of [input, area, editable]) {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    }
    expect(run).not.toHaveBeenCalled()

    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })
    document.body.dispatchEvent(event)
    expect(run).toHaveBeenCalledWith({ kind: 'delete' })
    expect(event.defaultPrevented).toBe(true)

    // a key that is not a shortcut is left alone
    const other = new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true })
    document.body.dispatchEvent(other)
    expect(other.defaultPrevented).toBe(false)
    expect(run).toHaveBeenCalledTimes(1)

    off()
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('an event another handler already took is left alone', () => {
    const run = vi.fn()
    const off = installShortcuts(window, run)
    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })
    event.preventDefault()
    document.body.dispatchEvent(event)
    expect(run).not.toHaveBeenCalled()
    off()
  })
})
