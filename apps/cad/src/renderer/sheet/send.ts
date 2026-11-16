/**
 * "Copy picture" and "Send to Hangul / Word" from start to end, as the screen
 * runs them. What went wrong comes back as the key of a sentence in the UI
 * language: the main process's own error words are logged, never shown.
 *
 * The request follows the shell's contract (`SendToDocumentRequest`): the
 * drawing's title (else the tab title), its date (else today), the sheet as
 * PNG under 10 MB, and the size table with a translated header row.
 */
import type { CadDocument, SheetInput, SheetLabels, SheetResult } from '@genoffice/cad-engine'
import type { CadSendApi, SendToDocumentRequest } from '../../shared/ipc'
import type { StringKey } from '../i18n/locale'
import { filledTitle, sheetFor, sheetPng, type Rasterize } from './sheet-png'

/** The shell takes at most this many part rows (after the header row). */
export const MAX_TABLE_ROWS = 500
/** The shell's limits on the title, the date line and each table cell, in UTF-16 units. */
const MAX_TITLE = 200
const MAX_DATE = 40
const MAX_CELL = 200

/** At most `max` UTF-16 units, without cutting a character in half. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut
}

export type SendTarget = SendToDocumentRequest['target']

/** What a send or a copy reads from the open drawing at the moment it runs. */
export interface SheetSource {
  doc: CadDocument
  evaluated: readonly SheetInput[]
  /** the tab title, for an untitled title block */
  tabTitle: string
  /** yyyy-mm-dd */
  today: string
  labels: SheetLabels
  /** the size table's header row: name, width, depth, height */
  header: [string, string, string, string]
}

/** Nothing visible to draw: the sheet and the send are refused with this reason. */
export function sheetBlocked(doc: CadDocument): StringKey | null {
  return doc.parts.some((p) => !p.hidden) ? null : 'sheetEmpty'
}

export function sheetOf(source: SheetSource): SheetResult {
  return sheetFor(source.doc, source.evaluated, source.labels, {
    title: source.tabTitle,
    today: source.today,
  })
}

/** The request for the shell, around an already made picture. */
export function buildSendRequest(
  source: SheetSource,
  sheet: SheetResult,
  target: SendTarget,
  drawingPng: Uint8Array,
): SendToDocumentRequest {
  const title = filledTitle(source.doc, { title: source.tabTitle, today: source.today })
  return {
    target,
    title: clip(title.name, MAX_TITLE),
    date: clip(title.date, MAX_DATE),
    drawingPng,
    rows: [
      source.header.map((cell) => clip(cell, MAX_CELL)),
      ...sheet.rows
        .slice(0, MAX_TABLE_ROWS)
        .map((r) => [r.name, r.width, r.depth, r.height].map((cell) => clip(cell, MAX_CELL))),
    ],
  }
}

/** Sends the sheet as a new document; null when the new tab opened. */
export async function runSend(
  source: SheetSource,
  target: SendTarget,
  api: Pick<CadSendApi, 'sendToDocument'>,
  rasterize?: Rasterize,
): Promise<StringKey | null> {
  const blocked = sheetBlocked(source.doc)
  if (blocked) return blocked
  try {
    const sheet = sheetOf(source)
    const png = await sheetPng(sheet.svg, rasterize)
    if (!png) return 'pictureTooLarge'
    const result = await api.sendToDocument(buildSendRequest(source, sheet, target, png))
    if (result.ok) return null
    console.warn('[cad] the sheet was not sent:', result.error)
    return 'sendFailed'
  } catch (err) {
    console.warn('[cad] the sheet was not sent:', err)
    return 'sendFailed'
  }
}

/** Puts PNG bytes on the clipboard; the key of what to say. */
export async function copyPng(
  png: Uint8Array | null,
  api: Pick<CadSendApi, 'copyImage'>,
): Promise<StringKey> {
  if (!png) return 'pictureTooLarge'
  try {
    return (await api.copyImage(png)) ? 'copyDone' : 'copyFailed'
  } catch (err) {
    console.warn('[cad] the picture was not copied:', err)
    return 'copyFailed'
  }
}

/** The sheet as a picture on the clipboard. */
export async function copySheet(
  source: SheetSource,
  api: Pick<CadSendApi, 'copyImage'>,
  rasterize?: Rasterize,
): Promise<StringKey> {
  const blocked = sheetBlocked(source.doc)
  if (blocked) return blocked
  let png: Uint8Array | null
  try {
    png = await sheetPng(sheetOf(source).svg, rasterize)
  } catch (err) {
    console.warn('[cad] the sheet picture could not be made:', err)
    return 'copyFailed'
  }
  return copyPng(png, api)
}
