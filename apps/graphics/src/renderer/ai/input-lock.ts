/**
 * While the AI (or a quick action) works on the document, the person's input
 * does not reach the app: the overlay over the frame takes the pointer, and
 * the frame's agent (`frame/frame-agent.ts`) drops keys and the rest. So the
 * app's history during a run holds the run's edits only.
 */
import { postFrameLock, type HostLink } from '../frame/page-api'
export function lockFrameInput(
  frame: HTMLIFrameElement,
  overlay: HTMLElement,
  /** tests only: in place of the frame's window messages */
  testLink?: HostLink,
): () => void {
  // the overlay takes the pointer here; inside the frame (its own origin) the agent drops
  // keys and the rest and takes the keyboard from the focused control
  overlay.dataset.locked = 'true'
  postFrameLock(frame, true, testLink)
  let locked = true
  return () => {
    if (!locked) return
    locked = false
    postFrameLock(frame, false, testLink)
    delete overlay.dataset.locked
  }
}
