import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWriteFile } from '../atomic-write'
import { deviceIdHash, usbDeviceId, type DeviceProbe } from './devices'
import {
  isActivationPayload,
  isKeyPayload,
  verifySigned,
  type ActivationPayload,
  type KeyPayload,
  type PublicKeys,
  type Signed,
} from './format'

/** The three files of a registration, on a stick or in the PC folder (spec 7-2) */
export const KEY_FILES = {
  key: 'hanpan.key',
  activation: 'activation.json',
  vault: 'vault.key',
} as const

export const USB_KEY_DIR = 'Hanpan'
const VAULT_BYTES = 32

export function pcKeyDir(userData: string): string {
  return join(userData, 'securekey')
}

export function usbKeyDir(letter: string): string {
  return `${letter}:\\${USB_KEY_DIR}`
}

export interface Registration {
  where: 'usb' | 'pc'
  dir: string
  key: KeyPayload
  activation: ActivationPayload
  vault: Buffer
  /** the stick's volume serial, watched while the app runs; absent for the PC */
  volumeSerial?: string
}

export type FindResult =
  | { kind: 'none' }
  | { kind: 'found'; registration: Registration }
  | { kind: 'other-device'; where: 'usb' | 'pc' }
  | { kind: 'damaged' }

type Place =
  | { kind: 'none' }
  | { kind: 'damaged' }
  | { kind: 'read'; key: KeyPayload; activation: ActivationPayload; vault: Buffer }

/** What one folder holds: nothing, something unreadable, or a verified registration */
async function readPlace(dir: string, keys: PublicKeys): Promise<Place> {
  const paths = Object.values(KEY_FILES).map((name) => join(dir, name))
  const present = paths.filter((p) => existsSync(p))
  if (present.length === 0) return { kind: 'none' }
  if (present.length !== paths.length) return { kind: 'damaged' }
  try {
    const [keyText, activationText, vault] = await Promise.all([
      readFile(join(dir, KEY_FILES.key), 'utf8'),
      readFile(join(dir, KEY_FILES.activation), 'utf8'),
      readFile(join(dir, KEY_FILES.vault)),
    ])
    const key = verifySigned(JSON.parse(keyText) as unknown, keys, isKeyPayload)
    const activation = verifySigned(
      JSON.parse(activationText) as unknown,
      keys,
      isActivationPayload,
    )
    if (!key || !activation || vault.length !== VAULT_BYTES) return { kind: 'damaged' }
    if (key.keyId !== activation.keyId || key.memberId !== activation.memberId) {
      return { kind: 'damaged' }
    }
    return { kind: 'read', key, activation, vault }
  } catch {
    return { kind: 'damaged' }
  }
}

/**
 * Where this PC's registration is: every USB stick first, then the PC folder.
 * When places disagree, a matching registration wins, then damaged files, then
 * files bound to another device (a stick holding a copy is not the registered one).
 */
export async function findRegistration(opts: {
  userData: string
  probe: DeviceProbe
  keys: PublicKeys
  /** where a stick's folder is; tests point it at a temporary folder */
  usbDir?: (letter: string) => string
}): Promise<FindResult> {
  const usbDir = opts.usbDir ?? usbKeyDir
  const results: FindResult[] = []
  for (const volume of await opts.probe.listUsbVolumes()) {
    const dir = usbDir(volume.letter)
    const place = await readPlace(dir, opts.keys)
    if (place.kind === 'none') continue
    if (place.kind === 'damaged') {
      results.push({ kind: 'damaged' })
      continue
    }
    const { activation } = place
    if (
      activation.deviceType === 'usb' &&
      activation.deviceId === deviceIdHash(usbDeviceId(volume))
    ) {
      return {
        kind: 'found',
        registration: {
          where: 'usb',
          dir,
          key: place.key,
          activation,
          vault: place.vault,
          volumeSerial: volume.volumeSerial,
        },
      }
    }
    results.push({ kind: 'other-device', where: 'usb' })
  }
  const dir = pcKeyDir(opts.userData)
  const place = await readPlace(dir, opts.keys)
  if (place.kind === 'damaged') results.push({ kind: 'damaged' })
  if (place.kind === 'read') {
    const guid = await opts.probe.machineGuid()
    if (
      guid !== null &&
      place.activation.deviceType === 'pc' &&
      place.activation.deviceId === deviceIdHash(guid)
    ) {
      return {
        kind: 'found',
        registration: {
          where: 'pc',
          dir,
          key: place.key,
          activation: place.activation,
          vault: place.vault,
        },
      }
    }
    results.push({ kind: 'other-device', where: 'pc' })
  }
  return results.find((r) => r.kind === 'damaged') ?? results[0] ?? { kind: 'none' }
}

/** Write a registration's three files into `dir`, each one atomically */
export async function writeRegistration(
  dir: string,
  files: { key: Signed<KeyPayload>; activation: Signed<ActivationPayload>; vault: Buffer },
): Promise<void> {
  await mkdir(dir, { recursive: true })
  await atomicWriteFile(join(dir, KEY_FILES.key), Buffer.from(JSON.stringify(files.key), 'utf8'))
  await atomicWriteFile(
    join(dir, KEY_FILES.activation),
    Buffer.from(JSON.stringify(files.activation), 'utf8'),
  )
  await atomicWriteFile(join(dir, KEY_FILES.vault), files.vault)
}

export function newVaultKey(): Buffer {
  return randomBytes(VAULT_BYTES)
}
