/**
 * The PhotoCraft adapter against a fake page shaped like the real 0.20.2-h1 web
 * build (answers recorded 2026-11-05 in the built app):
 * - `inspect()` has `session.documents[session.active]` with {dirty, name, path, revision}
 *   and `document` with {name, width, height, history, layers, selectedLayers, hasSelection}
 * - `request('app.save', {path})` writes PSD as a real save (clean, renamed) and
 *   PNG/JPEG as a flat copy (name and dirty mark unchanged)
 * - `edit.undo` throws when there is nothing left to undo
 */
import { describe, expect, it } from 'vitest'
import { createAdapter } from '../src/renderer/adapters'
import type { GraphicsPageApi } from '../src/renderer/frame/page-api'

interface Layer {
  id: number
  name: string
  kind: string
  hasMask?: boolean
  hasVectorMask?: boolean
  text?: { text: string }
}

class FakePhotoPage {
  doc: {
    name: string
    dirty: boolean
    revision: number
    history: string[]
    layers: Layer[]
    selectedLayers: number[]
    hasSelection: boolean
  } | null = null
  /** a second document in front (a smart object's contents, a duplicate): clean */
  second: { name: string; dirty: boolean } | null = null
  captured = new Map<string, Uint8Array>()
  capturing = false
  requests: Array<[string, Record<string, unknown>]> = []
  /** h4 answers `app.exportImage {format: 'psd'}`; h3 refuses it */
  psdExport = false
  executed: string[] = []

  open(): this {
    this.doc = {
      name: 'Untitled',
      dirty: false,
      revision: 1,
      history: ['Open'],
      layers: [{ id: 2, name: 'Background', kind: 'Pixel' }],
      selectedLayers: [2],
      hasSelection: false,
    }
    return this
  }

  edit(label: string): void {
    const d = this.doc!
    d.history.push(label)
    d.revision += 1
    d.dirty = true
  }

  api(): GraphicsPageApi {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const page = this
    return {
      async request(method: string, params: Record<string, unknown> = {}) {
        page.requests.push([method, params])
        if (method === 'app.exportImage') {
          // h2: the composited image, no file, no save, no status line
          if (!page.doc) throw new Error('no document')
          const fmt = String(params.format ?? 'png')
          if (fmt === 'psd') {
            if (!page.psdExport) throw new Error('format must be png or jpeg')
            return { dataBase64: btoa('PSD'), format: 'psd' }
          }
          return {
            dataBase64: btoa(fmt === 'jpeg' ? 'JPG' : 'PNG'),
            width: 400,
            height: 300,
            format: fmt,
          }
        }
        if (method !== 'app.save') throw new Error(`unknown method ${method}`)
        const path = String(params.path)
        if (!page.doc) throw new Error('no document')
        page.captured.set(path, new Uint8Array([path.length, 1, 2]))
        if (/\.(psd|psb)$/i.test(path)) {
          page.doc.dirty = false
          page.doc.name = path
        }
        return { path, warnings: [] }
      },
      async execute(id: string) {
        page.executed.push(id)
        if (id === 'edit.undo') {
          const d = page.doc
          if (!d || d.history.length <= 1) throw new Error('nothing to undo')
          d.history.pop()
          d.revision += 1
          return true
        }
        return null
      },
      async commands() {
        return []
      },
      async inspect() {
        const d = page.doc
        return {
          session: d
            ? {
                active: page.second ? 1 : 0,
                documents: [
                  { dirty: d.dirty, name: d.name, path: null, revision: d.revision, index: 0 },
                  ...(page.second ? [{ ...page.second, path: null, revision: 1, index: 1 }] : []),
                ],
              }
            : { active: null, documents: [] },
          document: d
            ? {
                name: d.name,
                width: 400,
                height: 300,
                history: [...d.history],
                layers: d.layers,
                selectedLayers: d.selectedLayers,
                hasSelection: d.hasSelection,
              }
            : null,
        }
      },
      async screenshot() {
        return {}
      },
      async openFile() {
        return true
      },
      captureDownloads(on: boolean) {
        page.capturing = on
      },
      async files() {
        return [...page.captured].map(([path, b]) => ({ path, size: b.length }))
      },
      async readFile(path: string) {
        const bytes = page.captured.get(path)
        if (!bytes) throw new Error(`${path}: not found`)
        return bytes
      },
    } as unknown as GraphicsPageApi
  }
}

const photo = (page: FakePhotoPage) => createAdapter('photo', page.api())

describe('the PhotoCraft adapter', () => {
  it('docInfo reports no document on the start screen, then the active one', async () => {
    const page = new FakePhotoPage()
    const adapter = photo(page)
    expect(await adapter.docInfo()).toEqual({ hasDocument: false, dirty: false, title: null })
    page.open().edit('Fill')
    expect(await adapter.docInfo()).toEqual({ hasDocument: true, dirty: true, title: 'Untitled' })
  })

  it('afterReady turns capture on', async () => {
    const page = new FakePhotoPage()
    await photo(page).afterReady()
    expect(page.capturing).toBe(true)
  })

  it('saveBytes saves through app.save and returns a copy of the captured bytes', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    const adapter = photo(page)
    const bytes = await adapter.saveBytes('poster.psd', 'psd')
    expect(page.requests).toEqual([['app.save', { path: 'poster.psd' }]])
    expect(Array.from(bytes)).toEqual([10, 1, 2])
    bytes[0] = 99
    expect(page.captured.get('poster.psd')![0]).toBe(10)
    expect(await adapter.docInfo()).toEqual({
      hasDocument: true,
      dirty: false,
      title: 'poster.psd',
    })
  })

  it('a flat save (PNG) leaves the app marked changed: the tab reads it clean until the next edit', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    const adapter = photo(page)
    await adapter.saveBytes('photo.png', 'png')
    expect(page.doc!.dirty).toBe(true)
    expect(await adapter.docInfo()).toEqual({ hasDocument: true, dirty: false, title: 'photo.png' })
    page.edit('Auto Tone')
    expect(await adapter.docInfo()).toEqual({ hasDocument: true, dirty: true, title: 'photo.png' })
  })

  it('exportBytes asks for the composited image: no file is written, nothing is saved', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    const adapter = photo(page)
    expect(new TextDecoder().decode(await adapter.exportBytes('png'))).toBe('PNG')
    expect(page.requests[0]).toEqual(['app.exportImage', { format: 'png' }])
    expect(new TextDecoder().decode(await adapter.exportBytes('jpg'))).toBe('JPG')
    expect(page.requests[1]![1]).toMatchObject({ format: 'jpeg' })
    expect(page.captured.size).toBe(0)
    expect(await adapter.docInfo()).toEqual({ hasDocument: true, dirty: true, title: 'Untitled' })
    await expect(adapter.exportBytes('svg')).rejects.toThrow(/SVG/)
  })

  it('the canvas picture for the AI comes scaled down by the app itself', async () => {
    const page = new FakePhotoPage().open()
    await photo(page).snapshotPng(1024)
    expect(page.requests[0]).toEqual(['app.exportImage', { format: 'png', maxSide: 1024 }])
    expect(page.captured.size).toBe(0)
  })

  it('isLayered: more than one layer, a type layer, a mask or a non-pixel layer', async () => {
    const page = new FakePhotoPage().open()
    const adapter = photo(page)
    expect(await adapter.isLayered()).toBe(false)
    page.doc!.layers = [{ id: 2, name: 'Background', kind: 'Pixel', hasMask: true }]
    expect(await adapter.isLayered()).toBe(true)
    page.doc!.layers = [{ id: 3, name: 'Hello', kind: 'Type' }]
    expect(await adapter.isLayered()).toBe(true)
    page.doc!.layers = [
      { id: 3, name: 'A', kind: 'Pixel' },
      { id: 2, name: 'Background', kind: 'Pixel' },
    ]
    expect(await adapter.isLayered()).toBe(true)
  })

  it('historyLength reads the document history; undo stops at the first refusal', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    page.edit('Auto Tone')
    const adapter = photo(page)
    expect(await adapter.historyLength()).toBe(3)
    expect(await adapter.undo(5)).toBe(2)
    expect(await adapter.historyLength()).toBe(1)
  })

  it('snapshotPng is null without a document', async () => {
    expect(await photo(new FakePhotoPage()).snapshotPng(1024)).toBeNull()
  })

  it('contextSummary names the picture, its size, layers and selection, briefly', async () => {
    const page = new FakePhotoPage().open()
    page.doc!.layers = [
      { id: 3, name: 'Title', kind: 'Type', text: { text: '안녕하세요 한판' } },
      ...Array.from({ length: 80 }, (_, i) => ({ id: 10 + i, name: `Layer ${i}`, kind: 'Pixel' })),
    ]
    page.doc!.selectedLayers = [3]
    const text = await photo(page).contextSummary()
    expect(text).toContain('"Untitled"')
    expect(text).toContain('400 × 300')
    expect(text).toContain('Title')
    expect(text).toContain('안녕하세요 한판')
    expect(text).toMatch(/Selected layers?: .*#3/)
    expect(text.length).toBeLessThanOrEqual(2000)
  })

  it('placeImage is not offered (the web build has no place from bytes)', async () => {
    const page = new FakePhotoPage().open()
    await expect(photo(page).placeImage('cat.png', new Uint8Array([1]))).rejects.toThrow(/AI Photo/)
  })

  it('follows the tab own document while another one is in front', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    page.second = { name: 'Layer 1.psb', dirty: false }
    const adapter = photo(page)
    // the picture's own changes still count, and its name stays the tab's
    expect(await adapter.docInfo()).toEqual({ hasDocument: true, dirty: true, title: 'Untitled' })
    page.doc!.dirty = false
    page.second.dirty = true
    expect((await adapter.docInfo()).dirty).toBe(true)
  })

  it('refuses to save while another document is in front (it would go over the picture file)', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    page.second = { name: 'Layer 1.psb', dirty: true }
    await expect(photo(page).saveBytes('poster.psd', 'psd')).rejects.toThrow(/another document/)
    expect(page.requests).toEqual([])
  })
})

describe('the recovery copy', () => {
  it('is the layered PSD when the web build gives one, and leaves the document alone', async () => {
    const page = new FakePhotoPage().open()
    page.psdExport = true
    page.edit('Fill')
    const copy = await photo(page).recoveryBytes()
    expect(copy && { text: new TextDecoder().decode(copy.bytes), ext: copy.ext }).toEqual({
      text: 'PSD',
      ext: 'psd',
    })
    expect(page.requests).toEqual([['app.exportImage', { format: 'psd' }]])
    expect(page.captured.size).toBe(0)
    expect(page.doc!.dirty).toBe(true)
  })

  it('falls back to the flattened PNG on a build without PSD export', async () => {
    const page = new FakePhotoPage().open()
    page.edit('Fill')
    const copy = await photo(page).recoveryBytes()
    expect(copy && { text: new TextDecoder().decode(copy.bytes), ext: copy.ext }).toEqual({
      text: 'PNG',
      ext: 'png',
    })
    expect(page.doc!.dirty).toBe(true)
  })

  it('is null without a document', async () => {
    expect(await photo(new FakePhotoPage()).recoveryBytes()).toBeNull()
  })
})
