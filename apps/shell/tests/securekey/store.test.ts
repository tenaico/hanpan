import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { deviceIdHash, usbDeviceId, type UsbVolume } from '../../src/main/securekey/devices'
import type { Registered } from '../../src/main/securekey/format'
import {
  findRegistration,
  KEY_FILES,
  pcKeyDir,
  readRegistered,
  writeRegistered,
} from '../../src/main/securekey/store'

const KEY = '0123456789abcdef0123456789abcdef'
const OLD = 'fedcba9876543210fedcba9876543210'
const AT = '2026-11-20T00:00:00.000Z'
const E: UsbVolume = { letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' }
const F: UsbVolume = { letter: 'F', diskSerial: 'BB22', volumeSerial: '0000beef' }
const VAULT = Buffer.alloc(32, 7)
const PC_VAULT = Buffer.alloc(32, 9)

let root: string
let userData: string
let volumes: UsbVolume[]
let listed: number
const usbDir = (letter: string) => join(root, `usb-${letter}`, 'Hanpan')

const find = () =>
  findRegistration({
    userData,
    listVolumes: async () => {
      listed++
      return volumes
    },
    usbDir,
    openPcVault: (sealed) => (sealed.equals(Buffer.from('sealed')) ? PC_VAULT : null),
  })

function stick(volume: UsbVolume, keyId: string, vault = VAULT): void {
  const dir = usbDir(volume.letter)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, KEY_FILES.key), JSON.stringify({ v: 2, keyId, createdAt: AT }))
  writeFileSync(join(dir, KEY_FILES.vault), vault)
}

const record = (over: Partial<Registered> = {}): Registered => ({
  v: 2,
  keyId: KEY,
  where: 'usb',
  devices: [{ deviceId: deviceIdHash(usbDeviceId(E)), addedAt: AT }],
  createdAt: AT,
  pcConsentAt: null,
  previous: [],
  ...over,
})

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hanpan-sk-store-'))
  userData = join(root, 'userData')
  mkdirSync(userData)
  volumes = []
  listed = 0
})

describe('the registration record on the PC', () => {
  it('writes and reads it back', async () => {
    await writeRegistered(userData, record())
    expect(readRegistered(userData)).toEqual(record())
  })

  it('reads a damaged registration as none', async () => {
    mkdirSync(pcKeyDir(userData), { recursive: true })
    writeFileSync(join(pcKeyDir(userData), KEY_FILES.registered), '{')
    expect(readRegistered(userData)).toBeNull()
    expect(await find()).toEqual({ kind: 'none' })
  })

  it('does not look at the USB sticks while nothing is registered', async () => {
    volumes = [E]
    stick(E, KEY)
    expect(await find()).toEqual({ kind: 'none' })
    expect(listed).toBe(0)
  })
})

describe('finding the key at start', () => {
  it('finds the stick whose key and device match', async () => {
    await writeRegistered(userData, record())
    volumes = [E]
    stick(E, KEY)
    const found = await find()
    expect(found.kind).toBe('found')
    if (found.kind !== 'found') return
    expect(found.registration).toMatchObject({ where: 'usb', keyId: KEY, letter: 'E' })
    expect(found.registration.vault.equals(VAULT)).toBe(true)
    expect(found.registration.volumeSerial).toBe(E.volumeSerial)
  })

  it('tells a copied folder from the registered stick', async () => {
    await writeRegistered(userData, record())
    volumes = [F]
    stick(F, KEY)
    expect(await find()).toEqual({ kind: 'unregistered-usb' })
  })

  it('reports a replaced stick with its date', async () => {
    const replacedAt = '2026-11-21T06:32:00.000Z'
    await writeRegistered(userData, record({ previous: [{ keyId: OLD, replacedAt }] }))
    volumes = [F]
    stick(F, OLD)
    expect(await find()).toEqual({ kind: 'replaced', replacedAt })
  })

  it('opens with the current stick when an old one is also in', async () => {
    const replacedAt = '2026-11-21T06:32:00.000Z'
    await writeRegistered(userData, record({ previous: [{ keyId: OLD, replacedAt }] }))
    volumes = [F, E]
    stick(F, OLD)
    stick(E, KEY)
    expect((await find()).kind).toBe('found')
  })

  it('ignores a damaged or v1 key file on a stick', async () => {
    await writeRegistered(userData, record())
    volumes = [E, F]
    mkdirSync(usbDir('E'), { recursive: true })
    writeFileSync(join(usbDir('E'), KEY_FILES.key), '{')
    writeFileSync(join(usbDir('E'), KEY_FILES.vault), VAULT)
    mkdirSync(usbDir('F'), { recursive: true })
    writeFileSync(join(usbDir('F'), KEY_FILES.key), JSON.stringify({ payload: { v: 1 }, sig: 's' }))
    expect(await find()).toEqual({ kind: 'usb-missing' })
  })

  it('reads a stick with a short vault as not the key', async () => {
    await writeRegistered(userData, record())
    volumes = [E]
    stick(E, KEY, Buffer.alloc(5))
    expect(await find()).toEqual({ kind: 'usb-missing' })
  })

  it('says the stick is missing when no stick is in', async () => {
    await writeRegistered(userData, record())
    expect(await find()).toEqual({ kind: 'usb-missing' })
  })

  it('opens the PC vault for a PC registration', async () => {
    await writeRegistered(userData, record({ where: 'pc', devices: [], pcConsentAt: AT }))
    writeFileSync(join(pcKeyDir(userData), KEY_FILES.vault), 'sealed')
    const found = await find()
    expect(found.kind).toBe('found')
    if (found.kind !== 'found') return
    expect(found.registration).toMatchObject({ where: 'pc', keyId: KEY })
    expect(found.registration.vault.equals(PC_VAULT)).toBe(true)
    expect(listed).toBe(0)
  })

  it('calls a PC registration whose vault does not open damaged', async () => {
    await writeRegistered(userData, record({ where: 'pc', devices: [], pcConsentAt: AT }))
    writeFileSync(join(pcKeyDir(userData), KEY_FILES.vault), 'other')
    expect(await find()).toEqual({ kind: 'damaged' })
  })
})
