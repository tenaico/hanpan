import { parsePublicKeys, type PublicKeys } from './format'
import type { FindResult, Registration } from './store'
import type { SecureKeyState, StatusVerdict } from './status'

/**
 * The startup decision for the security key (spec 7-3, 7-7, 7-9): skip it,
 * open the found key, ask for a registration, or lock with a reason.
 */

declare const __HANPAN_REQUIRE_KEY__: string
declare const __HANPAN_KEY_REQUIRED_FROM__: string
declare const __HANPAN_KEY_SERVER__: string
declare const __HANPAN_KEY_PUBKEYS__: string

export interface GateConfig {
  platform: NodeJS.Platform
  requireKey: boolean
  /** `YYYY-MM-DD`: from this local day on the key is needed; null = no grace */
  requiredFrom: string | null
  /** the key server, without a trailing `/` */
  server: string
  keys: PublicKeys
}

/** Where a member gets a key. The path follows once the server (D) settles it. */
export const KEY_PAGE_URL = 'https://tenai.kr'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** The build values (electron.vite.config.ts `main.define`); an unbuilt app has none */
export function readGateConfig(): GateConfig {
  const requireKey = typeof __HANPAN_REQUIRE_KEY__ === 'string' ? __HANPAN_REQUIRE_KEY__ : ''
  const requiredFrom =
    typeof __HANPAN_KEY_REQUIRED_FROM__ === 'string' ? __HANPAN_KEY_REQUIRED_FROM__ : ''
  const server = typeof __HANPAN_KEY_SERVER__ === 'string' ? __HANPAN_KEY_SERVER__ : ''
  const keys = typeof __HANPAN_KEY_PUBKEYS__ === 'string' ? __HANPAN_KEY_PUBKEYS__ : ''
  return {
    platform: process.platform,
    requireKey: requireKey === '1',
    requiredFrom: DATE_PATTERN.test(requiredFrom) ? requiredFrom : null,
    server: server.replace(/\/+$/, ''),
    keys: parsePublicKeys(keys),
  }
}

/** Whether today (local date) is before the day the key becomes necessary */
export function inGrace(requiredFrom: string | null, now: Date): boolean {
  const match = requiredFrom ? DATE_PATTERN.exec(requiredFrom) : null
  if (!match) return false
  const from = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(from.getTime())) return false
  return now.getTime() < from.getTime()
}

export type LockReason = 'usb-missing' | 'other-device' | 'revoked' | 'stale' | 'clock' | 'damaged'

export type GateDecision =
  | { kind: 'skip' }
  | { kind: 'open'; registration: Registration }
  | { kind: 'register'; optional: boolean; until: string | null }
  | { kind: 'locked'; reason: LockReason }

/**
 * The rules, in order. The grace applies only when there is no registration
 * at all (spec 7-9): a registered stick that is missing locks whatever the date.
 */
export function decideGate(input: {
  config: GateConfig
  now: Date
  found: FindResult
  state: SecureKeyState | null
  status: StatusVerdict | null
}): GateDecision {
  const { config, found } = input
  if (config.platform !== 'win32' || !config.requireKey) return { kind: 'skip' }
  if (found.kind === 'found') {
    if (input.status && !input.status.ok) return { kind: 'locked', reason: input.status.reason }
    return { kind: 'open', registration: found.registration }
  }
  if (found.kind === 'other-device') return { kind: 'locked', reason: 'other-device' }
  if (found.kind === 'damaged') return { kind: 'locked', reason: 'damaged' }
  if (input.state?.where === 'usb') return { kind: 'locked', reason: 'usb-missing' }
  return {
    kind: 'register',
    optional: inGrace(config.requiredFrom, input.now),
    until: config.requiredFrom,
  }
}
