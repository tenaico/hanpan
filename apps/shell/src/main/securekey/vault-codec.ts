import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { SEALED_PREFIX, SEALED_PREFIX_V2, type AiSecretCodec } from '@genoffice/ai-provider'

/**
 * The AI keys under two locks (spec 7-5): AES-256-GCM with the security key's
 * vault, then the operating system's seal (`base`, safeStorage). The value on
 * disk is `sealed:v2:` and the v1 seal of `iv ‖ tag ‖ ciphertext` in base64.
 * Without the vault (the stick is out, or no key was ever registered) a v2
 * value does not open and the "no key" rules apply. With no vault the codec
 * seals v1 as before, so a PC that never registered keeps today's format.
 */

const IV_BYTES = 12
const TAG_BYTES = 16
const VAULT_BYTES = 32

export function vaultCodec(base: AiSecretCodec, vault: () => Buffer | null): AiSecretCodec {
  const key = (): Buffer | null => {
    const v = vault()
    return v && v.length === VAULT_BYTES ? v : null
  }
  return {
    seal(plain) {
      const k = key()
      if (!k) return base.seal(plain)
      const iv = randomBytes(IV_BYTES)
      const cipher = createCipheriv('aes-256-gcm', k, iv)
      const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
      const inner = Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')
      const sealed = base.seal(inner)
      if (sealed === null || !sealed.startsWith(SEALED_PREFIX)) return null
      return SEALED_PREFIX_V2 + sealed.slice(SEALED_PREFIX.length)
    },
    open(sealed) {
      if (sealed.startsWith(SEALED_PREFIX)) return base.open(sealed)
      if (!sealed.startsWith(SEALED_PREFIX_V2)) return null
      const k = key()
      if (!k) return null
      const inner = base.open(SEALED_PREFIX + sealed.slice(SEALED_PREFIX_V2.length))
      if (inner === null) return null
      try {
        const bytes = Buffer.from(inner, 'base64')
        if (bytes.length < IV_BYTES + TAG_BYTES) return null
        const decipher = createDecipheriv('aes-256-gcm', k, bytes.subarray(0, IV_BYTES))
        decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES))
        const plain = Buffer.concat([
          decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)),
          decipher.final(),
        ])
        return plain.toString('utf8')
      } catch {
        return null
      }
    },
  }
}
