import { existsSync, readFileSync } from 'node:fs'
import {
  AiLockedError,
  SEALED_PREFIX,
  SEALED_PREFIX_V2,
  isSealedSecret,
  mapAiSecrets,
  openSecretValue,
  sealSecretValue,
  type AiSecretCodec,
} from '@genoffice/ai-provider'
import { writeJsonAtomic } from '@genoffice/electron-utils/atomic-write'

/**
 * Keys and tokens in ai-settings.json under the operating system's protection
 * (decision 0063). The app seals them with Electron safeStorage on Windows
 * (DPAPI under the user's account) and on Linux when a real keyring holds the
 * key (GNOME Keyring, KWallet). macOS keeps them plain: an ad hoc signed app
 * (decision 0031) would meet a Keychain prompt after every update. Any
 * platform opens a sealed value it can.
 *
 * The terminal command runs without Electron, so it starts this app hidden
 * with REVEAL_FLAG, hands it the sealed values on stdin and reads the plain
 * ones back on stdout (packages/cli/src/secrets.ts). That is no wider than
 * the protection itself: any program running as the same user can ask DPAPI.
 */

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean
  encryptString(plain: string): Buffer
  decryptString(sealed: Buffer): string
  /** Linux only: which password store holds the key */
  getSelectedStorageBackend?(): string
}

/**
 * Linux password stores that really protect the key. Without a keyring
 * Chromium falls back to `basic_text`, a key built into the program: a value
 * "sealed" that way only looks protected, so it stays plain.
 */
const LINUX_KEYRINGS: ReadonlySet<string> = new Set([
  'gnome_libsecret',
  'kwallet',
  'kwallet5',
  'kwallet6',
])

/** Whether this platform seals at all, apart from the key being ready */
export function platformSeals(storage: SafeStorageLike, platform: NodeJS.Platform): boolean {
  if (!storage.isEncryptionAvailable()) return false
  if (platform === 'win32') return true
  if (platform === 'linux') return LINUX_KEYRINGS.has(storage.getSelectedStorageBackend?.() ?? '')
  return false
}

/**
 * Whether Chromium's key for safeStorage is on disk yet (`Local State`,
 * `os_crypt.encrypted_key`). Chromium makes the key on first use and writes it
 * some seconds later or at a clean quit; a value sealed before that and an app
 * killed in between could never be opened again, by the app or the command.
 */
export function sealingKeyOnDisk(localStatePath: string): boolean {
  try {
    const state = JSON.parse(readFileSync(localStatePath, 'utf8')) as {
      os_crypt?: { encrypted_key?: unknown }
    }
    return typeof state.os_crypt?.encrypted_key === 'string' && state.os_crypt.encrypted_key !== ''
  } catch {
    return false
  }
}

export function safeStorageCodec(
  storage: SafeStorageLike,
  platform: NodeJS.Platform = process.platform,
  /** Windows: values stay plain until this says the key would survive a crash */
  keyOnDisk: () => boolean = () => true,
): AiSecretCodec {
  return {
    // Linux keeps the key in the keyring itself, so only Windows waits for Local State
    seal: (plain) =>
      platformSeals(storage, platform) && (platform !== 'win32' || keyOnDisk())
        ? SEALED_PREFIX + storage.encryptString(plain).toString('base64')
        : null,
    open: (sealed) => {
      // v1 only: a v2 value opened here would hand out its inner, still encrypted text
      if (!sealed.startsWith(SEALED_PREFIX) || !storage.isEncryptionAvailable()) return null
      try {
        return storage.decryptString(Buffer.from(sealed.slice(SEALED_PREFIX.length), 'base64'))
      } catch {
        return null
      }
    },
  }
}

/** `upgrade`: the security key's vault is open, so v1 values are sealed again as v2 (spec 7-5) */
export interface SealOptions {
  upgrade?: boolean
}

/** A value that sealing would change: plain and non-empty, or v1 while upgrading */
function wantsSealing(v: string, options: SealOptions): boolean {
  if (v === '') return false
  if (!isSealedSecret(v)) return true
  return options.upgrade === true && v.startsWith(SEALED_PREFIX)
}

/**
 * One stored value sealed again: a plain one sealed, a v1 one opened and sealed
 * again while upgrading. A value that cannot be opened stays as it is: emptying
 * it would lose the key.
 */
function resealValue(v: string, options: SealOptions): string {
  if (!wantsSealing(v, options)) return v
  if (!isSealedSecret(v)) return sealSecretValue(v)
  const plain = openSecretValue(v)
  if (plain === '') return v
  const next = sealSecretValue(plain)
  return isSealedSecret(next) ? next : v
}

/** Whether a stored settings object still holds a plain, non-empty key or token (or v1 while upgrading) */
export function holdsPlainSecrets(stored: unknown, options: SealOptions = {}): boolean {
  let found = false
  mapAiSecrets(stored, (v) => {
    if (wantsSealing(v, options)) found = true
    return v
  })
  return found
}

/**
 * Seal the plain keys an existing file holds (written by an earlier version,
 * or by hand). Leaves the file alone when it cannot be read, holds nothing
 * plain, or this PC cannot seal. Returns whether it rewrote the file.
 */
export function sealStoredAiSettings(path: string, options: SealOptions = {}): boolean {
  let stored: unknown
  try {
    if (!existsSync(path)) return false
    stored = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return false
  }
  if (!holdsPlainSecrets(stored, options)) return false
  const sealed = mapAiSecrets(stored, (v) => resealValue(v, options))
  if (holdsPlainSecrets(sealed)) return false
  // nothing could be upgraded (no vault, or values it cannot open): the file stays as it is
  if (JSON.stringify(sealed) === JSON.stringify(stored)) return false
  writeJsonAtomic(path, sealed)
  return true
}

/**
 * "Make a new security key" (spec 2026-11-12 5-4): the keys sealed with the
 * old key's vault can never open again, so they are emptied; everything else
 * in the file stays. Returns how many keys were emptied.
 */
export function clearSealedV2Secrets(path: string): number {
  let stored: unknown
  try {
    if (!existsSync(path)) return 0
    stored = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return 0
  }
  let cleared = 0
  const next = mapAiSecrets(stored, (v) => {
    if (!v.startsWith(SEALED_PREFIX_V2)) return v
    cleared++
    return ''
  })
  if (cleared > 0) writeJsonAtomic(path, next)
  return cleared
}

/**
 * The same for the home search's reranking keys (`fileSearch.keys` and
 * `fileSearch.jevKeys` in app-settings.json): a v2 value no vault can open
 * would refuse every later write of those settings. Returns how many keys
 * were emptied.
 */
export function clearSealedV2FileSearchKeys(path: string): number {
  let stored: unknown
  try {
    if (!existsSync(path)) return 0
    stored = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return 0
  }
  if (typeof stored !== 'object' || stored === null) return 0
  const search = (stored as Record<string, unknown>).fileSearch
  if (typeof search !== 'object' || search === null) return 0
  let cleared = 0
  const clear = (keys: unknown) =>
    typeof keys === 'object' && keys !== null
      ? Object.fromEntries(
          Object.entries(keys).map(([id, v]) => {
            if (typeof v !== 'string' || !v.startsWith(SEALED_PREFIX_V2)) return [id, v]
            cleared++
            return [id, '']
          }),
        )
      : keys
  const s = search as Record<string, unknown>
  const next = {
    ...s,
    ...('keys' in s ? { keys: clear(s.keys) } : {}),
    ...('jevKeys' in s ? { jevKeys: clear(s.jevKeys) } : {}),
  }
  if (cleared > 0) writeJsonAtomic(path, { ...(stored as object), fileSearch: next })
  return cleared
}

/**
 * The home search's reranking keys (`fileSearch.keys` in app-settings.json)
 * under the same protection. Only the app reads that file, so no command needs
 * them opened. Opened before the settings are normalized (which trims and
 * cuts each key), sealed after.
 */
export function openFileSearchKeys(stored: unknown): unknown {
  if (typeof stored !== 'object' || stored === null) return stored
  const s = stored as Record<string, unknown>
  const open = (keys: unknown) =>
    typeof keys === 'object' && keys !== null
      ? Object.fromEntries(
          Object.entries(keys).map(([id, v]) => [
            id,
            typeof v === 'string' ? openSecretValue(v) : v,
          ]),
        )
      : keys
  return {
    ...s,
    ...('keys' in s ? { keys: open(s.keys) } : {}),
    ...('jevKeys' in s ? { jevKeys: open(s.jevKeys) } : {}),
  }
}

export function sealFileSearchKeys<T extends { keys: Record<string, string> }>(settings: T): T {
  return {
    ...settings,
    keys: Object.fromEntries(
      Object.entries(settings.keys).map(([id, v]) => [id, sealSecretValue(v)]),
    ) as T['keys'],
  }
}

/** Whether stored reranking settings still hold a plain, non-empty key (or a v1 one while upgrading) */
export function fileSearchHoldsPlainKeys(stored: unknown, options: SealOptions = {}): boolean {
  const keys = (stored as { keys?: unknown } | null)?.keys
  return (
    typeof keys === 'object' &&
    keys !== null &&
    Object.values(keys).some((v) => typeof v === 'string' && wantsSealing(v, options))
  )
}

/**
 * The reranking keys are not written while one of them is a v2 value this run
 * cannot open (the security key's stick is out): it reads as empty, and the
 * write would replace it for good. Pass the stored `fileSearch` value.
 */
export function assertFileSearchKeysWritable(stored: unknown): void {
  const keys = (stored as { keys?: unknown } | null | undefined)?.keys
  if (typeof keys !== 'object' || keys === null) return
  for (const v of Object.values(keys)) {
    if (typeof v === 'string' && v.startsWith(SEALED_PREFIX_V2) && openSecretValue(v) === '') {
      throw new AiLockedError()
    }
  }
}

/** The hidden entry the terminal command starts to open sealed values */
export const REVEAL_FLAG = '--reveal-ai-secrets'
export const MAX_REVEAL_VALUES = 64
const MAX_SEALED_LENGTH = 16_384
const MAX_STDIN_BYTES = 2 * 1024 * 1024
const STDIN_TIMEOUT_MS = 5_000

/** The sealed values a reveal request asks for, or null when it is not one */
export function revealRequestOf(text: string): string[] | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!Array.isArray(raw) || raw.length > MAX_REVEAL_VALUES) return null
  const values: string[] = []
  for (const v of raw) {
    if (!isSealedSecret(v) || v.length > MAX_SEALED_LENGTH) return null
    values.push(v)
  }
  return values
}

/** The answer line: every value this PC could open, keyed by its sealed form */
export function revealAnswer(values: string[] | null, codec: AiSecretCodec): string {
  if (!values) return JSON.stringify({ status: 'error', error: 'bad request' })
  const secrets: Record<string, string> = {}
  for (const v of values) {
    const plain = codec.open(v)
    if (plain !== null) secrets[v] = plain
  }
  return JSON.stringify({ status: 'ok', secrets })
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let size = 0
    const done = () => {
      clearTimeout(timer)
      process.stdin.removeAllListeners()
      process.stdin.pause()
      resolve(Buffer.concat(chunks).toString('utf8'))
    }
    const timer = setTimeout(done, STDIN_TIMEOUT_MS)
    process.stdin.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_STDIN_BYTES) {
        chunks.length = 0
        done()
        return
      }
      chunks.push(chunk)
    })
    process.stdin.on('end', done)
    process.stdin.on('error', done)
  })
}

/** The whole hidden run: read the request, print one line, return the exit code */
export async function runRevealEntry(codec: AiSecretCodec): Promise<number> {
  const line = revealAnswer(revealRequestOf(await readStdin()), codec) + '\n'
  await new Promise<void>((resolve) => {
    const bail = setTimeout(resolve, 2000)
    process.stdout.write(line, () => {
      clearTimeout(bail)
      resolve()
    })
  })
  return line.startsWith('{"status":"ok"') ? 0 : 1
}
