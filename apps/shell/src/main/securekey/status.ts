import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { atomicWriteFile } from '../atomic-write'
import {
  isStatusPayload,
  verifySigned,
  type PublicKeys,
  type Signed,
  type StatusPayload,
} from './format'

/**
 * Whether a registered key is still good (spec 7-3, step 4). tenai.kr answers
 * with a signed status and its own clock; the app keeps the last good answer.
 * Thirty days without one locks, whatever the cause (no internet, a blocked
 * domain, a server down): otherwise blocking the domain would undo revocation
 * and the three-key limit. A PC clock set back before the last trusted time
 * fails too.
 */

export const STATUS_MAX_AGE_MS = 30 * 24 * 3600_000
export const STATUS_EVERY_MS = 24 * 3600_000
export const CLOCK_SKEW_MS = 5 * 60_000
const STATUS_TIMEOUT_MS = 10_000
const MAX_STATUS_BYTES = 64 * 1024

/** The PC's own record: where the key was registered and the last signed answer */
export interface SecureKeyState {
  keyId: string
  where: 'usb' | 'pc'
  status?: Signed<StatusPayload>
  checkedAt?: string
}

export function statePath(userData: string): string {
  return join(userData, 'securekey-state.json')
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export function readState(path: string): SecureKeyState | null {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
  if (!isRecord(raw) || typeof raw.keyId !== 'string' || raw.keyId === '') return null
  if (raw.where !== 'usb' && raw.where !== 'pc') return null
  const state: SecureKeyState = { keyId: raw.keyId, where: raw.where }
  if (isRecord(raw.status)) state.status = raw.status as unknown as Signed<StatusPayload>
  if (typeof raw.checkedAt === 'string') state.checkedAt = raw.checkedAt
  return state
}

export async function writeState(path: string, state: SecureKeyState): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  return atomicWriteFile(path, Buffer.from(JSON.stringify(state, null, 2), 'utf8'))
}

export type StatusVerdict = { ok: true } | { ok: false; reason: 'revoked' | 'stale' | 'clock' }

export function judgeStatus(input: {
  now: Date
  activatedAt: string
  last: StatusPayload | null
}): StatusVerdict {
  if (input.last?.status === 'revoked') return { ok: false, reason: 'revoked' }
  const times = [Date.parse(input.activatedAt), Date.parse(input.last?.serverTime ?? '')].filter(
    (t) => Number.isFinite(t),
  )
  if (times.length === 0) return { ok: false, reason: 'stale' }
  const trusted = Math.max(...times)
  const now = input.now.getTime()
  if (now < trusted - CLOCK_SKEW_MS) return { ok: false, reason: 'clock' }
  if (now - trusted > STATUS_MAX_AGE_MS) return { ok: false, reason: 'stale' }
  return { ok: true }
}

/** The signed status of `keyId`, or null for any failure (network, refusal, bad signature) */
export async function fetchStatus(opts: {
  server: string
  keyId: string
  keys: PublicKeys
  fetch: typeof fetch
  timeoutMs?: number
}): Promise<Signed<StatusPayload> | null> {
  try {
    const response = await opts.fetch(
      `${opts.server}/keys/status?keyId=${encodeURIComponent(opts.keyId)}`,
      {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(opts.timeoutMs ?? STATUS_TIMEOUT_MS),
      },
    )
    if (!response.ok) return null
    const text = await response.text()
    if (text.length > MAX_STATUS_BYTES) return null
    const doc = JSON.parse(text) as unknown
    const payload = verifySigned(doc, opts.keys, isStatusPayload)
    if (!payload || payload.keyId !== opts.keyId) return null
    return doc as Signed<StatusPayload>
  } catch {
    return null
  }
}

/** Whether a day has passed since the last answer (or there never was one) */
export function statusDue(state: SecureKeyState | null, now: Date): boolean {
  const checked = Date.parse(state?.checkedAt ?? '')
  if (!Number.isFinite(checked)) return true
  const since = now.getTime() - checked
  // a clock set back since the last answer asks again instead of waiting until it catches up
  return since < 0 || since >= STATUS_EVERY_MS
}
