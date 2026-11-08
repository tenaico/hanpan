// @vitest-environment node
/**
 * P4: PDF printing had no printer choice or copy count, unlike the Excel
 * print dialog. The view now lists the printers Chromium knows and prints
 * the rendered pages to a chosen one with copies and collation. These tests
 * use a fake printer list and a fake print call; nothing reaches a printer.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PDF_CHANNELS } from '../src/shared/ipc'
import { parsePrintToDevice, printOptionsForDevice } from '../src/main/print-device'

type Handler = (event: { sender: FakeContents }, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
let lastContents: FakeContents
let nextId = 500
class FakeContents {
  id = ++nextId
  once = vi.fn()
  on = vi.fn()
  setWindowOpenHandler = vi.fn()
  loadURL = vi.fn()
  loadFile = vi.fn()
  isDestroyed = () => false
  send = vi.fn()
  getPrintersAsync = vi.fn(async () => [
    { name: 'Office-Laser', displayName: '사무실 레이저', description: '', options: {} },
    { name: 'Microsoft Print to PDF', displayName: '', description: '', options: {} },
  ])
  print = vi.fn((_options: unknown, done: (ok: boolean, reason: string) => void) => done(true, ''))
}
vi.mock('electron', () => ({
  app: { on: vi.fn(), whenReady: () => new Promise(() => {}) },
  dialog: {},
  shell: {},
  BrowserWindow: { fromWebContents: () => null },
  WebContentsView: class {
    webContents = (lastContents = new FakeContents())
  },
  ipcMain: {
    handle: (channel: string, fn: Handler) => handlers.set(channel, fn),
    on: (channel: string, fn: Handler) => handlers.set(channel, fn),
    removeHandler: vi.fn(),
  },
}))
import { createPdfView } from '../src/main/pdf-main'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function view(): Promise<FakeContents> {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-print-'))
  dirs.push(dir)
  const source = join(dir, 'doc.pdf')
  const pdf = await PDFDocument.create()
  pdf.addPage([300, 200])
  await writeFile(source, await pdf.save())
  createPdfView(source)
  return lastContents
}

describe('parsePrintToDevice', () => {
  it('keeps a printer name, 1-999 copies and collation', () => {
    expect(parsePrintToDevice({ deviceName: 'Office-Laser', copies: 3, collate: false })).toEqual({
      deviceName: 'Office-Laser',
      copies: 3,
      collate: false,
    })
    // '' = the system default printer
    expect(parsePrintToDevice({ deviceName: '', copies: 1, collate: true })?.deviceName).toBe('')
  })
  it('refuses anything else', () => {
    for (const bad of [
      null,
      {},
      { deviceName: 1, copies: 1, collate: true },
      { deviceName: 'x', copies: 0, collate: true },
      { deviceName: 'x', copies: 1000, collate: true },
      { deviceName: 'x', copies: 1.5, collate: true },
      { deviceName: 'x'.repeat(600), copies: 1, collate: true },
      { deviceName: 'x', copies: 1, collate: 'yes' },
    ]) {
      expect(parsePrintToDevice(bad)).toBeNull()
    }
  })
})

describe('printOptionsForDevice', () => {
  it('prints without the system dialog to the chosen printer', () => {
    expect(printOptionsForDevice({ deviceName: 'Office-Laser', copies: 2, collate: true })).toEqual(
      {
        silent: true,
        printBackground: true,
        deviceName: 'Office-Laser',
        copies: 2,
        collate: true,
      },
    )
    // the default printer: no deviceName, Chromium picks the system default
    expect(printOptionsForDevice({ deviceName: '', copies: 1, collate: true })).not.toHaveProperty(
      'deviceName',
    )
  })
})

describe('print handlers', () => {
  it('lists the printers the view knows, display name first', async () => {
    const wc = await view()
    const list = await handlers.get(PDF_CHANNELS.listPrinters)!({ sender: wc })
    expect(list).toEqual([
      { name: 'Office-Laser', displayName: '사무실 레이저' },
      { name: 'Microsoft Print to PDF', displayName: 'Microsoft Print to PDF' },
    ])
  })

  it('prints the view to the chosen printer (fake print call)', async () => {
    const wc = await view()
    const result = await handlers.get(PDF_CHANNELS.printToDevice)!(
      { sender: wc },
      { deviceName: 'Office-Laser', copies: 2, collate: false },
    )
    expect(result).toEqual({ ok: true })
    expect(wc.print).toHaveBeenCalledTimes(1)
    expect(wc.print.mock.calls[0]![0]).toMatchObject({
      silent: true,
      deviceName: 'Office-Laser',
      copies: 2,
      collate: false,
    })
  })

  it('reports a failed or cancelled job, and refuses a bad request or another sender', async () => {
    const wc = await view()
    wc.print.mockImplementationOnce((_o, done) => done(false, 'Print job canceled'))
    const call = (sender: FakeContents, request: unknown) =>
      handlers.get(PDF_CHANNELS.printToDevice)!({ sender }, request)
    expect(await call(wc, { deviceName: '', copies: 1, collate: true })).toEqual({
      ok: false,
      canceled: true,
    })
    wc.print.mockImplementationOnce((_o, done) => done(false, 'Printer is offline'))
    expect(await call(wc, { deviceName: '', copies: 1, collate: true })).toEqual({
      ok: false,
      error: 'Printer is offline',
    })
    expect(await call(wc, { deviceName: 'x', copies: 0, collate: true })).toEqual({
      ok: false,
      error: 'invalid request',
    })
    const stranger = new FakeContents()
    expect(await call(stranger, { deviceName: '', copies: 1, collate: true })).toEqual({
      ok: false,
      error: 'not a PDF view',
    })
    expect(await handlers.get(PDF_CHANNELS.listPrinters)!({ sender: stranger })).toEqual([])
    expect(wc.print).toHaveBeenCalledTimes(2)
    expect(stranger.print).not.toHaveBeenCalled()
  })
})
