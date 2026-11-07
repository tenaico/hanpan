// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The editors' Gongu picture channels (Word and PowerPoint, Insert ▸ Gongu
 * pictures): the same search as the design board's — main searches with the
 * key from Settings, fetches the thumbnails and the picture from the
 * service's own addresses, and the page sends only words and numbers.
 */

type Handler = (event: { sender: unknown }, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()

vi.mock('electron', () => ({
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

import { GONGU_PICTURE_CHANNELS, registerGonguPictureIpc } from '../src/main/hanpan/gongu-pictures'

const JPEG = { base64: Buffer.from('jpeg bytes').toString('base64'), mime: 'image/jpeg' }
let key = 'the-key'
registerGonguPictureIpc({ gonguKey: () => key })

const call = (channel: string, ...args: unknown[]) =>
  handlers.get(channel)!({ sender: { id: 12 } }, ...args)

beforeEach(() => {
  key = 'the-key'
  gonguImageSearch.mockReset()
  gonguImageDetail.mockReset()
  fetchImageBytes.mockReset()
})

describe('editor Gongu picture channels', () => {
  it('uses its own channel names, apart from the design window', () => {
    expect(GONGU_PICTURE_CHANNELS).toEqual({
      search: 'hanpan:gongu-pictures-search',
      picture: 'hanpan:gongu-pictures-picture',
    })
  })

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
    const answer = await call(GONGU_PICTURE_CHANNELS.search, '호랑이', 3)
    expect(gonguImageSearch).toHaveBeenCalledWith('호랑이', 'the-key', { page: 3, perPage: 20 })
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

  it('reads the key at each call, so a key saved later is used', async () => {
    gonguImageSearch.mockResolvedValue({ ok: false, error: 'no-key', message: '' })
    key = ''
    expect(await call(GONGU_PICTURE_CHANNELS.search, 'a', 1)).toEqual({
      ok: false,
      error: 'no-key',
    })
    key = 'new-key'
    await call(GONGU_PICTURE_CHANNELS.search, 'a', 1)
    expect(gonguImageSearch).toHaveBeenLastCalledWith('a', 'new-key', { page: 1, perPage: 20 })
  })

  it('answers no-key without a request, so the picker can ask before the first search', async () => {
    key = ''
    expect(await call(GONGU_PICTURE_CHANNELS.search, '', 1)).toEqual({ ok: false, error: 'no-key' })
    expect(gonguImageSearch).not.toHaveBeenCalled()
    // with a key, the empty probe is the library's no-request empty answer
    key = 'the-key'
    gonguImageSearch.mockResolvedValue({ ok: true, value: { works: [] } })
    expect(await call(GONGU_PICTURE_CHANNELS.search, '', 1)).toEqual({
      ok: true,
      works: [],
      total: null,
    })
  })

  it('clamps the words and the page number the page sends', async () => {
    gonguImageSearch.mockResolvedValue({ ok: true, value: { works: [] } })
    await call(GONGU_PICTURE_CHANNELS.search, 'x'.repeat(500), 99999)
    expect(gonguImageSearch).toHaveBeenCalledWith('x'.repeat(100), 'the-key', {
      page: 1000,
      perPage: 20,
    })
    expect(await call(GONGU_PICTURE_CHANNELS.search, 42, 1)).toBeNull()
  })

  it('fetches the picture from the address in the work record', async () => {
    gonguImageDetail.mockResolvedValue({
      ok: true,
      value: { workId: '4534', title: '호작도', imageUrl: 'https://gongu.copyright.or.kr/l/4534' },
    })
    fetchImageBytes.mockResolvedValue(JPEG)
    const answer = await call(GONGU_PICTURE_CHANNELS.picture, '4534')
    expect(gonguImageDetail).toHaveBeenCalledWith('4534', 'the-key')
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
    expect(await call(GONGU_PICTURE_CHANNELS.picture, '1')).toEqual({
      ok: false,
      error: 'picture',
    })
    expect(await call(GONGU_PICTURE_CHANNELS.picture, { not: 'a work id' })).toBeNull()
  })
})
