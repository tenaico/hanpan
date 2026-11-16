// @vitest-environment node
/**
 * Text outlines from the bundled Black Han Sans font: closed rings of finite
 * millimetres in the engine's TextShape form, accepted by addShape and turned
 * by the kernel into a closed solid, with the counters of letters as holes.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { parse, type Font } from 'opentype.js'
import {
  addShape,
  createDocument,
  createKernel,
  evaluateDocument,
  isClosedMesh,
  meshVolume,
  ringArea2,
  triangleCount,
  type ShapePart,
} from '@genoffice/cad-engine'
import { templateFontUrl } from '@genoffice/ui/template-fonts'
import { loadTextFont, textOutlines } from '../src/renderer/editing/text-outlines'

const FONT_FILE = fileURLToPath(
  new URL('../../../packages/ui/template-fonts/BlackHanSans-Regular.ttf', import.meta.url),
)

function fontBytes(): ArrayBuffer {
  const buf = readFileSync(FONT_FILE)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

let font: Font
beforeAll(() => {
  font = parse(fontBytes())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function expectClosedRings(rings: number[][]): void {
  expect(rings.length).toBeGreaterThan(0)
  for (const ring of rings) {
    expect(ring.length % 2).toBe(0)
    expect(ring.length).toBeGreaterThanOrEqual(6)
    expect(ring.every((v) => Number.isFinite(v))).toBe(true)
    expect(ringArea2(ring)).not.toBe(0)
    // closed by convention: the last point is not a copy of the first
    const n = ring.length
    expect(ring[0] === ring[n - 2] && ring[1] === ring[n - 1]).toBe(false)
  }
}

async function evaluateText(value: string, outlines: number[][]) {
  const { doc } = addShape(createDocument(), 'text', { text: { value, outlines } })
  const kernel = await createKernel()
  try {
    const [evaluated] = evaluateDocument(doc, kernel)
    expect(evaluated!.issue).toBeNull()
    const mesh = evaluated!.mesh!
    // manifold-3d takes it as a valid solid
    const united = kernel.union([mesh])
    return { doc, mesh, united }
  } finally {
    kernel.dispose()
  }
}

describe('textOutlines', () => {
  it('text outlines for "A" are closed rings with finite numbers', () => {
    const rings = textOutlines(font, 'A', 10)
    expectClosedRings(rings)
    // the outside of the A turns counter-clockwise, its counter clockwise
    expect(rings.filter((r) => ringArea2(r) > 0)).toHaveLength(1)
    expect(rings.filter((r) => ringArea2(r) < 0)).toHaveLength(1)
  })

  it('outlines for "가" are closed rings with finite numbers', () => {
    const rings = textOutlines(font, '가', 10)
    expectClosedRings(rings)
    expect(rings.some((r) => ringArea2(r) > 0)).toBe(true)
  })

  it('sizes the text in millimetres and centres it on the origin', () => {
    const rings = textOutlines(font, 'A', 20)
    const xs = rings.flatMap((r) => r.filter((_, i) => i % 2 === 0))
    const ys = rings.flatMap((r) => r.filter((_, i) => i % 2 === 1))
    const width = Math.max(...xs) - Math.min(...xs)
    const height = Math.max(...ys) - Math.min(...ys)
    expect(height).toBeGreaterThan(8)
    expect(height).toBeLessThan(20)
    expect(width).toBeGreaterThan(5)
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(0, 3)
    expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(0, 3)
  })

  it('gives no outlines for an empty string or only spaces', () => {
    expect(textOutlines(font, '', 10)).toEqual([])
    expect(textOutlines(font, '   ', 10)).toEqual([])
  })

  it('the engine accepts "A" and a kernel makes a closed solid with the hole cut', async () => {
    const outlines = textOutlines(font, 'A', 10)
    const { doc, mesh, united } = await evaluateText('A', outlines)
    expect((doc.parts[0] as ShapePart).text!.outlines).toEqual(outlines)
    expect(triangleCount(mesh)).toBeGreaterThan(0)
    expect(isClosedMesh(mesh)).toBe(true)
    expect(triangleCount(united)).toBeGreaterThan(0)
    const outer = outlines.find((r) => ringArea2(r) > 0)!
    const hole = outlines.find((r) => ringArea2(r) < 0)!
    const height = (doc.parts[0] as ShapePart).dims.height!
    // the hole's area is negative, so the sum is the area of the letter alone
    const expected = ((ringArea2(outer) + ringArea2(hole)) / 2) * height
    expect(meshVolume(mesh)).toBeCloseTo(expected, 1)
    expect(meshVolume(united)).toBeCloseTo(expected, 1)
  })

  it('the engine accepts "가" and a kernel makes a closed solid', async () => {
    const { mesh, united } = await evaluateText('가', textOutlines(font, '가', 10))
    expect(triangleCount(mesh)).toBeGreaterThan(0)
    expect(isClosedMesh(mesh)).toBe(true)
    expect(meshVolume(united)).toBeGreaterThan(0)
  })

  it('a word with holes in several letters makes a closed solid', async () => {
    const outlines = textOutlines(font, '한판 AI', 10)
    expectClosedRings(outlines)
    const { mesh } = await evaluateText('한판 AI', outlines)
    expect(isClosedMesh(mesh)).toBe(true)
  })
})

describe('loadTextFont', () => {
  it('loads Black Han Sans from the template font URL', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url)
      return new Response(fontBytes())
    })
    const loaded = await loadTextFont()
    expect(urls).toEqual([templateFontUrl('BlackHanSans-Regular.ttf')])
    expect(textOutlines(loaded, 'A', 10)).toHaveLength(2)
  })
})
