/**
 * AutoSave of a drawing that has a path (spec 7-1): every 30 seconds and when
 * the window goes to the background, and only when there are unsaved changes.
 * An untitled drawing waits for the first save by hand, which asks where.
 *
 * Writing a big drawing (more than 200,000 triangles, the same rule as the
 * recovery copies) takes seconds, so its tick waits until the user has not
 * pressed a key, clicked or scrolled for 2 seconds and no pointer button is
 * held (a handle drag or a turn of the view): a save never freezes an edit.
 */
import { useEffect, useRef } from 'react'
import { RECOVERY_COPY_TIMING } from './recovery-copies'

export const AUTO_SAVE_INTERVAL_MS = 30_000
/** how long the user must have stopped working before a big drawing is saved */
export const AUTO_SAVE_IDLE_MS = RECOVERY_COPY_TIMING.idleMs

export interface AutoSaveHost {
  dirty(): boolean
  /** a save is running: this occasion is skipped, the next one takes it */
  saving(): boolean
  save(): void
  /** the drawing is big enough that a save waits for a pause; false when absent */
  big?(): boolean
}

/** Starts the timer and the listeners; returns the stop function. */
export function startAutoSave(
  host: AutoSaveHost,
  intervalMs: number = AUTO_SAVE_INTERVAL_MS,
  idleMs: number = AUTO_SAVE_IDLE_MS,
): () => void {
  let lastInput = Number.NEGATIVE_INFINITY
  let held = false
  let retry: ReturnType<typeof setTimeout> | null = null

  const attempt = (urgent: boolean): void => {
    if (host.saving() || !host.dirty()) return
    if (!urgent && host.big?.()) {
      const quiet = Date.now() - lastInput
      if (held || quiet < idleMs) {
        // one pending retry at most; a held pointer is checked again after a full pause
        if (!retry) {
          retry = setTimeout(
            () => {
              retry = null
              attempt(false)
            },
            held ? idleMs : idleMs - quiet,
          )
        }
        return
      }
    }
    host.save()
  }

  const onInput = (): void => {
    lastInput = Date.now()
  }
  const onDown = (): void => {
    held = true
    onInput()
  }
  const onUp = (): void => {
    held = false
    onInput()
  }
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') attempt(true)
  }
  const inputs = ['keydown', 'wheel'] as const
  const ups = ['pointerup', 'pointercancel'] as const
  for (const e of inputs) window.addEventListener(e, onInput, true)
  window.addEventListener('pointerdown', onDown, true)
  for (const e of ups) window.addEventListener(e, onUp, true)
  const id = window.setInterval(() => attempt(false), intervalMs)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.clearInterval(id)
    if (retry) clearTimeout(retry)
    retry = null
    for (const e of inputs) window.removeEventListener(e, onInput, true)
    window.removeEventListener('pointerdown', onDown, true)
    for (const e of ups) window.removeEventListener(e, onUp, true)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

/** Runs AutoSave while `on` (the AutoSave setting is on and the drawing has a path). */
export function useAutoSave(on: boolean, host: AutoSaveHost): void {
  const latest = useRef(host)
  latest.current = host
  useEffect(() => {
    if (!on) return
    return startAutoSave({
      dirty: () => latest.current.dirty(),
      saving: () => latest.current.saving(),
      save: () => latest.current.save(),
      big: () => latest.current.big?.() ?? false,
    })
  }, [on])
}
