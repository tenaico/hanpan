/**
 * AutoSave of a drawing that has a path (spec 7-1): every 30 seconds and when
 * the window goes to the background, and only when there are unsaved changes.
 * An untitled drawing waits for the first save by hand, which asks where.
 */
import { useEffect, useRef } from 'react'

export const AUTO_SAVE_INTERVAL_MS = 30_000

export interface AutoSaveHost {
  dirty(): boolean
  /** a save is running: this occasion is skipped, the next one takes it */
  saving(): boolean
  save(): void
}

/** Starts the timer and the background listener; returns the stop function. */
export function startAutoSave(
  host: AutoSaveHost,
  intervalMs: number = AUTO_SAVE_INTERVAL_MS,
): () => void {
  const tick = (): void => {
    if (host.saving() || !host.dirty()) return
    host.save()
  }
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') tick()
  }
  const id = window.setInterval(tick, intervalMs)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.clearInterval(id)
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
    })
  }, [on])
}
