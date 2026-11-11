import { describe, expect, it } from 'vitest'
import { createAdapter } from '../src/renderer/adapters'
import { FakePage } from './helpers/fake-page'

/** file.save as the official build answers it: the bytes land in files(), the document turns clean. */
function savingPage(bytes: Uint8Array): FakePage {
  const page = new FakePage().withDocument('Untitled-1', true)
  page.handlers['file.save'] = (params, p) => {
    const path = String(params.path)
    p.captured.set(path, bytes)
    p.documents[0] = { title: path, dirty: false }
    return { path, bytes: bytes.length, format: path.split('.').pop(), warnings: [] }
  }
  return page
}

describe('the illustration adapter', () => {
  it('saveBytes saves through file.save and returns a copy of the captured bytes', async () => {
    const shared = new Uint8Array([1, 2, 3, 4])
    const page = savingPage(shared)
    const adapter = createAdapter('illust', page)
    const saved = await adapter.saveBytes('logo.vectorcraft', 'vectorcraft')
    shared[0] = 99 // the app reuses its memory after the call
    expect([...saved]).toEqual([1, 2, 3, 4])
    expect(page.executed).toEqual([['file.save', { path: 'logo.vectorcraft' }]])
    expect(await adapter.docInfo()).toEqual({
      hasDocument: true,
      dirty: false,
      title: 'logo.vectorcraft',
    })
  })

  it('saveBytes passes svg options for .svg and options for .ai', async () => {
    const page = savingPage(new Uint8Array([1]))
    const adapter = createAdapter('illust', page)
    await adapter.saveBytes('a.svg', 'svg')
    await adapter.saveBytes('a.svgz', 'svgz')
    await adapter.saveBytes('a.ai', 'ai')
    expect(page.executed.map(([, p]) => p)).toEqual([
      { path: 'a.svg', svg: {} },
      { path: 'a.svgz', svg: {} },
      { path: 'a.ai', options: {} },
    ])
  })

  it('saveCopyBytes writes a copy through file.saveCopy and leaves the document as it is', async () => {
    const page = savingPage(new Uint8Array([9]))
    // the engine may name the copy differently from the name asked for
    page.handlers['file.saveCopy'] = (params, p) => {
      const path = `${String(params.path).replace(/\.ai$/, '')} copy.ai`
      p.captured.set(path, new Uint8Array([5, 6, 7]))
      return { path, bytes: 3, format: 'ai', warnings: [] }
    }
    const adapter = createAdapter('illust', page)
    const before = await adapter.docInfo()
    const bytes = await adapter.saveCopyBytes!('logo.ai', 'ai')
    expect([...bytes]).toEqual([5, 6, 7])
    expect(page.executed).toEqual([['file.saveCopy', { path: 'logo.ai', options: {} }]])
    expect(await adapter.docInfo()).toEqual(before)
    expect(before).toEqual({ hasDocument: true, dirty: true, title: 'Untitled-1' })
  })

  it('a write the app has not done (a dialog asks first) is a failure, not stale bytes', async () => {
    // an opened drawing.ai: writing over it asks before losing what the import dropped
    const page = savingPage(new Uint8Array([1]))
    page.captured.set('drawing.ai', new Uint8Array([4, 4, 4]))
    page.handlers['file.saveCopy'] = () => ({ pending: 'confirm' })
    page.handlers['file.save'] = () => ({ pending: 'confirm' })
    const adapter = createAdapter('illust', page)
    await expect(adapter.saveCopyBytes!('drawing.ai', 'ai')).rejects.toThrow(/pending|not written/)
    await expect(adapter.saveBytes('drawing.ai', 'ai')).rejects.toThrow(/pending|not written/)
  })

  it('an answer without the written path or size is a failure', async () => {
    const page = savingPage(new Uint8Array([1]))
    page.captured.set('a.ai', new Uint8Array([4, 4, 4]))
    const adapter = createAdapter('illust', page)
    page.handlers['file.saveCopy'] = () => ({ bytes: 3, format: 'ai' })
    await expect(adapter.saveCopyBytes!('a.ai', 'ai')).rejects.toThrow(/no path/)
    page.handlers['file.saveCopy'] = () => ({ path: 'a.ai', format: 'ai' })
    await expect(adapter.saveCopyBytes!('a.ai', 'ai')).rejects.toThrow(/no size/)
    page.handlers['file.saveCopy'] = () => null
    await expect(adapter.saveCopyBytes!('a.ai', 'ai')).rejects.toThrow(/no path/)
  })

  it('saveBytes fails when the captured size differs from what the app reported', async () => {
    const page = savingPage(new Uint8Array([1, 2]))
    page.handlers['file.save'] = (params, p) => {
      p.captured.set(String(params.path), new Uint8Array([1, 2]))
      return { path: params.path, bytes: 5, format: 'svg', warnings: [] }
    }
    await expect(createAdapter('illust', page).saveBytes('a.svg', 'svg')).rejects.toThrow(
      /capture size mismatch/,
    )
  })

  it('afterReady turns capture on and the app recovery off', async () => {
    const page = new FakePage()
    page.handlers['prefs.set'] = () => null
    await createAdapter('illust', page).afterReady()
    expect(page.capturing).toBe(true)
    expect(page.executed).toEqual([['prefs.set', { key: 'autosaveRecovery', value: false }]])
  })

  it('historyLength reads document.inspect history', async () => {
    const page = new FakePage().withDocument()
    page.history = ['Rectangle', 'Align']
    page.handlers['document.inspect'] = (_p, p) => ({ history: [...p.history], dirty: true })
    expect(await createAdapter('illust', page).historyLength()).toBe(2)
    expect(page.executed[0]).toEqual(['document.inspect', { ids: [] }])
  })

  it('undo stops at the first refusal and reports how many ran', async () => {
    const page = new FakePage().withDocument()
    page.history = ['a', 'b']
    page.handlers['edit.undo'] = (_p, p) => {
      if (p.history.length === 0) throw new Error('command `edit.undo` is not available right now')
      return { undone: p.history.pop() }
    }
    expect(await createAdapter('illust', page).undo(3)).toBe(2)
  })

  it('exportBytes decodes dataBase64 and never calls file.save', async () => {
    const page = new FakePage().withDocument()
    page.handlers['document.export'] = (params) =>
      params.format === 'svg' ? { text: '<svg/>' } : { dataBase64: btoa('PNG!'), format: 'png' }
    const adapter = createAdapter('illust', page)
    expect(new TextDecoder().decode(await adapter.exportBytes('png'))).toBe('PNG!')
    expect(new TextDecoder().decode(await adapter.exportBytes('svg'))).toBe('<svg/>')
    expect(page.executed.map(([id]) => id)).toEqual(['document.export', 'document.export'])
  })

  it('docInfo reports no document on the start screen', async () => {
    expect(await createAdapter('illust', new FakePage()).docInfo()).toEqual({
      hasDocument: false,
      dirty: false,
      title: null,
    })
  })

  it('placeImage places the picture as an editable copy', async () => {
    const page = new FakePage().withDocument()
    page.handlers['file.place'] = () => ({ ids: [4] })
    await createAdapter('illust', page).placeImage('dot.png', new Uint8Array([1, 2, 3]))
    expect(page.executed[0]).toEqual([
      'file.place',
      { name: 'dot.png', dataBase64: btoa(String.fromCharCode(1, 2, 3)), link: false },
    ])
  })

  it('contextSummary stays short and names the document, selection and layers', async () => {
    const page = new FakePage().withDocument('poster.svg', true)
    page.handlers['document.inspect'] = () => ({
      title: 'poster.svg',
      dirty: true,
      units: 'Points',
      artboards: [{ name: 'Artboard 1', width: 612, height: 792 }],
      selection: [3],
      tool: 'selection',
      layers: [
        {
          name: 'Layer 1',
          kind: 'Layer',
          id: 1,
          children: Array.from({ length: 300 }, (_, i) => ({
            id: i + 2,
            kind: 'Rectangle',
            name: `<Rectangle ${i}>`,
          })),
        },
      ],
    })
    const summary = await createAdapter('illust', page).contextSummary()
    expect(summary.length).toBeLessThanOrEqual(2000)
    expect(summary).toContain('poster.svg')
    expect(summary).toContain('612')
    expect(summary).toContain('Layer 1')
    expect(summary).toMatch(/selection.*3/i)
  })
})

describe('createAdapter', () => {
  it('gives each app its own adapter', () => {
    expect(createAdapter('photo', new FakePage()).kind).toBe('photo')
    expect(createAdapter('illust', new FakePage()).kind).toBe('illust')
  })
})

describe('the illustration recovery copy', () => {
  it('is the .vectorcraft document from document.export, without saving', async () => {
    const page = new FakePage().withDocument('Untitled-1', true)
    page.handlers['document.export'] = (params) =>
      params.format === 'vectorcraft'
        ? { dataBase64: btoa('{"vc":1}'), format: 'vectorcraft' }
        : null
    const copy = await createAdapter('illust', page).recoveryBytes()
    expect(copy && { text: new TextDecoder().decode(copy.bytes), ext: copy.ext }).toEqual({
      text: '{"vc":1}',
      ext: 'vectorcraft',
    })
    expect(page.executed).toEqual([['document.export', { format: 'vectorcraft' }]])
    expect(page.documents[0]!.dirty).toBe(true)
  })

  it('is null when the app gives no copy (no document, or the format refused)', async () => {
    const page = new FakePage().withDocument('Untitled-1', true)
    page.handlers['document.export'] = () => {
      throw new Error('unsupported format')
    }
    expect(await createAdapter('illust', page).recoveryBytes()).toBeNull()
    expect(await createAdapter('illust', new FakePage()).recoveryBytes()).toBeNull()
  })
})
