/**
 * What the app saves or exports from its own menus arrives as captured
 * downloads. A save from the app's menu (its document turning clean while the
 * host is not saving) runs Hanpan's save; a new exported file goes to Hanpan's
 * export dialog. Nothing is acted on while the host saves or the AI runs: what
 * reaches the disk is only what the person chose.
 */
import type { DocInfo, GraphicsAdapter } from '../adapters'
import { HOST_EXPORT_PREFIX } from '../adapters/types'

export interface CaptureWatchDeps {
  adapter: Pick<GraphicsAdapter, 'api'>
  intervalMs?: number
  /** a host save or an AI run is under way */
  busy(): boolean
  /** a host save is under way (its own turn to clean is expected) */
  hostSaving(): boolean
  onAppSave(): void
  onAppExport(path: string): void
  /** the document turned clean while the AI ran: nothing of Hanpan's saved it, so the tab keeps its mark */
  onUnexpectedClean(): void
}

export interface CaptureWatch {
  /** The latest document state, from the document watch. */
  noteDoc(info: DocInfo): void
  /** After a host save: its capture (by name) and its turn to clean are the host's own. */
  noteHostSave(fileName: string): Promise<void>
  /** At the end of a run that owned the app: whatever it wrote is taken in, not acted on. */
  absorb(): Promise<void>
  stop(): void
}

/** Exports the host hands on (the export dialog takes these); others are the app's own business. */
const EXPORT_EXT = /\.(png|jpe?g|svg)$/i
/** a file this size or larger is compared by size only */
const SIGNATURE_MAX_BYTES = 16 * 1024 * 1024
const SAMPLE = 4096

/** A cheap fingerprint of a file's bytes: its start, middle and end. */
function signature(bytes: Uint8Array): string {
  const parts = [
    bytes.subarray(0, SAMPLE),
    bytes.subarray(Math.max(0, (bytes.length >> 1) - SAMPLE / 2), (bytes.length >> 1) + SAMPLE / 2),
    bytes.subarray(Math.max(0, bytes.length - SAMPLE)),
  ]
  let h = 0x811c9dc5
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      h ^= part[i]!
      h = Math.imul(h, 0x01000193)
    }
  }
  return `${bytes.length}:${(h >>> 0).toString(16)}`
}

export function watchCaptures(deps: CaptureWatchDeps): CaptureWatch {
  const { adapter, intervalMs = 1000 } = deps
  const seen = new Map<string, number>()
  /** fingerprints of export files, so a re-export of the same size is still told apart */
  const signatures = new Map<string, string>()
  let docTitle: string | null = null
  let lastDirty: boolean | null = null
  let primed = false
  let stopped = false
  /** names the host saved under: never an app export */
  const ownNames = new Set<string>()
  let inFlight: Promise<void> | null = null

  const scan = (act: boolean): Promise<void> => {
    if (stopped) return Promise.resolve()
    if (inFlight) return inFlight
    inFlight = look(act).finally(() => {
      inFlight = null
    })
    return inFlight
  }

  const look = async (act: boolean): Promise<void> => {
    try {
      const files = await adapter.api.files()
      const quiet = !act || !primed || deps.busy()
      for (const { path, size } of files) {
        const known = seen.get(path)
        seen.set(path, size)
        // a copy the host had the app write (the AI's canvas picture, an export)
        if (path.split(/[\\/]/).pop()!.startsWith(HOST_EXPORT_PREFIX)) continue
        if (path === docTitle) {
          // the app wrote its own document (its File > Save): Hanpan's save puts it on disk.
          // This, not the changed mark turning off, is the sign: an undo back to the saved
          // state turns the mark off too, and a flat picture's save leaves it on.
          if (!quiet && known !== undefined && known !== size) deps.onAppSave()
          else if (!quiet && known === undefined && primed) deps.onAppSave()
          continue
        }
        if (ownNames.has(path)) continue
        let changed = known !== size
        if (EXPORT_EXT.test(path) && size < SIGNATURE_MAX_BYTES) {
          const before = signatures.get(path)
          if (changed || before !== undefined) {
            const now = signature(await adapter.api.readFile(path))
            signatures.set(path, now)
            if (before !== undefined && before !== now) changed = true
          }
        }
        if (quiet || !changed) continue
        deps.onAppExport(path)
      }
      primed = true
    } catch {
      // the app is busy or reloading: look again next time
    }
  }

  void scan(false)
  const timer = setInterval(() => void scan(true), intervalMs)

  return {
    noteDoc(info) {
      docTitle = info.title
      const was = lastDirty
      lastDirty = info.hasDocument ? info.dirty : null
      if (was !== true || lastDirty !== false) return
      // the document turned clean while a run owned it: nothing of Hanpan's saved it
      if (deps.busy() && !deps.hostSaving()) deps.onUnexpectedClean()
    },
    async noteHostSave(fileName) {
      ownNames.add(fileName)
      lastDirty = false
      // a scan that started before the save finishes first, then the save's file is marked seen
      await inFlight
      await scan(false)
    },
    async absorb() {
      await inFlight
      await scan(false)
    },
    stop() {
      stopped = true
      clearInterval(timer)
    },
  }
}
