// @vitest-environment node
/**
 * "Send to Hangul / Word" in the main process: the drawing's request is handed
 * to the shell's hook as it came; the shell checks it and opens the new tab.
 * Without a hook (a standalone window) the answer is an error, not a throw.
 */
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeContents, Handler } from './helpers/fake-electron'

const handlers = new Map<string, Handler>()

vi.mock('electron', async () => {
  const { fakeContents } = await import('./helpers/fake-electron')
  return {
    app: {
      on: vi.fn(),
      whenReady: () => new Promise(() => {}),
      getPath: (name: string) => join(tmpdir(), `cad-test-${name}`),
      getLocale: () => 'en-US',
    },
    dialog: { showSaveDialog: vi.fn(), showMessageBox: vi.fn() },
    clipboard: { writeImage: vi.fn() },
    nativeImage: { createFromBuffer: vi.fn() },
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

import { createCadView, setCadSendToDocumentHook } from '../src/main/cad-main'
import { CAD_CHANNELS } from '../src/shared/ipc'
import type { SendToDocumentResult } from '../src/shared/ipc'

const view = () => createCadView(null).webContents as unknown as FakeContents

const send = (contents: FakeContents, request: unknown) =>
  handlers.get(CAD_CHANNELS.sendToDocument)!(
    { sender: contents },
    request,
  ) as Promise<SendToDocumentResult>

const REQUEST = {
  target: 'hwp',
  title: '선반 받침',
  date: '2026-11-16',
  drawingPng: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  rows: [['Name', 'Width (mm)', 'Depth (mm)', 'Height (mm)']],
}

beforeEach(() => setCadSendToDocumentHook(null))

describe('send to a document', () => {
  it('answers an error when the shell has no hook', async () => {
    expect(await send(view(), REQUEST)).toEqual({
      ok: false,
      error: 'not available in this build',
    })
  })

  it('hands the request and the drawing tab to the hook and returns its answer', async () => {
    const hook = vi.fn(async () => ({ ok: true as const, title: '선반 받침' }))
    setCadSendToDocumentHook(hook)
    const contents = view()
    expect(await send(contents, REQUEST)).toEqual({ ok: true, title: '선반 받침' })
    expect(hook).toHaveBeenCalledTimes(1)
    expect(hook).toHaveBeenCalledWith(contents, REQUEST)
  })

  it('turns a hook that throws into an error answer', async () => {
    setCadSendToDocumentHook(async () => {
      throw new Error('engine failed')
    })
    expect(await send(view(), REQUEST)).toEqual({ ok: false, error: 'engine failed' })
  })
})
