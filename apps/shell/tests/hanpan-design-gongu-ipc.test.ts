// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The design window's Gongu channels (docs/plans/gongu-images.md 4.5): main
 * searches with the key from Settings, fetches the thumbnails and the picture
 * from the service's own addresses, and answers only the design window.
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
  nativeImage: {
    createFromBuffer: (buf: Buffer) => ({
      isEmpty: () => buf.toString() === 'not a picture',
      getSize: () => ({ width: 1120, height: 552 }),
    }),
  },
}))

const gonguImageSearch = vi.fn()
const gonguImageDetail = vi.fn()
vi.mock('@genoffice/ai-search', () => ({
  gonguImageSearch: (...args: unknown[]) => gonguImageSearch(...args),
  gonguImageDetail: (...args: unknown[]) => gonguImageDetail(...args),
}))

const fetchImageBytes = vi.fn()
vi.mock('@genoffice/electron-utils/fetch-image-bytes', () => ({
  fetchImageBytes: (...args: unknown[]) => fetchImageBytes(...args),
}))

import {
  DESIGN_CHANNELS,
  configureDesignWindow,
  openDesignWindow,
} from '../src/main/hanpan/design-window'

const JPEG = { base64: Buffer.from('jpeg bytes').toString('base64'), mime: 'image/jpeg' }

configureDesignWindow({
  parentWindow: () => null,
  lang: () => 'ko',
  theme: () => 'light',
  title: () => 'Design',
  gonguKey: () => 'the-key',
})
openDesignWindow()

const call = (channel: string, sender: unknown, ...args: unknown[]) =>
  handlers.get(channel)!({ sender }, ...args)

beforeEach(() => {
  gonguImageSearch.mockReset()
  gonguImageDetail.mockReset()
  fetchImageBytes.mockReset()
})

describe('design window Gongu channels', () => {
  it('searches with the key from Settings and hands back thumbnails as data URLs', async () => {
    gonguImageSearch.mockResolvedValue({
      ok: true,
      value: {
        total: 86,
        works: [
          { workId: '1', title: 'a', thumbUrl: 'https://gongu.copyright.or.kr/t/1' },
          { workId: '2', title: 'b' },
        ],
      },
    })
    fetchImageBytes.mockResolvedValue(JPEG)
    const answer = await call(DESIGN_CHANNELS.gonguSearch, webContents, '호랑이', 3)
    expect(gonguImageSearch).toHaveBeenCalledWith('호랑이', 'the-key', { page: 3, perPage: 20 })
    expect(fetchImageBytes).toHaveBeenCalledTimes(1)
    expect(fetchImageBytes).toHaveBeenCalledWith('https://gongu.copyright.or.kr/t/1')
    expect(answer).toEqual({
      ok: true,
      total: 86,
      works: [
        {
          workId: '1',
          title: 'a',
          thumbUrl: 'https://gongu.copyright.or.kr/t/1',
          thumb: `data:image/jpeg;base64,${JPEG.base64}`,
        },
        { workId: '2', title: 'b', thumb: null },
      ],
    })
  })

  it('passes a failure kind through and fetches nothing', async () => {
    gonguImageSearch.mockResolvedValue({ ok: false, error: 'quota', message: 'x' })
    expect(await call(DESIGN_CHANNELS.gonguSearch, webContents, 'a', 1)).toEqual({
      ok: false,
      error: 'quota',
    })
    expect(fetchImageBytes).not.toHaveBeenCalled()
  })

  it('inserts from the address in the work record, keeping the file as it came', async () => {
    gonguImageDetail.mockResolvedValue({
      ok: true,
      value: { workId: '4534', title: '호작도', imageUrl: 'https://gongu.copyright.or.kr/l/4534' },
    })
    fetchImageBytes.mockResolvedValue(JPEG)
    const answer = await call(DESIGN_CHANNELS.gonguPicture, webContents, '4534')
    expect(gonguImageDetail).toHaveBeenCalledWith('4534', 'the-key')
    expect(fetchImageBytes).toHaveBeenCalledWith('https://gongu.copyright.or.kr/l/4534')
    expect(answer).toEqual({
      ok: true,
      dataUrl: `data:image/jpeg;base64,${JPEG.base64}`,
      width: 1120,
      height: 552,
      work: { workId: '4534', title: '호작도', imageUrl: 'https://gongu.copyright.or.kr/l/4534' },
    })
  })

  it('refuses a download that is not a picture', async () => {
    gonguImageDetail.mockResolvedValue({
      ok: true,
      value: { workId: '1', title: 'a', imageUrl: 'https://gongu.copyright.or.kr/l/1' },
    })
    fetchImageBytes.mockResolvedValue({
      base64: Buffer.from('not a picture').toString('base64'),
      mime: 'image/jpeg',
    })
    expect(await call(DESIGN_CHANNELS.gonguPicture, webContents, '1')).toEqual({
      ok: false,
      error: 'picture',
    })
  })

  it('answers no one but the design window', async () => {
    expect(await call(DESIGN_CHANNELS.gonguSearch, { id: 99 }, 'a', 1)).toBeNull()
    expect(await call(DESIGN_CHANNELS.gonguPicture, { id: 99 }, '1')).toBeNull()
    expect(gonguImageSearch).not.toHaveBeenCalled()
    expect(gonguImageDetail).not.toHaveBeenCalled()
  })
})
