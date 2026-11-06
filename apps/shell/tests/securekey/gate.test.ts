import { describe, expect, it } from 'vitest'
import {
  decideGate,
  inGrace,
  readGateConfig,
  type GateConfig,
  type GateDecision,
} from '../../src/main/securekey/gate'
import type { FindResult, Registration } from '../../src/main/securekey/store'
import type { SecureKeyState, StatusVerdict } from '../../src/main/securekey/status'

const registration = { where: 'usb', dir: 'E:\\Hanpan' } as Registration
const config = (patch: Partial<GateConfig> = {}): GateConfig => ({
  platform: 'win32',
  requireKey: true,
  requiredFrom: '2026-12-04',
  server: 'http://127.0.0.1:3870',
  keys: { dev1: 'x' },
  ...patch,
})
const BEFORE = new Date(2026, 11, 3, 12, 0)
const ON = new Date(2026, 11, 4, 0, 0)
const usbState: SecureKeyState = { keyId: 'k1', where: 'usb' }
const pcState: SecureKeyState = { keyId: 'k1', where: 'pc' }
const found: FindResult = { kind: 'found', registration }
const none: FindResult = { kind: 'none' }

describe('inGrace', () => {
  it('is in grace the day before the date and not on it', () => {
    expect(inGrace('2026-12-04', new Date(2026, 11, 3, 23, 59))).toBe(true)
    expect(inGrace('2026-12-04', new Date(2026, 11, 4, 0, 0))).toBe(false)
    expect(inGrace(null, new Date())).toBe(false)
  })

  it('reads a malformed date as no grace', () =>
    expect(inGrace('next week', new Date(2026, 0, 1))).toBe(false))
})

describe('decideGate', () => {
  const cases: Array<
    [
      string,
      Partial<GateConfig>,
      Date,
      FindResult,
      SecureKeyState | null,
      StatusVerdict | null,
      GateDecision,
    ]
  > = [
    [
      'skips on macOS even when the key is required',
      { platform: 'darwin' },
      ON,
      none,
      null,
      null,
      { kind: 'skip' },
    ],
    ['skips on Linux', { platform: 'linux' }, ON, none, usbState, null, { kind: 'skip' }],
    [
      'skips a build without the key',
      { requireKey: false },
      ON,
      none,
      usbState,
      null,
      { kind: 'skip' },
    ],
    [
      'opens a found registration',
      {},
      ON,
      found,
      usbState,
      { ok: true },
      { kind: 'open', registration },
    ],
    [
      'opens a found registration before any status',
      {},
      ON,
      found,
      null,
      null,
      { kind: 'open', registration },
    ],
    [
      'locks a revoked key',
      {},
      ON,
      found,
      usbState,
      { ok: false, reason: 'revoked' },
      { kind: 'locked', reason: 'revoked' },
    ],
    [
      'locks a stale key',
      {},
      BEFORE,
      found,
      usbState,
      { ok: false, reason: 'stale' },
      { kind: 'locked', reason: 'stale' },
    ],
    [
      'locks a set-back clock',
      {},
      ON,
      found,
      usbState,
      { ok: false, reason: 'clock' },
      { kind: 'locked', reason: 'clock' },
    ],
    [
      'locks files of another device',
      {},
      ON,
      { kind: 'other-device', where: 'usb' },
      null,
      null,
      { kind: 'locked', reason: 'other-device' },
    ],
    [
      'locks damaged files',
      {},
      BEFORE,
      { kind: 'damaged' },
      null,
      null,
      { kind: 'locked', reason: 'damaged' },
    ],
    [
      'locks a missing stick during the grace too',
      {},
      BEFORE,
      none,
      usbState,
      null,
      { kind: 'locked', reason: 'usb-missing' },
    ],
    [
      'locks a missing stick after the grace',
      {},
      ON,
      none,
      usbState,
      null,
      { kind: 'locked', reason: 'usb-missing' },
    ],
    [
      'asks a PC whose PC registration is gone to register',
      {},
      ON,
      none,
      pcState,
      null,
      { kind: 'register', optional: false, until: '2026-12-04' },
    ],
    [
      'offers later during the grace',
      {},
      BEFORE,
      none,
      null,
      null,
      { kind: 'register', optional: true, until: '2026-12-04' },
    ],
    [
      'needs the key on the first day',
      {},
      ON,
      none,
      null,
      null,
      { kind: 'register', optional: false, until: '2026-12-04' },
    ],
    [
      'needs the key at once without a grace date',
      { requiredFrom: null },
      BEFORE,
      none,
      null,
      null,
      { kind: 'register', optional: false, until: null },
    ],
  ]
  it.each(cases)('%s', (_name, patch, now, result, state, status, expected) =>
    expect(decideGate({ config: config(patch), now, found: result, state, status })).toEqual(
      expected,
    ),
  )
})

describe('readGateConfig', () => {
  it('reads an unbuilt app as a build without the key', () =>
    expect(readGateConfig()).toMatchObject({ requireKey: false, requiredFrom: null, keys: {} }))
})
