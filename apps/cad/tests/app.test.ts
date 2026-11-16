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
  openCadFile,
  saveCadFile,
} from '@genoffice/cad-engine'
import App from '../src/renderer/App'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { strings } from '../src/renderer/i18n/strings'
import { HandleRefusedError } from '../src/renderer/scene/handles'
import type { ViewportFactory, ViewportOptions } from '../src/renderer/scene/viewport'
import type {
  BytesReply,
  CadApi,
  CadMenuCommand,
  OpenFileResult,
  SaveCadRequest,
  SaveCadResult,
  SaveMode,
  SummaryReply,
} from '../src/shared/ipc'

const en = strings.en

interface Fake {
  api: CadApi
  saves: SaveCadRequest[]
  dirty: boolean[]
  acks: boolean[]
  closeResults: boolean[]
  summaries: SummaryReply[]
  bytes: BytesReply[]
  saveResult: SaveCadResult
  emit: {
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
    emit: {
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

async function mountApp(fake: Fake, viewportFactory: ViewportFactory): Promise<void> {
  ;(window as unknown as { cadApi: CadApi }).cadApi = fake.api
  container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      createElement(LocaleProvider, {
        initial: 'en',
        // the boolean kernel never starts here: the screen tests need no wasm
        children: createElement(App, { viewportFactory, kernelFactory: pendingKernel }),
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
        dispose: () => {},
      }
    }
    await mountApp(fake, factory)
    for (const command of ['view-top', 'view-front', 'view-side', 'view-fit'] as const) {
      await act(async () => fake.emit.menu(command))
    }
    expect(views).toEqual(['top', 'front', 'side', 'fit'])

    // a release on a locked part: the engine refuses, the drawing stays as it was
    expect(text('[data-cad-status]')).toBe('')
    await act(async () =>
      options!.onEdit!('move', () => {
        throw new CadEditError('locked', 'x')
      }),
    )
    expect(text('[data-cad-status]')).toBe(en.editLocked)
    expect(text('.cad-state')).toBe(en.saved)
    await act(async () => options!.onRefused!(new HandleRefusedError('x')))
    expect(text('[data-cad-status]')).toBe(en.editNotScalable)
    // a change that lands clears the line and makes one undo step
    await act(async () => options!.onEdit!('move', (doc) => ({ ...doc, parts: [] })))
    expect(text('[data-cad-status]')).toBe('')
    expect(text('.cad-state')).toBe(en.unsaved)
  })
})
