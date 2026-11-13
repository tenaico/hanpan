import { readFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWriteFile } from '../atomic-write'
import { deviceIdHash, usbDeviceId, type UsbVolume } from './devices'
import type { Registered } from './format'
import {
  KEY_FILES,
  pcKeyDir,
  readRegistered,
  usbKeyDir,
  writeKeyFiles,
  writeRegistered,
  type Registration,
} from './store'

/**
 * Changing the key after it was made (spec 2026-11-12 5-4, 5-5). A reset
 * keeps the old key's id in `previous.json` until the next key is made, so a
 * stick of the old key can be told apart ("made again on …") afterwards.
 */

const PREVIOUS = 'previous.json'

/** Keys replaced since the last key was made; [] when there are none */
export function readPrevious(userData: string): Registered['previous'] {
  try {
    const v = JSON.parse(readFileSync(join(pcKeyDir(userData), PREVIOUS), 'utf8')) as unknown
    if (!Array.isArray(v)) return []
    return v.filter(
      (p): p is Registered['previous'][number] =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as Record<string, unknown>).keyId === 'string' &&
        typeof (p as Record<string, unknown>).replacedAt === 'string',
    )
  } catch {
    return []
  }
}

/** Forget the previous list once a new record holds it */
export async function dropPrevious(userData: string): Promise<void> {
  await rm(join(pcKeyDir(userData), PREVIOUS), { force: true })
}

/**
 * "Make a new key": the current key goes to the previous list, its record and
 * the PC vault are removed. The stick's files stay untouched. The caller
 * clears the AI keys sealed with the old vault (ai-secrets `clearSealedV2Secrets`).
 */
export async function resetKey(opts: { userData: string; now: Date }): Promise<void> {
  const dir = pcKeyDir(opts.userData)
  const record = readRegistered(opts.userData)
  const previous = [
    ...(record?.previous ?? []),
    ...readPrevious(opts.userData),
    ...(record ? [{ keyId: record.keyId, replacedAt: opts.now.toISOString() }] : []),
  ]
  await mkdir(dir, { recursive: true })
  await atomicWriteFile(join(dir, PREVIOUS), Buffer.from(`${JSON.stringify(previous)}\n`, 'utf8'))
  await rm(join(dir, KEY_FILES.registered), { force: true })
  await rm(join(dir, KEY_FILES.vault), { force: true })
}

export type ManageResult = 'ok' | 'same-usb' | 'no-record' | 'write-failed'

/**
 * A spare stick (spec 5-5): the same key files on another stick, and its
 * device on the record. Only for a stick key that is open now.
 */
export async function addSpareUsb(opts: {
  userData: string
  current: Registration
  volume: UsbVolume
  usbDir?: (letter: string) => string
  now: Date
}): Promise<ManageResult> {
  const record = readRegistered(opts.userData)
  if (!record || record.keyId !== opts.current.keyId) return 'no-record'
  const deviceId = deviceIdHash(usbDeviceId(opts.volume))
  if (record.devices.some((d) => d.deviceId === deviceId)) return 'same-usb'
  try {
    await writeKeyFiles((opts.usbDir ?? usbKeyDir)(opts.volume.letter), record, opts.current.vault)
  } catch {
    return 'write-failed'
  }
  await writeRegistered(opts.userData, {
    ...record,
    devices: [...record.devices, { deviceId, addedAt: opts.now.toISOString() }],
  })
  return 'ok'
}

/** A PC key moves onto a stick: the stick files are written, the PC vault goes */
export async function moveToUsb(opts: {
  userData: string
  current: Registration
  volume: UsbVolume
  usbDir?: (letter: string) => string
  now: Date
}): Promise<ManageResult> {
  const record = readRegistered(opts.userData)
  if (!record || record.keyId !== opts.current.keyId) return 'no-record'
  try {
    await writeKeyFiles((opts.usbDir ?? usbKeyDir)(opts.volume.letter), record, opts.current.vault)
  } catch {
    return 'write-failed'
  }
  const addedAt = opts.now.toISOString()
  await writeRegistered(opts.userData, {
    ...record,
    where: 'usb',
    devices: [{ deviceId: deviceIdHash(usbDeviceId(opts.volume)), addedAt }],
    pcConsentAt: null,
  })
  await rm(join(pcKeyDir(opts.userData), KEY_FILES.vault), { force: true })
  return 'ok'
}

/** A stick key moves onto this PC once its risk is accepted; the stick's files stay */
export async function moveToPc(opts: {
  userData: string
  current: Registration
  consentAt: string
  sealPcVault: (vault: Buffer) => Buffer
}): Promise<ManageResult> {
  const record = readRegistered(opts.userData)
  if (!record || record.keyId !== opts.current.keyId) return 'no-record'
  const dir = pcKeyDir(opts.userData)
  try {
    await mkdir(dir, { recursive: true })
    await atomicWriteFile(join(dir, KEY_FILES.vault), opts.sealPcVault(opts.current.vault))
  } catch {
    return 'write-failed'
  }
  await writeRegistered(opts.userData, {
    ...record,
    where: 'pc',
    devices: [],
    pcConsentAt: opts.consentAt,
  })
  return 'ok'
}
