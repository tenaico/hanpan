/**
 * The letters of DXF and DWG text in the 3D view (0.22.2). The bundled
 * Pretendard Regular (OFL, Hangul and Latin) gives each character's outline
 * once; `drawingLines` places them at a text's point, height and angle. Until
 * the font has loaded, and for a drawing with more texts than
 * `GLYPH_TEXT_LIMIT`, a text is drawn as the box it takes.
 */
import { parse } from 'opentype.js'
import type { Font } from 'opentype.js'
import { templateFontUrl } from '@genoffice/ui/template-fonts'
import { contoursOf } from '../editing/text-outlines'

/** The bundled font drawing text is shown in. */
export const DRAWING_FONT_FILE = 'Pretendard-Regular.otf'

/** Past this many texts in one drawing, its texts stay boxes so a big drawing stays quick. */
export const GLYPH_TEXT_LIMIT = 2000

/** Lines of a text are this many text heights apart (AutoCAD's MTEXT default). */
const LINE_SPACING = 1.667

/** Curve pieces per em, at one em; text is small on screen, so a coarse cut is enough. */
const CURVE_STEP = 1 / 12

/** One character: its outlines in em units (y up, baseline at 0) and how far the pen moves. */
interface Glyph {
  contours: [number, number][][]
  advance: number
}

export interface GlyphSet {
  /**
   * The outlines of `value` for a text `height` mm high (the height of a capital),
   * in the text's own frame: x along the text, y up, the first baseline at 0,
   * each further line `LINE_SPACING` heights below. Characters the font lacks are left out.
   */
  outlines(value: string, height: number): [number, number][][]
}

export function glyphSetFromFont(font: Font): GlyphSet {
  const units = font.unitsPerEm || 1000
  const os2 = (font.tables as { os2?: { sCapHeight?: number } }).os2
  // a capital is this share of the em: text height is a capital's height
  const cap = os2?.sCapHeight ? os2.sCapHeight / units : 0.7
  const cache = new Map<string, Glyph | null>()
  const glyphOf = (ch: string): Glyph | null => {
    let glyph = cache.get(ch)
    if (glyph !== undefined) return glyph
    const found = font.charToGlyph(ch)
    if (!found || found.index === 0) {
      glyph = null
    } else {
      const path = found.getPath(0, 0, 1, undefined, font)
      glyph = {
        // path units are y down
        contours: contoursOf(path.commands, CURVE_STEP).map((c) =>
          c.map(([x, y]): [number, number] => [x, -y]),
        ),
        advance: (found.advanceWidth ?? units) / units,
      }
    }
    cache.set(ch, glyph)
    return glyph
  }
  return {
    outlines(value, height) {
      const size = height / cap
      const out: [number, number][][] = []
      value.split('\n').forEach((row, line) => {
        let pen = 0
        const base = -line * LINE_SPACING * height
        for (const ch of row) {
          const glyph = glyphOf(ch)
          if (!glyph) {
            pen += 0.5
            continue
          }
          for (const contour of glyph.contours) {
            if (contour.length < 2) continue
            const ring = contour.map(([x, y]): [number, number] => [
              (pen + x) * size,
              base + y * size,
            ])
            ring.push(ring[0]!)
            out.push(ring)
          }
          pen += glyph.advance
        }
      })
      return out
    },
  }
}

let active: GlyphSet | null = null

/** The letters drawing text is shown with now; null draws boxes. */
export function drawingGlyphs(): GlyphSet | null {
  return active
}

export function setDrawingGlyphs(glyphs: GlyphSet | null): void {
  active = glyphs
}

let loading: Promise<GlyphSet> | null = null

/** Fetches the font once and makes it the drawing font; a failed load is tried again next time. */
export function loadDrawingGlyphs(): Promise<GlyphSet> {
  loading ??= (async () => {
    const res = await fetch(templateFontUrl(DRAWING_FONT_FILE))
    if (!res.ok) throw new Error(`drawing font: HTTP ${res.status}`)
    const glyphs = glyphSetFromFont(parse(await res.arrayBuffer()))
    setDrawingGlyphs(glyphs)
    return glyphs
  })().catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}
