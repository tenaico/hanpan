/**
 * The canvas picture that goes with a request (design 6-4): a scaled-down PNG
 * of the document for a model that can see images, and a line telling the
 * model what it got. A model without vision gets the line only.
 */
import type { AgentImage } from '@genoffice/agent-core'
import type { GraphicsAdapter } from '../adapters'
import { bytesToBase64 } from '../frame/bytes'

/** the longest side of the picture sent with a request */
export const CANVAS_SHOT_MAX_SIDE = 1024

export const CANVAS_SHOT_NOTE =
  '(Attached image: the current canvas of this document, scaled down.)'
export const NO_CANVAS_SHOT_NOTE = '(No canvas picture: the current model cannot see images.)'
const NO_DOCUMENT_NOTE = '(No canvas picture: there is no document open.)'

export async function canvasShot(
  adapter: Pick<GraphicsAdapter, 'snapshotPng'>,
  vision: boolean,
): Promise<{ images?: AgentImage[]; note: string }> {
  if (!vision) return { note: NO_CANVAS_SHOT_NOTE }
  const png = await adapter.snapshotPng(CANVAS_SHOT_MAX_SIDE).catch(() => null)
  if (!png) return { note: NO_DOCUMENT_NOTE }
  return { images: [{ base64: bytesToBase64(png), mime: 'image/png' }], note: CANVAS_SHOT_NOTE }
}
