/**
 * The dimension sheet as the screen makes it: the engine's sheet with the
 * title block's empty cells filled (tab title, today), its PNG at a pixel
 * width, and the halving that keeps a sent or copied picture under 10 MB.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  addShape,
  createDocument,
  createKernel,
  evaluateDocument,
  type CadDocument,
  type Kernel,
} from '@genoffice/cad-engine'
import {
  MIN_PNG_WIDTH,
  SHEET_PNG_WIDTH,
  fitUnder,
  sheetFor,
  svgToPng,
  todayIso,
} from '../src/renderer/sheet/sheet-png'

let kernel: Promise<Kernel> | null = null
const sharedKernel = (): Promise<Kernel> => (kernel ??= createKernel())

const LABELS = {
  front: 'Front view',
  top: 'Top view',
  side: 'Side view',
  title: 'Title',
  date: 'Date',
  scale: 'Scale',
}

const STANDARD_SCALES = [
  '10:1',
  '5:1',
  '2:1',
  '1:1',
  '1:2',
  '1:5',
  '1:10',
  '1:20',
  '1:50',
  '1:100',
  '1:200',
  '1:500',
  '1:1000',
  '1:2000',
  '1:5000',
  '1:10000',
  '1:20000',
  '1:50000',
]

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function boxDoc(width: number, depth: number, height: number): CadDocument {
  return addShape(createDocument(), 'box', { name: 'Part', dims: { width, depth, height } }).doc
}

/** Every number of every line and circle on the sheet lies on the A4 page. */
function drawnInsidePage(svg: string): boolean {
  for (const m of svg.matchAll(
    /<line x1="([-\d.e]+)" y1="([-\d.e]+)" x2="([-\d.e]+)" y2="([-\d.e]+)"/g,
  )) {
    const [x1, y1, x2, y2] = m.slice(1).map(Number) as [number, number, number, number]
    for (const x of [x1, x2]) if (x < 0 || x > 297) return false
    for (const y of [y1, y2]) if (y < 0 || y > 210) return false
  }
  return true
}

describe('sheetFor', () => {
  it('fills an empty title block with the tab title and today', async () => {
    const doc = boxDoc(40, 30, 20)
    const sheet = sheetFor(doc, evaluateDocument(doc, await sharedKernel()), LABELS, {
      title: 'Pencil holder',
      today: '2026-11-16',
    })
    expect(sheet.svg).toContain('Pencil holder')
    expect(sheet.svg).toContain('2026-11-16')
    expect(sheet.rows).toEqual([{ name: 'Part', width: '40', depth: '30', height: '20' }])
    // the drawing's own title block wins over the fill
    const titled = { ...doc, title: { name: 'Bracket', date: '2026-01-02', scale: '' } }
    const own = sheetFor(titled, evaluateDocument(titled, await sharedKernel()), LABELS, {
      title: 'Pencil holder',
      today: '2026-11-16',
    })
    expect(own.svg).toContain('Bracket')
    expect(own.svg).toContain('2026-01-02')
    expect(own.svg).not.toContain('Pencil holder')
  })

  it('a 1 km room and a 1 mm pin both pick a scale from the list', async () => {
    const k = await sharedKernel()
    for (const doc of [boxDoc(1_000_000, 1_000_000, 1_000_000), boxDoc(1, 1, 1)]) {
      const sheet = sheetFor(doc, evaluateDocument(doc, k), LABELS, { title: 'x', today: 'y' })
      expect(STANDARD_SCALES).toContain(sheet.scale)
      expect(sheet.widthMm).toBe(297)
      expect(sheet.heightMm).toBe(210)
      expect(drawnInsidePage(sheet.svg), `${sheet.scale} stays on A4`).toBe(true)
    }
  })
})

describe('svgToPng', () => {
  it('hands the sheet and an A4-shaped pixel size to the rasterizer', async () => {
    const rasterize = vi.fn(async () => new Uint8Array([...PNG, 1, 2, 3]))
    const png = await svgToPng('<svg/>', 2970, rasterize)
    expect(rasterize).toHaveBeenCalledWith('<svg/>', 2970, 2100)
    expect([...png.slice(0, 8)]).toEqual(PNG)
  })

  it('refuses bytes that are not PNG', async () => {
    await expect(svgToPng('<svg/>', 1000, async () => new Uint8Array([1, 2, 3]))).rejects.toThrow()
  })
})

describe('fitUnder', () => {
  it('halves the width until under the limit and gives up below 1024', async () => {
    const widths: number[] = []
    // bytes grow with the square of the width, like a picture
    const render = async (w: number): Promise<Uint8Array> => {
      widths.push(w)
      return new Uint8Array(Math.round((w * w) / 100))
    }
    const fitted = await fitUnder(50_000, render)
    expect(widths).toEqual([SHEET_PNG_WIDTH, SHEET_PNG_WIDTH / 2])
    expect(fitted!.length).toBeLessThanOrEqual(50_000)

    widths.length = 0
    expect(await fitUnder(10, render)).toBeNull()
    // never narrower than the floor, and the floor itself is tried once
    expect(Math.min(...widths)).toBe(MIN_PNG_WIDTH)
    expect(widths.filter((w) => w === MIN_PNG_WIDTH)).toHaveLength(1)
    expect(widths[0]).toBe(SHEET_PNG_WIDTH)
  })
})

describe('todayIso', () => {
  it('is the local date as yyyy-mm-dd', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
