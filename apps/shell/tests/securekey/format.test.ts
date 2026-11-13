import { describe, expect, it } from 'vitest'
import {
  canonicalJson,
  isActivationPayload,
  isKeyPayload,
  isStatusPayload,
  parsePublicKeys,
  verifySigned,
  type KeyPayload,
} from '../../src/main/securekey/format'
import { makeTestSigner } from './test-signer'

describe('security key format', () => {
  const s = makeTestSigner()
  const key: KeyPayload = {
    v: 1,
    kid: 'test1',
    memberId: 'm1',
    keyId: 'k1',
    issuedAt: '2026-11-20T00:00:00Z',
  }

  it('verifies a payload signed with a known kid', () =>
    expect(verifySigned(s.sign(key), s.keys, isKeyPayload)).toEqual(key))

  it('rejects one changed character', () => {
    const doc = s.sign(key)
    expect(
      verifySigned({ ...doc, payload: { ...doc.payload, memberId: 'm2' } }, s.keys, isKeyPayload),
    ).toBeNull()
  })

  it('rejects an unknown kid', () =>
    expect(verifySigned(s.sign(key), makeTestSigner('other').keys, isKeyPayload)).toBeNull())

  it('rejects a payload of the wrong shape', () =>
    expect(verifySigned(s.sign({ v: 1, kid: 'test1' }), s.keys, isKeyPayload)).toBeNull())

  it('rejects documents that are not signed objects', () => {
    expect(verifySigned(null, s.keys, isKeyPayload)).toBeNull()
    expect(verifySigned('x', s.keys, isKeyPayload)).toBeNull()
    expect(
      verifySigned({ ...s.sign(key), sig: 'not base64 at all!' }, s.keys, isKeyPayload),
    ).toBeNull()
    expect(verifySigned(s.sign(key), { test1: 'QUJD' }, isKeyPayload)).toBeNull()
  })

  it('sorts keys at every depth', () =>
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}'))

  it('reads the build value of public keys', () => {
    expect(parsePublicKeys('{"k1":"QUJD"}')).toEqual({ k1: 'QUJD' })
    expect(parsePublicKeys('not json')).toEqual({})
    expect(parsePublicKeys('[1]')).toEqual({})
    expect(parsePublicKeys('{"k1":3}')).toEqual({})
  })

  it('checks the activation and status shapes', () => {
    expect(
      isActivationPayload({
        v: 1,
        keyId: 'k1',
        memberId: 'm1',
        deviceType: 'usb',
        deviceId: 'a'.repeat(64),
        activatedAt: '2026-11-20T00:00:00Z',
      }),
    ).toBe(true)
    expect(
      isActivationPayload({
        v: 1,
        keyId: 'k1',
        memberId: 'm1',
        deviceType: 'phone',
        deviceId: 'x',
        activatedAt: 'x',
      }),
    ).toBe(false)
    expect(
      isStatusPayload({ v: 1, keyId: 'k1', status: 'revoked', serverTime: '2026-11-20T00:00:00Z' }),
    ).toBe(true)
    expect(isStatusPayload({ v: 1, keyId: 'k1', status: 'gone', serverTime: 'x' })).toBe(false)
  })
})
