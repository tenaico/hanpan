/**
 * A process-wide stop for every AI call while Hanpan's security key is
 * missing (spec 7-4). AI has no single gate in this code base, so each place
 * that starts a request or a program asks here: aiFetch, streamForProvider,
 * chatForProvider, the model lists that call fetch directly and
 * spawnSubscriptionProgram. Locking also ends the calls in flight: aiFetch
 * ties every request to aiLockSignal().
 */
import { AiRunError } from './run-error'

let locked = false
let controller = new AbortController()

/** Refused because the security key is not open. The existing "not connected" kind, so the renderer shows its usual guidance. */
export class AiLockedError extends AiRunError {
  readonly code = 'ai-locked'

  constructor() {
    super('not-connected', 'AI is locked until the security key is back')
    this.name = 'AiLockedError'
  }
}

export function setAiLocked(next: boolean): void {
  if (next === locked) return
  locked = next
  if (next) controller.abort(new AiLockedError())
  else controller = new AbortController()
}

export function isAiLocked(): boolean {
  return locked
}

/** Aborted when the lock comes on; a fresh one after it goes off */
export function aiLockSignal(): AbortSignal {
  return controller.signal
}

export function assertAiUnlocked(): void {
  if (locked) throw new AiLockedError()
}
