/**
 * The host page shares its origin, and so its localStorage, with the web app in
 * its frame. Before the frame loads, the host prepares what the app reads at
 * start-up.
 */

const PHOTO_PREFS_KEY = 'photocraft.preferences'
const ILLUST_RECOVERY_PREFIX = 'vectorcraft-recovery/'

/**
 * PhotoCraft's web build ignores the browser language (its "auto" is always
 * English on the web), so the host writes the interface language into the app's
 * preferences before the app starts; every other preference stays.
 */
export function seedPhotoPreferences(storage: Storage, appLang: string): void {
  let prefs: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PHOTO_PREFS_KEY) ?? '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      prefs = parsed as Record<string, unknown>
    }
  } catch {
    prefs = {}
  }
  const ui = prefs.interface
  const iface =
    ui && typeof ui === 'object' && !Array.isArray(ui) ? (ui as Record<string, unknown>) : {}
  prefs.interface = { ...iface, language: appLang }
  storage.setItem(PHOTO_PREFS_KEY, JSON.stringify(prefs))
}

/**
 * VectorCraft keeps unsaved documents in localStorage and offers them back at
 * the next start, in whichever tab of the same origin starts next. Hanpan tabs
 * hold one document each and ask before closing, so those copies are dropped
 * before a tab starts (the app's own recovery is also turned off once it runs).
 */
export function clearIllustRecovery(storage: Storage): number {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key?.startsWith(ILLUST_RECOVERY_PREFIX)) keys.push(key)
  }
  for (const key of keys) storage.removeItem(key)
  return keys.length
}
