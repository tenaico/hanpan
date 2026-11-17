/**
 * Crash-recovery copies of the open drawing (spec 7-2, decision 0061).
 *
 * While the drawing has unsaved changes, about every 30 seconds the bytes a
 * save would write now (`CadSession.saveBytes`) go to the main process, which
 * keeps them in the app data folder. A copy is made only when the history's
 * revision moved since the last copy that landed. It is independent of the
 * AutoSave switch, and it never touches the file, the unsaved mark or what a
 * later save compares with.
 *
 * - A big drawing (more than 200,000 triangles) is copied only once the user
 *   stopped working for 2 seconds, so a copy never cuts into an edit. Every
 *   change of the history counts as the user working, and so do keys, the
 *   pointer and the wheel on the screen.
 * - A copy that fails skips the next ticks and tries again; copies are never
 *   switched off.
 * - A copy made while a save ran is dropped: its bytes may be what the save
 *   just wrote, and a copy of them would outlive it.
 */
import { useEffect, useRef, useState } from 'react'
import type { RecoveryCopyResult } from '../../shared/ipc'
import type { CadSession } from './session'

/** Tunable timing (spec 7-2); tests shorten it. */
export const RECOVERY_COPY_TIMING = {
  /** between two copy ticks */
  intervalMs: 30_000,
  /** how long the user must have stopped working before a big drawing is copied */
  idleMs: 2_000,
  /** ticks skipped after a copy failed */
  backoffTicks: 10,
  /** above this many triangles a drawing counts as big */
  bigTriangles: 200_000,
}

export type RecoveryCopyTiming = typeof RECOVERY_COPY_TIMING

export interface RecoveryCopierHost {
  session(): CadSession | null
  /** a save is running */
  saving(): boolean
  write(bytes: Uint8Array): Promise<RecoveryCopyResult>
}

export type RecoveryCopyOutcome =
  'written' | 'clean' | 'unchanged' | 'waiting' | 'busy' | 'backoff' | 'dropped' | 'failed'

export class RecoveryCopier {
  readonly #host: RecoveryCopierHost
  readonly #timing: RecoveryCopyTiming
  readonly #now: () => number
  /** the history revision the last copy that landed holds; -1 for none */
  #copied = -1
  #backoff = 0
  /** bumped whenever a save starts */
  #saves = 0
  #lastInput = Number.NEGATIVE_INFINITY
  #running: Promise<RecoveryCopyOutcome> | null = null
  #retry: ReturnType<typeof setTimeout> | null = null
  #stopped = false

  constructor(
    host: RecoveryCopierHost,
    timing: RecoveryCopyTiming = RECOVERY_COPY_TIMING,
    now: () => number = () => performance.now(),
  ) {
    this.#host = host
    this.#timing = timing
    this.#now = now
  }

  /** the history moved: the user is working */
  noteChange(): void {
    this.noteInput()
  }

  /** the user typed, clicked or scrolled */
  noteInput(): void {
    this.#lastInput = this.#now()
  }

  /** a save starts */
  noteSave(): void {
    this.#saves++
  }

  /** the timer's tick */
  tick(): Promise<RecoveryCopyOutcome> {
    if (this.#stopped) return Promise.resolve('clean')
    if (this.#backoff > 0) {
      this.#backoff--
      return Promise.resolve('backoff')
    }
    return this.#attempt(false)
  }

  /** the OS is ending the session: a copy now, after any copy under way */
  async writeNow(): Promise<RecoveryCopyOutcome> {
    if (this.#running) await this.#running
    return this.#attempt(true)
  }

  /** the main process dropped the last copy and the tab stayed open: the next tick copies again */
  reset(): void {
    this.#copied = -1
  }

  stop(): void {
    this.#stopped = true
    if (this.#retry) clearTimeout(this.#retry)
    this.#retry = null
  }

  #attempt(urgent: boolean): Promise<RecoveryCopyOutcome> {
    const session = this.#host.session()
    if (!session || !session.dirty()) return Promise.resolve('clean')
    if (this.#running || this.#host.saving()) return Promise.resolve('busy')
    if (!urgent) {
      const quiet = this.#now() - this.#lastInput
      if (quiet < this.#timing.idleMs && session.triangles() > this.#timing.bigTriangles) {
        this.#retryIn(this.#timing.idleMs - quiet)
        return Promise.resolve('waiting')
      }
    }
    const revision = session.history.revision()
    if (revision === this.#copied) return Promise.resolve('unchanged')
    const running = this.#write(session, revision)
    this.#running = running
    void running.finally(() => {
      if (this.#running === running) this.#running = null
    })
    return running
  }

  async #write(session: CadSession, revision: number): Promise<RecoveryCopyOutcome> {
    const saves = this.#saves
    try {
      const bytes = session.saveBytes()
      const result = await this.#host.write(bytes)
      if (this.#saves !== saves || this.#stopped || result !== 'written') return 'dropped'
      this.#copied = revision
      return 'written'
    } catch (err) {
      console.warn('[cad] the recovery copy could not be written:', err)
      this.#backoff = this.#timing.backoffTicks
      return 'failed'
    }
  }

  /** one more try once the user has been quiet long enough (one pending at most) */
  #retryIn(ms: number): void {
    if (this.#retry || this.#stopped) return
    this.#retry = setTimeout(() => {
      this.#retry = null
      if (!this.#stopped && this.#backoff === 0) void this.#attempt(false)
    }, ms)
  }
}

export interface RecoveryCopiesOptions {
  /** the drawing opened and is shown */
  ready: boolean
  session: CadSession | null
  saving(): boolean
}

/**
 * Writes the open drawing's recovery copies for the editor screen. Returns the
 * copier so a save can tell it that it started (`noteSave`).
 */
export function useRecoveryCopies(options: RecoveryCopiesOptions): RecoveryCopier {
  const latest = useRef(options)
  latest.current = options
  const [current] = useState(
    () =>
      new RecoveryCopier({
        session: () => latest.current.session,
        saving: () => latest.current.saving(),
        write: async (bytes) => {
          const session = latest.current.session
          // the shell names an untitled drawing's copy after this when it has no name of its own
          const name = session && !session.path() ? session.title() : undefined
          return window.cadApi.writeRecoveryCopy({ bytes, name })
        },
      }),
  )
  const { ready, session } = options

  // every change of the history is the user working
  useEffect(() => {
    if (!session) return
    return session.history.subscribe(() => current.noteChange())
  }, [session, current])

  // so is turning the view: keys, the pointer, the wheel
  useEffect(() => {
    const note = (): void => current.noteInput()
    const events = ['keydown', 'pointerdown', 'wheel'] as const
    for (const event of events) window.addEventListener(event, note, true)
    return () => {
      for (const event of events) window.removeEventListener(event, note, true)
    }
  }, [current])

  useEffect(() => {
    if (!ready) return
    const id = window.setInterval(() => void current.tick(), RECOVERY_COPY_TIMING.intervalMs)
    const off = window.cadApi.onRecoveryCopyNow(() => {
      void current.writeNow().finally(() => window.cadApi.sendRecoveryCopyNowDone())
    })
    const offReset = window.cadApi.onRecoveryReset(() => current.reset())
    return () => {
      window.clearInterval(id)
      off()
      offReset()
    }
  }, [ready, current])

  useEffect(() => () => current.stop(), [current])

  return current
}
