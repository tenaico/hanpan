import { describe, expect, it } from 'vitest'
import { evaluateDocument } from '../src/evaluate'
import { openCadFile, saveCadFile } from '../src/file'
import { CadHistory } from '../src/history'
import { partSize } from '../src/measure'
import { makeMesh } from '../src/mesh'
import { CadEditError, createDocument } from '../src/model'
import type { CadDocument, Part, PartRole, Vec3 } from '../src/model'
import { addShape, groupParts, setWorkplane, updatePart } from '../src/ops'
import { makeSheet } from '../src/sheet'
import { cube, sharedKernel } from './helpers'

const LABELS = { front: 'F', top: 'T', side: 'S', title: 'Title', date: 'Date', scale: 'Scale' }

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (error) {
    if (error instanceof CadEditError) return error.code
    throw error
  }
  return undefined
}

describe('edits never produce a document that cannot be saved and reopened', () => {
  const base = addShape(createDocument(), 'box')

  it.each([
    ['a number as name', { name: 5 as unknown as string }],
    ['an unknown role', { role: 'foo' as PartRole }],
    ['a null colour', { color: null as unknown as string }],
    ['a colour that is not #rrggbb', { color: 'red' }],
    ['a string as hidden', { hidden: 'yes' as unknown as boolean }],
    ['a string as locked', { locked: 'no' as unknown as boolean }],
  ])('rejects %s', (_what, patch) => {
    expect(codeOf(() => updatePart(base.doc, base.id, patch))).toBe('bad-number')
  })

  it('rejects text outlines with a non-finite number', () => {
    expect(
      codeOf(() =>
        addShape(createDocument(), 'text', {
          text: { value: 'A', outlines: [[0, 0, Number.NaN, 0, 1, 1]] },
        }),
      ),
    ).toBe('bad-number')
  })

  it('refuses to save a document that would not reopen', () => {
    const bad = {
      ...base.doc,
      parts: base.doc.parts.map((p): Part => ({ ...p, position: [Number.NaN, 0, 0] as Vec3 })),
    }
    expect(() => saveCadFile(bad)).toThrow()
  })

  it('still saves and reopens a normal document', () => {
    expect(openCadFile(saveCadFile(base.doc)).status).toBe('ok')
  })
})

describe('sizes stay in a range the mesh can hold', () => {
  it.each([1e39, 1e7, 1e-46, 1e-4])('rejects a width of %s mm', (width) => {
    expect(codeOf(() => addShape(createDocument(), 'box', { dims: { width } }))).toBe('bad-number')
  })

  it('accepts a 5 m room and a 1 mm pin', () => {
    expect(() => addShape(createDocument(), 'box', { dims: { width: 5000 } })).not.toThrow()
    expect(() => addShape(createDocument(), 'cylinder', { dims: { diameter: 1 } })).not.toThrow()
  })

  it('rejects positions and workplanes beyond a kilometre', () => {
    expect(codeOf(() => addShape(createDocument(), 'box', { position: [2e6, 0, 0] }))).toBe(
      'bad-number',
    )
    expect(codeOf(() => setWorkplane(createDocument(), { width: 2e6 }))).toBe('bad-number')
  })
})

describe('the sheet ignores parts with nothing to draw', () => {
  it('keeps the overall size of the real model when an empty group sits elsewhere', async () => {
    const kernel = await sharedKernel()
    const box = addShape(createDocument(), 'box', { position: [100, 100, 0] })
    const h1 = addShape(box.doc, 'cylinder', { role: 'hole' })
    const h2 = addShape(h1.doc, 'cone', { role: 'hole' })
    const g = groupParts(h2.doc, [h1.id, h2.id])
    const doc: CadDocument = g.doc
    const evaluated = evaluateDocument(doc, kernel)
    const sheet = makeSheet(doc, evaluated, LABELS)
    const texts = [...sheet.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1])
    expect(texts).toContain('20')
    expect(texts).not.toContain('110')
    expect(sheet.rows).toHaveLength(1)
  })

  it('gives no size for a mesh without triangles', () => {
    expect(partSize({ mesh: makeMesh([], []) })).toBeNull()
  })
})

describe('the sheet SVG is always well-formed XML', () => {
  it('drops control characters and lone surrogates from text', () => {
    const added = addShape(createDocument(), 'box', { name: 'A\u0001B\uD800C' })
    const doc = { ...added.doc, title: { name: 'T\u0007', date: '', scale: '' } }
    const { svg } = makeSheet(doc, [{ id: added.id, mesh: cube([0, 0, 0], [20, 20, 20]) }], LABELS)
    // eslint-disable-next-line no-control-regex -- looking for control chars is the point here
    expect(svg).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/)
    expect(svg).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/)
  })
})

describe('undo during an AI request', () => {
  it('keeps the rest of the request as one step', () => {
    const start = createDocument()
    const h = new CadHistory(start)
    const widen = (d: CadDocument) => setWorkplane(d, { width: d.workplane.width + 1 })
    h.openGroup('ai')
    h.edit('a', widen)
    h.edit('b', widen)
    h.undo()
    expect(h.current()).toBe(start)
    h.edit('c', widen)
    h.edit('d', widen)
    h.closeGroup()
    expect(h.current().workplane.width).toBe(202)
    h.undo()
    expect(h.current()).toBe(start)
  })
})
