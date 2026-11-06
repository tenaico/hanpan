import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { deviceIdHash, type DeviceProbe, type UsbVolume } from '../../src/main/securekey/devices'
import type { ActivationPayload, KeyPayload } from '../../src/main/securekey/format'
import type { GateConfig } from '../../src/main/securekey/gate'
import { activateKey, registerKey } from '../../src/main/securekey/register'
import { KEY_FILES, pcKeyDir } from '../../src/main/securekey/store'
import { readState, statePath } from '../../src/main/securekey/status'
import { makeTestSigner } from './test-signer'

const signer = makeTestSigner()
const GUID = '3f1c2a9e-0000-4000-8000-1234567890ab'
const E: UsbVolume = { letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' }
const keyPayload: KeyPayload = {
  v: 1,
  kid: 'test1',
  memberId: 'm1',
  keyId: 'k1',
  issuedAt: '2026-11-20T00:00:00Z',
}

let root: string
let userData: string
let keyFile: string
let requests: Array<{ url: string; body: Record<string, unknown> }>
const probe: DeviceProbe = { listUsbVolumes: async () => [E], machineGuid: async () => GUID }
const config: GateConfig = {
  platform: 'win32',
  requireKey: true,
  requiredFrom: '2026-12-04',
  server: 'https://keys.test',
  keys: signer.keys,
}
const usbDir = (letter: string) => join(root, `usb-${letter}`, 'Hanpan')

/** A server that activates what it is sent, or answers `status` */
function server(
  opts: { status?: number; tamper?: (a: ActivationPayload) => ActivationPayload } = {},
): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    requests.push({ url: String(url), body })
    if (opts.status) return new Response('{"error":"no"}', { status: opts.status })
    const sent = body as { deviceType: 'usb' | 'pc'; deviceId: string; pcConsentAt?: string }
    let activation: ActivationPayload = {
      v: 1,
      keyId: 'k1',
      memberId: 'm1',
      deviceType: sent.deviceType,
      deviceId: sent.deviceId,
      activatedAt: '2026-11-20T01:00:00Z',
      ...(sent.pcConsentAt ? { pcConsentAt: sent.pcConsentAt } : {}),
    }
    if (opts.tamper) activation = opts.tamper(activation)
    return new Response(JSON.stringify(signer.sign(activation)))
  }) as typeof fetch
}

const register = (
  fetchImpl: typeof fetch,
  target: Parameters<typeof registerKey>[0]['target'] = { where: 'usb', letter: 'E' },
) => registerKey({ userData, keyFile, target, probe, config, fetch: fetchImpl, usbDir })

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'securekey-register-'))
  userData = join(root, 'userData')
  keyFile = join(root, 'hanpan.key')
  writeFileSync(keyFile, JSON.stringify(signer.sign(keyPayload)))
  requests = []
})

describe('registerKey', () => {
  it('registers on a USB stick and writes the three files there', async () => {
    const result = await register(server())
    expect(result.ok).toBe(true)
    for (const name of Object.values(KEY_FILES))
      expect(existsSync(join(usbDir('E'), name))).toBe(true)
    expect(readFileSync(join(usbDir('E'), KEY_FILES.vault))).toHaveLength(32)
    expect(readState(statePath(userData))).toEqual({ keyId: 'k1', where: 'usb' })
    expect(requests[0]!.url).toBe('https://keys.test/keys/activate')
    if (result.ok) {
      expect(result.registration.where).toBe('usb')
      expect(result.registration.volumeSerial).toBe('1a2b3c4d')
    }
  })

  it('registers on the PC with the consent time', async () => {
    const consentAt = '2026-11-20T00:59:00Z'
    const result = await register(server(), { where: 'pc', consentAt })
    expect(result.ok).toBe(true)
    expect(requests[0]!.body.pcConsentAt).toBe(consentAt)
    expect(requests[0]!.body.deviceType).toBe('pc')
    const stored = JSON.parse(readFileSync(join(pcKeyDir(userData), KEY_FILES.activation), 'utf8'))
    expect(stored.payload.pcConsentAt).toBe(consentAt)
    expect(readState(statePath(userData))).toEqual({ keyId: 'k1', where: 'pc' })
  })

  it('needs the consent time for the PC', async () => {
    const result = await register(server(), { where: 'pc', consentAt: '' })
    expect(result).toEqual({ ok: false, error: 'refused' })
    expect(requests).toHaveLength(0)
  })

  it('sends only the hashed device number', async () => {
    await register(server())
    const body = requests[0]!.body
    expect(body.deviceId).toBe(deviceIdHash('AA11'))
    expect(JSON.stringify(body)).not.toContain('AA11')
    // the signed key file goes as it is, so the server can check its signature
    expect(body.key).toEqual(JSON.parse(readFileSync(keyFile, 'utf8')))
  })

  it('reports the 3-key limit', async () => {
    expect(await register(server({ status: 429 }))).toEqual({ ok: false, error: 'limit' })
    expect(existsSync(usbDir('E'))).toBe(false)
    expect(readState(statePath(userData))).toBeNull()
  })

  it('reports a key already used on another device', async () =>
    expect(await register(server({ status: 409 }))).toEqual({ ok: false, error: 'used' }))

  it('reports other refusals', async () => {
    expect(await register(server({ status: 403 }))).toEqual({ ok: false, error: 'refused' })
    expect(await register(server({ status: 503 }))).toEqual({ ok: false, error: 'refused' })
  })

  it('refuses an answer for another device', async () => {
    const result = await register(
      server({ tamper: (a) => ({ ...a, deviceId: deviceIdHash('ZZ') }) }),
    )
    expect(result).toEqual({ ok: false, error: 'bad-answer' })
    expect(existsSync(usbDir('E'))).toBe(false)
  })

  it('refuses an answer for another member or an unsigned one', async () => {
    expect(await register(server({ tamper: (a) => ({ ...a, memberId: 'm2' }) }))).toEqual({
      ok: false,
      error: 'bad-answer',
    })
    const unsigned = (async () =>
      new Response(JSON.stringify({ payload: {}, kid: 'test1', sig: 'x' }))) as typeof fetch
    expect(await register(unsigned)).toEqual({ ok: false, error: 'bad-answer' })
  })

  it('rejects a key file that is not signed by a known kid', async () => {
    writeFileSync(keyFile, JSON.stringify(makeTestSigner('other').sign(keyPayload)))
    expect(await register(server())).toEqual({ ok: false, error: 'bad-key' })
    writeFileSync(keyFile, 'not json')
    expect(await register(server())).toEqual({ ok: false, error: 'bad-key' })
    expect(requests).toHaveLength(0)
  })

  it('needs the stick it is asked to use', async () =>
    expect(await register(server(), { where: 'usb', letter: 'G' })).toEqual({
      ok: false,
      error: 'no-usb',
    }))

  it('keeps an activation the stick could not take and uses it on the next try', async () => {
    // the stick refuses the write (write-protected, full, pulled): a file where the folder goes
    mkdirSync(join(root, 'usb-E'), { recursive: true })
    writeFileSync(join(root, 'usb-E', 'Hanpan'), 'in the way')
    await expect(register(server())).rejects.toThrow()
    expect(requests).toHaveLength(1)
    rmSync(join(root, 'usb-E', 'Hanpan'))
    // the server would answer 409 now; the kept activation is used instead
    const again = await register(server({ status: 409 }))
    expect(again.ok).toBe(true)
    expect(requests).toHaveLength(1)
    for (const name of Object.values(KEY_FILES))
      expect(existsSync(join(usbDir('E'), name))).toBe(true)
    // once written, nothing is kept any more
    expect(existsSync(join(userData, 'securekey-pending.json'))).toBe(false)
  })

  it('keeps the vault of the registration it replaces', async () => {
    // the AI keys are sealed with that vault: a new one would leave them unreadable
    const previous = Buffer.alloc(32, 7)
    const result = await registerKey({
      userData,
      keyFile,
      target: { where: 'usb', letter: 'E' },
      probe,
      config,
      fetch: server(),
      usbDir,
      vault: previous,
    })
    expect(result.ok).toBe(true)
    expect(readFileSync(join(usbDir('E'), KEY_FILES.vault)).equals(previous)).toBe(true)
  })

  it('reuses a vault already in the place it registers to', async () => {
    const onStick = Buffer.alloc(32, 9)
    mkdirSync(usbDir('E'), { recursive: true })
    writeFileSync(join(usbDir('E'), KEY_FILES.vault), onStick)
    expect((await register(server())).ok).toBe(true)
    expect(readFileSync(join(usbDir('E'), KEY_FILES.vault)).equals(onStick)).toBe(true)
  })

  it('does not use a kept activation for another device', async () => {
    mkdirSync(join(root, 'usb-E'), { recursive: true })
    writeFileSync(join(root, 'usb-E', 'Hanpan'), 'in the way')
    await expect(register(server())).rejects.toThrow()
    const pc = await register(server(), { where: 'pc', consentAt: '2026-11-20T00:59:00Z' })
    expect(pc.ok).toBe(true)
    expect(requests).toHaveLength(2)
  })

  it('needs the internet', async () => {
    const offline = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof fetch
    expect(await register(offline)).toEqual({ ok: false, error: 'network' })
  })
})

describe('activateKey', () => {
  it('posts the key, the device and the consent', async () => {
    const result = await activateKey({
      server: 'https://keys.test',
      fetch: server(),
      key: signer.sign(keyPayload),
      deviceType: 'pc',
      deviceIdHash: deviceIdHash(GUID),
      pcConsentAt: '2026-11-20T00:59:00Z',
      keys: signer.keys,
    })
    expect(result.ok).toBe(true)
    expect(Object.keys(requests[0]!.body).sort()).toEqual([
      'deviceId',
      'deviceType',
      'key',
      'pcConsentAt',
    ])
  })
})
