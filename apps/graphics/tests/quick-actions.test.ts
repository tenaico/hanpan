import { describe, expect, it, vi } from 'vitest'
import { QUICK_ACTIONS, runQuickAction, type QuickDeps } from '../src/renderer/quick/quick-actions'
import { keepRatio } from '../src/renderer/quick/resize'
import type { GraphicsAdapter } from '../src/renderer/adapters'

/** An app whose commands are scripted by id; records what ran. */
function fakeApp(
  handlers: Record<string, (params: Record<string, unknown>) => unknown> = {},
  hasDocument = true,
) {
  const executed: Array<[string, Record<string, unknown>]> = []
  const placed: string[] = []
  const adapter = {
    kind: 'illust',
    api: {
      execute: async (id: string, params: Record<string, unknown> = {}) => {
        executed.push([id, params])
        const handler = handlers[id]
        if (!handler) return {}
        return handler(params)
      },
      commands: async () => [],
    },
    placeImage: vi.fn(async (name: string) => {
      placed.push(name)
    }),
    exportBytes: vi.fn(async () => new Uint8Array([1, 2, 3])),
    docInfo: async () =>
      hasDocument
        ? { hasDocument: true, dirty: false, title: 'logo.svg' }
        : { hasDocument: false, dirty: false, title: null },
  } as unknown as GraphicsAdapter
  return { adapter, executed, placed }
}

function deps(adapter: GraphicsAdapter, overrides: Partial<QuickDeps> = {}): QuickDeps {
  const unlock = vi.fn()
  return {
    adapter,
    pickImage: vi.fn(async () => ({ name: 'cat.png', bytes: new Uint8Array([9]) })),
    exportFile: vi.fn(async () => ({ ok: true as const, path: 'C:\\out\\logo.png' })),
    askExport: vi.fn(async () => ({ format: 'png' as const })),
    lock: vi.fn(() => unlock),
    measure: vi.fn(async () => ({ width: 1000, height: 500 })),
    resize: vi.fn(async () => new Uint8Array([4])),
    ...overrides,
  }
}

const ids = (executed: Array<[string, unknown]>) => executed.map(([id]) => id)

describe('the quick actions', () => {
  it('are three per app', () => {
    expect(QUICK_ACTIONS.photo).toEqual(['removeBackground', 'autoTone', 'exportAtSize'])
    expect(QUICK_ACTIONS.illust).toEqual(['traceImage', 'centerOnArtboard', 'exportPngSvg'])
  })

  it('removeBackground runs layer.removeBackground; a refusal gets a plain message, not the app text', async () => {
    const ok = fakeApp()
    expect(await runQuickAction('removeBackground', deps(ok.adapter))).toMatchObject({
      ok: true,
    })
    expect(ids(ok.executed)).toEqual(['layer.removeBackground'])

    const refused = fakeApp({
      'layer.removeBackground': () => {
        throw new Error('select a pixel layer first')
      },
    })
    expect(await runQuickAction('removeBackground', deps(refused.adapter))).toEqual({
      ok: false,
      messageKey: 'quickNeedPixelLayer',
    })
  })

  // 0.17 UX v2 G4: 무엇을 했는지, 왜 못 했는지를 동작마다 말한다
  it.each([
    ['removeBackground', 'quickDoneRemoveBackground', {}],
    ['autoTone', 'quickDoneAutoTone', {}],
    ['centerOnArtboard', 'quickDoneCenter', { 'document.inspect': () => ({ selection: [3] }) }],
    [
      'traceImage',
      'quickDoneTrace',
      {
        'document.inspect': () => ({ selection: [7] }),
        'document.node': () => ({ id: 7, kind: { type: 'image' } }),
      },
    ],
  ] as const)('%s says what it did (%s)', async (id, key, handlers) => {
    const app = fakeApp(handlers as Record<string, () => unknown>)
    expect(await runQuickAction(id, deps(app.adapter))).toEqual({ ok: true, messageKey: key })
  })

  it.each([
    ['removeBackground', 'layer.removeBackground', 'quickNeedPixelLayer'],
    ['autoTone', 'image.autoTone', 'quickNeedPixelLayer'],
    ['centerOnArtboard', 'object.align', 'quickCenterFailed'],
    ['traceImage', 'imageTrace.makeAndExpand', 'quickTraceFailed'],
  ] as const)('%s tells the likely cause when the app refuses', async (id, command, key) => {
    const app = fakeApp({
      'document.inspect': () => ({ selection: [] }),
      [command]: () => {
        throw new Error('nothing to change')
      },
    })
    expect(await runQuickAction(id, deps(app.adapter))).toEqual({ ok: false, messageKey: key })
  })

  // 0.17 리뷰 #3: 문서 없이 누르면 앱에 명령을 보내지 않고 사람 말로 알린다
  it.each([...QUICK_ACTIONS.photo, ...QUICK_ACTIONS.illust])(
    '%s without an open document sends the app nothing and asks for a picture first',
    async (id) => {
      const app = fakeApp({}, false)
      const d = deps(app.adapter)
      expect(await runQuickAction(id, d)).toEqual({ ok: false, messageKey: 'quickNoDocument' })
      expect(app.executed).toEqual([])
      expect(d.pickImage).not.toHaveBeenCalled()
      expect(d.askExport).not.toHaveBeenCalled()
    },
  )

  it('a failed export says so plainly, without the main process error text', async () => {
    const app = fakeApp()
    const d = deps(app.adapter, {
      exportFile: vi.fn(async () => ({ ok: false as const, error: 'EACCES: permission denied' })),
    })
    expect(await runQuickAction('exportPngSvg', d)).toEqual({
      ok: false,
      messageKey: 'quickExportFailed',
    })
  })

  it('traceImage traces a selected image without asking for a file', async () => {
    const app = fakeApp({
      'document.inspect': () => ({ selection: [7] }),
      // VectorCraft 0.21.0's answer, as the real app gave it (e2e)
      'document.node': () => ({
        id: 7,
        kind: { type: 'image', width: 32, height: 32, key: 'img1', xf: [1, 0, 0, 1, 0, 0] },
        name: 'dot.png',
      }),
    })
    const d = deps(app.adapter)
    await runQuickAction('traceImage', d)
    expect(d.pickImage).not.toHaveBeenCalled()
    expect(ids(app.executed)).toContain('imageTrace.makeAndExpand')
  })

  it('traceImage asks for a picture, places it and traces it', async () => {
    const app = fakeApp({ 'document.inspect': () => ({ selection: [] }) })
    const d = deps(app.adapter)
    expect(await runQuickAction('traceImage', d)).toMatchObject({ ok: true })
    expect(app.placed).toEqual(['cat.png'])
    expect(ids(app.executed).at(-1)).toBe('imageTrace.makeAndExpand')
  })

  it('traceImage does nothing when the picture dialog is canceled', async () => {
    const app = fakeApp({ 'document.inspect': () => ({ selection: [] }) })
    const d = deps(app.adapter, { pickImage: vi.fn(async () => null) })
    expect(await runQuickAction('traceImage', d)).toEqual({ ok: true, messageKey: null })
    expect(app.placed).toEqual([])
    expect(ids(app.executed)).not.toContain('imageTrace.makeAndExpand')
  })

  it('centerOnArtboard selects everything first when nothing is selected', async () => {
    const app = fakeApp({ 'document.inspect': () => ({ selection: [] }) })
    await runQuickAction('centerOnArtboard', deps(app.adapter))
    expect(ids(app.executed)).toEqual(['document.inspect', 'select.all', 'object.align'])
    expect(app.executed.at(-1)![1]).toEqual({
      horizontal: 'center',
      vertical: 'center',
      to: 'artboard',
    })
  })

  it('centerOnArtboard keeps a selection the person made', async () => {
    const app = fakeApp({ 'document.inspect': () => ({ selection: [3] }) })
    await runQuickAction('centerOnArtboard', deps(app.adapter))
    expect(ids(app.executed)).toEqual(['document.inspect', 'object.align'])
  })

  it('every action runs inside the input lock and lets go after a failure', async () => {
    const app = fakeApp({
      'image.autoTone': () => {
        throw new Error('no image')
      },
    })
    const unlock = vi.fn()
    const d = deps(app.adapter, { lock: vi.fn(() => unlock) })
    await runQuickAction('autoTone', d)
    expect(d.lock).toHaveBeenCalledTimes(1)
    expect(unlock).toHaveBeenCalledTimes(1)
  })

  it('exportAtSize offers the picture size and resizes to the chosen one', async () => {
    const app = fakeApp()
    const d = deps(app.adapter, {
      askExport: vi.fn(async () => ({ format: 'jpg' as const, width: 500, height: 250 })),
    })
    expect(await runQuickAction('exportAtSize', d)).toMatchObject({ ok: true })
    expect(d.askExport).toHaveBeenCalledWith('photo', { width: 1000, height: 500 })
    expect(app.adapter.exportBytes).toHaveBeenCalledWith('png')
    expect(d.resize).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 500, 250, 'jpg')
    expect(d.exportFile).toHaveBeenCalledWith({
      bytes: new Uint8Array([4]),
      defaultName: 'logo.jpg',
      format: 'jpg',
    })
  })

  it('exportAtSize passes the chosen JPG quality to the resize', async () => {
    const app = fakeApp()
    const d = deps(app.adapter, {
      askExport: vi.fn(async () => ({
        format: 'jpg' as const,
        width: 1000,
        height: 500,
        quality: 0.7,
      })),
    })
    await runQuickAction('exportAtSize', d)
    expect(d.resize).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 1000, 500, 'jpg', 0.7)
  })

  // 0.17 UX v2 G6: 앱이 붙인 "Untitled-1" 대신 한판 탭의 이름으로 내보낸다
  it.each(['Untitled-1', 'Untitled-12', 'Untitled', null])(
    'an export of the app default name %s takes the tab name',
    async (title) => {
      const app = fakeApp()
      app.adapter.docInfo = async () => ({ hasDocument: true, dirty: true, title })
      const d = deps(app.adapter, { untitledName: '제목 없는 사진' })
      await runQuickAction('exportAtSize', d)
      expect(d.exportFile).toHaveBeenCalledWith(
        expect.objectContaining({ defaultName: '제목 없는 사진.png' }),
      )
    },
  )

  it('an export keeps a real file name', async () => {
    const app = fakeApp()
    app.adapter.docInfo = async () => ({
      hasDocument: true,
      dirty: true,
      title: 'Untitled-art.svg',
    })
    const d = deps(app.adapter, { untitledName: '제목 없는 일러스트' })
    await runQuickAction('exportPngSvg', d)
    expect(d.exportFile).toHaveBeenCalledWith(
      expect.objectContaining({ defaultName: 'Untitled-art.png' }),
    )
  })

  it('exportPngSvg hands an SVG over as the app wrote it', async () => {
    const app = fakeApp()
    const d = deps(app.adapter, { askExport: vi.fn(async () => ({ format: 'svg' as const })) })
    await runQuickAction('exportPngSvg', d)
    expect(app.adapter.exportBytes).toHaveBeenCalledWith('svg')
    expect(d.resize).not.toHaveBeenCalled()
    expect(d.exportFile).toHaveBeenCalledWith(
      expect.objectContaining({ defaultName: 'logo.svg', format: 'svg' }),
    )
  })

  it('a canceled export dialog writes nothing', async () => {
    const app = fakeApp()
    const d = deps(app.adapter, { askExport: vi.fn(async () => null) })
    expect(await runQuickAction('exportPngSvg', d)).toEqual({ ok: true, messageKey: null })
    expect(d.exportFile).not.toHaveBeenCalled()
  })
})

describe('keepRatio', () => {
  it('exportAtSize keeps the ratio', () => {
    expect(keepRatio({ width: 1000, height: 500 }, { width: 500 })).toEqual({
      width: 500,
      height: 250,
    })
    expect(keepRatio({ width: 1000, height: 500 }, { height: 100 })).toEqual({
      width: 200,
      height: 100,
    })
  })

  it('never answers less than one pixel', () => {
    expect(keepRatio({ width: 4000, height: 10 }, { width: 100 })).toEqual({
      width: 100,
      height: 1,
    })
  })
})
