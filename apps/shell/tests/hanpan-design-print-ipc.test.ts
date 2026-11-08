// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 디자인 보드 인쇄(0.17): 보드는 PNG·PDF 내보내기와 같은 150 dpi PNG를 보내고,
 * 뒷단이 그 그림으로 인쇄 페이지를 만들어 시스템 인쇄 대화상자로 보낸다.
 * 보드 창이 아닌 곳의 요청, PNG가 아닌 것, 엉뚱한 용지는 받지 않는다.
 */

type Handler = (event: { sender: unknown }, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
const webContents = { id: 7, setWindowOpenHandler: vi.fn() }

vi.mock('electron', () => ({
  app: { getPath: () => '/home/me/Documents' },
  screen: { getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }) },
  BrowserWindow: class {
    webContents = webContents
    isDestroyed = () => false
    removeMenu() {}
    once() {}
    on() {}
    loadFile() {}
    loadURL() {}
  },
  clipboard: {},
  dialog: {},
  shell: {},
  ipcMain: { handle: (channel: string, fn: Handler) => handlers.set(channel, fn) },
  nativeImage: {},
}))
vi.mock('@genoffice/ai-search', () => ({}))
vi.mock('@genoffice/electron-utils/fetch-image-bytes', () => ({}))

import {
  DESIGN_CHANNELS,
  configureDesignWindow,
  openDesignWindow,
} from '../src/main/hanpan/design-window'

const printHtml = vi.fn()
configureDesignWindow({
  parentWindow: () => null,
  lang: () => 'ko',
  theme: () => 'light',
  title: () => 'Design',
  gonguKey: () => '',
  printHtml,
})
openDesignWindow()

const call = (channel: string, sender: unknown, ...args: unknown[]) =>
  handlers.get(channel)!({ sender }, ...args)

/** a PNG head that says w × h */
function png(w: number, h: number): Uint8Array {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  new DataView(bytes.buffer).setUint32(16, w)
  new DataView(bytes.buffer).setUint32(20, h)
  return bytes
}

const A4 = { widthMm: 210, heightMm: 297, marginMm: 0 }

beforeEach(() => {
  printHtml.mockReset()
  printHtml.mockResolvedValue({ ok: true })
})

describe('design window print', () => {
  it('prints every page the board sent on the paper it chose, one sheet each', async () => {
    const pages = [png(1240, 1754), png(1240, 1754)]
    expect(await call(DESIGN_CHANNELS.print, webContents, pages, A4)).toEqual({ ok: true })
    const [html, sheet] = printHtml.mock.calls[0]!
    expect(sheet).toEqual(A4)
    expect(html).toContain('@page { size: 210mm 297mm; margin: 0; }')
    expect((html as string).match(/class="page"/g)).toHaveLength(2)
    expect(html).toContain(`data:image/png;base64,${Buffer.from(pages[0]!).toString('base64')}`)
  })

  it('passes a canceled system dialog back as canceled', async () => {
    printHtml.mockResolvedValue({ ok: true, canceled: true })
    expect(await call(DESIGN_CHANNELS.print, webContents, [png(10, 10)], A4)).toEqual({
      ok: true,
      canceled: true,
    })
  })

  it('answers only the board, and only with PNG pages and a sane paper', async () => {
    const stranger = { id: 99 }
    expect(await call(DESIGN_CHANNELS.print, stranger, [png(10, 10)], A4)).toMatchObject({
      ok: false,
    })
    for (const [pages, sheet] of [
      [[], A4],
      [[new Uint8Array([1, 2, 3])], A4],
      [[png(10, 10)], { widthMm: 0, heightMm: 0, marginMm: 0 }],
      ['not pages', A4],
    ] as const)
      expect(await call(DESIGN_CHANNELS.print, webContents, pages, sheet)).toMatchObject({
        ok: false,
      })
    expect(printHtml).not.toHaveBeenCalled()
  })
})
