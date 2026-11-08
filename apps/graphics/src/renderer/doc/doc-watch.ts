/**
 * Follows the app's document state (is there one, is it changed, its name) by
 * asking every interval; one question at a time, and only changes are reported.
 */
import type { DocInfo, GraphicsAdapter } from '../adapters'
import { withTimeout } from '../frame/page-api'

export interface DocWatch {
  stop(): void
  /** Report the state again at the next look, changed or not: a save has reset the tab's mark. */
  resync(): void
}

export function watchDoc(
  adapter: Pick<GraphicsAdapter, 'docInfo'>,
  onChange: (info: DocInfo) => void,
  intervalMs = 1000,
  /** an inspect that takes longer is given up and asked again */
  callTimeoutMs = 20_000,
): DocWatch {
  let stopped = false
  let asking = false
  let last: DocInfo | null = null
  /** bumped by resync: an answer to an older question is stale */
  let generation = 0
  const tick = async (): Promise<void> => {
    if (asking || stopped) return
    asking = true
    const asked = generation
    try {
      const info = await withTimeout(adapter.docInfo(), callTimeoutMs, 'inspect')
      if (asked !== generation) return
      if (
        !stopped &&
        (!last ||
          last.hasDocument !== info.hasDocument ||
          last.dirty !== info.dirty ||
          last.title !== info.title)
      ) {
        last = info
        onChange(info)
      }
    } catch {
      // the app is busy or reloading: keep the last state
    } finally {
      // a question resync gave up on must not free the slot of the one asked after it
      if (asked === generation) asking = false
    }
  }
  void tick()
  const timer = setInterval(() => void tick(), intervalMs)
  return {
    stop() {
      stopped = true
      clearInterval(timer)
    },
    resync() {
      last = null
      generation += 1
      asking = false
      void tick()
    },
  }
}
