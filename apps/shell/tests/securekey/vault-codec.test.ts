import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { SEALED_PREFIX, SEALED_PREFIX_V2 } from '@genoffice/ai-provider'
import { safeStorageCodec, type SafeStorageLike } from '../../src/main/ai-secrets'
import { vaultCodec } from '../../src/main/securekey/vault-codec'

/** safeStorage stand-in, as in tests/ai-secrets.test.ts: "encryption" reverses the bytes */
const fakeStorage = (): SafeStorageLike => ({
  isEncryptionAvailable: () => true,
  encryptString: (plain) => Buffer.from([...Buffer.from(plain, 'utf8')].reverse()),
  decryptString: (sealed) => Buffer.from([...sealed].reverse()).toString('utf8'),
})
const base = () => safeStorageCodec(fakeStorage(), 'win32')

describe('vaultCodec', () => {
  it('round-trips through v2 with the vault', () => {
    const vault = randomBytes(32)
    const codec = vaultCodec(base(), () => vault)
    const sealed = codec.seal('sk-키')!
    expect(sealed.startsWith(SEALED_PREFIX_V2)).toBe(true)
    // the DPAPI layer alone does not give the key back
    expect(base().open(sealed)).toBeNull()
    expect(base().open(SEALED_PREFIX + sealed.slice(SEALED_PREFIX_V2.length))).not.toContain('sk-')
    expect(codec.open(sealed)).toBe('sk-키')
  })

  it('cannot open v2 without the vault', () => {
    let vault: Buffer | null = randomBytes(32)
    const codec = vaultCodec(base(), () => vault)
    const sealed = codec.seal('sk-1')!
    vault = null
    expect(codec.open(sealed)).toBeNull()
  })

  it('cannot open v2 with another vault', () => {
    let vault = randomBytes(32)
    const codec = vaultCodec(base(), () => vault)
    const sealed = codec.seal('sk-1')!
    vault = randomBytes(32)
    expect(codec.open(sealed)).toBeNull()
  })

  it('cannot open a damaged v2 value', () => {
    const vault = randomBytes(32)
    const codec = vaultCodec(base(), () => vault)
    expect(codec.open(`${SEALED_PREFIX_V2}AAAA`)).toBeNull()
    expect(codec.open(`${SEALED_PREFIX_V2}`)).toBeNull()
  })

  it('still opens v1 values', () => {
    const v1 = base().seal('sk-old')!
    expect(vaultCodec(base(), () => randomBytes(32)).open(v1)).toBe('sk-old')
    expect(vaultCodec(base(), () => null).open(v1)).toBe('sk-old')
  })

  it('seals v1 when there is no vault', () => {
    const sealed = vaultCodec(base(), () => null).seal('sk-1')!
    expect(sealed.startsWith(SEALED_PREFIX)).toBe(true)
    expect(base().open(sealed)).toBe('sk-1')
  })

  it('keeps the value plain when the PC cannot seal at all', () => {
    const cannot = safeStorageCodec(
      { ...fakeStorage(), isEncryptionAvailable: () => false },
      'win32',
    )
    expect(vaultCodec(cannot, () => randomBytes(32)).seal('sk-1')).toBeNull()
  })
})
