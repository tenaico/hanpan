/** A 12-character lowercase hex id. Uses getRandomValues so it also runs in a renderer. */
export function newId(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}
