import { existsSync } from 'node:fs'
import { win32 } from 'node:path'
import { volumeSerialOf } from './devices'

/**
 * Whether the registered stick is still in (spec 7-4): every `everyMs` the
 * registration's activation.json is looked at and the volume serial of its
 * drive compared with the registered one, so another stick on the same letter
 * counts as missing. A PC registration only checks that the file is there.
 * Reports changes only. Returns the stop function.
 */
export function startPresenceWatch(opts: {
  activationPath: string
  /** the registered stick's volume serial; null for a PC registration */
  volumeSerial: string | null
  everyMs?: number
  serialOf?: (root: string) => string | null
  exists?: (path: string) => boolean
  onChange(present: boolean): void
}): () => void {
  const serialOf = opts.serialOf ?? volumeSerialOf
  const exists = opts.exists ?? existsSync
  const root = win32.parse(opts.activationPath).root
  const look = (): boolean => {
    try {
      if (!exists(opts.activationPath)) return false
      return opts.volumeSerial === null || serialOf(root) === opts.volumeSerial
    } catch {
      return false
    }
  }
  let present = true
  const timer = setInterval(() => {
    const now = look()
    if (now === present) return
    present = now
    try {
      opts.onChange(now)
    } catch {
      /* the next change still reports */
    }
  }, opts.everyMs ?? 2000)
  timer.unref?.()
  return () => clearInterval(timer)
}
