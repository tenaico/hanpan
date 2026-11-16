// @vitest-environment node
/**
 * Export: the visible top-level results of the drawing merged into one STL or
 * OBJ file, and the picture of the 3D view as PNG. A drawing with nothing to
 * export is refused with a notice instead of an empty file.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  addPart,
  addShape,
  createDocument,
  createKernel,
  evaluateDocument,
  groupParts,
  meshVolume,
  newId,
  readObj,
  readStl,
  updatePart,
  type CadDocument,
  type Kernel,
} from '@genoffice/cad-engine'
import { exportObj, exportPng, exportStl } from '../src/renderer/export/export'
import { runExport, type CadExportSource } from '../src/renderer/export/use-export'
import type { ExportFileRequest, ExportResult } from '../src/shared/ipc'

let kernel: Promise<Kernel> | undefined
const sharedKernel = (): Promise<Kernel> => (kernel ??= createKernel())

/** A 10 mm box with a d = 4 cylinder hole through it, grouped. */
function drilledBox(doc: CadDocument): CadDocument {
  const a = addShape(doc, 'box', { dims: { width: 10, depth: 10, height: 10 } })
  const b = addShape(a.doc, 'cylinder', {
    role: 'hole',
    dims: { diameter: 4, height: 12 },
    position: [0, 0, -1],
  })
  return groupParts(b.doc, [a.id, b.id]).doc
}

/** The box less a d = 4 cylinder 10 mm long; the engine's cylinder is a fine prism. */
const HOLE_VOLUME = 1000 - Math.PI * 4 * 10

describe('export', () => {
  it('export STL of a box with a hole reopens with readStl and has the hole volume', async () => {
    const doc = drilledBox(createDocument())
    const evaluated = evaluateDocument(doc, await sharedKernel())
    const out = exportStl(doc, evaluated)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const read = readStl(out.bytes)
    expect(read.status).toBe('ok')
    if (read.status !== 'ok') return
    expect(read.closed).toBe(true)
    expect(Math.abs(meshVolume(read.mesh) - HOLE_VOLUME)).toBeLessThan(1)
  })

  it('export OBJ joins the visible top-level parts and leaves hidden ones out', async () => {
    let doc = createDocument()
    const a = addShape(doc, 'box', { dims: { width: 10, depth: 10, height: 10 } })
    const b = addShape(a.doc, 'box', {
      dims: { width: 2, depth: 2, height: 2 },
      position: [30, 0, 0],
    })
    const c = addShape(b.doc, 'box', {
      dims: { width: 5, depth: 5, height: 5 },
      position: [60, 0, 0],
    })
    doc = updatePart(c.doc, c.id, { hidden: true })
    const evaluated = evaluateDocument(doc, await sharedKernel())
    const out = exportObj(doc, evaluated)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const read = readObj(out.bytes)
    expect(read.status === 'ok' && meshVolume(read.mesh)).toBeCloseTo(1000 + 8, 3)
  })

  it('results that do not belong to a visible top-level part are not exported', async () => {
    const a = addShape(createDocument(), 'box', { dims: { width: 10, depth: 10, height: 10 } })
    const doc = updatePart(a.doc, a.id, { hidden: true })
    // results evaluated before the part was hidden
    const stale = evaluateDocument(a.doc, await sharedKernel())
    expect(exportStl(doc, stale)).toEqual({ ok: false, notice: 'exportEmpty' })
  })

  it('a drawing with nothing to export is refused with a notice', async () => {
    const k = await sharedKernel()
    const empty = createDocument()
    expect(exportStl(empty, evaluateDocument(empty, k))).toEqual({
      ok: false,
      notice: 'exportEmpty',
    })
    // a DXF drawing has no solid to export
    const drawing = addPart(createDocument(), {
      id: newId(),
      type: 'drawing',
      name: 'plan',
      role: 'solid',
      color: '#000000',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      hidden: false,
      locked: false,
      entities: [{ kind: 'line', a: [0, 0], b: [10, 0], layer: '0' }],
    })
    expect(exportObj(drawing, evaluateDocument(drawing, k))).toEqual({
      ok: false,
      notice: 'exportEmpty',
    })
  })

  it('PNG is the picture the 3D view takes', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const snapshot = vi.fn(async () => png)
    expect(await exportPng({ snapshot })).toBe(png)
    expect(snapshot).toHaveBeenCalledTimes(1)
  })
})

describe('a menu export request', () => {
  async function source(doc: CadDocument, png?: Uint8Array): Promise<CadExportSource> {
    const evaluated = evaluateDocument(doc, await sharedKernel())
    return {
      document: () => doc,
      evaluated: () => evaluated,
      pngSource: () => (png ? { snapshot: async () => png } : null),
      suggestedName: () => 'Bracket',
    }
  }
  const api = (result: ExportResult) => ({
    exportFile: vi.fn(async (_request: ExportFileRequest) => result),
  })

  it('hands the bytes and the drawing name to the main process', async () => {
    const box = addShape(createDocument(), 'box', { dims: { width: 10, depth: 10, height: 10 } })
    const main = api({ ok: true, path: '/x/Bracket.stl' })
    expect(await runExport('stl', await source(box.doc), main)).toBeNull()
    const request = main.exportFile.mock.calls[0]![0]
    expect(request.format).toBe('stl')
    expect(request.suggestedName).toBe('Bracket')
    const read = readStl(request.bytes)
    expect(read.status === 'ok' && meshVolume(read.mesh)).toBeCloseTo(1000, 3)
  })

  it('says why when there is nothing to export, without asking where', async () => {
    const main = api({ ok: true, path: '/x' })
    expect(await runExport('obj', await source(createDocument()), main)).toBe('exportEmpty')
    expect(main.exportFile).not.toHaveBeenCalled()
  })

  it('takes the picture for PNG; without a 3D view it says the export failed', async () => {
    const png = new Uint8Array([0x89, 0x50])
    const main = api({ ok: true, canceled: true })
    expect(await runExport('png', await source(createDocument(), png), main)).toBeNull()
    expect(main.exportFile.mock.calls[0]![0].bytes).toBe(png)
    expect(await runExport('png', await source(createDocument()), main)).toBe('exportFailed')
  })

  it('turns the refusals of the main process into notices', async () => {
    const box = addShape(createDocument(), 'box', {})
    const from = await source(box.doc)
    expect(await runExport('stl', from, api({ ok: false, error: 'source-path' }))).toBe(
      'exportSourcePath',
    )
    expect(await runExport('stl', from, api({ ok: false, error: 'write-failed' }))).toBe(
      'exportFailed',
    )
    const broken = { exportFile: vi.fn(async () => Promise.reject(new Error('gone'))) }
    expect(await runExport('stl', from, broken)).toBe('exportFailed')
  })
})
