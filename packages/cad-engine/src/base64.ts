// Standard base64 (RFC 4648, with = padding), written out so it needs no host helpers.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1)
  for (let i = 0; i < ALPHABET.length; i++) table[ALPHABET.charCodeAt(i)] = i
  return table
})()

export function encodeBase64(bytes: Uint8Array): string {
  const parts: string[] = []
  let chunk = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0
    const n = (a << 16) | (b << 8) | c
    chunk += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]!
    chunk += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63]! : '='
    chunk += i + 2 < bytes.length ? ALPHABET[n & 63]! : '='
    // Keep the working string short so large meshes do not build one huge rope.
    if (chunk.length >= 8192) {
      parts.push(chunk)
      chunk = ''
    }
  }
  parts.push(chunk)
  return parts.join('')
}

/** Throws on anything that is not canonical padded base64 (no whitespace, no URL alphabet). */
export function decodeBase64(text: string): Uint8Array {
  if (text.length % 4 !== 0) throw new Error('base64: length is not a multiple of 4')
  let pad = 0
  if (text.endsWith('==')) pad = 2
  else if (text.endsWith('=')) pad = 1
  const out = new Uint8Array((text.length / 4) * 3 - pad)
  const value = (i: number): number => {
    const code = text.charCodeAt(i)
    const v = code < 128 ? LOOKUP[code]! : -1
    if (v < 0) throw new Error('base64: bad character')
    return v
  }
  let o = 0
  for (let i = 0; i < text.length; i += 4) {
    const last = i + 4 === text.length
    const a = value(i)
    const b = value(i + 1)
    const c = last && pad === 2 ? 0 : value(i + 2)
    const d = last && pad >= 1 ? 0 : value(i + 3)
    const n = (a << 18) | (b << 12) | (c << 6) | d
    out[o++] = (n >> 16) & 255
    if (o < out.length) out[o++] = (n >> 8) & 255
    if (o < out.length) out[o++] = n & 255
  }
  return out
}
