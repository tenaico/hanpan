import { describe, expect, it } from 'vitest'
import { decideGate, readGateConfig, type GateConfig } from '../../src/main/securekey/gate'
import type { Registration } from '../../src/main/securekey/store'

const on: GateConfig = { platform: 'win32', requireKey: true }
const registration: Registration = {
  where: 'usb',
  keyId: '0123456789abcdef0123456789abcdef',
  vault: Buffer.alloc(32),
  letter: 'E',
  volumeSerial: '1a2b3c4d',
}

describe('decideGate', () => {
  it('skips outside Windows or without the build switch', () => {
    const found = { kind: 'none' } as const
    expect(decideGate({ config: { ...on, platform: 'darwin' }, found })).toEqual({ kind: 'skip' })
    expect(decideGate({ config: { ...on, requireKey: false }, found })).toEqual({ kind: 'skip' })
  })

  it('asks to create a key when nothing is registered', () => {
    expect(decideGate({ config: on, found: { kind: 'none' } })).toEqual({ kind: 'create' })
  })

  it('opens a found key', () => {
    expect(decideGate({ config: on, found: { kind: 'found', registration } })).toEqual({
      kind: 'open',
      registration,
    })
  })

  it('locks with the reason', () => {
    for (const kind of ['usb-missing', 'unregistered-usb', 'damaged'] as const) {
      expect(decideGate({ config: on, found: { kind } })).toEqual({ kind: 'locked', reason: kind })
    }
  })

  it('carries the replaced date', () => {
    const replacedAt = '2026-11-21T06:32:00.000Z'
    expect(decideGate({ config: on, found: { kind: 'replaced', replacedAt } })).toEqual({
      kind: 'locked',
      reason: 'replaced',
      replacedAt,
    })
  })
})

describe('readGateConfig', () => {
  it('reads an unbuilt app as a build without the key', () =>
    expect(readGateConfig()).toEqual({ platform: process.platform, requireKey: false }))
})
