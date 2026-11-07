/**
 * Picture sizes for an export: the ratio-kept size the dialog shows, the size
 * of a PNG the app exported, and the resize itself (in the page, no file).
 */

export interface PixelSize {
  width: number
  height: number
}

/** The other side for a changed one, the ratio kept; never less than one pixel. */
export function keepRatio(
  original: PixelSize,
  changed: { width: number } | { height: number },
): PixelSize {
  const ratio = original.width / Math.max(1, original.height)
  if ('width' in changed) {
    const width = Math.max(1, Math.round(changed.width))
    return { width, height: Math.max(1, Math.round(width / ratio)) }
  }
  const height = Math.max(1, Math.round(changed.height))
  return { width: Math.max(1, Math.round(height * ratio)), height }
}

/** Chromium's canvas stops at 16384 pixels a side: an export never asks for more. */
export const MAX_EXPORT_SIDE = 16384

/** The size times a factor (a scale preset), never less than one pixel. */
export function scaleSize(size: PixelSize, factor: number): PixelSize {
  return {
    width: Math.max(1, Math.round(size.width * factor)),
    height: Math.max(1, Math.round(size.height * factor)),
  }
}

/** The size of a picture the page can decode. */
export async function measureImage(bytes: Uint8Array): Promise<PixelSize> {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]))
  try {
    return { width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

/** The picture at a new size, as PNG or JPEG. */
export async function resizeImage(
  bytes: Uint8Array,
  width: number,
  height: number,
  format: 'png' | 'jpg',
  quality = 0.9,
): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]), {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: 'high',
  })
  try {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d canvas')
    if (format === 'jpg') {
      // JPEG has no transparency: white behind, as the apps' own JPEG export does
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await canvas.convertToBlob(
      format === 'jpg' ? { type: 'image/jpeg', quality } : { type: 'image/png' },
    )
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    bitmap.close()
  }
}
