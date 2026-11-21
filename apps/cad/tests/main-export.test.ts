// @vitest-environment node
/**
 * The main process for the files of stage 3: 3MF, GLB and PLY are handed over
 * as imports; DWG, STEP, IGES and BREP files are not read at all and the
 * screen explains how to get a file that opens; an export writes the bytes
 * the renderer made to a path picked in the save dialog, never onto the file
 * the drawing came from.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeContents, Handler } from './helpers/fake-electron'

const handlers = new Map<string, Handler>()
const showSaveDialog = vi.fn()
const showMessageBox = vi.fn()

vi.mock('electron', async () => {
  const { fakeContents } = await import('./helpers/fake-electron')
  return {
    app: {
      on: vi.fn(),
      whenReady: () => new Promise(() => {}),
      getPath: (name: string) => join(tmpdir(), `cad-test-${name}`),
      getLocale: () => 'en-US',
    },
    dialog: {
      showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
      showMessageBox: (...args: unknown[]) => showMessageBox(...args),
    },
    shell: { openExternal: vi.fn() },
    protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
    net: {},
    BrowserWindow: { fromWebContents: () => null, getFocusedWindow: () => null },
    WebContentsView: class {
      webContents = fakeContents()
    },
    ipcMain: {
      handle: (channel: string, fn: Handler) => handlers.set(channel, fn),
      on: (channel: string, fn: Handler) => handlers.set(channel, fn),
      removeHandler: vi.fn(),
    },
  }
})

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, default: actual, readFile: vi.fn(actual.readFile) }
})
vi.mock('../src/main/atomic-write', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/main/atomic-write')>()
  return { atomicWriteFile: vi.fn(actual.atomicWriteFile) }
})

import { readFile } from 'node:fs/promises'
import { createDocument, saveCadFile } from '@genoffice/cad-engine'
import { setUiLang } from '@genoffice/i18n'
import { atomicWriteFile } from '../src/main/atomic-write'
import { cadFilePath, createCadView, sendCadExportRequest } from '../src/main/cad-main'
import { CAD_CHANNELS } from '../src/shared/ipc'
import type { ExportResult, OpenFileResult, SaveCadResult } from '../src/shared/ipc'

let dir: string
beforeEach(() => {
  setUiLang('en')
  dir = mkdtempSync(join(tmpdir(), 'genoffice-cad-export-'))
  showSaveDialog.mockReset()
  showMessageBox.mockReset()
  vi.mocked(readFile).mockClear()
  vi.mocked(atomicWriteFile).mockClear()
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function view(openPath?: string | null): FakeContents {
  return createCadView(openPath).webContents as unknown as FakeContents
}

const call = <T>(channel: string, contents: FakeContents, ...args: unknown[]): T =>
  handlers.get(channel)!({ sender: contents }, ...args) as T

const open = (contents: FakeContents, path: string) =>
  call<Promise<OpenFileResult>>(CAD_CHANNELS.openFile, contents, path)

const exportFile = (contents: FakeContents, request: unknown) =>
  call<Promise<ExportResult>>(CAD_CHANNELS.exportFile, contents, request)

const STL_BYTES = new Uint8Array([1, 2, 3, 4])
const pickPath = (path: string) =>
  showSaveDialog.mockResolvedValue({ canceled: false, filePath: path })
const dialogOptions = () =>
  showSaveDialog.mock.calls.at(-1)!.at(-1) as {
    defaultPath: string
    filters: Array<{ name: string; extensions: string[] }>
  }

describe('opening the files of stage 3', () => {
  it.each([
    ['Bracket.3mf', '3mf'],
    ['Scene.GLB', 'glb'],
    ['scan.ply', 'ply'],
    ['Floor Plan.dwg', 'dwg'],
  ])('open %s returns import as %s and grants nothing', async (name, ext) => {
    const path = join(dir, name)
    writeFileSync(path, 'bytes')
    const contents = view(path)
    const result = await open(contents, path)
    expect(result).toMatchObject({ status: 'import', ext, name: name.replace(/\.\w+$/, '') })
    expect(cadFilePath(contents.id)).toBeUndefined()
  })

  it.each(['shaft.step', 'shaft.STP', 'body.iges', 'body.igs', 'solid.brep'])(
    'a STEP, IGES or BREP file shows the guide and grants nothing (%s)',
    async (name) => {
      const path = join(dir, name)
      writeFileSync(path, 'proprietary bytes')
      const contents = view(path)
      const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
      expect(await open(contents, path)).toEqual({
        status: 'guide',
        ext,
        name: name.slice(0, name.lastIndexOf('.')),
      })
      // not read, and not a save target: the first save asks for a new .ttukcad
      expect(readFile).not.toHaveBeenCalled()
      expect(cadFilePath(contents.id)).toBeUndefined()
      const target = join(dir, 'new')
      pickPath(target)
      const saved = await call<Promise<SaveCadResult>>(CAD_CHANNELS.save, contents, {
        bytes: saveCadFile(createDocument()),
        mode: 'save',
      })
      expect(saved).toEqual({ ok: true, path: `${target}.ttukcad` })
      expect(readFileSync(path, 'utf8')).toBe('proprietary bytes')
    },
  )
})

describe('export', () => {
  it('writes the bytes to the picked path with the format filter and the suggested name', async () => {
    const contents = view(null)
    pickPath(join(dir, 'Bracket.stl'))
    expect(
      await exportFile(contents, { format: 'stl', bytes: STL_BYTES, suggestedName: 'Bracket' }),
    ).toEqual({ ok: true, path: join(dir, 'Bracket.stl') })
    const options = dialogOptions()
    expect(options.defaultPath.endsWith('Bracket.stl')).toBe(true)
    expect(options.filters.map((f) => f.extensions)).toEqual([['stl']])
    expect([...readFileSync(join(dir, 'Bracket.stl'))]).toEqual([1, 2, 3, 4])
    // an export is not the drawing's file: the save target stays as it was
    expect(cadFilePath(contents.id)).toBeUndefined()
  })

  it.each([
    ['obj', 'mesh', 'mesh.obj'],
    ['png', 'shot.jpg', 'shot.jpg.png'],
    ['stl', 'part.STL', 'part.STL'],
  ])(
    'a %s export gets its extension when the picked name lacks it',
    async (format, picked, written) => {
      const contents = view(null)
      pickPath(join(dir, picked))
      expect(await exportFile(contents, { format, bytes: STL_BYTES, suggestedName: 'x' })).toEqual({
        ok: true,
        path: join(dir, written),
      })
      expect(readdirSync(dir)).toEqual([written])
    },
  )

  it('export never writes to the opened source path', async () => {
    const source = join(dir, 'model.stl')
    writeFileSync(source, 'solid original')
    const contents = view(source)
    await open(contents, source)
    for (const picked of [source, join(dir, 'model'), join(dir, 'MODEL.stl')]) {
      // on Windows and macOS the same name in another case is the same file
      if (picked.includes('MODEL') && process.platform === 'linux') continue
      pickPath(picked)
      expect(
        await exportFile(contents, { format: 'stl', bytes: STL_BYTES, suggestedName: 'model' }),
      ).toEqual({ ok: false, error: 'source-path' })
    }
    expect(atomicWriteFile).not.toHaveBeenCalled()
    expect(readFileSync(source, 'utf8')).toBe('solid original')
  })

  it('export never writes over the drawing it was made from', async () => {
    const drawing = join(dir, 'part.ttukcad')
    writeFileSync(drawing, saveCadFile(createDocument()))
    const contents = view(drawing)
    await open(contents, drawing)
    // the .ttukcad name gets .png appended, so the drawing itself is safe
    pickPath(drawing)
    expect(
      await exportFile(contents, { format: 'png', bytes: STL_BYTES, suggestedName: 'part' }),
    ).toEqual({ ok: true, path: `${drawing}.png` })
    expect(cadFilePath(contents.id)).toBe(drawing)
  })

  it('a canceled dialog writes nothing', async () => {
    const contents = view(null)
    showSaveDialog.mockResolvedValue({ canceled: true })
    expect(
      await exportFile(contents, { format: 'obj', bytes: STL_BYTES, suggestedName: 'x' }),
    ).toEqual({ ok: true, canceled: true })
    expect(atomicWriteFile).not.toHaveBeenCalled()
  })

  it.each([
    ['no bytes', { format: 'stl', suggestedName: 'x' }],
    ['text instead of bytes', { format: 'stl', bytes: 'abc', suggestedName: 'x' }],
    ['an unknown format', { format: 'step', bytes: STL_BYTES, suggestedName: 'x' }],
    ['empty bytes', { format: 'stl', bytes: new Uint8Array(0), suggestedName: 'x' }],
    ['nothing', null],
  ])('a request with %s is refused before any dialog', async (_label, request) => {
    const contents = view(null)
    expect(await exportFile(contents, request)).toEqual({ ok: false, error: 'bad-request' })
    expect(showSaveDialog).not.toHaveBeenCalled()
    expect(atomicWriteFile).not.toHaveBeenCalled()
  })

  it('a view whose file has not opened yet exports nothing', async () => {
    const path = join(dir, 'part.ttukcad')
    writeFileSync(path, saveCadFile(createDocument()))
    const contents = view(path)
    expect(
      await exportFile(contents, { format: 'stl', bytes: STL_BYTES, suggestedName: 'x' }),
    ).toEqual({ ok: false, error: 'not-open' })
    expect(showSaveDialog).not.toHaveBeenCalled()
  })

  it('a write that fails says so', async () => {
    const contents = view(null)
    pickPath(join(dir, 'missing-folder', 'x.stl'))
    vi.mocked(atomicWriteFile).mockRejectedValueOnce(new Error('disk full'))
    expect(
      await exportFile(contents, { format: 'stl', bytes: STL_BYTES, suggestedName: 'x' }),
    ).toEqual({ ok: false, error: 'write-failed' })
  })

  it('the menu asks the drawing for the bytes of one format', () => {
    const contents = view(null)
    sendCadExportRequest(contents as never, 'obj')
    expect(contents.sent).toContainEqual([CAD_CHANNELS.exportRequest, 'obj'])
  })
})
