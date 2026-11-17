/**
 * The dimension sheet as the screen hands it on: the engine's A4 sheet
 * (`makeSheet`) with the title block's empty cells filled in, turned into a
 * PNG picture for "Copy picture" and "Send to Hangul / Word".
 *
 * The sheet is always black on white, whatever the app theme: the picture is
 * drawn on a white canvas. A picture that comes out larger than the limit is
 * drawn again at half the width, down to `MIN_PNG_WIDTH`; below that it is
 * refused (`fitUnder` gives null) and the screen says why.
 *
 * The browser part (an offscreen image and a canvas) is the `Rasterize`
 * function; tests hand in their own because jsdom cannot decode pictures.
 */
import {
  makeSheet,
  type CadDocument,
  type SheetInput,
  type SheetLabels,
  type SheetResult,
} from '@genoffice/cad-engine'
import type { TFunc } from '../i18n/locale'

/** A4 landscape at 300 dpi. */
export const SHEET_PNG_WIDTH = 3508
/** Below this width the sheet's small text cannot be read. */
export const MIN_PNG_WIDTH = 1024
/** What a copied or sent picture may weigh at most (the main process refuses more). */
export const PICTURE_LIMIT_BYTES = 10 * 1024 * 1024

const SHEET_W_MM = 297
const SHEET_H_MM = 210
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** What fills the title block's empty cells. */
export interface SheetFill {
  /** the tab title */
  title: string
  /** today, yyyy-mm-dd */
  today: string
}

/** Draws SVG text on a white canvas of the given pixel size and gives the PNG bytes. */
export type Rasterize = (svg: string, widthPx: number, heightPx: number) => Promise<Uint8Array>

/** The local date as yyyy-mm-dd. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** The words written on the sheet, in the UI language. */
export function sheetLabels(t: TFunc): SheetLabels {
  return {
    front: t('sheetFront'),
    top: t('sheetTop'),
    side: t('sheetSide'),
    title: t('sheetFieldTitle'),
    date: t('sheetFieldDate'),
    scale: t('sheetFieldScale'),
  }
}

/** The title block as it is printed: the drawing's own values, else the tab title and today. */
export function filledTitle(doc: CadDocument, fill: SheetFill): CadDocument['title'] {
  return {
    ...doc.title,
    name: doc.title.name.trim() || fill.title,
    date: doc.title.date.trim() || fill.today,
  }
}

/** The engine's sheet of the drawing, with the empty title block cells filled. */
export function sheetFor(
  doc: CadDocument,
  evaluated: readonly SheetInput[],
  labels: SheetLabels,
  fill: SheetFill,
): SheetResult {
  return makeSheet({ ...doc, title: filledTitle(doc, fill) }, evaluated, labels)
}

/** True when the bytes start with the PNG signature. */
export function isPng(bytes: Uint8Array): boolean {
  return bytes.length > PNG_SIGNATURE.length && PNG_SIGNATURE.every((b, i) => bytes[i] === b)
}

/** The browser's way: the SVG as an offscreen picture, drawn on a white canvas. */
export const browserRasterize: Rasterize = async (svg, widthPx, heightPx) => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = widthPx
    canvas.height = heightPx
    const context = canvas.getContext('2d')
    if (!context) throw new Error('no 2D canvas for the sheet picture')
    // the sheet is paper: white whatever the theme (the SVG paints white too)
    context.fillStyle = 'white'
    context.fillRect(0, 0, widthPx, heightPx)
    context.drawImage(image, 0, 0, widthPx, heightPx)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('the canvas gave no PNG picture')
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** The A4 sheet SVG as a PNG `widthPx` wide (the height keeps the A4 shape). */
export async function svgToPng(
  svg: string,
  widthPx: number,
  rasterize: Rasterize = browserRasterize,
): Promise<Uint8Array> {
  const width = Math.round(widthPx)
  const height = Math.round((width * SHEET_H_MM) / SHEET_W_MM)
  const png = await rasterize(svg, width, height)
  if (!isPng(png)) throw new Error('the sheet picture is not a PNG')
  return png
}

/**
 * Renders at `startWidth`, then at half the width each time the bytes are
 * over `bytesLimit`, never narrower than `MIN_PNG_WIDTH` (which is tried
 * once). Null when even that is too large.
 */
export async function fitUnder(
  bytesLimit: number,
  render: (widthPx: number) => Promise<Uint8Array>,
  startWidth: number = SHEET_PNG_WIDTH,
): Promise<Uint8Array | null> {
  let width = Math.max(MIN_PNG_WIDTH, Math.round(startWidth))
  for (;;) {
    const bytes = await render(width)
    if (bytes.length <= bytesLimit) return bytes
    if (width <= MIN_PNG_WIDTH) return null
    width = Math.max(MIN_PNG_WIDTH, Math.floor(width / 2))
  }
}

/** The sheet as a PNG of at most `PICTURE_LIMIT_BYTES`, or null when it cannot be made that small. */
export function sheetPng(
  svg: string,
  rasterize: Rasterize = browserRasterize,
): Promise<Uint8Array | null> {
  return fitUnder(PICTURE_LIMIT_BYTES, (w) => svgToPng(svg, w, rasterize))
}
