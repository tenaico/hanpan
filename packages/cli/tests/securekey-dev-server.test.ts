import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { deviceIdHash, type DeviceProbe } from '../../../apps/shell/src/main/securekey/devices'
import { parsePublicKeys } from '../../../apps/shell/src/main/securekey/format'
import type { GateConfig } from '../../../apps/shell/src/main/securekey/gate'
import { registerKey } from '../../../apps/shell/src/main/securekey/register'
import { fetchStatus } from '../../../apps/shell/src/main/securekey/status'

/**
 * tools/securekey-dev-server.mjs, started for real, against the app's own
 * security key functions: what it issues and signs is what the app accepts.
 */
const TOOL = join(__dirname, '../../../tools/securekey-dev-server.mjs')
const running: ChildProcess[] = []

afterEach(() => {
  for (const child of running.splice(0)) child.kill()
})

async function startServer(extra: string[] = [], dir = mkdtempSync(join(tmpdir(), 'sk-dev-'))) {
  const child = spawn(process.execPath, [TOOL, '--port', '0', '--dir', dir, ...extra], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  running.push(child)
  const values = await new Promise<Record<string, string>>((resolve, reject) => {
    let out = ''
    let err = ''
    child.stdout!.on('data', (c: Buffer) => {
      out += c.toString('utf8')
      const lines = out.split('\n').filter((l) => l.includes('='))
      if (lines.length >= 2) {
        resolve(
          Object.fromEntries(
            lines.map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
          ),
        )
      }
    })
    child.stderr!.on('data', (c: Buffer) => (err += c.toString('utf8')))
    child.on('exit', (code) => reject(new Error(`exited ${code}: ${err}`)))
  })
  const server = values.HANPAN_KEY_SERVER!
  const keys = parsePublicKeys(values.HANPAN_KEY_PUBKEYS!)
  return { server, keys, dir }
}

const probe: DeviceProbe = {
  listUsbVolumes: async () => [{ letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' }],
  machineGuid: async () => 'guid-1',
}

async function issue(server: string, root: string, name: string): Promise<string> {
  const response = await fetch(`${server}/keys`, { method: 'POST', body: '{}' })
  expect(response.status).toBe(200)
  const file = join(root, name)
  writeFileSync(file, await response.text())
  return file
}

function config(server: string, keys: GateConfig['keys']): GateConfig {
  return { platform: 'win32', requireKey: true, requiredFrom: null, server, keys }
}

describe('securekey-dev-server', () => {
  it('prints the build values of a development run', async () => {
    const { server, keys } = await startServer()
    expect(server).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    expect(Object.keys(keys)).toEqual(['dev1'])
    expect(Buffer.from(keys.dev1!, 'base64')).toHaveLength(32)
  })

  it('issues, activates and reports a key that the app accepts', async () => {
    const { server, keys } = await startServer()
    const root = mkdtempSync(join(tmpdir(), 'sk-app-'))
    const keyFile = await issue(server, root, 'hanpan.key')
    const result = await registerKey({
      userData: join(root, 'userData'),
      keyFile,
      target: { where: 'usb', letter: 'E' },
      probe,
      config: config(server, keys),
      fetch,
      usbDir: (letter) => join(root, `usb-${letter}`, 'Hanpan'),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.registration.activation.deviceId).toBe(deviceIdHash('AA11'))
    const status = await fetchStatus({
      server,
      keyId: result.registration.key.keyId,
      keys,
      fetch,
    })
    expect(status?.payload.status).toBe('active')
    // the same key on another device: already used
    const again = await registerKey({
      userData: join(root, 'userData2'),
      keyFile,
      target: { where: 'pc', consentAt: new Date().toISOString() },
      probe,
      config: config(server, keys),
      fetch,
    })
    expect(again).toEqual({ ok: false, error: 'used' })
  })

  it('activates the same key on the same device again, with a new activation time', async () => {
    // a stick whose first write failed on another PC, or a data folder that was cleared
    const { server, keys } = await startServer()
    const root = mkdtempSync(join(tmpdir(), 'sk-app-'))
    const keyFile = await issue(server, root, 'hanpan.key')
    const register = (n: number) =>
      registerKey({
        userData: join(root, `userData${n}`),
        keyFile,
        target: { where: 'usb', letter: 'E' },
        probe,
        config: config(server, keys),
        fetch,
        usbDir: (letter) => join(root, `usb-${n}-${letter}`, 'Hanpan'),
      })
    const first = await register(1)
    await new Promise((r) => setTimeout(r, 15))
    const second = await register(2)
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(second.registration.activation.deviceId).toBe(first.registration.activation.deviceId)
    // counted from now: the 30 days start again for the new registration
    expect(Date.parse(second.registration.activation.activatedAt)).toBeGreaterThan(
      Date.parse(first.registration.activation.activatedAt),
    )
  })

  it('refuses the fourth active key', async () => {
    const { server, keys } = await startServer()
    const root = mkdtempSync(join(tmpdir(), 'sk-app-'))
    // four keys issued before any is activated: the fourth activation is the one refused
    const files: string[] = []
    for (let i = 0; i < 4; i++) files.push(await issue(server, root, `k${i}.key`))
    const results = []
    for (const [i, keyFile] of files.entries()) {
      results.push(
        await registerKey({
          userData: join(root, `userData${i}`),
          keyFile,
          target: { where: 'usb', letter: 'E' },
          probe,
          config: config(server, keys),
          fetch,
          usbDir: (letter) => join(root, `usb-${i}-${letter}`, 'Hanpan'),
        }),
      )
    }
    expect(results.slice(0, 3).every((r) => r.ok)).toBe(true)
    expect(results[3]).toEqual({ ok: false, error: 'limit' })
    // and no fifth key is issued while three are active
    expect((await fetch(`${server}/keys`, { method: 'POST', body: '{}' })).status).toBe(429)
  })

  it('reports a revoked key', async () => {
    const { server, keys, dir } = await startServer()
    const root = mkdtempSync(join(tmpdir(), 'sk-app-'))
    const keyFile = await issue(server, root, 'hanpan.key')
    const keyId = (JSON.parse(readFileSync(keyFile, 'utf8')) as { payload: { keyId: string } })
      .payload.keyId
    const revoked = await fetch(`${server}/keys/${encodeURIComponent(keyId)}/revoke`, {
      method: 'POST',
    })
    expect(revoked.status).toBe(200)
    expect((await fetchStatus({ server, keyId, keys, fetch }))?.payload.status).toBe('revoked')
    // the revocation is kept: a restart with --server-time still reports it, at that time
    for (const child of running.splice(0)) child.kill()
    const later = await startServer(['--server-time', '2027-01-01T00:00:00Z'], dir)
    const status = await fetchStatus({ server: later.server, keyId, keys: later.keys, fetch })
    expect(status?.payload).toMatchObject({ status: 'revoked', serverTime: '2027-01-01T00:00:00Z' })
  })

  it('writes a key file for a hand test', async () => {
    const root = mkdtempSync(join(tmpdir(), 'sk-app-'))
    const out = join(root, 'hanpan.key')
    const { keys } = await startServer(['--issue', out])
    const doc = JSON.parse(readFileSync(out, 'utf8')) as {
      kid: string
      payload: { memberId: string }
    }
    expect(doc.kid).toBe('dev1')
    expect(doc.payload.memberId).toBe('dev')
    expect(Object.keys(keys)).toEqual(['dev1'])
  })
})
