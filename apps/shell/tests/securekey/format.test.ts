import { describe, expect, it } from 'vitest'
import {
  newKeyId,
  parseLocalKeyFile,
  parseRegistered,
  type Registered,
} from '../../src/main/securekey/format'

const KEY_ID = '0123456789abcdef0123456789abcdef'
const AT = '2026-11-20T00:00:00.000Z'

const registered: Registered = {
  v: 2,
  keyId: KEY_ID,
  where: 'usb',
  devices: [{ deviceId: 'a'.repeat(64), addedAt: AT }],
  createdAt: AT,
  pcConsentAt: null,
  previous: [{ keyId: 'f'.repeat(32), replacedAt: '2026-11-19T00:00:00.000Z' }],
}

describe('the local key file', () => {
  it('reads a v2 key file', () => {
    const text = JSON.stringify({ v: 2, keyId: KEY_ID, createdAt: AT })
    expect(parseLocalKeyFile(text)).toEqual({ v: 2, keyId: KEY_ID, createdAt: AT })
  })

  it('refuses a short, upper-case or v1 key file', () => {
    const file = (keyId: string) => JSON.stringify({ v: 2, keyId, createdAt: AT })
    expect(parseLocalKeyFile(file(KEY_ID.slice(1)))).toBeNull()
    expect(parseLocalKeyFile(file(KEY_ID.toUpperCase()))).toBeNull()
    expect(parseLocalKeyFile(JSON.stringify({ payload: { v: 1 }, sig: 'x' }))).toBeNull()
    expect(parseLocalKeyFile('{')).toBeNull()
  })

  it('makes 32 hex digits for a key id', () => {
    const a = newKeyId()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(newKeyId()).not.toBe(a)
  })
})

describe('the registration record', () => {
  it('reads a whole record', () => {
    expect(parseRegistered(JSON.stringify(registered))).toEqual(registered)
  })

  it('refuses a record with a field missing or wrong', () => {
    const without = (key: keyof Registered) => {
      const copy: Record<string, unknown> = { ...registered }
      delete copy[key]
      return JSON.stringify(copy)
    }
    expect(parseRegistered(without('devices'))).toBeNull()
    expect(parseRegistered(without('previous'))).toBeNull()
    expect(parseRegistered(JSON.stringify({ ...registered, where: 'cloud' }))).toBeNull()
    expect(parseRegistered(JSON.stringify({ ...registered, keyId: 'k1' }))).toBeNull()
    const badDevice = { ...registered, devices: [{ deviceId: 'x' }] }
    expect(parseRegistered(JSON.stringify(badDevice))).toBeNull()
    expect(parseRegistered('not json')).toBeNull()
  })
})
