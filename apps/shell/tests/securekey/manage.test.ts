import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createKey } from '../../src/main/securekey/create'
import { deviceIdHash, usbDeviceId, type UsbVolume } from '../../src/main/securekey/devices'
import { addSpareUsb, moveToPc, moveToUsb } from '../../src/main/securekey/manage'
import {
  findRegistration,
  KEY_FILES,
  pcKeyDir,
  readRegistered,
  type Registration,
} from '../../src/main/securekey/store'

const E: UsbVolume = { letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' }
const F: UsbVolume = { letter: 'F', diskSerial: 'BB22', volumeSerial: '0000beef' }
const NOW = new Date('2026-11-20T05:00:00.000Z')
const LATER = new Date('2026-11-22T08:00:00.000Z')

let root: string
let userData: string
const usbDir = (letter: string) => join(root, `usb-${letter}`, 'Hanpan')
const seal = (vault: Buffer) => Buffer.concat([Buffer.from('S'), vault])
const open = (sealed: Buffer) => (sealed[0] === 0x53 ? sealed.subarray(1) : null)
const find = (volumes: UsbVolume[]) =>
  findRegistration({ userData, listVolumes: async () => volumes, usbDir, openPcVault: open })

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hanpan-sk-manage-'))
  userData = join(root, 'userData')
  mkdirSync(userData)
})

async function make(where: 'usb' | 'pc'): Promise<Registration> {
  const made = await createKey({
    userData,
    target: where === 'usb' ? { where, letter: 'E' } : { where, consentAt: NOW.toISOString() },
    volumes: [E],
    now: NOW,
    usbDir,
    sealPcVault: seal,
  })
  if (!made.ok) throw new Error('key')
  return made.registration
}

describe('a spare stick', () => {
  it("adds a spare stick's device to the record", async () => {
    const current = await make('usb')
    expect(await addSpareUsb({ userData, current, volume: F, usbDir, now: LATER })).toBe('ok')
    expect(readRegistered(userData)!.devices).toEqual([
      { deviceId: deviceIdHash(usbDeviceId(E)), addedAt: NOW.toISOString() },
      { deviceId: deviceIdHash(usbDeviceId(F)), addedAt: LATER.toISOString() },
    ])
    for (const stick of [E, F]) {
      const found = await find([stick])
      expect(found.kind).toBe('found')
      if (found.kind === 'found') expect(found.registration.vault.equals(current.vault)).toBe(true)
    }
  })

  it('refuses the same stick as a spare', async () => {
    const current = await make('usb')
    expect(await addSpareUsb({ userData, current, volume: E, usbDir, now: LATER })).toBe('same-usb')
    expect(readRegistered(userData)!.devices).toHaveLength(1)
  })

  it('reports a stick it cannot write', async () => {
    const current = await make('usb')
    const blocked = () => join(root, 'missing-drive', '\0bad', 'Hanpan')
    expect(await addSpareUsb({ userData, current, volume: F, usbDir: blocked, now: LATER })).toBe(
      'write-failed',
    )
    expect(readRegistered(userData)!.devices).toHaveLength(1)
  })
})

describe('moving the key', () => {
  it('moves a PC key to a stick and drops the PC vault', async () => {
    const current = await make('pc')
    expect(await moveToUsb({ userData, current, volume: F, usbDir, now: LATER })).toBe('ok')
    const record = readRegistered(userData)!
    expect(record).toMatchObject({ where: 'usb', keyId: current.keyId, pcConsentAt: null })
    expect(existsSync(join(pcKeyDir(userData), KEY_FILES.vault))).toBe(false)
    const found = await find([F])
    expect(found.kind).toBe('found')
    if (found.kind === 'found') expect(found.registration.vault.equals(current.vault)).toBe(true)
  })

  it('moves a stick key to this PC and keeps the stick files', async () => {
    const current = await make('usb')
    const consentAt = LATER.toISOString()
    await moveToPc({ userData, current, consentAt, sealPcVault: seal })
    expect(readRegistered(userData)).toMatchObject({
      where: 'pc',
      devices: [],
      pcConsentAt: consentAt,
    })
    const sealed = readFileSync(join(pcKeyDir(userData), KEY_FILES.vault))
    expect(open(sealed)!.equals(current.vault)).toBe(true)
    expect(existsSync(join(usbDir('E'), KEY_FILES.key))).toBe(true)
    expect((await find([])).kind).toBe('found')
  })
})
