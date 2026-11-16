import { describe, expect, it } from 'vitest'
import { createDocument } from '../src/model'
import type { CadDocument, DrawingPart, Mesh, Part } from '../src/model'
import { addShape, updatePart } from '../src/ops'
import { chooseScale, makeSheet } from '../src/sheet'
import { viewOutline } from '../src/silhouette'
import type { SheetLabels } from '../src/sheet'
import { cube } from './helpers'

const LABELS: SheetLabels = {
  front: 'Front',
  top: 'Top',
  side: 'Side',
  title: 'Title',
  date: 'Date',
  scale: 'Scale',
}

function texts(svg: string): string[] {
  return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!)
}

/** A document with one box part and its evaluated mesh, as the evaluator would hand them over. */
function boxDoc(): { doc: CadDocument; evaluated: { id: string; mesh: Mesh | null }[] } {
  const added = addShape(createDocument(), 'box', {
    name: 'Base',
    dims: { width: 40, depth: 20, height: 10 },
  })
  return { doc: added.doc, evaluated: [{ id: added.id, mesh: cube([-20, -10, 0], [20, 10, 10]) }] }
}

function drawingPart(): DrawingPart {
  return {
    id: 'dwg',
    type: 'drawing',
    name: 'Plan',
    role: 'solid',
    color: '#000000',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    entities: [{ kind: 'line', a: [0, 0], b: [100, 50], layer: '0' }],
  }
}

describe('chooseScale', () => {
  it.each([
    [100, 120, '1:1'],
    [5000, 120, '1:50'],
    [10, 120, '10:1'],
    [50, 120, '2:1'],
    [1e6, 120, '1:10000'],
    [1e9, 120, '1:50000'],
  ])('fits %s mm into %s mm at %s', (size, room, label) => {
    expect(chooseScale(size, room).label).toBe(label)
  })
})

describe('viewOutline', () => {
  it('draws a box seen from above as four lines', () => {
    expect(viewOutline(cube([0, 0, 0], [10, 20, 5]), 'top')).toHaveLength(4)
  })

  it('draws the front of a box as four lines in x and z', () => {
    const segs = viewOutline(cube([0, 0, 0], [10, 20, 5]), 'front')
    expect(segs).toHaveLength(4)
    const xs = segs.flatMap((s) => [s[0]!, s[2]!])
    const ys = segs.flatMap((s) => [s[1]!, s[3]!])
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(10)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(5)
  })
})

describe('makeSheet', () => {
  it('draws three views with overall dimensions and a title block', () => {
    const { doc, evaluated } = boxDoc()
    const titled = { ...doc, title: { name: 'Pencil holder', date: '2026-11-16', scale: '' } }
    const sheet = makeSheet(titled, evaluated, LABELS)
    expect(sheet.widthMm).toBe(297)
    expect(sheet.heightMm).toBe(210)
    expect(sheet.svg.startsWith('<svg')).toBe(true)
    expect(sheet.svg).toContain('viewBox="0 0 297 210"')
    const t = texts(sheet.svg)
    for (const label of ['Front', 'Top', 'Side', '40', '20', '10', 'Pencil holder', '2026-11-16'])
      expect(t, label).toContain(label)
    expect(t).toContain(sheet.scale)
    expect(sheet.rows).toEqual([{ name: 'Base', width: '40', depth: '20', height: '10' }])
  })

  it('draws text without an outline stroke and gives every shape a line width', () => {
    const doc: CadDocument = { ...createDocument(), parts: [drawingPart()] }
    const withCircle: CadDocument = {
      ...doc,
      parts: [
        {
          ...drawingPart(),
          entities: [
            ...drawingPart().entities,
            { kind: 'circle', center: [50, 25], radius: 10, layer: '0' },
            { kind: 'polyline', points: [0, 0, 10, 0, 10, 10], closed: true, layer: '0' },
          ],
        },
      ],
    }
    const { svg } = makeSheet(withCircle, [{ id: 'dwg', mesh: null }], LABELS)
    for (const tag of svg.match(/<text [^>]*>/g)!) expect(tag).toContain('stroke="none"')
    for (const tag of svg.match(/<(?:circle|path) [^>]*>/g)!) expect(tag).toMatch(/stroke-width="/)
  })

  it('keeps the view label clear of the width dimension under the front view', () => {
    const { doc, evaluated } = boxDoc()
    const { svg } = makeSheet(doc, evaluated, LABELS)
    const y = (value: string) =>
      Number(new RegExp(`<text [^>]* y="([0-9.]+)"[^>]*>${value}</text>`).exec(svg)![1])
    // the label top (baseline minus the 3.5 mm font) sits at least 1 mm under the dimension line
    expect(y('Front') - y('40')).toBeGreaterThanOrEqual(6)
  })

  it('centres the views on the drawing area', () => {
    const { doc, evaluated } = boxDoc()
    const { svg } = makeSheet(doc, evaluated, LABELS)
    // view and dimension lines: everything above the title block, minus the frame
    const xs = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)]
      .filter((m) => Number(m[2]) < 170 && Number(m[4]) < 170)
      .flatMap((m) => [Number(m[1]), Number(m[3])])
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2
    expect(Math.abs(mid - 148.5)).toBeLessThan(10)
  })

  it('picks a smaller scale for a big model', () => {
    const added = addShape(createDocument(), 'box', { dims: { width: 4000, depth: 2000 } })
    const sheet = makeSheet(
      added.doc,
      [{ id: added.id, mesh: cube([0, 0, 0], [4000, 2000, 20]) }],
      LABELS,
    )
    expect(sheet.scale).toBe('1:50')
  })

  it('keeps a 1 km model on the A4 page', () => {
    const added = addShape(createDocument(), 'box')
    const size = 1_000_000
    const sheet = makeSheet(
      added.doc,
      [{ id: added.id, mesh: cube([0, 0, 0], [size, size, size]) }],
      LABELS,
    )
    expect(sheet.scale).toBe('1:20000')
    for (const m of sheet.svg.matchAll(
      /<line x1="([-\d.e]+)" y1="([-\d.e]+)" x2="([-\d.e]+)" y2="([-\d.e]+)"/g,
    )) {
      const [x1, y1, x2, y2] = m.slice(1).map(Number)
      for (const x of [x1!, x2!]) expect(x).toBeGreaterThanOrEqual(0)
      for (const x of [x1!, x2!]) expect(x).toBeLessThanOrEqual(297)
      for (const y of [y1!, y2!]) expect(y).toBeGreaterThanOrEqual(0)
      for (const y of [y1!, y2!]) expect(y).toBeLessThanOrEqual(210)
    }
  })

  it('escapes the title', () => {
    const { doc, evaluated } = boxDoc()
    const sheet = makeSheet(
      { ...doc, title: { name: 'A & <B>', date: '', scale: '' } },
      evaluated,
      LABELS,
    )
    expect(sheet.svg).toContain('A &amp; &lt;B&gt;')
    expect(sheet.svg).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/)
  })

  it('draws a drawing-only document from above with its width and depth', () => {
    const doc: CadDocument = { ...createDocument(), parts: [drawingPart()] }
    const sheet = makeSheet(doc, [{ id: 'dwg', mesh: null }], LABELS)
    const t = texts(sheet.svg)
    expect(t).toContain('100')
    expect(t).toContain('50')
    expect(t).toContain('Top')
    expect(t).not.toContain('Side')
    expect(t).not.toContain('Front')
    expect(sheet.rows).toEqual([])
  })

  it('gives only the title block for an empty document', () => {
    const sheet = makeSheet(createDocument(), [], LABELS)
    expect(sheet.rows).toEqual([])
    expect(texts(sheet.svg)).not.toContain('Front')
    expect(sheet.scale).toBe('1:1')
  })

  it('leaves hidden parts and lone holes out of the table', () => {
    const { doc, evaluated } = boxDoc()
    const hole = addShape(doc, 'cylinder', { role: 'hole' })
    const hidden = addShape(hole.doc, 'box', { name: 'Hidden' })
    const parts: Part[] = updatePart(hidden.doc, hidden.id, { hidden: true }).parts
    const sheet = makeSheet(
      { ...doc, parts },
      [
        ...evaluated,
        { id: hole.id, mesh: cube([0, 0, 0], [5, 5, 5]) },
        { id: hidden.id, mesh: cube([0, 0, 0], [5, 5, 5]) },
      ],
      LABELS,
    )
    expect(sheet.rows.map((r) => r.name)).toEqual(['Base'])
  })
})
