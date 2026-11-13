import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  deviceIdHash,
  usbDeviceId,
  type DeviceProbe,
  type UsbVolume,
} from '../../src/main/securekey/devices'
import type { ActivationPayload, KeyPayload } from '../../src/main/securekey/format'
import {
  findRegistration,
  KEY_FILES,
  newVaultKey,
  pcKeyDir,
  usbKeyDir,
  writeRegistration,
} from '../../src/main/securekey/store'
import { makeTestSigner } from './test-signer'

const signer = makeTestSigner()
const GUID = '3f1c2a9e-0000-4000-8000-1234567890ab'
const E: UsbVolume = { letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' }
const F: UsbVolume = { letter: 'F', diskSerial: '', volumeSerial: '0000beef' }

const keyPayload: KeyPayload = {
  v: 1,
  kid: 'test1',
  memberId: 'm1',
  keyId: 'k1',
  issuedAt: '2026-11-20T00:00:00Z',
}
const activationFor = (
  deviceType: 'usb' | 'pc',
  rawId: string,
  extra: Partial<ActivationPayload> = {},
): ActivationPayload => ({
  v: 1,
  keyId: 'k1',
  memberId: 'm1',
  deviceType,
  deviceId: deviceIdHash(rawId),
  activatedAt: '2026-11-20T00:00:00Z',
  ...extra,
})

let root: string
let userData: string
let volumes: UsbVolume[]
const probe: DeviceProbe = {
  listUsbVolumes: async () => volumes,
  machineGuid: async () => GUID,
}
const usbDir = (letter: string) => join(root, `usb-${letter}`, 'Hanpan')
const find = () => findRegistration({ userData, probe, keys: signer.keys, usbDir })

async function register(dir: string, activation: ActivationPayload, vault = newVaultKey()) {
  await writeRegistration(dir, {
    key: signer.sign(keyPayload),
    activation: signer.sign(activation),
    vault,
  })
  return vault
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'securekey-store-'))
  userData = join(root, 'userData')
  volumes = []
})

describe('security key store', () => {
  it('uses the folders of the spec', () => {
    expect(usbKeyDir('E')).toBe('E:\\Hanpan')
    expect(pcKeyDir('C:\\Users\\a\\AppData\\Roaming\\Hanpan')).toBe(
      join('C:\\Users\\a\\AppData\\Roaming\\Hanpan', 'securekey'),
    )
    expect(KEY_FILES).toEqual({
      key: 'hanpan.key',
      activation: 'activation.json',
      vault: 'vault.key',
    })
  })

  it('finds a USB registration whose device matches', async () => {
    volumes = [E]
    const vault = await register(usbDir('E'), activationFor('usb', usbDeviceId(E)))
    const result = await find()
    expect(result.kind).toBe('found')
    if (result.kind !== 'found') return
    expect(result.registration.where).toBe('usb')
    expect(result.registration.dir).toBe(usbDir('E'))
    expect(result.registration.volumeSerial).toBe('1a2b3c4d')
    expect(result.registration.vault.equals(vault)).toBe(true)
  })

  it('picks the registered stick among two', async () => {
    volumes = [E, F]
    await register(usbDir('F'), activationFor('usb', usbDeviceId(F)))
    const result = await find()
    expect(result.kind).toBe('found')
    if (result.kind === 'found') expect(result.registration.dir).toBe(usbDir('F'))
  })

  it('reports other-device for files copied to another stick', async () => {
    volumes = [E]
    await register(usbDir('E'), activationFor('usb', usbDeviceId(F)))
    expect(await find()).toEqual({ kind: 'other-device', where: 'usb' })
  })

  it('reports other-device for a PC registration copied to a stick', async () => {
    volumes = [E]
    await register(usbDir('E'), activationFor('pc', GUID))
    expect(await find()).toEqual({ kind: 'other-device', where: 'usb' })
  })

  it('falls back to the PC folder', async () => {
    await register(
      pcKeyDir(userData),
      activationFor('pc', GUID, { pcConsentAt: '2026-11-20T00:00:00Z' }),
    )
    const result = await find()
    expect(result.kind).toBe('found')
    if (result.kind === 'found') expect(result.registration.where).toBe('pc')
  })

  it('reports another PC', async () => {
    await register(pcKeyDir(userData), activationFor('pc', 'another-guid'))
    expect(await find()).toEqual({ kind: 'other-device', where: 'pc' })
  })

  it('prefers a found stick over a damaged folder and a damaged one over another device', async () => {
    volumes = [E, F]
    await register(usbDir('E'), activationFor('usb', usbDeviceId(E)))
    mkdirSync(usbDir('F'), { recursive: true })
    writeFileSync(join(usbDir('F'), KEY_FILES.activation), 'not json')
    expect((await find()).kind).toBe('found')

    volumes = [F]
    await register(pcKeyDir(userData), activationFor('pc', 'another-guid'))
    expect((await find()).kind).toBe('damaged')
  })

  it('reports damaged files', async () => {
    volumes = [E]
    const dir = usbDir('E')
    await register(dir, activationFor('usb', usbDeviceId(E)))
    writeFileSync(join(dir, KEY_FILES.activation), 'not json')
    expect((await find()).kind).toBe('damaged')

    const bad = signer.sign(activationFor('usb', usbDeviceId(E)))
    writeFileSync(
      join(dir, KEY_FILES.activation),
      JSON.stringify({ ...bad, payload: { ...bad.payload, memberId: 'm2' } }),
    )
    expect((await find()).kind).toBe('damaged')

    await register(dir, activationFor('usb', usbDeviceId(E)), Buffer.alloc(31))
    expect((await find()).kind).toBe('damaged')

    await register(dir, activationFor('usb', usbDeviceId(E), { keyId: 'k2' }))
    expect((await find()).kind).toBe('damaged')
  })

  it('reports damaged when one of the three files is missing', async () => {
    volumes = [E]
    mkdirSync(usbDir('E'), { recursive: true })
    writeFileSync(
      join(usbDir('E'), KEY_FILES.activation),
      JSON.stringify(signer.sign(activationFor('usb', usbDeviceId(E)))),
    )
    expect((await find()).kind).toBe('damaged')
  })

  it('finds nothing anywhere', async () => {
    volumes = [E]
    expect((await find()).kind).toBe('none')
  })

  it('round-trips what it writes', async () => {
    volumes = [E]
    const activation = activationFor('usb', usbDeviceId(E))
    const vault = await register(usbDir('E'), activation)
    const result = await find()
    if (result.kind !== 'found') throw new Error(`expected found, got ${result.kind}`)
    expect(result.registration.key).toEqual(keyPayload)
    expect(result.registration.activation).toEqual(activation)
    expect(result.registration.vault.equals(vault)).toBe(true)
  })

  it('makes a 32-byte vault key', () => expect(newVaultKey()).toHaveLength(32))
})
