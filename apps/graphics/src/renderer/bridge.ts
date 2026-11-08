/**
 * The host page's one copy of the preload bridge (decision 0093, docs/security.md).
 *
 * The web app runs in a same-origin frame and can reach `parent`, so the
 * preload puts no `graphicsApi` on the window. It exposes `graphicsBridge`,
 * whose `take()` answers the API once: `main.tsx` takes it before the frame
 * exists, and the frame's own take gets null. The API then lives in this
 * module's closure, out of the window's reach.
 */
import type { GraphicsApi } from '../shared/ipc'

let api: GraphicsApi | null = null

/** Takes the bridge from the preload; false when there was none left to take. */
export function takeGraphicsApi(): boolean {
  const taken = window.graphicsBridge?.take() ?? null
  if (taken) api = taken
  return taken !== null
}

/** The bridge; throws before `takeGraphicsApi` (a programming error). */
export function graphicsApi(): GraphicsApi {
  if (!api) throw new Error('the graphics bridge was not taken')
  return api
}

/** The bridge when there is one (a standalone page or a test may have none). */
export function graphicsApiOrNull(): GraphicsApi | null {
  return api
}

/** Tests only: put a fake in place of the preload's bridge, or take it away. */
export function installGraphicsApi(value: GraphicsApi | null): void {
  api = value
}
