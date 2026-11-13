import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWriteFile } from '../atomic-write'
import { deviceIdHash, usbDeviceId, type UsbVolume } from './devices'
import { newKeyId, type LocalKeyFile, type Registered } from './format'
import { dropPrevious, readPrevious } from './manage'
import {
  KEY_FILES,
  newVaultKey,
  pcKeyDir,
  readRegistered,
  usbKeyDir,
  writeKeyFiles,
  writeRegistered,
  type Registration,
} from './store'

/** Where the first-run window makes the key: a stick by letter, or this PC once its risk is accepted */
export type CreateTarget = { where: 'usb'; letter: string } | { where: 'pc'; consentAt: string }

export type CreateResult =
  { ok: true; registration: Registration } | { ok: false; error: 'no-usb' | 'write-failed' }

/**
 * Make a key (spec 2026-11-12 5-3): a new key id and vault, written to the
 * stick (or sealed into the PC folder) first; the PC record is written only
 * once that worked, so a failed write leaves no half registration behind.
 * Keys replaced before carry over into the new record's `previous`.
 */
export async function createKey(opts: {
  userData: string
  target: CreateTarget
  volumes: UsbVolume[]
  now: Date
  usbDir?: (letter: string) => string
  /** seal the vault for the PC folder (Windows DPAPI) */
  sealPcVault: (vault: Buffer) => Buffer
}): Promise<CreateResult> {
  const at = opts.now.toISOString()
  const key: LocalKeyFile = { v: 2, keyId: newKeyId(), createdAt: at }
  const vault = newVaultKey()
  const old = readRegistered(opts.userData)
  const previous = [...(old?.previous ?? []), ...readPrevious(opts.userData)]
  let registration: Registration
  let record: Registered
  try {
    if (opts.target.where === 'usb') {
      const { letter } = opts.target
      const volume = opts.volumes.find((v) => v.letter === letter)
      if (!volume) return { ok: false, error: 'no-usb' }
      await writeKeyFiles((opts.usbDir ?? usbKeyDir)(letter), key, vault)
      registration = {
        where: 'usb',
        keyId: key.keyId,
        vault,
        letter,
        volumeSerial: volume.volumeSerial,
      }
      record = {
        v: 2,
        keyId: key.keyId,
        where: 'usb',
        devices: [{ deviceId: deviceIdHash(usbDeviceId(volume)), addedAt: at }],
        createdAt: at,
        pcConsentAt: null,
        previous,
      }
    } else {
      const dir = pcKeyDir(opts.userData)
      await mkdir(dir, { recursive: true })
      await atomicWriteFile(join(dir, KEY_FILES.vault), opts.sealPcVault(vault))
      registration = { where: 'pc', keyId: key.keyId, vault }
      record = {
        v: 2,
        keyId: key.keyId,
        where: 'pc',
        devices: [],
        createdAt: at,
        pcConsentAt: opts.target.consentAt,
        previous,
      }
    }
  } catch {
    return { ok: false, error: 'write-failed' }
  }
  await writeRegistered(opts.userData, record)
  await dropPrevious(opts.userData)
  return { ok: true, registration }
}
