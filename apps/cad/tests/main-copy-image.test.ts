// @vitest-environment node
/**
 * "Copy as picture": the renderer makes PNG bytes and the main process puts
 * them on the OS clipboard. Bytes that are not a PNG, or are over 10 MB, are
 * refused and the clipboard is left alone.
 */
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeContents, Handler } from './helpers/fake-electron'

const handlers = new Map<string, Handler>()
const writeImage = vi.fn()
const createFromBuffer = vi.fn((buffer: Buffer) => ({ fromBuffer: buffer }))

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
    clipboard: { writeImage: (...args: unknown[]) => writeImage(...args) },
    nativeImage: { createFromBuffer: (buffer: Buffer) => createFromBuffer(buffer) },
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

import { createCadView } from '../src/main/cad-main'
import { CAD_CHANNELS } from '../src/shared/ipc'

const view = () => createCadView(null).webContents as unknown as FakeContents

const copy = (bytes: unknown) => {
  // making a view registers the editor's channels
  const sender = view()
  return handlers.get(CAD_CHANNELS.copyImage)!({ sender }, bytes) as boolean
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const PNG = new Uint8Array([...SIGNATURE, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1])

beforeEach(() => {
  writeImage.mockClear()
  createFromBuffer.mockClear()
})

describe('copy as picture', () => {
  it('puts a PNG on the clipboard', async () => {
    expect(await copy(PNG)).toBe(true)
    expect(createFromBuffer).toHaveBeenCalledTimes(1)
    const buffer = createFromBuffer.mock.calls[0]![0]
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect([...buffer]).toEqual([...PNG])
    expect(writeImage).toHaveBeenCalledWith({ fromBuffer: buffer })
  })

  it('copy-image refuses bytes that are not PNG', async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46])
    expect(await copy(jpeg)).toBe(false)
    expect(await copy(new Uint8Array(SIGNATURE.slice(0, 4)))).toBe(false)
    expect(await copy('iVBORw0KGgo=')).toBe(false)
    expect(await copy(null)).toBe(false)
    expect(writeImage).not.toHaveBeenCalled()
  })

  it('refuses a picture over 10 MB', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1)
    big.set(PNG)
    expect(await copy(big)).toBe(false)
    expect(writeImage).not.toHaveBeenCalled()
  })
})
