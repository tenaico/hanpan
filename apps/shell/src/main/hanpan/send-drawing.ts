/**
 * Hanpan: "send this drawing to a document". The AI Drawing tab hands over its
 * dimension sheet as a PNG and a table of part sizes; this writes a HWPX
 * (through the rhwp engine) or a DOCX with a title, a date line, the picture
 * and the table, and opens it as a new untitled tab of the Hangul or Word
 * editor, the same way the mind map's sender does (`send-map.ts`).
 *
 * Unlike the mind map, nothing is linked and nothing is synced: the new tab is
 * a plain untitled copy. Its temp folder goes when the tab is closed, or at
 * once when the tab does not open.
 */
import {
  blocksToDocx,
  blocksToHwp,
  documentFileName,
  themeFor,
  type DocBlock,
} from '@genoffice/hanpan-core'
import { join } from 'node:path'
import type { SendToDocumentRequest, SendToDocumentResult } from '../../../../cad/src/shared/ipc'
import type { TabContents } from './link-store'
import type { CopyEditor, SendMapDeps } from './send-map'

export type SendDrawingDeps = Omit<SendMapDeps, 'buildDeck' | 'recordLink'>

/** Limits on what a drawing tab may hand over. */
const MAX_TITLE = 200
const MAX_DATE = 40
const MAX_PNG_BYTES = 10 * 1024 * 1024
/** the header row and up to 500 parts */
const MAX_ROWS = 501
const MAX_CELLS = 4
const MAX_CELL = 200

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const EDITOR_OF: Record<SendToDocumentRequest['target'], CopyEditor> = {
  hwp: 'hwp',
  docx: 'docs',
}

/** True when the bytes start with the PNG signature and an IHDR chunk. */
function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 24) return false
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return false
  // the first chunk of every PNG is IHDR
  return String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!) === 'IHDR'
}

/** The picture's size in pixels, from its IHDR chunk. */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function checkRows(value: unknown): string[][] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ROWS) {
    throw new Error('bad rows')
  }
  return value.map((row: unknown) => {
    if (!Array.isArray(row) || row.length === 0 || row.length > MAX_CELLS) {
      throw new Error('bad rows')
    }
    return row.map((cell: unknown) => {
      if (typeof cell !== 'string' || cell.length > MAX_CELL) throw new Error('bad rows')
      return cell
    })
  })
}

/**
 * The request as the shell may trust it: every field checked, nothing extra
 * kept. Throws a short reason on anything else.
 */
export function checkDrawingRequest(raw: unknown): SendToDocumentRequest {
  if (!raw || typeof raw !== 'object') throw new Error('bad request')
  const r = raw as Record<string, unknown>
  if (r.target !== 'hwp' && r.target !== 'docx') throw new Error('bad target')
  if (typeof r.title !== 'string' || !r.title.trim() || r.title.length > MAX_TITLE) {
    throw new Error('bad title')
  }
  if (typeof r.date !== 'string' || r.date.length > MAX_DATE) throw new Error('bad date')
  const picture = r.drawingPng
  if (!(picture instanceof Uint8Array) || !isPng(picture)) {
    throw new Error('the drawing is not a PNG picture')
  }
  if (picture.length > MAX_PNG_BYTES) throw new Error('the drawing is over 10 MB')
  const { width, height } = pngSize(picture)
  if (width === 0 || height === 0) throw new Error('the drawing is not a PNG picture')
  return {
    target: r.target,
    title: r.title.trim(),
    date: r.date.trim(),
    drawingPng: picture,
    rows: checkRows(r.rows),
  }
}

/** The page: title, date line (when there is a date), the dimension sheet, the size table. */
export function drawingBlocks(request: SendToDocumentRequest): DocBlock[] {
  const { width, height } = pngSize(request.drawingPng)
  return [
    { kind: 'title', text: request.title },
    ...(request.date ? [{ kind: 'meta' as const, text: request.date }] : []),
    {
      kind: 'image',
      depth: 0,
      image: { bytes: request.drawingPng, mime: 'image/png', width, height },
    },
    { kind: 'table', rows: request.rows, header: true },
  ]
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function createDrawingSender(deps: SendDrawingDeps) {
  return async function sendDrawing(
    raw: unknown,
    // the drawing tab: kept for the same call shape as the map sender; nothing is linked to it
    _drawingContents: TabContents | null,
  ): Promise<SendToDocumentResult> {
    let request: SendToDocumentRequest
    try {
      request = checkDrawingRequest(raw)
    } catch (error) {
      return { ok: false, error: message(error) }
    }
    // the plain report look, the mind map's default style
    const theme = themeFor('report')
    const blocks = drawingBlocks(request)
    let bytes: Uint8Array
    try {
      bytes =
        request.target === 'docx'
          ? await blocksToDocx(blocks, theme)
          : blocksToHwp(await deps.loadHwpEngine(), blocks, theme, 'hwpx').bytes
    } catch (error) {
      return { ok: false, error: message(error) }
    }
    const fileName = documentFileName(request.title, request.target === 'hwp' ? 'hwpx' : 'docx')
    const title = fileName.slice(0, fileName.lastIndexOf('.'))
    const dir = await deps.makeCopyDir()
    const path = join(dir, fileName)
    let opened: Awaited<ReturnType<SendDrawingDeps['openCopy']>>
    try {
      await deps.writeFile(path, bytes)
      opened = await deps.openCopy({
        editor: EDITOR_OF[request.target],
        path,
        dir,
        bytes,
        fileName,
        title,
      })
    } catch {
      opened = null
    }
    if (!opened) {
      await deps.removeDir(dir).catch(() => undefined)
      return { ok: false, error: 'the new tab did not open' }
    }
    opened.contents.once('destroyed', () => void deps.removeDir(dir).catch(() => undefined))
    return { ok: true, title }
  }
}
