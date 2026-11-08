/** The file a tab was opened for, handed to the app once it is up. */
import type { GraphicsAdapter } from '../adapters'
import type { PendingOpen } from '../../shared/ipc'
import { copyBytes } from '../frame/bytes'

export async function openPending(
  adapter: Pick<GraphicsAdapter, 'api' | 'docInfo'>,
  consume: () => Promise<PendingOpen | null>,
  /** tells main the app opened the file: only then is it the tab's save target */
  confirm: (path: string) => void,
  timeoutMs = 30_000,
): Promise<'opened' | 'none' | 'failed'> {
  let pending: PendingOpen | null
  try {
    pending = await consume()
  } catch {
    // main could not read the file: the tab stays usable and says so
    return 'failed'
  }
  if (!pending) return 'none'
  try {
    const started = Date.now()
    // PhotoCraft's API is up before its first frame and refuses an open until then:
    // offer the file again until the time limit
    while ((await adapter.api.openFile(pending.name, copyBytes(pending.bytes))) === false) {
      if (Date.now() - started >= timeoutMs) return 'failed'
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    while (Date.now() - started < timeoutMs) {
      if ((await adapter.docInfo()).hasDocument) {
        confirm(pending.path)
        return 'opened'
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    return 'failed'
  } catch {
    return 'failed'
  }
}
