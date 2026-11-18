// @vitest-environment node
/**
 * The AI panel's attachments on the main-process side, the same contract as
 * the other editors: which files are taken, text read through
 * `parseFileToText` in pages, a file open elsewhere with unsaved changes not
 * read at all, and a picture handed back as a picture.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
vi.mock('electron', () => ({
  app: {
    on: vi.fn(),
    whenReady: () => new Promise(() => {}),
    getPath: (name: string) => join(tmpdir(), `cad-attach-test-${name}`),
    getLocale: () => 'en-US',
  },
  dialog: {},
  shell: {},
  BrowserWindow: { fromWebContents: () => null, getFocusedWindow: () => null },
  ipcMain: {
    handle: (channel: string, fn: Handler) => handlers.set(channel, fn),
    on: (channel: string, fn: Handler) => handlers.set(channel, fn),
    removeHandler: vi.fn(),
  },
}))

const parsed = vi.fn()
vi.mock('@genoffice/file-parse', async (importOriginal) => {
  const real = await importOriginal<typeof import('@genoffice/file-parse')>()
  return {
    ...real,
    parseFileToText: (path: string) => {
      parsed(path)
      return real.parseFileToText(path)
    },
  }
})

import { UNSAVED_CHANGES_MESSAGE, setOpenFilesSource } from '@genoffice/electron-utils'
import { setUiLang } from '@genoffice/i18n'
import {
  ATTACHMENT_EXTS,
  collectAttachments,
  registerCadAttachmentIpc,
} from '../src/main/ai-attachments'
import { CAD_CHANNELS } from '../src/shared/ipc'
import type { AttachmentAddResult, AttachmentReadResult } from '../src/shared/ipc'

let dir: string
registerCadAttachmentIpc()

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'genoffice-cad-attach-'))
  parsed.mockClear()
  setUiLang('en')
})
afterEach(() => {
  setOpenFilesSource(null)
  rmSync(dir, { recursive: true, force: true })
})

const call = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  Promise.resolve(handlers.get(channel)!({ sender: { id: 7 } }, ...args) as T)

describe('which files are taken', () => {
  it('takes pictures, PDFs and text, as the other editors do', () => {
    for (const ext of ['png', 'jpg', 'pdf', 'docx', 'hwp', 'txt']) {
      expect(ATTACHMENT_EXTS.has(ext)).toBe(true)
    }
  })

  it('names the files it does not take, and why', async () => {
    const exe = join(dir, 'tool.exe')
    writeFileSync(exe, 'x')
    const ok = join(dir, 'spec.txt')
    writeFileSync(ok, 'width 80')
    const result = await call<AttachmentAddResult>(CAD_CHANNELS.filesAdd, [
      exe,
      join(dir, 'missing.txt'),
      42,
      ok,
    ])
    expect(result.accepted.map((a) => a.name)).toEqual(['spec.txt'])
    expect(result.rejected).toHaveLength(2)
    expect(result.rejected[0]).toMatch(/tool\.exe: \.exe files are not supported/)
    expect(collectAttachments([]).accepted).toEqual([])
  })

  it('refuses a picture over 5 MB', async () => {
    const big = join(dir, 'big.png')
    writeFileSync(big, new Uint8Array(5 * 1024 * 1024 + 1))
    const result = await call<AttachmentAddResult>(CAD_CHANNELS.filesAdd, [big])
    expect(result.accepted).toEqual([])
    expect(result.rejected[0]).toMatch(/big\.png: image exceeds the 5MB limit/)
  })

  it('keeps a pasted picture in a temporary file and attaches it', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const result = await call<AttachmentAddResult>(
      CAD_CHANNELS.filesAddPastedImage,
      png.buffer,
      'png',
    )
    expect(result.accepted).toHaveLength(1)
    expect(result.accepted[0]!.ext).toBe('png')
    const refused = await call<AttachmentAddResult>(
      CAD_CHANNELS.filesAddPastedImage,
      png.buffer,
      'exe',
    )
    expect(refused.accepted).toEqual([])
  })
})

describe('reading an attachment', () => {
  it('reads in pages and never more than 48,000 characters at once', async () => {
    const path = join(dir, 'long.txt')
    const text = 'abcdefghij'.repeat(6_000)
    writeFileSync(path, text)
    const first = await call<AttachmentReadResult>(CAD_CHANNELS.filesRead, path, 0, 24_000)
    expect(first).toMatchObject({ ok: true, totalChars: 60_000, offset: 0 })
    expect(first.text).toHaveLength(24_000)
    expect(parsed).toHaveBeenCalledWith(path)
    const next = await call<AttachmentReadResult>(CAD_CHANNELS.filesRead, path, 24_000, 24_000)
    expect(next.text).toBe(text.slice(24_000, 48_000))
    const greedy = await call<AttachmentReadResult>(CAD_CHANNELS.filesRead, path, 0, 1_000_000)
    expect(greedy.text).toHaveLength(48_000)
  })

  it('does not read a file open elsewhere with unsaved changes', async () => {
    const path = join(dir, 'notes.txt')
    writeFileSync(path, 'draft')
    setOpenFilesSource(() => [{ filePath: path, dirty: true }])
    const read = await call<AttachmentReadResult>(CAD_CHANNELS.filesRead, path, 0, 24_000)
    expect(read).toEqual({ ok: false, error: UNSAVED_CHANGES_MESSAGE })
    expect(parsed).not.toHaveBeenCalled()
    setOpenFilesSource(() => [{ filePath: path, dirty: false }])
    const again = await call<AttachmentReadResult>(CAD_CHANNELS.filesRead, path, 0, 24_000)
    expect(again.ok).toBe(true)
  })

  it('reads no text out of a picture: it goes to the model as a picture', async () => {
    const path = join(dir, 'shot.png')
    writeFileSync(path, new Uint8Array([0x89, 0x50, 0x4e, 0x47]))
    const read = await call<AttachmentReadResult>(CAD_CHANNELS.filesRead, path, 0, 24_000)
    expect(read.ok).toBe(false)
    const image = await call<{ ok: boolean; mime?: string; base64?: string }>(
      CAD_CHANNELS.filesReadImage,
      path,
    )
    expect(image).toMatchObject({ ok: true, mime: 'image/png', base64: 'iVBORw==' })
  })
})
