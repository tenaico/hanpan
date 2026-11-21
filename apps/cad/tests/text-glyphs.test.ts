// @vitest-environment node
/**
 * Drawing text in the 3D view as letter outlines (0.22.2): the bundled
 * Pretendard font gives each character's outline once, and a DXF or DWG text
 * is placed at its point, height and angle. Without the font, or past the
 * limit, a text stays the box it was.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'opentype.js'
import { afterEach, describe, expect, it } from 'vitest'
import type { DrawingPart } from '@genoffice/cad-engine'
import { drawingLines } from '../src/renderer/scene/drawing-lines'
import {
  DRAWING_FONT_FILE,
  GLYPH_TEXT_LIMIT,
  glyphSetFromFont,
  setDrawingGlyphs,
  type GlyphSet,
} from '../src/renderer/scene/text-glyphs'

const font = parse(
  readFileSync(join(__dirname, '../../../packages/ui/template-fonts', DRAWING_FONT_FILE))
    .buffer as ArrayBuffer,
)

function part(texts: number, value = 'H', rotationDeg = 0): DrawingPart {
  return {
    id: 'p',
    type: 'drawing',
    name: 'p',
    role: 'solid',
    color: '#888888',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    entities: Array.from({ length: texts }, (_, i) => ({
      kind: 'text' as const,
      at: [i * 100, 0] as [number, number],
      height: 10,
      rotationDeg,
      value,
      layer: 'TEXT',
    })),
  }
}

function bounds(lines: { points: number[] }[]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  const xs: number[] = []
  const ys: number[] = []
  for (const l of lines) {
    for (let i = 0; i < l.points.length; i += 3) {
      xs.push(l.points[i]!)
      ys.push(l.points[i + 1]!)
    }
  }
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

afterEach(() => setDrawingGlyphs(null))

describe('drawing text as letters', () => {
  it('without the font a text is its box: one closed outline of five points', () => {
    const lines = drawingLines(part(1))
    expect(lines).toHaveLength(1)
    expect(lines[0]!.points).toHaveLength(15)
  })

  it('with the font, "H" of height 10 stands on its baseline and is 10 mm tall', () => {
    setDrawingGlyphs(glyphSetFromFont(font))
    const lines = drawingLines(part(1))
    expect(lines.length).toBeGreaterThanOrEqual(1)
    const b = bounds(lines)
    expect(b.minY).toBeCloseTo(0, 0)
    expect(b.maxY).toBeGreaterThan(9)
    expect(b.maxY).toBeLessThan(11)
    expect(b.minX).toBeGreaterThanOrEqual(-0.5)
  })

  it('Hangul and a second line are drawn; a turned text turns', () => {
    setDrawingGlyphs(glyphSetFromFont(font))
    const two = bounds(drawingLines(part(1, '회의실\nROOM')))
    // the second line hangs below the baseline
    expect(two.minY).toBeLessThan(-5)
    const turned = bounds(drawingLines(part(1, 'HHHH', 90)))
    // turned a quarter: the word runs up the y axis
    expect(turned.maxY).toBeGreaterThan(20)
    expect(turned.maxX - turned.minX).toBeLessThan(12)
  })

  it('a drawing with more texts than the limit keeps the boxes', () => {
    const glyphs: GlyphSet = glyphSetFromFont(font)
    setDrawingGlyphs(glyphs)
    const lines = drawingLines(part(GLYPH_TEXT_LIMIT + 1))
    expect(lines).toHaveLength(GLYPH_TEXT_LIMIT + 1)
    expect(lines.every((l) => l.points.length === 15)).toBe(true)
  })
})
