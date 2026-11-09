import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assetUrl,
  downloadWithRetry,
  extractZip,
  fetchGraphicsWeb,
  flattenSingleRoot,
  localStamp,
  pinStamp,
  readGraphicsPins,
  verifyDownload,
} from '../../../tools/fetch-graphics-web.mjs'

/** SHA-256 of the three bytes 'abc' */
const ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

let dirs: string[] = []
function freshDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'graphics-web-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
  dirs = []
})

const ILLUST_PIN = {
  repo: 'tenaico/hanpan-graphics',
  tag: 'illust-v0.21.0-h1',
  asset: 'hanpan-illust-web-0.21.0-h1.zip',
  size: 3,
  sha256: ABC_SHA256,
}

async function zipBytes(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip()
  for (const [name, text] of Object.entries(files)) zip.file(name, text)
  return zip.generateAsync({ type: 'nodebuffer' })
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

describe('readGraphicsPins', () => {
  it('rejects a short sha256', () => {
    const file = join(freshDir(), 'pins.json')
    writeFileSync(file, JSON.stringify({ illust: { ...ILLUST_PIN, sha256: 'abc' } }))
    expect(() => readGraphicsPins(file)).toThrow(/sha256/)
  })

  it('rejects an app it does not know', () => {
    const file = join(freshDir(), 'pins.json')
    writeFileSync(file, JSON.stringify({ video: ILLUST_PIN }))
    expect(() => readGraphicsPins(file)).toThrow(/video/)
  })

  it('accepts an empty file', () => {
    const file = join(freshDir(), 'pins.json')
    writeFileSync(file, '{}')
    expect(readGraphicsPins(file)).toEqual({})
  })
})

describe('assetUrl', () => {
  it('builds the release download address', () => {
    expect(assetUrl(ILLUST_PIN)).toBe(
      'https://github.com/tenaico/hanpan-graphics/releases/download/illust-v0.21.0-h1/hanpan-illust-web-0.21.0-h1.zip',
    )
  })
})

describe('verifyDownload', () => {
  it('checks the size before the hash', () => {
    const file = join(freshDir(), 'a.zip')
    writeFileSync(file, 'abc')
    expect(() => verifyDownload(file, { size: 4, sha256: ABC_SHA256 })).toThrow(/size/)
    expect(() => verifyDownload(file, { size: 3, sha256: '0'.repeat(64) })).toThrow(/sha256/i)
    expect(() => verifyDownload(file, { size: 3, sha256: ABC_SHA256 })).not.toThrow()
  })
})

describe('stamps and folders', () => {
  it('stamps a pin by tag and hash, a local build by its folder', () => {
    expect(pinStamp(ILLUST_PIN)).toBe(`illust-v0.21.0-h1 ${ABC_SHA256}`)
    expect(localStamp('/x/y')).toMatch(/^local /)
  })

  it('lifts a lone top folder', () => {
    const dir = freshDir()
    mkdirSync(join(dir, 'site'))
    writeFileSync(join(dir, 'site', 'index.html'), 'x')
    flattenSingleRoot(dir)
    expect(readdirSync(dir)).toEqual(['index.html'])
  })
})

describe('extractZip', () => {
  it('refuses an entry that climbs out of the folder', async () => {
    const zip = join(freshDir(), 'bad.zip')
    writeFileSync(zip, await zipBytes({ 'ok.txt': 'ok', '../evil.txt': 'no' }))
    const dest = freshDir()
    await expect(extractZip(zip, dest)).rejects.toThrow(/outside/)
    expect(readdirSync(dest)).toEqual([])
  })

  it('writes nested files', async () => {
    const zip = join(freshDir(), 'good.zip')
    writeFileSync(zip, await zipBytes({ 'index.html': '<p>', 'fonts/a/b.ttf': 'font' }))
    const dest = freshDir()
    await extractZip(zip, dest)
    expect(readFileSync(join(dest, 'fonts/a/b.ttf'), 'utf8')).toBe('font')
  })
})

describe('fetchGraphicsWeb', () => {
  function localBuild(): string {
    const dir = freshDir()
    writeFileSync(join(dir, 'index.html'), '<p>local')
    return dir
  }

  it('copies a local build and stamps it', async () => {
    const root = freshDir()
    const result = await fetchGraphicsWeb({
      root,
      env: { GRAPHICS_WEB_ILLUST_DIR: localBuild() },
      pins: {},
    })
    expect(result.illust).toBe('local')
    const dest = join(root, 'apps/graphics/public/web/illust')
    expect(readFileSync(join(dest, 'index.html'), 'utf8')).toBe('<p>local')
    expect(readFileSync(join(dest, '.pin'), 'utf8')).toMatch(/^local /)
  })

  it('refuses a local build in strict mode', async () => {
    await expect(
      fetchGraphicsWeb({
        root: freshDir(),
        env: { CI: '1', GRAPHICS_WEB_PHOTO_DIR: localBuild() },
        pins: {},
      }),
    ).rejects.toThrow(/local build/)
  })

  it('reports a missing pin outside strict mode and throws in it', async () => {
    const result = await fetchGraphicsWeb({ root: freshDir(), env: {}, pins: {} })
    expect(result).toEqual({ photo: 'missing', illust: 'missing' })
    await expect(
      fetchGraphicsWeb({ root: freshDir(), env: { IEUM_RELEASE: '1' }, pins: {} }),
    ).rejects.toThrow(/no pin/)
  })

  it('downloads, verifies and extracts, then does not download again', async () => {
    const bytes = await zipBytes({ 'site/index.html': '<p>pinned' })
    const pin = { ...ILLUST_PIN, size: bytes.length, sha256: sha256(bytes) }
    const root = freshDir()
    const download = vi.fn(async (_url: string, dest: string) => writeFileSync(dest, bytes))
    const first = await fetchGraphicsWeb({ root, env: {}, pins: { illust: pin }, download })
    expect(first.illust).toBe('fetched')
    expect(download).toHaveBeenCalledWith(assetUrl(pin), expect.any(String))
    const dest = join(root, 'apps/graphics/public/web/illust')
    expect(readFileSync(join(dest, 'index.html'), 'utf8')).toBe('<p>pinned')
    expect(readFileSync(join(dest, '.pin'), 'utf8')).toBe(pinStamp(pin))
    const second = await fetchGraphicsWeb({ root, env: {}, pins: { illust: pin }, download })
    expect(second.illust).toBe('cached')
    expect(download).toHaveBeenCalledTimes(1)
  })

  it('stops when the downloaded file does not match its pin', async () => {
    const root = freshDir()
    const download = vi.fn(async (_url: string, dest: string) => writeFileSync(dest, 'abcd'))
    await expect(
      fetchGraphicsWeb({ root, env: {}, pins: { illust: ILLUST_PIN }, download }),
    ).rejects.toThrow(/size/)
    expect(existsSync(join(root, 'apps/graphics/public/web/illust/index.html'))).toBe(false)
  })

  it('stops when the build has no index.html', async () => {
    const empty = freshDir()
    writeFileSync(join(empty, 'readme.txt'), 'x')
    await expect(
      fetchGraphicsWeb({ root: freshDir(), env: { GRAPHICS_WEB_PHOTO_DIR: empty }, pins: {} }),
    ).rejects.toThrow(/index\.html/)
  })
})

describe('downloadWithRetry', () => {
  const noWait = async () => {}
  const ok = () => new Response('abc', { status: 200 })

  it('retries a 504 and then writes the file', async () => {
    const dest = join(freshDir(), 'a.zip')
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 504 }))
      .mockResolvedValueOnce(ok())
    await downloadWithRetry('https://x/a.zip', dest, { fetchImpl, sleep: noWait })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(readFileSync(dest, 'utf8')).toBe('abc')
  })

  it('retries a network error', async () => {
    const dest = join(freshDir(), 'a.zip')
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(ok())
    await downloadWithRetry('https://x/a.zip', dest, { fetchImpl, sleep: noWait })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 404', async () => {
    const dest = join(freshDir(), 'a.zip')
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    await expect(
      downloadWithRetry('https://x/a.zip', dest, { fetchImpl, sleep: noWait }),
    ).rejects.toThrow('HTTP 404')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('gives up after the last attempt with the last status', async () => {
    const dest = join(freshDir(), 'a.zip')
    const fetchImpl = vi.fn().mockImplementation(async () => new Response('', { status: 503 }))
    const sleep = vi.fn(noWait)
    await expect(
      downloadWithRetry('https://x/a.zip', dest, { fetchImpl, sleep, attempts: 3 }),
    ).rejects.toThrow('HTTP 503')
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
  })
})
