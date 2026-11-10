import { describe, expect, it, vi } from 'vitest'
import commandsFixture from './fixtures/vectorcraft-0.21.0-commands.json'
import photoCommands from './fixtures/photocraft-0.20.2-h1-commands.json'
import { createAdapter } from '../src/renderer/adapters'
import { createGraphicsSkill } from '../src/renderer/ai/graphics-skill'
import { isBlockedCommand } from '../src/renderer/ai/blocked-commands'
import { guideNames, loadGuides } from '../src/renderer/ai/guides'
import { createUndoTracker } from '../src/renderer/ai/undo-tracker'
import type { AppCommand } from '../src/renderer/frame/page-api'
import type { ExportRequest } from '../src/shared/ipc'
import { FakePage } from './helpers/fake-page'

const FIXTURE = commandsFixture as { id: string; label: string; menu: string[] }[]

function setup(kind: 'photo' | 'illust' = 'illust') {
  const page = new FakePage().withDocument('poster.svg', false)
  page.commandList = FIXTURE.map((c): AppCommand => ({
    ...c,
    enabled: c.id !== 'object.ungroup',
    params: `{params of ${c.id}}`,
    disabled_reason: c.id === 'object.ungroup' ? 'nothing selected' : undefined,
  }))
  // the revision moves with every edit, as the real app's does
  page.handlers['document.inspect'] = (_p, p) => ({
    history: [...p.history],
    revision: p.history.length,
    layers: [],
  })
  page.handlers['shape.rectangle'] = (_p, p) => {
    p.edit('Rectangle')
    return { id: 7 }
  }
  page.handlers['object.align'] = (_p, p) => {
    p.edit('Align')
    return null
  }
  page.handlers['text.fontList'] = () => ({ families: ['NanumGothic'] })
  page.handlers['document.export'] = () => ({ dataBase64: btoa('PNG') })
  const adapter =
    kind === 'illust'
      ? createAdapter('illust', page)
      : { ...createAdapter('illust', page), kind: 'photo' as const }
  const tracker = createUndoTracker(adapter)
  const exportFile = vi.fn(async (_req: ExportRequest) => ({
    ok: true as const,
    path: 'C:\\Users\\me\\Pictures\\poster.png',
  }))
  const skill = createGraphicsSkill({
    kind,
    adapter,
    tracker,
    context: () => 'CONTEXT',
    exportFile,
  })
  const run = async (name: string, input: Record<string, unknown> = {}) =>
    skill.executeTool({ id: 'c1', name, input })
  return { page, skill, tracker, exportFile, run }
}

describe('the graphics skill', () => {
  it('offers the eight tools and the context', () => {
    const { skill } = setup()
    expect(skill.tools.map((t) => t.name)).toEqual([
      'find_commands',
      'describe_command',
      'run_command',
      'run_commands',
      'inspect_document',
      'export_file',
      'load_guide',
      'pc_fonts',
    ])
    expect(skill.buildContext?.()).toBe('CONTEXT')
    expect(skill.systemPrompt).toMatch(/VectorCraft/)
  })

  // the web builds read the PC's fonts in embedded mode: request('fonts.local', {family?})
  it('pc_fonts lists the PC fonts, or loads one by family, through the page API', async () => {
    const { run, page, skill } = setup()
    const tool = skill.tools.find((t) => t.name === 'pc_fonts')!
    expect(tool.description).toMatch(/installed on this PC/)
    page.requestHandlers['fonts.local'] = (params) =>
      (params as { family?: string }).family
        ? { loaded: '맑은 고딕' }
        : { families: ['맑은 고딕', 'NanumGothic'] }
    const list = await run('pc_fonts')
    expect(list.isError).toBeFalsy()
    expect(list.output).toContain('NanumGothic')
    expect(page.requested.at(-1)).toEqual(['fonts.local', {}])
    const load = await run('pc_fonts', { family: '맑은 고딕' })
    expect(load.output).toContain('"loaded":"맑은 고딕"')
    expect(page.requested.at(-1)).toEqual(['fonts.local', { family: '맑은 고딕' }])
  })

  it('pc_fonts reports an app without PC fonts as an error, not a crash', async () => {
    const { run } = setup()
    const result = await run('pc_fonts')
    expect(result.isError).toBe(true)
  })

  it('find_commands hides blocked commands', async () => {
    const { run } = setup()
    const out = (await run('find_commands', { query: 'save' })).output
    expect(out).not.toMatch(/file\.save|document\.save/)
  })

  it('find_commands matches words across id, label and menu', async () => {
    const { run } = setup()
    // "horizontal center" is in the label, "align" in the id
    const out = (await run('find_commands', { query: 'align horizontal center', limit: 50 })).output
    expect(out).toContain('align.horizontalCenter')
    expect((await run('find_commands', { query: 'align', limit: 50 })).output).toContain(
      'object.align',
    )
  })

  it('find_commands marks commands the app has turned off', async () => {
    const { run } = setup()
    expect((await run('find_commands', { query: 'ungroup' })).output).toMatch(
      /object\.ungroup .*\[disabled: nothing selected\]/,
    )
  })

  it('describe_command gives the params, and refuses a blocked id', async () => {
    const { run } = setup()
    expect((await run('describe_command', { id: 'shape.rectangle' })).output).toContain(
      '{params of shape.rectangle}',
    )
    const blocked = await run('describe_command', { id: 'file.save' })
    expect(blocked.isError).toBe(true)
  })

  it.each([
    'file.save',
    'edit.undo',
    'app.quit',
    'prefs.set',
    'plugin.install',
    'window.newWindow',
  ])('run_command refuses %s without calling the app', async (id) => {
    const { run, page } = setup()
    const result = await run('run_command', { id })
    expect(result.isError).toBe(true)
    expect(page.executed.filter(([x]) => x === id)).toEqual([])
  })

  it('run_command runs with {} when params are missing and reports the result', async () => {
    const { run, page } = setup()
    const result = await run('run_command', { id: 'shape.rectangle' })
    expect(result.isError).toBeFalsy()
    expect(result.mutated).toBe(true)
    expect(result.output).toContain('"id":7')
    expect(page.executed.at(-1)).toEqual(['shape.rectangle', {}])
  })

  it('run_command records the history length once, before the first change', async () => {
    const { run, page, tracker } = setup()
    page.history = ['Earlier']
    await run('run_command', { id: 'shape.rectangle', params: { x: 1, y: 1, width: 2, height: 2 } })
    await run('run_command', { id: 'object.align', params: { horizontal: 'center' } })
    expect(page.executed.filter(([id]) => id === 'document.inspect')).toHaveLength(1)
    expect(await tracker.finish()).toEqual({ steps: 2, markerAfter: 3, overflow: false })
  })

  it('run_command does not start tracking for read-only commands', async () => {
    const { run, page, tracker } = setup()
    await run('run_command', { id: 'text.fontList' })
    expect(page.executed.filter(([id]) => id === 'document.inspect')).toHaveLength(0)
    expect(await tracker.finish()).toBeNull()
  })

  it('run_command reports an app error as a tool error', async () => {
    const { run, page } = setup()
    page.handlers['shape.ellipse'] = () => {
      throw new Error('invalid parameters for `shape.ellipse`: missing number `x`')
    }
    const result = await run('run_command', { id: 'shape.ellipse' })
    expect(result.isError).toBe(true)
    expect(result.output).toMatch(/missing number `x`/)
  })

  it('run_command cuts its output to 4,000 characters', async () => {
    const { run, page } = setup()
    page.handlers['document.json'] = () => ({ big: 'x'.repeat(20_000) })
    const out = (await run('run_command', { id: 'document.json' })).output
    expect(out.length).toBeLessThanOrEqual(4100)
    expect(out).toMatch(/cut/)
  })

  it('run_commands stops at the first failure and lists the steps that did not run', async () => {
    const { run, page } = setup()
    page.handlers['shape.ellipse'] = () => {
      throw new Error('bad ellipse')
    }
    const result = await run('run_commands', {
      steps: [
        { id: 'shape.rectangle', params: {} },
        { id: 'shape.ellipse', params: {} },
        { id: 'object.align', params: {} },
      ],
    })
    expect(result.isError).toBe(true)
    expect(result.output).toMatch(/1\. shape\.rectangle .*OK/)
    expect(result.output).toMatch(/2\. shape\.ellipse .*bad ellipse/)
    expect(result.output).toMatch(/3\. object\.align .*not run/)
    expect(page.executed.some(([id]) => id === 'object.align')).toBe(false)
  })

  it('run_commands refuses a batch that contains a blocked command before running any step', async () => {
    const { run, page } = setup()
    const result = await run('run_commands', {
      steps: [{ id: 'shape.rectangle' }, { id: 'file.export.png', params: { path: 'x.png' } }],
    })
    expect(result.isError).toBe(true)
    expect(page.executed.some(([id]) => id === 'shape.rectangle')).toBe(false)
  })

  it('inspect_document cuts large trees with a note', async () => {
    const { run, page } = setup()
    page.handlers['document.inspect'] = () => ({
      layers: Array.from({ length: 2000 }, (_, i) => ({ id: i, name: `n${i}` })),
    })
    const out = (await run('inspect_document', { depth: 2 })).output
    expect(out.length).toBeLessThanOrEqual(12_200)
    expect(out).toMatch(/cut/)
  })

  it('export_file asks the user through exportFile and never writes by itself', async () => {
    const { run, exportFile, page } = setup()
    const result = await run('export_file', { format: 'png' })
    expect(exportFile).toHaveBeenCalledWith({
      bytes: new TextEncoder().encode('PNG'),
      defaultName: 'poster.png',
      format: 'png',
    })
    expect(result.output).toContain('poster.png')
    expect(result.output).not.toContain('Pictures')
    expect(page.executed.some(([id]) => id.startsWith('file.'))).toBe(false)
  })

  it('export_file says when the person canceled', async () => {
    const { run, exportFile } = setup()
    exportFile.mockResolvedValueOnce({ ok: true, canceled: true } as never)
    expect((await run('export_file', { format: 'svg' })).output).toMatch(/canceled/i)
  })

  it('export_file refuses a format the kind cannot export', async () => {
    const { run, exportFile } = setup('photo')
    const result = await run('export_file', { format: 'svg' })
    expect(result.isError).toBe(true)
    expect(exportFile).not.toHaveBeenCalled()
  })

  it('load_guide returns the guides and names them on a typo', async () => {
    const { run } = setup()
    expect((await run('load_guide', { guides: ['shapes'] })).output).toMatch(/shape\.rectangle/)
    const typo = await run('load_guide', { guides: ['shapez'] })
    expect(typo.isError).toBe(true)
    expect(typo.output).toMatch(/shapes/)
  })
})

describe('the blocked commands, checked against the real command list', () => {
  it('every fixture command under file., app., help., prefs., plugin., window. and ui. is blocked', () => {
    const risky = FIXTURE.filter((c) => /^(file|app|help|prefs|plugin|window|ui)\./.test(c.id))
    expect(risky.length).toBeGreaterThan(250)
    for (const c of risky) expect(isBlockedCommand(c.id), c.id).toBe(true)
    for (const id of [
      'edit.undo',
      'edit.redo',
      'edit.undoGroup.begin',
      'document.save',
      'document.export',
      'links.relink',
    ])
      expect(isBlockedCommand(id), id).toBe(true)
  })

  it('the AI may not change the theme or call any hanpan. command', () => {
    expect(isBlockedCommand('hanpan.theme')).toBe(true)
    expect(isBlockedCommand('hanpan.status')).toBe(true)
  })

  it('shape., object., text., path., select. and paint. commands stay available', () => {
    const editing = FIXTURE.filter((c) => /^(shape|object|text|path|select|paint)\./.test(c.id))
    expect(editing.length).toBeGreaterThan(200)
    for (const c of editing) expect(isBlockedCommand(c.id), c.id).toBe(false)
  })
})

describe('the blocked commands, checked against the PhotoCraft 0.20.2-h1 command list', () => {
  const PHOTO = photoCommands as { id: string }[]

  it('the history, purges, files, updates and recent documents stay with the person', () => {
    const risky = PHOTO.filter((c) =>
      /^(file|app|help|prefs|plugin|history|updates|actions)\.|^edit\.purge|^document\.(recent|presets\.(save|delete))/.test(
        c.id,
      ),
    )
    expect(risky.length).toBeGreaterThan(100)
    for (const c of risky) expect(isBlockedCommand(c.id), c.id).toBe(true)
  })

  it('the picture commands the quick actions and the AI use stay available', () => {
    for (const id of [
      'layer.removeBackground',
      'image.autoTone',
      'type.create',
      'select.subject',
      'image.canvasSize',
      'layer.new.layer',
    ])
      expect(isBlockedCommand(id), id).toBe(false)
    // these open a second document in the app: never the assistant's
    const opensDocument = ['image.duplicate', 'layer.smartObjects.editContents']
    for (const id of opensDocument) expect(isBlockedCommand(id), id).toBe(true)
    const editing = PHOTO.filter(
      (c) =>
        /^(layer|image|filter|select|type|paint)\./.test(c.id) && !opensDocument.includes(c.id),
    )
    expect(editing.length).toBeGreaterThan(300)
    for (const c of editing) expect(isBlockedCommand(c.id), c.id).toBe(false)
  })
})

describe('the photo guides', () => {
  const PHOTO_IDS = new Set((photoCommands as { id: string }[]).map((c) => c.id))

  it('cover background, adjust, text, crop-resize and export', () => {
    expect(guideNames('photo')).toEqual(['background', 'adjust', 'text', 'crop-resize', 'export'])
  })

  it('name only commands PhotoCraft 0.20.2-h1 has and the assistant may run', () => {
    const loaded = loadGuides('photo', guideNames('photo'))
    expect(loaded.ok).toBe(true)
    const text = loaded.ok ? loaded.content : ''
    const ids = [...text.matchAll(/`([a-z]+(?:\.[a-zA-Z]+)+)`/g)].map((m) => m[1]!)
    expect(ids.length).toBeGreaterThan(15)
    for (const id of ids) {
      expect(PHOTO_IDS.has(id), id).toBe(true)
      expect(isBlockedCommand(id), id).toBe(false)
    }
  })
})
