import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createKey } from '../../src/main/securekey/create'
import { deviceIdHash, usbDeviceId, type UsbVolume } from '../../src/main/securekey/devices'
import { resetKey } from '../../src/main/securekey/manage'
import { KEY_FILES, pcKeyDir, readRegistered } from '../../src/main/securekey/store'

const E: UsbVolume = { letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' }
const NOW = new Date('2026-11-20T05:00:00.000Z')

let root: string
let userData: string
const usbDir = (letter: string) => join(root, `usb-${letter}`, 'Hanpan')
const seal = (vault: Buffer) => Buffer.concat([Buffer.from('sealed:'), vault])

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hanpan-sk-create-'))
  userData = join(root, 'userData')
  mkdirSync(userData)
})

const make = (target: Parameters<typeof createKey>[0]['target'], dir = usbDir) =>
  createKey({ userData, target, volumes: [E], now: NOW, usbDir: dir, sealPcVault: seal })

describe('making a key', () => {
  it('writes the stick files before the record', async () => {
    const result = await make({ where: 'usb', letter: 'E' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const key = JSON.parse(readFileSync(join(usbDir('E'), KEY_FILES.key), 'utf8'))
    expect(key).toEqual({ v: 2, keyId: result.registration.keyId, createdAt: NOW.toISOString() })
    const vault = readFileSync(join(usbDir('E'), KEY_FILES.vault))
    expect(vault.length).toBe(32)
    expect(result.registration).toMatchObject({
      where: 'usb',
      letter: 'E',
      volumeSerial: E.volumeSerial,
    })
    expect(result.registration.vault.equals(vault)).toBe(true)
    const record = readRegistered(userData)!
    expect(record).toMatchObject({
      keyId: key.keyId,
      where: 'usb',
      pcConsentAt: null,
      previous: [],
    })
    expect(record.devices).toEqual([
      { deviceId: deviceIdHash(usbDeviceId(E)), addedAt: NOW.toISOString() },
    ])
  })

  it('says so when the stick is not in', async () => {
    expect(await make({ where: 'usb', letter: 'G' })).toEqual({ ok: false, error: 'no-usb' })
    expect(readRegistered(userData)).toBeNull()
  })

  it('leaves no registration when writing the stick fails', async () => {
    const blocked = join(root, 'blocked')
    writeFileSync(blocked, 'a file where the folder should go')
    const result = await make({ where: 'usb', letter: 'E' }, () => join(blocked, 'Hanpan'))
    expect(result).toEqual({ ok: false, error: 'write-failed' })
    expect(readRegistered(userData)).toBeNull()
  })

  it('records the PC consent time for a PC key', async () => {
    const consentAt = '2026-11-20T04:59:00.000Z'
    const result = await make({ where: 'pc', consentAt })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const record = readRegistered(userData)!
    expect(record).toMatchObject({ where: 'pc', devices: [], pcConsentAt: consentAt })
    const sealed = readFileSync(join(pcKeyDir(userData), KEY_FILES.vault))
    expect(sealed.equals(seal(result.registration.vault))).toBe(true)
  })

  it('keeps the previous keys when creating again', async () => {
    const first = await make({ where: 'usb', letter: 'E' })
    if (!first.ok) throw new Error('first key')
    await resetKey({ userData, now: new Date('2026-11-21T06:32:00.000Z') })
    const second = await make({ where: 'pc', consentAt: NOW.toISOString() })
    if (!second.ok) throw new Error('second key')
    expect(readRegistered(userData)!.previous).toEqual([
      { keyId: first.registration.keyId, replacedAt: '2026-11-21T06:32:00.000Z' },
    ])
  })
})

describe('resetting the key', () => {
  it('moves the current key to previous and drops the PC vault', async () => {
    const made = await make({ where: 'pc', consentAt: NOW.toISOString() })
    if (!made.ok) throw new Error('key')
    await resetKey({ userData, now: new Date('2026-11-21T06:32:00.000Z') })
    expect(readRegistered(userData)).toBeNull()
    expect(existsSync(join(pcKeyDir(userData), KEY_FILES.vault))).toBe(false)
    const previous = JSON.parse(
      readFileSync(join(pcKeyDir(userData), 'previous.json'), 'utf8'),
    ) as unknown
    expect(previous).toEqual([
      { keyId: made.registration.keyId, replacedAt: '2026-11-21T06:32:00.000Z' },
    ])
  })

  it('leaves the stick files alone', async () => {
    await make({ where: 'usb', letter: 'E' })
    await resetKey({ userData, now: NOW })
    expect(existsSync(join(usbDir('E'), KEY_FILES.key))).toBe(true)
  })
})
