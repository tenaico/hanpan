import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWriteFile } from '../atomic-write'
import { deviceIdHash, usbDeviceId, type UsbVolume } from './devices'
import { parseLocalKeyFile, parseRegistered, type Registered } from './format'

/** The files of a local key (spec 2026-11-12 5-1) */
export const KEY_FILES = {
  key: 'hanpan.key',
  vault: 'vault.key',
  registered: 'registered.json',
} as const

export const USB_KEY_DIR = 'Hanpan'
const VAULT_BYTES = 32

export function pcKeyDir(userData: string): string {
  return join(userData, 'securekey')
}

export function usbKeyDir(letter: string): string {
  return `${letter}:\\${USB_KEY_DIR}`
}

/** The PC's registration record, or null when there is none or it does not read */
export function readRegistered(userData: string): Registered | null {
  try {
    return parseRegistered(readFileSync(join(pcKeyDir(userData), KEY_FILES.registered), 'utf8'))
  } catch {
    return null
  }
}

export async function writeRegistered(userData: string, record: Registered): Promise<void> {
  const dir = pcKeyDir(userData)
  await mkdir(dir, { recursive: true })
  await atomicWriteFile(
    join(dir, KEY_FILES.registered),
    Buffer.from(`${JSON.stringify(record, null, 2)}\n`, 'utf8'),
  )
}

/** The key in use: where it is and the vault that opens the AI keys */
export interface Registration {
  where: 'usb' | 'pc'
  keyId: string
  vault: Buffer
  /** the stick's drive letter; absent for the PC */
  letter?: string
  /** the stick's volume serial, watched while the app runs; absent for the PC */
  volumeSerial?: string
}

export type FindResult =
  | { kind: 'none' }
  | { kind: 'found'; registration: Registration }
  | { kind: 'replaced'; replacedAt: string }
  | { kind: 'unregistered-usb' }
  | { kind: 'usb-missing' }
  | { kind: 'damaged' }

/** A stick's key id and vault, or null when its folder does not hold a whole key */
async function readStick(dir: string): Promise<{ keyId: string; vault: Buffer } | null> {
  try {
    const [text, vault] = await Promise.all([
      readFile(join(dir, KEY_FILES.key), 'utf8'),
      readFile(join(dir, KEY_FILES.vault)),
    ])
    const key = parseLocalKeyFile(text)
    if (!key || vault.length !== VAULT_BYTES) return null
    return { keyId: key.keyId, vault }
  } catch {
    return null
  }
}

/**
 * Which key opens this PC now (spec 5-2). Nothing registered: the sticks are
 * not even listed. A PC key opens from the sealed vault. A stick key needs a
 * stick holding the same key id whose device is on the record; that wins over
 * any other stick, then a copied folder, then a replaced key, then "missing".
 */
export async function findRegistration(opts: {
  userData: string
  listVolumes: () => Promise<UsbVolume[]>
  /** where a stick's folder is; tests point it at a temporary folder */
  usbDir?: (letter: string) => string
  /** open the PC vault from its sealed bytes; null when it does not open */
  openPcVault: (sealed: Buffer) => Buffer | null
}): Promise<FindResult> {
  const record = readRegistered(opts.userData)
  if (!record) return { kind: 'none' }
  if (record.where === 'pc') {
    try {
      const sealed = await readFile(join(pcKeyDir(opts.userData), KEY_FILES.vault))
      const vault = opts.openPcVault(sealed)
      if (!vault || vault.length !== VAULT_BYTES) return { kind: 'damaged' }
      return { kind: 'found', registration: { where: 'pc', keyId: record.keyId, vault } }
    } catch {
      return { kind: 'damaged' }
    }
  }
  const usbDir = opts.usbDir ?? usbKeyDir
  const devices = new Set(record.devices.map((d) => d.deviceId))
  let copied = false
  let replacedAt: string | null = null
  for (const volume of await opts.listVolumes()) {
    const stick = await readStick(usbDir(volume.letter))
    if (!stick) continue
    if (stick.keyId === record.keyId) {
      if (devices.has(deviceIdHash(usbDeviceId(volume)))) {
        return {
          kind: 'found',
          registration: {
            where: 'usb',
            keyId: record.keyId,
            vault: stick.vault,
            letter: volume.letter,
            volumeSerial: volume.volumeSerial,
          },
        }
      }
      copied = true
      continue
    }
    const old = record.previous.find((p) => p.keyId === stick.keyId)
    if (old) replacedAt = old.replacedAt
  }
  if (copied) return { kind: 'unregistered-usb' }
  if (replacedAt) return { kind: 'replaced', replacedAt }
  return { kind: 'usb-missing' }
}

/** A key's two files in a stick's folder (or any folder), each written atomically */
export async function writeKeyFiles(
  dir: string,
  key: { keyId: string; createdAt: string },
  vault: Buffer,
): Promise<void> {
  await mkdir(dir, { recursive: true })
  const file = { v: 2, keyId: key.keyId, createdAt: key.createdAt }
  await atomicWriteFile(join(dir, KEY_FILES.key), Buffer.from(`${JSON.stringify(file)}\n`, 'utf8'))
  await atomicWriteFile(join(dir, KEY_FILES.vault), vault)
}

export function newVaultKey(): Buffer {
  return randomBytes(VAULT_BYTES)
}
