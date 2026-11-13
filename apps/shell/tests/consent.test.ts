import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { needsConsent, readConsent, TERMS_VERSION, writeConsent } from '../src/main/consent'

let userData: string
beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'hanpan-consent-'))
})

describe('the terms consent record', () => {
  it('is for the terms of 2026-11-20', () => {
    expect(TERMS_VERSION).toBe('2026-11-20')
  })

  it('needs consent with no file', () => {
    expect(needsConsent(userData)).toBe(true)
  })

  it('keeps a matching consent', async () => {
    await writeConsent(userData, new Date('2026-11-20T01:02:03.000Z'))
    expect(readConsent(userData)).toEqual({
      v: 1,
      termsVersion: '2026-11-20',
      acceptedAt: '2026-11-20T01:02:03.000Z',
    })
    expect(needsConsent(userData)).toBe(false)
  })

  it('needs consent again when the terms version changes', async () => {
    await writeConsent(userData, new Date('2026-11-20T00:00:00.000Z'))
    expect(needsConsent(userData, '2026-12-01')).toBe(true)
  })

  it('reads a damaged file as none', () => {
    writeFileSync(join(userData, 'consent.json'), '{"v":1')
    expect(readConsent(userData)).toBeNull()
    expect(needsConsent(userData)).toBe(true)
  })
})
