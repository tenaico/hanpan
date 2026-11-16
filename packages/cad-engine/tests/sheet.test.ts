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
    [1e9, 120, '1:1000'],
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

  it('picks a smaller scale for a big model', () => {
    const added = addShape(createDocument(), 'box', { dims: { width: 4000, depth: 2000 } })
    const sheet = makeSheet(
      added.doc,
      [{ id: added.id, mesh: cube([0, 0, 0], [4000, 2000, 20]) }],
      LABELS,
    )
    expect(sheet.scale).toBe('1:50')
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
