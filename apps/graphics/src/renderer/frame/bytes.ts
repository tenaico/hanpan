/**
 * Bytes handed over by the web app may be a view into its WebAssembly memory,
 * which moves when the memory grows: copy them before anything else runs.
 */
export function copyBytes(bytes: Uint8Array | ArrayBuffer): Uint8Array {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes
  const copy = new Uint8Array(view.byteLength)
  copy.set(view)
  return copy
}

export function base64ToBytes(text: string): Uint8Array {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/** A PNG no larger than maxSide on its longer edge; the input when it already is. */
export async function downscalePng(bytes: Uint8Array, maxSide: number): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(
    new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/png' }),
  )
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  if (scale >= 1) {
    bitmap.close()
    return bytes
  }
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}
