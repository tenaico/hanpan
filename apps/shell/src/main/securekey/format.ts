import { randomBytes } from 'node:crypto'

/**
 * The local security key's files (spec 2026-11-12 5-1). Nothing is signed and
 * nothing leaves the PC: `hanpan.key` names the key on a stick, and the PC's
 * `registered.json` says which key and which sticks open this PC.
 */

/** `hanpan.key` on a stick (or in the PC folder) */
export interface LocalKeyFile {
  v: 2
  keyId: string
  createdAt: string
}

export interface RegisteredDevice {
  /** SHA-256 hex of the stick's device number (devices.ts `deviceIdHash`) */
  deviceId: string
  addedAt: string
}

/** `registered.json` in the PC folder */
export interface Registered {
  v: 2
  keyId: string
  where: 'usb' | 'pc'
  /** the sticks that open this PC; empty for a PC key */
  devices: RegisteredDevice[]
  createdAt: string
  /** when the person accepted the risk of a PC key; null for a stick */
  pcConsentAt: string | null
  /** keys made before this one, for the "made again" notice */
  previous: { keyId: string; replacedAt: string }[]
}

const KEY_ID = /^[0-9a-f]{32}$/
const HASH = /^[0-9a-f]{64}$/

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export function newKeyId(): string {
  return randomBytes(16).toString('hex')
}

/** A `hanpan.key` of this format, or null for anything else (an older signed file too) */
export function parseLocalKeyFile(text: string): LocalKeyFile | null {
  const v = parseJson(text)
  if (!isObject(v) || v.v !== 2 || !isText(v.keyId) || !KEY_ID.test(v.keyId)) return null
  if (!isText(v.createdAt)) return null
  return { v: 2, keyId: v.keyId, createdAt: v.createdAt }
}

/** A whole `registered.json`, or null when any field is missing or wrong */
export function parseRegistered(text: string): Registered | null {
  const v = parseJson(text)
  if (!isObject(v) || v.v !== 2 || !isText(v.keyId) || !KEY_ID.test(v.keyId)) return null
  if (v.where !== 'usb' && v.where !== 'pc') return null
  if (!isText(v.createdAt)) return null
  if (v.pcConsentAt !== null && !isText(v.pcConsentAt)) return null
  if (!Array.isArray(v.devices) || !Array.isArray(v.previous)) return null
  const devices: RegisteredDevice[] = []
  for (const d of v.devices) {
    if (!isObject(d) || !isText(d.deviceId) || !HASH.test(d.deviceId) || !isText(d.addedAt)) {
      return null
    }
    devices.push({ deviceId: d.deviceId, addedAt: d.addedAt })
  }
  const previous: Registered['previous'] = []
  for (const p of v.previous) {
    if (!isObject(p) || !isText(p.keyId) || !KEY_ID.test(p.keyId) || !isText(p.replacedAt)) {
      return null
    }
    previous.push({ keyId: p.keyId, replacedAt: p.replacedAt })
  }
  return {
    v: 2,
    keyId: v.keyId,
    where: v.where,
    devices,
    createdAt: v.createdAt,
    pcConsentAt: v.pcConsentAt as string | null,
    previous,
  }
}
