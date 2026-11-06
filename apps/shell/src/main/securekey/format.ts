import { createPublicKey, verify } from 'node:crypto'

/**
 * The security key's files and server answers (spec 7-2, 7-6). Each one is a
 * payload signed by tenai.kr with Ed25519 over `canonicalJson(payload)`; the
 * app carries only the public keys, by `kid`. The same shapes are the contract
 * with the server (docs/contracts.md "Security key files and server answers").
 */

/** `hanpan.key`: what tenai.kr issued to a member */
export interface KeyPayload {
  v: 1
  kid: string
  memberId: string
  keyId: string
  issuedAt: string
}

/** `activation.json`: the key bound to one device by the server */
export interface ActivationPayload {
  v: 1
  keyId: string
  memberId: string
  deviceType: 'usb' | 'pc'
  /** SHA-256 hex of the device number; the number itself never leaves the PC */
  deviceId: string
  activatedAt: string
  pcConsentAt?: string
}

/** The answer of `GET /keys/status` */
export interface StatusPayload {
  v: 1
  keyId: string
  status: 'active' | 'revoked'
  serverTime: string
}

export interface Signed<T> {
  payload: T
  kid: string
  /** base64 Ed25519 signature of the UTF-8 bytes of canonicalJson(payload) */
  sig: string
}

/** kid → base64 of the 32-byte Ed25519 public key */
export type PublicKeys = Readonly<Record<string, string>>

/** The ASN.1 header that turns a raw Ed25519 public key into SPKI DER */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isText = (v: unknown): v is string => typeof v === 'string' && v !== ''

/** JSON with the keys of every object sorted and no spaces: the bytes that are signed */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`
  if (isRecord(value)) {
    const fields = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
    return `{${fields.join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/** The build value of the public keys; anything malformed reads as no keys */
export function parsePublicKeys(raw: string): PublicKeys {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!isRecord(parsed)) return {}
  const entries = Object.entries(parsed)
  if (!entries.every(([, v]) => isText(v))) return {}
  return Object.freeze(Object.fromEntries(entries)) as PublicKeys
}

/** The signed payload when the signature is good under a known kid and the shape is right */
export function verifySigned<T>(
  doc: unknown,
  keys: PublicKeys,
  isPayload: (p: unknown) => p is T,
): T | null {
  if (!isRecord(doc) || !isText(doc.kid) || !isText(doc.sig)) return null
  if (!Object.prototype.hasOwnProperty.call(keys, doc.kid)) return null
  if (!isPayload(doc.payload)) return null
  try {
    const raw = Buffer.from(keys[doc.kid]!, 'base64')
    if (raw.length !== 32) return null
    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, raw]),
      format: 'der',
      type: 'spki',
    })
    const signature = Buffer.from(doc.sig, 'base64')
    if (signature.length !== 64) return null
    const bytes = Buffer.from(canonicalJson(doc.payload), 'utf8')
    return verify(null, bytes, publicKey, signature) ? doc.payload : null
  } catch {
    return null
  }
}

export function isKeyPayload(p: unknown): p is KeyPayload {
  return (
    isRecord(p) &&
    p.v === 1 &&
    isText(p.kid) &&
    isText(p.memberId) &&
    isText(p.keyId) &&
    isText(p.issuedAt)
  )
}

export function isActivationPayload(p: unknown): p is ActivationPayload {
  return (
    isRecord(p) &&
    p.v === 1 &&
    isText(p.keyId) &&
    isText(p.memberId) &&
    (p.deviceType === 'usb' || p.deviceType === 'pc') &&
    isText(p.deviceId) &&
    isText(p.activatedAt) &&
    (p.pcConsentAt === undefined || isText(p.pcConsentAt))
  )
}

export function isStatusPayload(p: unknown): p is StatusPayload {
  return (
    isRecord(p) &&
    p.v === 1 &&
    isText(p.keyId) &&
    (p.status === 'active' || p.status === 'revoked') &&
    isText(p.serverTime)
  )
}
