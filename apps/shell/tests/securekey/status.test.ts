import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { StatusPayload } from '../../src/main/securekey/format'
import {
  fetchStatus,
  judgeStatus,
  readState,
  statePath,
  statusDue,
  writeState,
} from '../../src/main/securekey/status'
import { makeTestSigner } from './test-signer'

const at = (iso: string) => new Date(iso)
const last = (serverTime: string, status: 'active' | 'revoked' = 'active'): StatusPayload => ({
  v: 1,
  keyId: 'k1',
  status,
  serverTime,
})

describe('judgeStatus', () => {
  it('is fine 29 days after the last server time', () =>
    expect(
      judgeStatus({
        now: at('2026-12-30T00:00:00Z'),
        activatedAt: '2026-11-20T00:00:00Z',
        last: last('2026-12-01T00:00:00Z'),
      }),
    ).toEqual({ ok: true }))

  it('is stale after 31 days', () =>
    expect(
      judgeStatus({
        now: at('2027-01-01T00:00:00Z'),
        activatedAt: '2026-11-20T00:00:00Z',
        last: last('2026-12-01T00:00:00Z'),
      }),
    ).toEqual({ ok: false, reason: 'stale' }))

  it('counts from activation when no status was seen yet', () => {
    expect(
      judgeStatus({
        now: at('2026-12-21T00:00:00Z'),
        activatedAt: '2026-11-20T00:00:00Z',
        last: null,
      }),
    ).toEqual({ ok: false, reason: 'stale' })
    expect(
      judgeStatus({
        now: at('2026-12-19T00:00:00Z'),
        activatedAt: '2026-11-20T00:00:00Z',
        last: null,
      }),
    ).toEqual({ ok: true })
  })

  it('a revoked key is locked', () =>
    expect(
      judgeStatus({
        now: at('2026-12-02T00:00:00Z'),
        activatedAt: '2026-11-20T00:00:00Z',
        last: last('2026-12-01T00:00:00Z', 'revoked'),
      }),
    ).toEqual({ ok: false, reason: 'revoked' }))

  it('a clock set back before the last server time fails', () =>
    expect(
      judgeStatus({
        now: at('2026-11-30T23:00:00Z'),
        activatedAt: '2026-11-20T00:00:00Z',
        last: last('2026-12-01T00:00:00Z'),
      }),
    ).toEqual({ ok: false, reason: 'clock' }))

  it('a clock set back before the activation fails too', () =>
    expect(
      judgeStatus({
        now: at('2026-11-01T00:00:00Z'),
        activatedAt: '2026-11-20T00:00:00Z',
        last: null,
      }),
    ).toEqual({ ok: false, reason: 'clock' }))

  it('allows a few minutes of clock skew', () =>
    expect(
      judgeStatus({
        now: at('2026-11-30T23:58:00Z'),
        activatedAt: '2026-11-20T00:00:00Z',
        last: last('2026-12-01T00:00:00Z'),
      }),
    ).toEqual({ ok: true }))

  it('reads an unreadable time as stale', () =>
    expect(
      judgeStatus({ now: at('2026-12-01T00:00:00Z'), activatedAt: 'not a date', last: null }),
    ).toEqual({ ok: false, reason: 'stale' }))
})

describe('fetchStatus', () => {
  const signer = makeTestSigner()
  const answer = (body: unknown, status = 200): typeof fetch =>
    (async () => new Response(JSON.stringify(body), { status })) as typeof fetch

  it('asks the status path with the key number', async () => {
    let asked = ''
    const fake = (async (url: string | URL | Request) => {
      asked = String(url)
      return new Response(JSON.stringify(signer.sign(last('2026-12-01T00:00:00Z'))))
    }) as typeof fetch
    const got = await fetchStatus({
      server: 'https://x.test',
      keyId: 'k 1/2',
      keys: signer.keys,
      fetch: fake,
    })
    expect(asked).toBe('https://x.test/keys/status?keyId=k%201%2F2')
    expect(got).toBeNull() // the answer is for k1, not 'k 1/2'
  })

  it('accepts only a signed answer for the same key', async () => {
    const good = signer.sign(last('2026-12-01T00:00:00Z'))
    const opts = { server: 'https://x.test', keyId: 'k1', keys: signer.keys }
    expect(await fetchStatus({ ...opts, fetch: answer(good) })).toEqual(good)
    expect(
      await fetchStatus({
        ...opts,
        fetch: answer({
          ...good,
          payload: { ...good.payload, status: 'active', serverTime: '2027-01-01T00:00:00Z' },
        }),
      }),
    ).toBeNull()
    expect(
      await fetchStatus({
        ...opts,
        fetch: answer(signer.sign({ ...last('2026-12-01T00:00:00Z'), keyId: 'k2' })),
      }),
    ).toBeNull()
    expect(await fetchStatus({ ...opts, fetch: answer(good, 500) })).toBeNull()
    expect(
      await fetchStatus({
        ...opts,
        fetch: (async () => {
          throw new TypeError('fetch failed')
        }) as typeof fetch,
      }),
    ).toBeNull()
  })

  it('gives up after its time limit', async () => {
    const hang = ((_url: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as typeof fetch
    const got = await fetchStatus({
      server: 'https://x.test',
      keyId: 'k1',
      keys: signer.keys,
      fetch: hang,
      timeoutMs: 50,
    })
    expect(got).toBeNull()
  })
})

describe('state', () => {
  it('asks once a day', () => {
    const now = at('2026-12-02T12:00:00Z')
    const state = (hoursAgo: number) => ({
      keyId: 'k1',
      where: 'usb' as const,
      checkedAt: new Date(now.getTime() - hoursAgo * 3600_000).toISOString(),
    })
    expect(statusDue(state(23), now)).toBe(false)
    expect(statusDue(state(25), now)).toBe(true)
    // a clock set back since the last answer asks again rather than waiting it out
    expect(statusDue(state(-2), now)).toBe(true)
    expect(statusDue(null, now)).toBe(true)
    expect(statusDue({ keyId: 'k1', where: 'usb' }, now)).toBe(true)
  })

  it('writes and reads the state file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'securekey-state-'))
    const path = statePath(dir)
    expect(path).toBe(join(dir, 'securekey-state.json'))
    expect(readState(path)).toBeNull()
    const state = { keyId: 'k1', where: 'pc' as const, checkedAt: '2026-12-01T00:00:00Z' }
    await writeState(path, state)
    expect(readState(path)).toEqual(state)
    writeFileSync(path, '{"keyId":3}')
    expect(readState(path)).toBeNull()
  })
})
