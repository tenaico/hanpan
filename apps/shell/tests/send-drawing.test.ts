/**
 * AI Drawing → "send to Hangul / Word": the shell writes the dimension sheet
 * and its table of sizes as a new HWPX or DOCX and opens it as an untitled
 * copy tab. No link is recorded and nothing is synced; the copy's temp folder
 * goes when its tab goes, or at once when the tab does not open.
 */
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseDocx } from '@genoffice/docx-engine'
import type { HwpEngine } from '@genoffice/hanpan-core'
import { loadEngine } from '../../../packages/hanpan-core/tests/engine'
import {
  checkDrawingRequest,
  createDrawingSender,
  drawingBlocks,
  type SendDrawingDeps,
} from '../src/main/hanpan/send-drawing'
import type { TabContents } from '../src/main/hanpan/link-store'

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}
/** A real white RGB PNG of the given size. */
function png(width: number, height: number): Uint8Array {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const raw = Buffer.alloc((width * 3 + 1) * height, 0xff)
  for (let y = 0; y < height; y++) raw[y * (width * 3 + 1)] = 0
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', new Uint8Array()),
    ]),
  )
}

const ROWS = [
  ['이름', '가로(mm)', '세로(mm)', '높이(mm)'],
  ['상자', '80', '60', '40'],
  ['원기둥', '30', '30', '50'],
]

function request(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    target: 'docx',
    title: '선반 받침',
    date: '2026-11-16',
    drawingPng: png(40, 30),
    rows: ROWS,
    ...overrides,
  }
}

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

interface Harness {
  deps: SendDrawingDeps
  opened: Array<Parameters<SendDrawingDeps['openCopy']>[0]>
  written: Map<string, Uint8Array>
  made: string[]
  destroy(): void
}

function harness(opens = true): Harness {
  const opened: Harness['opened'] = []
  const written = new Map<string, Uint8Array>()
  const made: string[] = []
  const listeners: Array<() => void> = []
  const contents = {
    id: 7,
    once: (event: string, listener: () => void) => {
      if (event === 'destroyed') listeners.push(listener)
    },
  } as unknown as TabContents
  const deps: SendDrawingDeps = {
    loadHwpEngine: loadEngine as () => Promise<HwpEngine>,
    makeCopyDir: async () => {
      const dir = mkdtempSync(join(tmpdir(), 'hp-drawing-'))
      dirs.push(dir)
      made.push(dir)
      return dir
    },
    writeFile: async (path, bytes) => {
      written.set(path, bytes)
      await writeFile(path, bytes)
    },
    removeDir: (dir) => rm(dir, { recursive: true, force: true }),
    openCopy: async (copy) => {
      opened.push(copy)
      return opens ? { tabId: 'tab-1', contents } : null
    },
    newId: () => 'id',
    now: () => 0,
  }
  return { deps, opened, written, made, destroy: () => listeners.forEach((l) => l()) }
}

describe('the drawing request', () => {
  it('blocks are title, date, image, table in that order', () => {
    const blocks = drawingBlocks(checkDrawingRequest(request()))
    expect(blocks.map((b) => b.kind)).toEqual(['title', 'meta', 'image', 'table'])
    expect(blocks[0]).toMatchObject({ kind: 'title', text: '선반 받침' })
    expect(blocks[1]).toMatchObject({ kind: 'meta', text: '2026-11-16' })
    expect(blocks[2]).toMatchObject({
      kind: 'image',
      image: { mime: 'image/png', width: 40, height: 30 },
    })
    expect(blocks[3]).toEqual({ kind: 'table', rows: ROWS, header: true })
  })

  it('a request with a non-PNG picture is refused', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46])
    expect(() => checkDrawingRequest(request({ drawingPng: jpeg }))).toThrow(/png/i)
    expect(() => checkDrawingRequest(request({ drawingPng: 'iVBORw0KGgo=' }))).toThrow(/png/i)
  })

  it('refuses a picture over 10 MB, a bad target, an over-long title and too many rows', () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1)
    big.set(png(1, 1))
    expect(() => checkDrawingRequest(request({ drawingPng: big }))).toThrow(/10 MB/)
    expect(() => checkDrawingRequest(request({ target: 'slides' }))).toThrow(/target/)
    expect(() => checkDrawingRequest(request({ title: 'x'.repeat(201) }))).toThrow(/title/)
    expect(() => checkDrawingRequest(request({ title: '  ' }))).toThrow(/title/)
    expect(() => checkDrawingRequest(request({ date: '1'.repeat(41) }))).toThrow(/date/)
    const many = [ROWS[0]!, ...Array.from({ length: 501 }, () => ['a', '1', '2', '3'])]
    expect(() => checkDrawingRequest(request({ rows: many }))).toThrow(/rows/)
    expect(() => checkDrawingRequest(request({ rows: [['a', 'b', 'c', 'd', 'e']] }))).toThrow(
      /rows/,
    )
    expect(() => checkDrawingRequest(request({ rows: [['a', 2, 'c', 'd']] }))).toThrow(/rows/)
    expect(() => checkDrawingRequest(request({ rows: [['x'.repeat(201)]] }))).toThrow(/rows/)
    expect(() => checkDrawingRequest(request({ rows: [] }))).toThrow(/rows/)
  })

  it('keeps only the known fields', () => {
    const checked = checkDrawingRequest(request({ extra: 'dropped' }))
    expect(Object.keys(checked).sort()).toEqual(['date', 'drawingPng', 'rows', 'target', 'title'])
  })

  it('leaves the date line out when there is no date', () => {
    const blocks = drawingBlocks(checkDrawingRequest(request({ date: '' })))
    expect(blocks.map((b) => b.kind)).toEqual(['title', 'image', 'table'])
  })
})

describe('sending the drawing', () => {
  it('docx target writes a docx that the docx engine reads back with one image and one table', async () => {
    const h = harness()
    const result = await createDrawingSender(h.deps)(request(), null)
    expect(result).toEqual({ ok: true, title: '선반 받침' })
    expect(h.opened).toHaveLength(1)
    const copy = h.opened[0]!
    expect(copy).toMatchObject({ editor: 'docs', fileName: '선반 받침.docx', title: '선반 받침' })
    expect(copy.path).toBe(join(copy.dir, copy.fileName))
    expect(h.written.get(copy.path)).toBe(copy.bytes)
    const doc = await parseDocx(copy.bytes)
    expect(doc.blocks.map((b) => b.type).filter((t) => t === 'image' || t === 'table')).toEqual([
      'image',
      'table',
    ])
    expect(JSON.stringify(doc.blocks)).toContain('원기둥')
    const zip = await JSZip.loadAsync(copy.bytes)
    expect(
      Object.values(zip.files).filter((f) => !f.dir && f.name.startsWith('word/media/')),
    ).toHaveLength(1)
    const xml = await zip.file('word/document.xml')!.async('string')
    expect(xml.match(/<pic:pic\b/g)).toHaveLength(1)
  })

  it('hwp target writes hwpx bytes and opens an hwp copy', async () => {
    const h = harness()
    const result = await createDrawingSender(h.deps)(request({ target: 'hwp' }), null)
    expect(result).toEqual({ ok: true, title: '선반 받침' })
    const copy = h.opened[0]!
    expect(copy).toMatchObject({ editor: 'hwp', fileName: '선반 받침.hwpx', title: '선반 받침' })
    // HWPX is a zip package
    expect([...copy.bytes.subarray(0, 2)]).toEqual([0x50, 0x4b])
    const zip = await JSZip.loadAsync(copy.bytes)
    const names = Object.keys(zip.files)
    expect(names.some((n) => /^BinData\/.+\.png$/i.test(n))).toBe(true)
    const section = await zip.file('Contents/section0.xml')!.async('string')
    expect(section).toContain('<hp:tbl')
    expect(section).toContain('원기둥')
  })

  it('removes the temp folder when the new tab is closed', async () => {
    const h = harness()
    await createDrawingSender(h.deps)(request(), null)
    const dir = h.made[0]!
    expect(existsSync(dir)).toBe(true)
    h.destroy()
    await vi.waitFor(() => expect(existsSync(dir)).toBe(false))
  })

  it('when the tab does not open the temp folder is removed', async () => {
    const h = harness(false)
    const result = await createDrawingSender(h.deps)(request({ target: 'hwp' }), null)
    expect(result).toEqual({ ok: false, error: 'the new tab did not open' })
    expect(h.made).toHaveLength(1)
    expect(existsSync(h.made[0]!)).toBe(false)
  })

  it('reports an error and leaves no folder when the hwp engine fails to load', async () => {
    const h = harness()
    h.deps.loadHwpEngine = () => Promise.reject(new Error('wasm missing'))
    const result = await createDrawingSender(h.deps)(request({ target: 'hwp' }), null)
    expect(result).toEqual({ ok: false, error: 'wasm missing' })
    expect(h.opened).toHaveLength(0)
    for (const dir of h.made) expect(existsSync(dir)).toBe(false)
  })

  it('a bad request opens nothing and makes no folder', async () => {
    const h = harness()
    const result = await createDrawingSender(h.deps)(
      request({ drawingPng: new Uint8Array(4) }),
      null,
    )
    expect(result.ok).toBe(false)
    expect(h.made).toHaveLength(0)
    expect(h.opened).toHaveLength(0)
  })
})
