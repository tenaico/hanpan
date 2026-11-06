import { generateKeyPairSync, sign as edSign } from 'node:crypto'
import { canonicalJson, type PublicKeys, type Signed } from '../../src/main/securekey/format'

/** An in-memory Ed25519 signer standing in for tenai.kr; the private key never leaves the test */
export function makeTestSigner(kid = 'test1'): {
  keys: PublicKeys
  sign<T>(payload: T): Signed<T>
} {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const spki = publicKey.export({ format: 'der', type: 'spki' })
  const raw = spki.subarray(spki.length - 32)
  return {
    keys: { [kid]: raw.toString('base64') },
    sign<T>(payload: T): Signed<T> {
      const sig = edSign(null, Buffer.from(canonicalJson(payload), 'utf8'), privateKey)
      return { payload, kid, sig: sig.toString('base64') }
    },
  }
}
