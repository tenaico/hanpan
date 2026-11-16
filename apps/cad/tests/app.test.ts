/**
 * The editor screen against a fake preload API and a fake 3D view: what it
 * shows for the file it opened, the no-WebGL screen, and what it hands the
 * main process on a save, a refused save and a save from the close prompt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Lang } from '@genoffice/i18n'
import {
  CadEditError,
  addShape,
  createDocument,
  createKernel,
  evaluateDocument,
  meshBounds,
  openCadFile,
  saveCadFile,
  type CadDocument,
  type Kernel,
} from '@genoffice/cad-engine'
import App from '../src/renderer/App'
import { selection } from '../src/renderer/editing/selection'
import type { Rasterize } from '../src/renderer/sheet/sheet-png'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { strings } from '../src/renderer/i18n/strings'
import { HandleRefusedError } from '../src/renderer/scene/handles'
import type { MeasureView, ViewportFactory, ViewportOptions } from '../src/renderer/scene/viewport'
import { applyKoreanDocFeatures } from '@genoffice/ui'
import type {
  BytesReply,
  CadApi,
  CadMenuCommand,
  ExportFileRequest,
  ExportFormat,
  OpenFileResult,
  SaveCadRequest,
  SaveCadResult,
  SaveMode,
  SendToDocumentRequest,
  SendToDocumentResult,
  SummaryReply,
} from '../src/shared/ipc'

const en = strings.en

// the text font is read in the app from the template font URL; here the outlines are made up
vi.mock('../src/renderer/editing/text-outlines', () => ({
  loadTextFont: async () => ({}),
  textOutlines: (_font: unknown, value: string) =>
    value === '?' ? [] : [[-5, -5, 5, -5, 5, 5, -5, 5]],
}))

interface Fake {
  api: CadApi
  saves: SaveCadRequest[]
  dirty: boolean[]
  acks: boolean[]
  closeResults: boolean[]
  summaries: SummaryReply[]
  bytes: BytesReply[]
  saveResult: SaveCadResult
  exports: ExportFileRequest[]
  sends: SendToDocumentRequest[]
  sendResult: SendToDocumentResult | Error
  copies: Uint8Array[]
  copyResult: boolean
  emit: {
    exportRequest(format: ExportFormat): void
    saveRequest(mode: SaveMode): void
    closeSave(): void
    menu(command: CadMenuCommand): void
    renamed(path: string): void
    summary(): void
    bytes(): void
  }
}

function fakeApi(pending: string | null, file: OpenFileResult | null): Fake {
  const handlers: Record<string, ((...args: never[]) => void) | undefined> = {}
  const on =
    (name: string) =>
    (handler: (...args: never[]) => void): (() => void) => {
      handlers[name] = handler
      return () => {
        handlers[name] = undefined
      }
    }
  const call = (name: string, ...args: unknown[]): void =>
    (handlers[name] as ((...a: unknown[]) => void) | undefined)?.(...args)
  const fake: Fake = {
    saves: [],
    dirty: [],
    acks: [],
    closeResults: [],
    summaries: [],
    bytes: [],
    saveResult: { ok: true, path: 'C:/models/new.ttukcad' },
    exports: [],
    sends: [],
    sendResult: { ok: true, title: 'sent' },
    copies: [],
    copyResult: true,
    emit: {
      exportRequest: (format) => call('export', format),
      saveRequest: (mode) => call('save', mode),
      closeSave: () => call('close'),
      menu: (command) => call('menu', command),
      renamed: (path) => call('renamed', path),
      summary: () => call('summary'),
      bytes: () => call('bytes'),
    },
    api: {
      consumePending: async () => pending,
      openFile: async () => file ?? { status: 'unreadable' },
      save: async (request: SaveCadRequest) => {
        fake.saves.push(request)
        return fake.saveResult
      },
      setDirty: (dirty: boolean) => void fake.dirty.push(dirty),
      onSaveRequest: on('save'),
      sendSaveRequestAck: (ok: boolean) => void fake.acks.push(ok),
      onCloseSaveRequest: on('close'),
      sendCloseSaveResult: (ok: boolean) => void fake.closeResults.push(ok),
      onFileRenamed: on('renamed'),
      onMenuCommand: on('menu'),
      getLanguage: async () => 'en' as Lang,
      onLanguageChanged: on('language'),
      getTheme: async () => 'system' as const,
      onThemeChanged: on('theme'),
      getAutoSaveDefault: async () => ({ on: false, updatedAt: 0 }),
      onAutoSaveDefaultChanged: on('autosave'),
      onChromePressed: on('chrome'),
      onSummaryRequest: on('summary'),
      sendSummaryResult: (reply: SummaryReply) => void fake.summaries.push(reply),
      onBytesRequest: on('bytes'),
      sendBytesResult: (reply: BytesReply) => void fake.bytes.push(reply),
      writeRecoveryCopy: async () => 'written' as const,
      onRecoveryCopyNow: on('copyNow'),
      sendRecoveryCopyNowDone: () => {},
      onRecoveryReset: on('reset'),
      exportFile: async (request: ExportFileRequest) => {
        fake.exports.push(request)
        return { ok: true, path: 'C:/out/x.' + request.format }
      },
      onExportRequest: on('export'),
      sendToDocument: async (request: SendToDocumentRequest) => {
        fake.sends.push(request)
        if (fake.sendResult instanceof Error) throw fake.sendResult
        return fake.sendResult
      },
      copyImage: async (png: Uint8Array) => {
        fake.copies.push(png)
        return fake.copyResult
      },
    },
  }
  return fake
}

/** A 3D view that records what it was shown, for a PC with WebGL. */
function fakeViewport() {
  const shown: number[] = []
  const factory: ViewportFactory = () => ({
    setTheme: () => {},
    showDocument: (doc) => void shown.push(doc.parts.length),
    setSelection: () => {},
    setHandleMode: () => {},
    view: () => {},
    setSketch: () => {},
    setMeasure: () => {},
    snapshot: async () => new Uint8Array([0x89, 0x50]),
    dispose: () => {},
  })
  return { factory, shown }
}

let container: HTMLElement
let unmount: () => void = () => {}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
})

afterEach(() => {
  unmount()
  unmount = () => {}
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

async function settle(): Promise<void> {
  for (let turn = 0; turn < 6; turn++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

async function until(done: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 5_000
  while (!done()) {
    if (Date.now() > deadline) throw new Error(`still waiting for ${what}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  }
}

const pendingKernel = (): Promise<never> => new Promise(() => {})

async function mountApp(
  fake: Fake,
  viewportFactory: ViewportFactory,
  kernelFactory: () => Promise<Kernel> = pendingKernel,
  rasterize?: Rasterize,
): Promise<void> {
  ;(window as unknown as { cadApi: CadApi }).cadApi = fake.api
  container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      createElement(LocaleProvider, {
        initial: 'en',
        // the boolean kernel never starts here: the screen tests need no wasm
        children: createElement(App, { viewportFactory, kernelFactory, rasterize }),
      }),
    )
  })
  unmount = () => act(() => root.unmount())
  await until(() => !!container.querySelector('[data-cad-ready]'), 'the drawing to open')
  await settle()
}

const text = (selector: string): string =>
  container.querySelector(selector)?.textContent?.trim() ?? ''

function bracketBytes(): Uint8Array {
  return saveCadFile(addShape(createDocument(), 'box', { name: 'Base' }).doc)
}

describe('the AI Drawing screen', () => {
  it('opens the pending path and shows its title', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: bracketBytes() })
    const view = fakeViewport()
    await mountApp(fake, view.factory)
    expect(text('.cad-title')).toBe('bracket')
    expect(text('.cad-state')).toBe(en.saved)
    expect(container.querySelector('[data-cad-notice]')).toBeNull()
    // the view was shown the drawing with its one part
    expect(view.shown.at(-1)).toBe(1)
    // a drawing nobody touched does not count as unsaved
    expect(fake.dirty.every((d) => d === false)).toBe(true)
  })

  it('opens an untitled drawing when nothing is pending', async () => {
    const fake = fakeApi(null, null)
    await mountApp(fake, fakeViewport().factory)
    expect(text('.cad-title')).toBe(en.untitled)
  })

  it('shows why a file did not open, on one line above the view', async () => {
    const fake = fakeApi('C:/models/bad.ttukcad', { status: 'broken' })
    await mountApp(fake, fakeViewport().factory)
    expect(text('[data-cad-notice]')).toBe(en.noticeNotOk)
    expect(text('.cad-title')).toBe(en.untitled)
  })

  it('shows the no-WebGL screen with both remedies', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: bracketBytes() })
    await mountApp(fake, () => null)
    const screen = container.querySelector('.cad-nowebgl')
    expect(screen).not.toBeNull()
    expect(screen!.textContent).toContain(en.noWebGlTitle)
    expect(screen!.textContent).toContain(en.noWebGlBody)
    const remedies = [...screen!.querySelectorAll('li')].map((li) => li.textContent)
    expect(remedies).toEqual([en.noWebGlDriver, en.noWebGlAccel])
    // the drawing is still open: its title shows
    expect(text('.cad-title')).toBe('bracket')
  })

  it('menu Save calls cadApi.save with bytes that reopen', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: bracketBytes() })
    fake.saveResult = { ok: true, path: 'C:/models/bracket.ttukcad' }
    await mountApp(fake, fakeViewport().factory)
    await act(async () => fake.emit.saveRequest('save'))
    await until(() => fake.saves.length === 1, 'the save')
    await settle()
    const request = fake.saves[0]!
    expect(request.mode).toBe('save')
    const reopened = openCadFile(request.bytes)
    expect(reopened.status).toBe('ok')
    if (reopened.status === 'ok')
      expect(reopened.document.parts.map((p) => p.name)).toEqual(['Base'])
    // a save that reached the main process needs no extra answer
    expect(fake.acks).toEqual([])
  })

  it('a refused save shows the refusal and stays dirty', async () => {
    // a restored recovery copy opens with unsaved changes
    const fake = fakeApi('C:/models/bracket.ttukcad', {
      status: 'ok',
      bytes: bracketBytes(),
      restored: 'file',
    })
    fake.saveResult = { ok: false, error: 'not-reopenable' }
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mountApp(fake, fakeViewport().factory)
    expect(fake.dirty.at(-1)).toBe(true)
    await act(async () => fake.emit.saveRequest('save'))
    await until(() => fake.saves.length === 1, 'the save')
    await settle()
    expect(text('[data-cad-save-error]')).toBe(en.saveRefused)
    expect(text('.cad-state')).toBe(en.unsaved)
    expect(fake.dirty.at(-1)).toBe(true)
    expect(fake.acks).toEqual([false])
    error.mockRestore()
  })

  it('a save that fails to write shows a general failure and stays dirty', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', {
      status: 'ok',
      bytes: bracketBytes(),
      restored: 'file',
    })
    fake.saveResult = { ok: false, error: 'write-failed' }
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mountApp(fake, fakeViewport().factory)
    await act(async () => fake.emit.saveRequest('save'))
    await until(() => fake.saves.length === 1, 'the save')
    await settle()
    expect(text('[data-cad-save-error]')).toBe(en.saveFailed)
    expect(fake.dirty.at(-1)).toBe(true)
    // the next save that lands clears the line
    fake.saveResult = { ok: true, path: 'C:/models/bracket.ttukcad' }
    await act(async () => fake.emit.saveRequest('save'))
    await until(() => fake.saves.length === 2, 'the second save')
    await settle()
    expect(container.querySelector('[data-cad-save-error]')).toBeNull()
    expect(fake.dirty.at(-1)).toBe(false)
    error.mockRestore()
  })

  it('a canceled save dialog leaves the drawing unsaved without an error', async () => {
    const fake = fakeApi(null, null)
    fake.saveResult = { ok: true, canceled: true }
    await mountApp(fake, fakeViewport().factory)
    await act(async () => fake.emit.saveRequest('saveAs'))
    await until(() => fake.saves.length === 1, 'the save')
    await settle()
    expect(container.querySelector('[data-cad-save-error]')).toBeNull()
    expect(fake.acks).toEqual([false])
    expect(text('.cad-title')).toBe(en.untitled)
  })

  it('close-save request answers closeSaveResult(true) after a save', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', {
      status: 'ok',
      bytes: bracketBytes(),
      restored: 'file',
    })
    fake.saveResult = { ok: true, path: 'C:/models/bracket.ttukcad' }
    await mountApp(fake, fakeViewport().factory)
    await act(async () => fake.emit.closeSave())
    await until(() => fake.closeResults.length === 1, 'the close-save answer')
    expect(fake.saves).toHaveLength(1)
    expect(fake.closeResults).toEqual([true])
    await settle()
    expect(fake.dirty.at(-1)).toBe(false)
    expect(text('.cad-state')).toBe(en.saved)
  })

  it('close-save request on a clean drawing answers true without saving', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: bracketBytes() })
    await mountApp(fake, fakeViewport().factory)
    await act(async () => fake.emit.closeSave())
    await until(() => fake.closeResults.length === 1, 'the close-save answer')
    expect(fake.saves).toHaveLength(0)
    expect(fake.closeResults).toEqual([true])
  })

  it('a renamed file changes the title', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: bracketBytes() })
    await mountApp(fake, fakeViewport().factory)
    await act(async () => fake.emit.renamed('C:/models/holder.ttukcad'))
    await settle()
    expect(text('.cad-title')).toBe('holder')
  })

  it('answers the MCP server with the summary and the bytes', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: bracketBytes() })
    await mountApp(fake, fakeViewport().factory)
    await act(async () => fake.emit.summary())
    await act(async () => fake.emit.bytes())
    await settle()
    expect(fake.summaries).toHaveLength(1)
    expect('text' in fake.summaries[0]! && fake.summaries[0].text).toMatch(
      /^AI Drawing "bracket": 1 parts\n- Base \(box\)/,
    )
    const reply = fake.bytes[0]!
    expect('bytes' in reply && openCadFile(reply.bytes).status).toBe('ok')
  })

  it('sends the view commands to the 3D view and says on the status line why a drag was refused', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: bracketBytes() })
    const views: string[] = []
    let options: ViewportOptions | undefined
    const factory: ViewportFactory = (_host, _theme, opts) => {
      options = opts
      return {
        setTheme: () => {},
        showDocument: () => {},
        setSelection: () => {},
        setHandleMode: () => {},
        view: (command) => void views.push(command),
        setSketch: () => {},
        setMeasure: () => {},
        snapshot: async () => new Uint8Array(),
        dispose: () => {},
      }
    }
    await mountApp(fake, factory)
    for (const command of ['view-top', 'view-front', 'view-side', 'view-fit'] as const) {
      await act(async () => fake.emit.menu(command))
    }
    expect(views).toEqual(['top', 'front', 'side', 'fit'])

    // a release on a locked part: the engine refuses, the drawing stays as it was
    expect(text('[data-cad-message]')).toBe('')
    await act(async () =>
      options!.onEdit!('move', () => {
        throw new CadEditError('locked', 'x')
      }),
    )
    expect(text('[data-cad-message]')).toBe(en.editLocked)
    expect(text('.cad-state')).toBe(en.saved)
    await act(async () => options!.onRefused!(new HandleRefusedError('x')))
    expect(text('[data-cad-message]')).toBe(en.editNotScalable)
    // a change that lands clears the line and makes one undo step
    await act(async () => options!.onEdit!('move', (doc) => ({ ...doc, parts: [] })))
    expect(text('[data-cad-message]')).toBe('')
    expect(text('.cad-state')).toBe(en.unsaved)
  })
})

/** A 3D view that hands its options to the test and records what it was asked. */
function probeViewport() {
  const probe = {
    options: undefined as ViewportOptions | undefined,
    docs: [] as CadDocument[],
    sketches: [] as (readonly [number, number][] | null)[],
    measures: [] as (MeasureView | null)[],
  }
  const factory: ViewportFactory = (_host, _theme, opts) => {
    probe.options = opts
    return {
      setTheme: () => {},
      showDocument: (doc) => void probe.docs.push(doc),
      setSelection: () => {},
      setHandleMode: () => {},
      view: () => {},
      setSketch: (points) => void probe.sketches.push(points ? [...points] : null),
      setMeasure: (view) => void probe.measures.push(view),
      snapshot: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      dispose: () => {},
    }
  }
  return { factory, probe, doc: () => probe.docs.at(-1)! }
}

const click = async (selector: string): Promise<void> => {
  const el = container.querySelector<HTMLElement>(selector)
  if (!el) throw new Error(`no ${selector}`)
  await act(async () => el.click())
}

const press = async (key: string, init: KeyboardEventInit = {}): Promise<void> => {
  await act(async () => {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    )
  })
}

describe('the AI Drawing screen, editing (stage 3)', () => {
  afterEach(() => selection.clear())

  it('has the ribbon, the property panel, the AI slot and the status line', async () => {
    const fake = fakeApi(null, null)
    await mountApp(fake, probeViewport().factory)
    expect(container.querySelector('[data-ribbon-pane="home"]')).not.toBeNull()
    expect(container.querySelector('[data-cad-properties]')).not.toBeNull()
    expect(container.querySelector('[data-cad-ai-slot]')).not.toBeNull()
    expect(text('[data-cad-status-info]')).toBe(
      en.statusWorkplane
        .replace('{width}', '200')
        .replace('{depth}', '200')
        .replace('{snap}', '1')
        .replace('{grid}', '10'),
    )
  })

  it('a shape from the ribbon is one undo step and shows its size on the status line', async () => {
    const fake = fakeApi(null, null)
    const view = probeViewport()
    await mountApp(fake, view.factory)
    await click('[data-action="shape-box"]')
    expect(view.doc().parts).toHaveLength(1)
    expect(text('.cad-state')).toBe(en.unsaved)
    // the new part is selected: its size shows (no kernel runs here: the part box)
    expect(text('[data-cad-status-info]')).toContain('20 × 20 × 20 mm')
    await press('z', { ctrlKey: true })
    expect(view.doc().parts).toHaveLength(0)
  })

  it('menu Select All and Delete work on the drawing', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: bracketBytes() })
    const view = probeViewport()
    await mountApp(fake, view.factory)
    await act(async () => fake.emit.menu('select-all'))
    expect(selection.ids()).toEqual([view.doc().parts[0]!.id])
    await act(async () => fake.emit.menu('delete'))
    expect(view.doc().parts).toHaveLength(0)
    expect(text('.cad-state')).toBe(en.unsaved)
  })

  it('an arrow key on a locked part says it is locked and moves nothing', async () => {
    const locked = addShape(createDocument(), 'box', { name: 'Base' })
    const doc = { ...locked.doc, parts: locked.doc.parts.map((p) => ({ ...p, locked: true })) }
    const fake = fakeApi('C:/models/l.ttukcad', { status: 'ok', bytes: saveCadFile(doc) })
    const view = probeViewport()
    await mountApp(fake, view.factory)
    await act(async () => view.probe.options!.onPick!(locked.id, false))
    await press('ArrowRight')
    expect(text('[data-cad-message]')).toBe(en.editLocked)
    expect(view.doc().parts[0]!.position).toEqual([0, 0, 0])
    expect(text('.cad-state')).toBe(en.saved)
  })

  it('a kernel that does not start says so on the status line', async () => {
    const fake = fakeApi(null, null)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mountApp(fake, probeViewport().factory, () => Promise.reject(new Error('no wasm')))
    await settle()
    expect(text('[data-cad-message]')).toBe(en.kernelFailed)
    error.mockRestore()
  })

  it('a CAD program file shows the guide instead of the 3D view', async () => {
    const fake = fakeApi('C:/models/plan.dwg', { status: 'guide', ext: 'dwg', name: 'plan' })
    await mountApp(fake, probeViewport().factory)
    expect(container.querySelector('.cad-guide')).not.toBeNull()
    expect(text('.cad-guide-file')).toBe('plan.dwg')
    expect(container.querySelector('.cad-viewport')).toBeNull()
    expect(text('.cad-title')).toBe(en.untitled)
  })

  it('a 3MF that cannot be read opens an empty drawing with the reason', async () => {
    const fake = fakeApi('C:/models/x.3mf', {
      status: 'import',
      ext: '3mf',
      name: 'x',
      bytes: new Uint8Array([1, 2, 3]),
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mountApp(fake, probeViewport().factory)
    expect(text('[data-cad-notice]')).toBe(en.noticeImportFailed)
    warn.mockRestore()
    error.mockRestore()
  })

  it('the menu export of a PNG hands the view picture to the main process', async () => {
    const fake = fakeApi(null, null)
    await mountApp(fake, probeViewport().factory)
    await act(async () => fake.emit.exportRequest('png'))
    await until(() => fake.exports.length === 1, 'the export')
    expect(fake.exports[0]!.format).toBe('png')
    expect([...fake.exports[0]!.bytes]).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(fake.exports[0]!.suggestedName).toBe(en.untitled)
    // nothing to export as STL: the status line says so
    await act(async () => fake.emit.exportRequest('stl'))
    await until(() => text('[data-cad-message]') !== '', 'the notice')
    expect(text('[data-cad-message]')).toBe(en.exportEmpty)
  })

  it('the property panel edits the selected part in one step', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: bracketBytes() })
    const view = probeViewport()
    await mountApp(fake, view.factory)
    const id = view.doc().parts[0]!.id
    await act(async () => view.probe.options!.onPick!(id, false))
    const width = container.querySelector<HTMLInputElement>('[data-prop="dims.width"]')!
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(width, '44')
      width.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      width.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    const part = view.doc().parts[0]!
    expect(part.type === 'shape' && part.dims.width).toBe(44)
    expect(text('[data-cad-status-info]')).toContain('44 × 20 × 20 mm')
  })

  it('sketch mode sends workplane clicks to the outline and shows the sketch bar', async () => {
    const fake = fakeApi(null, null)
    const view = probeViewport()
    await mountApp(fake, view.factory)
    await click('[data-action="sketch"]')
    expect(view.probe.sketches.at(-1)).toEqual([])
    expect(container.querySelector('[data-cad-sketch]')).not.toBeNull()
    await act(async () => view.probe.options!.onWorkplanePoint!([0.4, 0.2]))
    await act(async () => view.probe.options!.onWorkplanePoint!([20, 0]))
    expect(view.probe.sketches.at(-1)).toEqual([
      [0, 0],
      [20, 0],
    ])
    // shortcuts do not edit the drawing while sketching
    await press('Delete')
    expect(text('[data-cad-message]')).toBe('')
    // the sketch button again leaves the mode
    await click('[data-action="sketch"]')
    expect(view.probe.sketches.at(-1)).toBeNull()
    expect(container.querySelector('[data-cad-sketch]')).toBeNull()
  })

  it('Text asks for the words and places a text shape standing on the plate', async () => {
    const fake = fakeApi(null, null)
    const view = probeViewport()
    await mountApp(fake, view.factory)
    const typeText = async (value: string): Promise<void> => {
      await click('[data-action="text"]')
      const input = container.querySelector<HTMLInputElement>('[data-text-input]')!
      await act(async () => {
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        set.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await click('[data-text-place]')
      await settle()
    }
    await typeText('Hi')
    const part = view.doc().parts[0]!
    expect(part.type === 'shape' && part.shape).toBe('text')
    expect(part.name).toBe('Hi')
    expect(part.type === 'shape' && part.text?.value).toBe('Hi')
    expect(selection.ids()).toEqual([part.id])
    // words the font has no letters for make nothing and say so
    await typeText('?')
    expect(view.doc().parts).toHaveLength(1)
    expect(text('[data-cad-message]')).toBe(en.editRefused)
  })

  it('a closed sketch becomes one sketched solid, selected, in one undo step', async () => {
    const fake = fakeApi(null, null)
    const view = probeViewport()
    await mountApp(fake, view.factory)
    await click('[data-action="sketch"]')
    for (const p of [
      [0, 0],
      [20, 0],
      [20, 20],
    ] as [number, number][]) {
      await act(async () => view.probe.options!.onWorkplanePoint!(p))
    }
    const close = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-cad-sketch] button'),
    ].find((b) => b.textContent === en.sketchClose)!
    await act(async () => close.click())
    const part = view.doc().parts[0]!
    expect(part.type).toBe('extrude')
    expect(part.name).toBe(en.partExtrude)
    expect(selection.ids()).toEqual([part.id])
    expect(container.querySelector('[data-cad-sketch]')).toBeNull()
    expect(view.probe.sketches.at(-1)).toBeNull()
    await press('z', { ctrlKey: true })
    expect(view.doc().parts).toHaveLength(0)
  })
})

// ---- stage 4: measuring, the dimension sheet and sending it to a document ----

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7])
const fakeRasterize: Rasterize = async () => PNG_BYTES
const realKernel = (): Promise<Kernel> => createKernel()

function twoPartBytes(title?: CadDocument['title']): Uint8Array {
  const base = addShape(createDocument(), 'box', {
    name: 'Base',
    dims: { width: 80, depth: 50, height: 30 },
  })
  const leg = addShape(base.doc, 'cylinder', { name: 'Leg', position: [100, 0, 0] })
  const ghost = addShape(leg.doc, 'box', { name: 'Ghost', position: [-100, 0, 0] })
  const doc = {
    ...ghost.doc,
    parts: ghost.doc.parts.map((p) => (p.name === 'Ghost' ? { ...p, hidden: true } : p)),
    title: title ?? ghost.doc.title,
  }
  return saveCadFile(doc)
}

const pane = (name: string, action: string): string =>
  `[data-ribbon-pane="${name}"] [data-action="${action}"]`

async function mountWithParts(fake: Fake, view = probeViewport()) {
  await mountApp(fake, view.factory, realKernel, fakeRasterize)
  await until(
    () => container.querySelector(pane('dims', 'send'))?.hasAttribute('disabled') === false,
    'the parts to be computed',
  )
  return view
}

function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

describe('the AI Drawing screen, dimensions and sending (stage 4)', () => {
  afterEach(() => {
    selection.clear()
    applyKoreanDocFeatures(null)
  })

  it('an empty drawing disables the sheet and the send button and says why', async () => {
    const fake = fakeApi(null, null)
    await mountApp(fake, probeViewport().factory, realKernel, fakeRasterize)
    for (const action of ['sheet', 'send']) {
      const button = container.querySelector<HTMLButtonElement>(pane('dims', action))!
      expect(button.disabled).toBe(true)
      expect(button.getAttribute('data-tip')).toBe(en.sheetEmpty)
    }
    // the measuring tool and the 3D picture need no parts
    expect(container.querySelector<HTMLButtonElement>(pane('dims', 'measure'))!.disabled).toBe(
      false,
    )
  })

  it('send builds the title, date, picture, rows and target from the drawing', async () => {
    applyKoreanDocFeatures(true)
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: twoPartBytes() })
    await mountWithParts(fake)
    expect(text(pane('dims', 'send'))).toBe(en.sendHwp)
    await click(pane('dims', 'send'))
    await until(() => fake.sends.length === 1, 'the send')
    const request = fake.sends[0]!
    expect(request.target).toBe('hwp')
    // no title in the title block: the tab title; no date: today
    expect(request.title).toBe('bracket')
    expect(request.date).toBe(localToday())
    expect([...request.drawingPng]).toEqual([...PNG_BYTES])
    expect(request.rows[0]).toEqual([en.tableName, en.tableWidth, en.tableDepth, en.tableHeight])
    // the hidden part is not in the table
    expect(request.rows.map((r) => r[0])).toEqual([en.tableName, 'Base', 'Leg'])
    expect(request.rows[1]).toEqual(['Base', '80', '50', '30'])
    await until(() => text('[data-cad-message]') === en.sendDone, 'the sent note')
    expect(container.querySelector('[data-cad-status]')!.hasAttribute('data-error')).toBe(false)
  })

  it('the title block of the drawing names the document and dates it', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', {
      status: 'ok',
      bytes: twoPartBytes({ name: 'Bracket A', date: '2026-12-01', scale: '' }),
    })
    await mountWithParts(fake)
    await click(pane('dims', 'send'))
    await until(() => fake.sends.length === 1, 'the send')
    expect(fake.sends[0]!.title).toBe('Bracket A')
    expect(fake.sends[0]!.date).toBe('2026-12-01')
  })

  it('the send button follows the Korean document switch', async () => {
    applyKoreanDocFeatures(true)
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: twoPartBytes() })
    await mountWithParts(fake)
    expect(text(pane('dims', 'send'))).toBe(en.sendHwp)
    expect(text(pane('home', 'send'))).toBe(en.sendHwp)
    await act(async () => applyKoreanDocFeatures(false))
    expect(text(pane('dims', 'send'))).toBe(en.sendDocx)
    await click(pane('dims', 'send'))
    await until(() => fake.sends.length === 1, 'the send')
    expect(fake.sends[0]!.target).toBe('docx')
  })

  it('a failed send says so in the UI language, never with the main process words', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: twoPartBytes() })
    fake.sendResult = { ok: false, error: 'rhwp engine crashed' }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await mountWithParts(fake)
    await click(pane('dims', 'send'))
    await until(() => text('[data-cad-message]') !== '', 'the failure')
    expect(text('[data-cad-message]')).toBe(en.sendFailed)
    expect(container.querySelector('[data-cad-status]')!.hasAttribute('data-error')).toBe(true)
    expect(container.textContent).not.toContain('rhwp engine crashed')
    // a thrown IPC error reads the same
    fake.sendResult = new Error('ipc broke')
    await click(pane('dims', 'send'))
    await until(() => fake.sends.length === 2, 'the second send')
    await settle()
    expect(text('[data-cad-message]')).toBe(en.sendFailed)
    expect(container.textContent).not.toContain('ipc broke')
    warn.mockRestore()
  })

  it('copy picture on the ribbon copies the 3D view', async () => {
    const fake = fakeApi(null, null)
    await mountApp(fake, probeViewport().factory, realKernel, fakeRasterize)
    await click(pane('dims', 'copy-picture'))
    await until(() => fake.copies.length === 1, 'the copy')
    expect([...fake.copies[0]!]).toEqual([0x89, 0x50, 0x4e, 0x47])
    await until(() => text('[data-cad-message]') === en.copyDone, 'the copied note')
    fake.copyResult = false
    await click(pane('dims', 'copy-picture'))
    await until(() => text('[data-cad-message]') === en.copyFailed, 'the refusal')
  })

  it('the sheet dialog opens from the ribbon and copies the sheet picture', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: twoPartBytes() })
    await mountWithParts(fake)
    await click(pane('dims', 'sheet'))
    expect(container.querySelector('[data-sheet-preview]')).not.toBeNull()
    await click('[data-sheet-copy]')
    await until(() => fake.copies.length === 1, 'the copy')
    expect([...fake.copies[0]!]).toEqual([...PNG_BYTES])
    await click('[data-sheet-close]')
    expect(container.querySelector('[data-sheet-preview]')).toBeNull()
  })

  it('measuring: clicks in the view read a distance, and a document change clears it', async () => {
    const fake = fakeApi('C:/models/bracket.ttukcad', { status: 'ok', bytes: twoPartBytes() })
    const view = await mountWithParts(fake)
    await click(pane('dims', 'measure'))
    expect(container.querySelector('[data-cad-measure]')).not.toBeNull()
    expect(view.probe.measures.at(-1)).not.toBeNull()
    // the 80 × 50 × 30 box: two corners of its long top edge, a little off
    const opts = view.probe.options!
    const evaluated = evaluateDocument(view.doc(), await realKernel())
    const b = meshBounds(evaluated[0]!.mesh!)
    await act(async () => opts.onMeasureClick!([b.min[0] + 0.3, b.min[1], b.max[2]], 2))
    await act(async () => opts.onMeasureClick!([b.max[0], b.min[1] + 0.2, b.max[2]], 2))
    expect(text('[data-cad-measure-reading]')).toBe('80 mm')
    expect(view.probe.measures.at(-1)?.label).toBe('80 mm')
    // a change to the drawing (here from the menu) takes the reading away
    await act(async () => fake.emit.menu('select-all'))
    await act(async () => fake.emit.menu('delete'))
    expect(text('[data-cad-measure-reading]')).toBe('')
    expect(view.probe.measures.at(-1)?.label ?? null).toBeNull()
    // Esc with nothing to clear leaves the tool
    await press('Escape')
    expect(container.querySelector('[data-cad-measure]')).toBeNull()
    expect(view.probe.measures.at(-1)).toBeNull()
  })
})
