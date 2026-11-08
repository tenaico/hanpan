/**
 * Hanpan: a Gongu picture the person picked from the editor's Picture choice (0.17.1 #15).
 * It goes in at the caret, in a new paragraph right after the caret's, with its credit line in
 * a small centred paragraph under it, and the line goes into the "picture credits" list at the
 * end of the document: the way the AI's Gongu pictures go into this editor and the Word
 * editor's picker inserts them (apps/docs/src/renderer/gongu-insert.ts).
 */
import type { GonguPicked } from '@genoffice/ui'
import type { AgentBridge } from '../ai/agent-bridge'
import { addToCreditList } from './credit-list'

/**
 * The largest a picked picture goes on the page, in points, either way: a third of an A4 page
 * high at most, so it can stand under the caret's line instead of going to the next page.
 */
const MAX_SIDE_PT = 300

type PictureExt = 'png' | 'jpg' | 'gif'

/** The format of base64 picture bytes the document can hold, or null for any other. */
function pictureExt(base64: string): PictureExt | null {
  let head: string
  try {
    head = atob(base64.slice(0, 12))
  } catch {
    return null
  }
  if (head.startsWith('\x89PNG')) return 'png'
  if (head.startsWith('GIF8')) return 'gif'
  if (head.charCodeAt(0) === 0xff && head.charCodeAt(1) === 0xd8) return 'jpg'
  return null
}

/** A picture drawn again as PNG (base64), for a format the document cannot hold (WebP, BMP). */
async function canvasPng(dataUrl: string): Promise<string> {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no canvas')
  context.drawImage(image, 0, 0)
  return canvas.toDataURL('image/png').split(',')[1] ?? ''
}

/** Inserts a picked picture with its credit; false when it did not go in. */
export async function insertGonguPicture(
  bridge: Pick<AgentBridge, 'insertPictureAtCaret' | 'readText' | 'insertParagraphs'>,
  picked: GonguPicked,
  lang: string,
  toPng: (dataUrl: string) => Promise<string> = canvasPng,
): Promise<boolean> {
  let base64 = picked.dataUrl.slice(picked.dataUrl.indexOf(',') + 1)
  let ext = pictureExt(base64)
  if (!ext) {
    base64 = await toPng(picked.dataUrl)
    ext = pictureExt(base64)
    if (!ext) return false
  }
  // its own size at 96 px to the inch (0.75 pt a pixel), within MAX_SIDE_PT both ways
  const scale = Math.min(1, MAX_SIDE_PT / Math.max(1, picked.width * 0.75, picked.height * 0.75))
  const widthPt = Math.max(24, Math.round(picked.width * 0.75 * scale))
  const result = await bridge.insertPictureAtCaret(
    base64,
    widthPt,
    picked.width,
    picked.height,
    ext,
    picked.creditLine,
  )
  if (!result.ok) return false
  await addToCreditList(bridge, picked.creditLine, lang)
  return true
}
