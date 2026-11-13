import type { FindResult, Registration } from './store'

/**
 * The startup decision for the local security key (spec 2026-11-12 5-2):
 * skip it, open the found key, ask for a new key, or lock with a reason.
 */

declare const __HANPAN_REQUIRE_KEY__: string

export interface GateConfig {
  platform: NodeJS.Platform
  requireKey: boolean
}

/** The build value (electron.vite.config.ts `main.define`); an unbuilt app has none */
export function readGateConfig(): GateConfig {
  const requireKey = typeof __HANPAN_REQUIRE_KEY__ === 'string' ? __HANPAN_REQUIRE_KEY__ : ''
  return { platform: process.platform, requireKey: requireKey === '1' }
}

export type LockReason = 'usb-missing' | 'unregistered-usb' | 'replaced' | 'damaged'

export type GateDecision =
  | { kind: 'skip' }
  | { kind: 'open'; registration: Registration }
  | { kind: 'create' }
  | { kind: 'locked'; reason: LockReason; replacedAt?: string }

export function decideGate(input: { config: GateConfig; found: FindResult }): GateDecision {
  const { config, found } = input
  if (config.platform !== 'win32' || !config.requireKey) return { kind: 'skip' }
  switch (found.kind) {
    case 'found':
      return { kind: 'open', registration: found.registration }
    case 'none':
      return { kind: 'create' }
    case 'replaced':
      return { kind: 'locked', reason: 'replaced', replacedAt: found.replacedAt }
    default:
      return { kind: 'locked', reason: found.kind }
  }
}
