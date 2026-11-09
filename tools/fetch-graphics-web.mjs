/**
 * Fetches the web builds of AI Photo (PhotoCraft) and AI Illustration
 * (VectorCraft) that the graphics tabs serve (decision 0093): each app's zip from
 * a tenaico/hanpan-graphics release, pinned by tag, size and SHA-256 in
 * tools/graphics-web-pins.json, unpacked into apps/graphics/public/web/<app>/
 * (git-ignored). The graphics editor's build copies that folder into its
 * renderer output.
 *
 *   node tools/fetch-graphics-web.mjs
 *
 * A folder whose .pin stamp matches its pin is left alone, and a zip already in
 * vendor/graphics-web/_downloads is reused when it still matches.
 * GRAPHICS_WEB_PHOTO_DIR / GRAPHICS_WEB_ILLUST_DIR copy a local build instead,
 * for development only: on CI and in a release build (IEUM_RELEASE=1) a local
 * build or a missing pin stops the run. The web builds run on every OS.
 */
import { createHash, randomUUID } from 'node:crypto'
import {
  closeSync,
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import JSZip from 'jszip'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PINS = join(ROOT, 'tools/graphics-web-pins.json')
const CHUNK = 1 << 20

export const GRAPHICS_KINDS = ['photo', 'illust']

const LOCAL_ENV = { photo: 'GRAPHICS_WEB_PHOTO_DIR', illust: 'GRAPHICS_WEB_ILLUST_DIR' }

/** Reads the pins; a value that is not well formed throws, naming the field. */
export function readGraphicsPins(path = PINS) {
  const pins = JSON.parse(readFileSync(path, 'utf8'))
  for (const [kind, pin] of Object.entries(pins)) {
    if (!GRAPHICS_KINDS.includes(kind)) throw new Error(`${path}: unknown app "${kind}"`)
    const where = `${path}: ${kind}`
    if (typeof pin.repo !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(pin.repo))
      throw new Error(`${where}.repo is not owner/name`)
    if (typeof pin.tag !== 'string' || pin.tag === '') throw new Error(`${where}.tag is empty`)
    if (typeof pin.asset !== 'string' || !pin.asset.endsWith('.zip'))
      throw new Error(`${where}.asset is not a .zip`)
    if (!Number.isInteger(pin.size) || pin.size <= 0)
      throw new Error(`${where}.size is not a positive integer`)
    if (typeof pin.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(pin.sha256))
      throw new Error(`${where}.sha256 is not 64 hex digits`)
  }
  return pins
}

export function assetUrl(pin) {
  return `https://github.com/${pin.repo}/releases/download/${pin.tag}/${pin.asset}`
}

/** Throws unless the file has the pinned size and SHA-256. */
export function verifyDownload(path, pin) {
  const size = statSync(path).size
  if (size !== pin.size) throw new Error(`${path}: size ${size}, pinned ${pin.size}`)
  const hash = createHash('sha256')
  const fd = openSync(path, 'r')
  try {
    const buffer = Buffer.alloc(CHUNK)
    let read
    while ((read = readSync(fd, buffer, 0, CHUNK, null)) > 0) hash.update(buffer.subarray(0, read))
  } finally {
    closeSync(fd)
  }
  const sha256 = hash.digest('hex')
  if (sha256 !== pin.sha256) throw new Error(`${path}: sha256 ${sha256}, pinned ${pin.sha256}`)
}

/** What a fetched folder records in its .pin file. */
export function pinStamp(pin) {
  return `${pin.tag} ${pin.sha256}`
}

/** What a folder copied from a local build records; packaging refuses it in a release. */
export function localStamp(dir) {
  return `local ${resolve(dir)}`
}

export function localDirFor(kind, env) {
  const dir = env[LOCAL_ENV[kind]]
  return dir ? dir : null
}

export function isStrict(env) {
  const on = (name) => !['', '0', 'false'].includes((env[name] ?? '').toLowerCase())
  return on('CI') || on('IEUM_RELEASE')
}

/** A zip that unpacks into one top folder gets that folder's contents lifted one level. */
export function flattenSingleRoot(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  if (entries.length !== 1 || !entries[0].isDirectory()) return
  // move the lone folder aside first: a child may share its name
  const aside = join(dir, `.flatten-${randomUUID()}`)
  renameSync(join(dir, entries[0].name), aside)
  for (const name of readdirSync(aside)) renameSync(join(aside, name), join(dir, name))
  rmdirSync(aside)
}

/** Unpacks a zip; an entry that would land outside destDir stops it before anything is written. */
export async function extractZip(zipPath, destDir) {
  const zip = await JSZip.loadAsync(readFileSync(zipPath))
  const base = resolve(destDir)
  const files = []
  for (const entry of Object.values(zip.files)) {
    const target = resolve(base, entry.name)
    const rel = relative(base, target)
    if (isAbsolute(entry.name) || rel.startsWith('..') || isAbsolute(rel))
      throw new Error(`${zipPath}: entry ${entry.name} points outside the folder`)
    if (!entry.dir) files.push([entry, target])
  }
  for (const [entry, target] of files) {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, await entry.async('nodebuffer'))
  }
}

function matchesPin(path, pin) {
  try {
    verifyDownload(path, pin)
    return true
  } catch {
    return false
  }
}

/** GitHub Releases answers 5xx and 429 now and then; those and network errors are retried. */
function retryable(status) {
  return status === 429 || status >= 500
}

/**
 * Downloads url to dest, retrying a passing failure with a growing wait
 * (2 s, 4 s, 8 s by default). A 4xx other than 429 stops at once.
 */
export async function downloadWithRetry(
  url,
  dest,
  {
    fetchImpl = fetch,
    sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
    attempts = 4,
    baseDelayMs = 2000,
  } = {},
) {
  let last
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let again = true
    try {
      const response = await fetchImpl(url, { redirect: 'follow' })
      if (!response.ok || !response.body) {
        again = retryable(response.status)
        throw new Error(`${url}: HTTP ${response.status}`)
      }
      await pipeline(Readable.fromWeb(response.body), createWriteStream(dest))
      return
    } catch (e) {
      last = e
      if (!again || attempt === attempts) break
      console.warn(`${e instanceof Error ? e.message : e}; retry ${attempt}/${attempts - 1}`)
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }
  throw last
}

function readStamp(dir) {
  try {
    return readFileSync(join(dir, '.pin'), 'utf8').trim()
  } catch {
    return null
  }
}

function requireIndex(kind, dir) {
  if (!existsSync(join(dir, 'index.html')))
    throw new Error(`graphics web ${kind}: no index.html in the build`)
}

/** Puts each app's web build in place; returns what happened to each. */
export async function fetchGraphicsWeb({ root = ROOT, env = process.env, pins, download }) {
  const strict = isStrict(env)
  const get = download ?? downloadWithRetry
  const result = {}
  for (const kind of GRAPHICS_KINDS) {
    const dest = join(root, 'apps/graphics/public/web', kind)
    const local = localDirFor(kind, env)
    const pin = pins[kind]
    if (local) {
      if (strict)
        throw new Error(`graphics web ${kind}: a local build is not allowed in a release build`)
      requireIndex(kind, local)
      rmSync(dest, { recursive: true, force: true })
      mkdirSync(dirname(dest), { recursive: true })
      cpSync(local, dest, { recursive: true })
      writeFileSync(join(dest, '.pin'), localStamp(local))
      result[kind] = 'local'
      continue
    }
    if (!pin) {
      if (strict) throw new Error(`graphics web ${kind}: no pin in tools/graphics-web-pins.json`)
      console.warn(
        `warning: graphics web ${kind}: no pin yet; the ${kind} tab will say it is missing`,
      )
      result[kind] = 'missing'
      continue
    }
    if (readStamp(dest) === pinStamp(pin) && existsSync(join(dest, 'index.html'))) {
      result[kind] = 'cached'
      continue
    }
    const downloads = join(root, 'vendor/graphics-web/_downloads')
    mkdirSync(downloads, { recursive: true })
    const zip = join(downloads, pin.asset)
    if (!(existsSync(zip) && matchesPin(zip, pin))) {
      const part = `${zip}.part`
      rmSync(part, { force: true })
      await get(assetUrl(pin), part)
      verifyDownload(part, pin)
      renameSync(part, zip)
    }
    verifyDownload(zip, pin)
    rmSync(dest, { recursive: true, force: true })
    mkdirSync(dest, { recursive: true })
    await extractZip(zip, dest)
    flattenSingleRoot(dest)
    requireIndex(kind, dest)
    writeFileSync(join(dest, '.pin'), pinStamp(pin))
    result[kind] = 'fetched'
  }
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  fetchGraphicsWeb({ pins: readGraphicsPins() })
    .then((result) => {
      for (const [kind, what] of Object.entries(result))
        console.log(`graphics web ${kind}: ${what}`)
    })
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e)
      // exitCode, not exit(): exiting right after fetch crashes Node on Windows
      process.exitCode = 1
    })
}
