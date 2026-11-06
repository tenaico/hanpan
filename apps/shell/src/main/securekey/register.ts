import { readFile } from 'node:fs/promises'
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
import type { GateConfig } from './gate'
import { newVaultKey, pcKeyDir, usbKeyDir, writeRegistration, type Registration } from './store'
import { statePath, writeState } from './status'

/**
 * Registering a key on a stick or on this PC (spec 7-1): the server binds the
 * key to the device's hashed number and signs that; the app then writes the
 * key, the signed binding and a fresh vault key to the chosen place.
 */

const ACTIVATE_TIMEOUT_MS = 15_000
const MAX_KEY_FILE_BYTES = 64 * 1024
const MAX_ANSWER_BYTES = 64 * 1024

export type ActivateError = 'limit' | 'used' | 'refused' | 'network' | 'bad-answer'
export type RegisterError = 'bad-key' | 'no-usb' | ActivateError

export async function activateKey(opts: {
  server: string
  fetch: typeof fetch
  key: Signed<KeyPayload>
  deviceType: 'usb' | 'pc'
  deviceIdHash: string
  pcConsentAt?: string
  keys: PublicKeys
}): Promise<
  { ok: true; activation: Signed<ActivationPayload> } | { ok: false; error: ActivateError }
> {
  let response: Response
  try {
    response = await opts.fetch(`${opts.server}/keys/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        key: opts.key,
        deviceType: opts.deviceType,
        deviceId: opts.deviceIdHash,
        ...(opts.pcConsentAt ? { pcConsentAt: opts.pcConsentAt } : {}),
      }),
      signal: AbortSignal.timeout(ACTIVATE_TIMEOUT_MS),
    })
  } catch {
    return { ok: false, error: 'network' }
  }
  if (response.status === 409) return { ok: false, error: 'used' }
  if (response.status === 429) return { ok: false, error: 'limit' }
  if (!response.ok) return { ok: false, error: 'refused' }
  let doc: unknown
  try {
    const text = await response.text()
    if (text.length > MAX_ANSWER_BYTES) return { ok: false, error: 'bad-answer' }
    doc = JSON.parse(text)
  } catch {
    return { ok: false, error: 'bad-answer' }
  }
  const activation = verifySigned(doc, opts.keys, isActivationPayload)
  const key = opts.key.payload
  if (
    !activation ||
    activation.keyId !== key.keyId ||
    activation.memberId !== key.memberId ||
    activation.deviceType !== opts.deviceType ||
    activation.deviceId !== opts.deviceIdHash ||
    (opts.pcConsentAt !== undefined && activation.pcConsentAt !== opts.pcConsentAt)
  ) {
    return { ok: false, error: 'bad-answer' }
  }
  return { ok: true, activation: doc as Signed<ActivationPayload> }
}

async function readKeyFile(path: string, keys: PublicKeys): Promise<Signed<KeyPayload> | null> {
  try {
    const text = await readFile(path, 'utf8')
    if (text.length > MAX_KEY_FILE_BYTES) return null
    const doc = JSON.parse(text) as unknown
    return verifySigned(doc, keys, isKeyPayload) ? (doc as Signed<KeyPayload>) : null
  } catch {
    return null
  }
}

export async function registerKey(opts: {
  userData: string
  keyFile: string
  target: { where: 'usb'; letter: string } | { where: 'pc'; consentAt: string }
  probe: DeviceProbe
  config: GateConfig
  fetch: typeof fetch
  /** where a stick's folder is; tests point it at a temporary folder */
  usbDir?: (letter: string) => string
}): Promise<{ ok: true; registration: Registration } | { ok: false; error: RegisterError }> {
  const { target, config } = opts
  // the PC needs the moment the person accepted the warning (spec 7-1)
  if (target.where === 'pc' && !target.consentAt) return { ok: false, error: 'refused' }
  const key = await readKeyFile(opts.keyFile, config.keys)
  if (!key) return { ok: false, error: 'bad-key' }

  let rawId: string
  let dir: string
  let volumeSerial: string | undefined
  if (target.where === 'usb') {
    const volume = (await opts.probe.listUsbVolumes()).find((v) => v.letter === target.letter)
    if (!volume) return { ok: false, error: 'no-usb' }
    rawId = usbDeviceId(volume)
    dir = (opts.usbDir ?? usbKeyDir)(volume.letter)
    volumeSerial = volume.volumeSerial
  } else {
    const guid = await opts.probe.machineGuid()
    if (!guid) return { ok: false, error: 'refused' }
    rawId = guid
    dir = pcKeyDir(opts.userData)
  }

  const activated = await activateKey({
    server: config.server,
    fetch: opts.fetch,
    key,
    deviceType: target.where,
    deviceIdHash: deviceIdHash(rawId),
    ...(target.where === 'pc' ? { pcConsentAt: target.consentAt } : {}),
    keys: config.keys,
  })
  if (!activated.ok) return activated

  const vault = newVaultKey()
  await writeRegistration(dir, { key, activation: activated.activation, vault })
  await writeState(statePath(opts.userData), { keyId: key.payload.keyId, where: target.where })
  return {
    ok: true,
    registration: {
      where: target.where,
      dir,
      key: key.payload,
      activation: activated.activation.payload,
      vault,
      ...(volumeSerial !== undefined ? { volumeSerial } : {}),
    },
  }
}
