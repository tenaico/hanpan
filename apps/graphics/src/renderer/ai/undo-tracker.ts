/**
 * One [Undo] per AI request (design 6-4). The app's own undo history is the
 * measure: its length before the first change of a run and after the run. The
 * apps do not add one history entry per command (PhotoCraft's control docs say
 * so), so commands are not counted. The input lock keeps the person's own edits
 * out of a run, so the difference is the run's.
 */
import type { GraphicsAdapter } from '../adapters'

export interface RunUndo {
  /** history entries the run added */
  steps: number
  /** the document's revision when the run ended; an [Undo] later checks it is still so
      (any edit or undo moves it, even one that leaves the history as long as before) */
  markerAfter: number
  /** commands changed the document but the history did not grow (the app's history limit) */
  overflow: boolean
}

export interface UndoTracker {
  /** Before a command that may change the document: records the history length once per run. */
  beforeMutation(): Promise<void>
  noteMutation(): void
  /** At the end of a run; null when nothing was changed. Starts the next run fresh. */
  finish(): Promise<RunUndo | null>
}

export function createUndoTracker(
  adapter: Pick<GraphicsAdapter, 'historyLength' | 'revision'>,
): UndoTracker {
  let before: number | null = null
  let mutated = false
  return {
    async beforeMutation() {
      if (before === null) before = await adapter.historyLength()
    },
    noteMutation() {
      mutated = true
    },
    async finish() {
      const start = before
      const changed = mutated
      before = null
      mutated = false
      if (!changed || start === null) return null
      const after = await adapter.historyLength()
      const steps = Math.max(0, after - start)
      return { steps, markerAfter: await adapter.revision(), overflow: steps === 0 }
    },
  }
}

/** Undoes a run, unless the document's history has moved on since the run ended. */
export async function undoRun(
  adapter: Pick<GraphicsAdapter, 'revision' | 'undo'>,
  run: RunUndo,
): Promise<'undone' | 'changed-since' | 'failed'> {
  if ((await adapter.revision()) !== run.markerAfter) return 'changed-since'
  const done = await adapter.undo(run.steps)
  return done === run.steps ? 'undone' : 'failed'
}
