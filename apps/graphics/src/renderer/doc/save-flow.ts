/**
 * One Hanpan save: main settles the target, the app writes the bytes in that
 * format (captured, never to disk), main writes them. A write that fails after
 * the app turned the document clean leaves the tab marked changed.
 */
import type { GraphicsAdapter } from '../adapters'
import type { GraphicsApi, SaveMode } from '../../shared/ipc'
import { withTimeout } from '../frame/page-api'
import type { DirtyState } from './dirty-state'

export type SaveNoticeKey = 'saveFailed' | 'layeredSaveNotice'

export interface SaveDeps {
  adapter: Pick<GraphicsAdapter, 'docInfo' | 'isLayered' | 'saveBytes'>
  api: Pick<GraphicsApi, 'beginSave' | 'commitSave' | 'abortSave'>
  dirty: DirtyState
  notify(key: SaveNoticeKey): void
  /** Marks the save as the host's own, so the capture watch does not read it as the app's. */
  hostOp: { begin(): void; end(): void }
  /** how long one call to the app may take before the save gives up */
  timeoutMs?: number
  /** the file name the app writes under, told before it writes: its capture is the host's */
  savedAs?(fileName: string): void
}

const SAVE_CALL_TIMEOUT_MS = 120_000

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

export async function runSave(mode: SaveMode, deps: SaveDeps): Promise<boolean> {
  const { adapter, api, dirty, notify, hostOp, timeoutMs = SAVE_CALL_TIMEOUT_MS } = deps
  if (!(await adapter.docInfo()).hasDocument) return false
  hostOp.begin()
  let begun = false
  try {
    const layered = await withTimeout(adapter.isLayered(), timeoutMs, 'reading the layers')
    const target = await api.beginSave({ mode, layered })
    if (!target.ok) {
      notify('saveFailed')
      return false
    }
    if ('canceled' in target) return false
    begun = true
    if (target.reason === 'layered') notify('layeredSaveNotice')
    const name = fileName(target.path)
    deps.savedAs?.(name)
    const bytes = await withTimeout(
      adapter.saveBytes(name, target.format),
      timeoutMs,
      'saving through the app',
    )
    const commit = await api.commitSave({ bytes, path: target.path, format: target.format })
    begun = false
    if (!commit.ok) {
      dirty.saveFailed()
      notify('saveFailed')
      return false
    }
    // an edit made while the bytes were being written keeps the mark
    const now = await adapter.docInfo().catch(() => null)
    dirty.saved(now?.dirty === true)
    return true
  } catch {
    if (begun) api.abortSave()
    dirty.saveFailed()
    notify('saveFailed')
    return false
  } finally {
    hostOp.end()
  }
}
