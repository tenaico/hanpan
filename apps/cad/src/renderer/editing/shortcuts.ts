/**
 * The drawing's keyboard shortcuts (apps/cad plan, Global Constraints):
 * Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) undo and redo, Delete, Ctrl+A,
 * Ctrl+D duplicate, Ctrl+G / Ctrl+Shift+G group and ungroup, H hole ↔ solid,
 * the arrow keys move one snap step (Shift: ten).
 *
 * The shell's menu shows these keys without registering them, so the page
 * takes them itself (one press acts once). Nothing happens while the user
 * types into a box (the property panel, the text prompt), and an event some
 * other handler already took (a menu's Esc, a handle drag) is left alone.
 */

export type ShortcutAction =
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'delete' }
  | { kind: 'select-all' }
  | { kind: 'duplicate' }
  | { kind: 'group' }
  | { kind: 'ungroup' }
  | { kind: 'toggle-hole' }
  | { kind: 'nudge'; dx: number; dy: number }

/** The parts of a key press the table reads. */
export interface KeyPress {
  key: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

/** Shift with an arrow key moves this many steps. */
export const NUDGE_SHIFT_STEPS = 10

const ARROWS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
}

/** What a key press does in the drawing, or null when it is not a shortcut. */
export function shortcutFor(e: KeyPress): ShortcutAction | null {
  const mod = e.ctrlKey || e.metaKey
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  if (e.altKey) return null
  if (mod) {
    if (key === 'z') return e.shiftKey ? { kind: 'redo' } : { kind: 'undo' }
    if (key === 'y' && !e.shiftKey) return { kind: 'redo' }
    if (key === 'a' && !e.shiftKey) return { kind: 'select-all' }
    if (key === 'd' && !e.shiftKey) return { kind: 'duplicate' }
    if (key === 'g') return e.shiftKey ? { kind: 'ungroup' } : { kind: 'group' }
    return null
  }
  if (key === 'Delete') return { kind: 'delete' }
  if (key === 'h') return { kind: 'toggle-hole' }
  const arrow = ARROWS[key]
  if (arrow) {
    const steps = e.shiftKey ? NUDGE_SHIFT_STEPS : 1
    // 0 * steps would be -0 for the negative axes; keep plain zeros
    return { kind: 'nudge', dx: arrow[0] * steps || 0, dy: arrow[1] * steps || 0 }
  }
  return null
}

/** The user is typing: an input, a text area, a select or editable text has the key. */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest('input, textarea, select')) return true
  if (target instanceof HTMLElement && target.isContentEditable) return true
  return !!target.closest('[contenteditable]:not([contenteditable="false"])')
}

/** Listens for the shortcuts on `target`; returns the function that stops listening. */
export function installShortcuts(
  target: Window | HTMLElement,
  run: (action: ShortcutAction) => void,
): () => void {
  const onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent
    if (e.defaultPrevented || e.isComposing || isTyping(e.target)) return
    const action = shortcutFor(e)
    if (!action) return
    e.preventDefault()
    run(action)
  }
  target.addEventListener('keydown', onKeyDown)
  return () => target.removeEventListener('keydown', onKeyDown)
}
