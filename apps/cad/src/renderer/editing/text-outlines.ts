import { parse } from 'opentype.js'
import type { Font, PathCommand } from 'opentype.js'
import { CadEditError, MAX_SIZE_MM, MIN_SIZE_MM, ringArea2 } from '@genoffice/cad-engine'
import { templateFontUrl } from '@genoffice/ui/template-fonts'

/** The bundled OFL font with Hangul and Latin that text shapes are drawn in. */
export const TEXT_FONT_FILE = 'BlackHanSans-Regular.ttf'

/** Curve pieces are about this fraction of the text size long. */
const CURVE_STEP = 1 / 40
const MAX_CURVE_STEPS = 24
/** Coordinates are kept to a tenth of a micrometre; the file stays small. */
const ROUND = 1e4

type Point = [number, number]

function dist(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

function stepsFor(control: readonly Point[], stepLength: number): number {
  let length = 0
  for (let i = 1; i < control.length; i++) length += dist(control[i - 1]!, control[i]!)
  return Math.min(MAX_CURVE_STEPS, Math.max(2, Math.ceil(length / stepLength)))
}

/** The glyph path as flat contours in path units (y down), curves cut into short lines. */
export function contoursOf(commands: readonly PathCommand[], stepLength: number): Point[][] {
  const contours: Point[][] = []
  let current: Point[] = []
  let pen: Point = [0, 0]
  const finish = (): void => {
    if (current.length > 0) contours.push(current)
    current = []
  }
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        finish()
        pen = [cmd.x, cmd.y]
        current.push(pen)
        break
      case 'L':
        pen = [cmd.x, cmd.y]
        current.push(pen)
        break
      case 'Q': {
        const p0 = pen
        const p1: Point = [cmd.x1, cmd.y1]
        const p2: Point = [cmd.x, cmd.y]
        const n = stepsFor([p0, p1, p2], stepLength)
        for (let i = 1; i <= n; i++) {
          const t = i / n
          const u = 1 - t
          current.push([
            u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
          ])
        }
        pen = p2
        break
      }
      case 'C': {
        const p0 = pen
        const p1: Point = [cmd.x1, cmd.y1]
        const p2: Point = [cmd.x2, cmd.y2]
        const p3: Point = [cmd.x, cmd.y]
        const n = stepsFor([p0, p1, p2, p3], stepLength)
        for (let i = 1; i <= n; i++) {
          const t = i / n
          const u = 1 - t
          const a = u * u * u
          const b = 3 * u * u * t
          const c = 3 * u * t * t
          const d = t * t * t
          current.push([
            a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
            a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
          ])
        }
        pen = p3
        break
      }
      case 'Z':
        finish()
        break
    }
  }
  finish()
  return contours
}

function reversed(ring: readonly number[]): number[] {
  const out: number[] = []
  for (let i = ring.length - 2; i >= 0; i -= 2) out.push(ring[i]!, ring[i + 1]!)
  return out
}

/** Rounds, drops repeated points (the closing copy of the first included); null when nothing is left to enclose. */
function tidyRing(points: readonly Point[], dx: number, dy: number): number[] | null {
  const pts: Point[] = []
  for (const [x, y] of points) {
    const p: Point = [Math.round((x - dx) * ROUND) / ROUND, Math.round((y - dy) * ROUND) / ROUND]
    const last = pts[pts.length - 1]
    if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p)
  }
  while (pts.length > 1) {
    const first = pts[0]!
    const last = pts[pts.length - 1]!
    if (first[0] !== last[0] || first[1] !== last[1]) break
    pts.pop()
  }
  if (pts.length < 3) return null
  const ring = pts.flat().map((v) => (v === 0 ? 0 : v))
  return ringArea2(ring) === 0 ? null : ring
}

/**
 * The text as closed outline rings in millimetres, y up, in the engine's
 * TextShape.outlines form: counter-clockwise rings are outsides, clockwise
 * rings are holes (the counter of an A). `sizeMm` is the font size (the em
 * square) in millimetres. The block is centred on the origin. Characters the
 * font lacks are left out rather than drawn as boxes.
 *
 * Fonts disagree on which way outsides turn (TrueType and CFF are opposite),
 * so each glyph is read by its largest contour, which is always an outside:
 * contours turning the same way are outsides, the others holes.
 */
export function textOutlines(font: Font, value: string, sizeMm: number): number[][] {
  if (
    typeof sizeMm !== 'number' ||
    !Number.isFinite(sizeMm) ||
    sizeMm < MIN_SIZE_MM ||
    sizeMm > MAX_SIZE_MM
  ) {
    throw new CadEditError('bad-number', 'text size')
  }
  const stepLength = sizeMm * CURVE_STEP
  const glyphs: Point[][][] = []
  font.forEachGlyph(value, 0, 0, sizeMm, undefined, (glyph, x, y, fontSize) => {
    if (glyph.index === 0) return // .notdef: the font has no such character
    const path = glyph.getPath(x, y, fontSize, undefined, font)
    // path units are y down; the workplane is y up
    const contours = contoursOf(path.commands, stepLength).map((c) =>
      c.map(([px, py]): Point => [px, -py]),
    )
    if (contours.length > 0) glyphs.push(contours)
  })
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const contours of glyphs) {
    for (const contour of contours) {
      for (const [x, y] of contour) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
  }
  if (!Number.isFinite(minX)) return []
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const out: number[][] = []
  for (const contours of glyphs) {
    const rings = contours.map((c) => tidyRing(c, cx, cy)).filter((r): r is number[] => r !== null)
    if (rings.length === 0) continue
    let largest = rings[0]!
    for (const ring of rings) {
      if (Math.abs(ringArea2(ring)) > Math.abs(ringArea2(largest))) largest = ring
    }
    // flip the whole glyph when its outsides turn clockwise
    const flip = ringArea2(largest) < 0
    for (const ring of rings) out.push(flip ? reversed(ring) : ring)
  }
  return out
}

let loading: Promise<Font> | null = null

/** The text font, fetched once from the template font URL; a failed load is tried again next time. */
export function loadTextFont(): Promise<Font> {
  loading ??= (async () => {
    const res = await fetch(templateFontUrl(TEXT_FONT_FILE))
    if (!res.ok) throw new Error(`text font: HTTP ${res.status}`)
    return parse(await res.arrayBuffer())
  })().catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}
