// @vitest-environment node
/**
 * 0.17 UI/UX review v2, hwp-design #7 and #8: an exported PDF or Word file opened in a new tab
 * and took the user out of the Hangul document they were working on, the page pictures opened
 * a folder, and a save said nothing. The main process now only writes the file and answers with
 * its path; the tab shows a notice whose buttons open the file or its folder, for a file this
 * tab wrote and no other.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
const showSaveDialog = vi.fn(async (..._args: unknown[]) => ({
  canceled: false,
  filePath: undefined as string | undefined,
}))
const showOpenDialog = vi.fn(async (..._args: unknown[]) => ({
  canceled: false,
  filePaths: [] as string[],
}))
const showItemInFolder = vi.fn()

vi.mock('electron', () => ({
  app: {
    on: vi.fn(),
    whenReady: () => new Promise(() => {}),
    getPath: (name: string) => join(tmpdir(), `hwp-test-${name}`),
    getLocale: () => 'en-US',
  },
  dialog: {
    showMessageBox: vi.fn(async () => ({ response: 0 })),
    showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
    showOpenDialog: (...args: unknown[]) => showOpenDialog(...args),
  },
  shell: {
    openExternal: vi.fn(async () => {}),
    showItemInFolder: (path: string) => showItemInFolder(path),
  },
  protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
  net: {},
  ipcRenderer: {},
  webUtils: {},
  BrowserWindow: { fromWebContents: () => null, getFocusedWindow: () => null },
  WebContentsView: class {
    webContents = {
      id: Math.floor(Math.random() * 1e9),
      isDestroyed: () => false,
      setWindowOpenHandler: () => {},
      loadURL: async () => {},
      send: () => {},
      on: () => {},
      once: () => {},
    }
  },
  ipcMain: {
    handle: (channel: string, fn: Handler) => handlers.set(channel, fn),
    on: (channel: string, fn: Handler) => handlers.set(channel, fn),
    removeHandler: vi.fn(),
  },
}))

vi.mock('@genoffice/file-parse', () => ({
  hwpToText: vi.fn(async () => ''),
  parseFileToText: vi.fn(async () => ({ kind: 'text', text: '' })),
  ATTACHABLE_EXTS: new Set<string>(),
  ATTACHABLE_IMAGE_EXTS: new Set<string>(),
  ATTACHABLE_MAX_BYTES: 25 * 1024 * 1024,
  ATTACHABLE_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
}))

vi.mock('../src/main/docx-export', () => ({
  badDocxHtml: () => null,
  htmlToDocx: vi.fn(async () => Uint8Array.from([0x50, 0x4b, 0x03, 0x04])),
}))

vi.mock('../src/main/print-document', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/main/print-document')>()),
  printJobToPdf: vi.fn(async () => Buffer.from('%PDF-1.7')),
}))

import { configureHwpRuntime, createHwpView } from '../src/main/hwp-main'
import { HWP_CHANNELS } from '../src/shared/ipc'
import type { PrintResult } from '../src/shared/ipc'

let dir: string
const openGeneratedPath = vi.fn((_path: string) => true)

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'genoffice-hwp-export-notice-'))
  openGeneratedPath.mockClear()
  showItemInFolder.mockClear()
  configureHwpRuntime({ preloadPath: '', openGeneratedPath })
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const call = <T>(channel: string, sender: unknown, ...args: unknown[]): T =>
  handlers.get(channel)!({ sender }, ...args) as T

const PAGE = { svg: '<svg width="10" height="10"></svg>', width: 10, height: 10 }

describe('an export', () => {
  it('writes the PDF and stays in the document: nothing opens by itself', async () => {
    const tab = createHwpView().webContents
    const target = join(dir, 'out.pdf')
    showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: target })
    const result = await call<Promise<PrintResult>>(HWP_CHANNELS.printPages, tab, {
      mode: 'pdf',
      pages: [PAGE],
      images: [],
    })
    expect(result).toEqual({ ok: true, path: target })
    expect(openGeneratedPath).not.toHaveBeenCalled()
    expect(showItemInFolder).not.toHaveBeenCalled()
  })

  it('writes the Word file and stays in the document', async () => {
    const tab = createHwpView().webContents
    const target = join(dir, 'out.docx')
    showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: target })
    const result = await call<Promise<PrintResult>>(
      HWP_CHANNELS.exportDocx,
      tab,
      '<!DOCTYPE html><p>a</p>',
    )
    expect(result).toEqual({ ok: true, path: target })
    expect(openGeneratedPath).not.toHaveBeenCalled()
    expect(showItemInFolder).not.toHaveBeenCalled()
  })

  it('writes the page pictures without opening their folder', async () => {
    const tab = createHwpView().webContents
    showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [dir] })
    const result = await call<Promise<PrintResult>>(HWP_CHANNELS.savePngs, tab, {
      mode: 'png',
      pngs: [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    })
    expect(result.ok).toBe(true)
    expect(showItemInFolder).not.toHaveBeenCalled()
  })
})

describe("the notice's buttons", () => {
  it('open a file the tab exported, in the app, or show it in its folder', async () => {
    const tab = createHwpView().webContents
    const target = join(dir, 'shown.pdf')
    showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: target })
    await call<Promise<PrintResult>>(HWP_CHANNELS.printPages, tab, {
      mode: 'pdf',
      pages: [PAGE],
      images: [],
    })
    expect(await call(HWP_CHANNELS.revealOutput, tab, target, 'open')).toBe(true)
    expect(openGeneratedPath).toHaveBeenCalledWith(target)
    expect(await call(HWP_CHANNELS.revealOutput, tab, target, 'folder')).toBe(true)
    expect(showItemInFolder).toHaveBeenCalledWith(target)
  })

  it('refuse a path the tab did not write, and another tab’s file', async () => {
    const tab = createHwpView().webContents
    const other = createHwpView().webContents
    const target = join(dir, 'mine.docx')
    showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: target })
    await call<Promise<PrintResult>>(HWP_CHANNELS.exportDocx, tab, '<!DOCTYPE html><p>a</p>')
    expect(await call(HWP_CHANNELS.revealOutput, tab, join(dir, 'else.exe'), 'open')).toBe(false)
    expect(await call(HWP_CHANNELS.revealOutput, other, target, 'folder')).toBe(false)
    expect(await call(HWP_CHANNELS.revealOutput, tab, target, 'run')).toBe(false)
    expect(openGeneratedPath).not.toHaveBeenCalled()
    expect(showItemInFolder).not.toHaveBeenCalled()
  })
})

describe("the About box's licence button (#6)", () => {
  it("opens the app's open-source licence list", () => {
    const openLicenseNotices = vi.fn()
    configureHwpRuntime({ preloadPath: '', openLicenseNotices })
    const tab = createHwpView().webContents
    call(HWP_CHANNELS.openLicenses, tab)
    expect(openLicenseNotices).toHaveBeenCalledTimes(1)
  })
})
