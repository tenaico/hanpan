#!/usr/bin/env node
/**
 * A stand-in for tenai.kr's security key server, for development and tests
 * only (plan Task 12, spec 7-6). It speaks the four requests of
 * docs/contracts.md "Security key files and server answers" and signs with a
 * development key pair kept outside the repository.
 *
 * Usage: node tools/securekey-dev-server.mjs [--port 3870] [--dir <folder>]
 *          [--revoke <keyId>] [--server-time <ISO>] [--issue <file>]
 *   --port         0 picks a free port; the line below names the one taken
 *   --dir          where the key pair and the state live (default %TEMP%\hanpan-securekey-dev)
 *   --revoke       mark a key revoked before serving (kept in the state file)
 *   --server-time  answer with this server time instead of the clock (try 31 days ahead)
 *   --issue        issue a key for member `dev` and write it to <file> (a hanpan.key)
 *
 * On start it prints the build values for a development run:
 *   HANPAN_KEY_SERVER=http://127.0.0.1:3870
 *   HANPAN_KEY_PUBKEYS={"dev1":"..."}
 * The private key never leaves --dir. This is not a server to put online.
 */
import {
  createPrivateKey,
  generateKeyPairSync,
  randomUUID,
  sign,
  verify,
  createPublicKey,
} from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const KID = 'dev1'
const MEMBER = 'dev'
const MAX_ACTIVE = 3
const MAX_BODY = 64 * 1024
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function argsOf(argv) {
  const out = {
    port: 3870,
    dir: join(tmpdir(), 'hanpan-securekey-dev'),
    revoke: [],
    serverTime: null,
    issue: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => {
      const v = argv[++i]
      if (v === undefined) throw new Error(`${a} needs a value`)
      return v
    }
    if (a === '--port') out.port = Number(next())
    else if (a === '--dir') out.dir = next()
    else if (a === '--revoke') out.revoke.push(next())
    else if (a === '--server-time') out.serverTime = next()
    else if (a === '--issue') out.issue = next()
    else throw new Error(`unknown argument: ${a}`)
  }
  if (!Number.isInteger(out.port) || out.port < 0 || out.port > 65535) throw new Error('bad --port')
  if (out.serverTime !== null && !Number.isFinite(Date.parse(out.serverTime))) {
    throw new Error('bad --server-time')
  }
  return out
}

/** The same bytes the app checks: keys sorted at every depth, no spaces */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`
  if (value && typeof value === 'object') {
    const fields = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
    return `{${fields.join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function loadKeyPair(dir) {
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'dev-key.json')
  if (!existsSync(file)) {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const spki = publicKey.export({ format: 'der', type: 'spki' })
    writeFileSync(
      file,
      JSON.stringify({
        kid: KID,
        privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }),
        publicKey: spki.subarray(spki.length - 32).toString('base64'),
      }),
      { mode: 0o600 },
    )
  }
  const stored = JSON.parse(readFileSync(file, 'utf8'))
  return { privateKey: createPrivateKey(stored.privateKey), publicRaw: stored.publicKey }
}

function loadState(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8'))
  } catch {
    return { keys: {} }
  }
}

export async function startDevServer(options) {
  const { privateKey, publicRaw } = loadKeyPair(options.dir)
  const publicKey = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicRaw, 'base64')]),
    format: 'der',
    type: 'spki',
  })
  const state = loadState(options.dir)
  const save = () => writeFileSync(join(options.dir, 'state.json'), JSON.stringify(state, null, 2))
  const now = () => options.serverTime ?? new Date().toISOString()
  const signed = (payload) => ({
    payload,
    kid: KID,
    sig: sign(null, Buffer.from(canonicalJson(payload), 'utf8'), privateKey).toString('base64'),
  })
  const activeOf = (member) =>
    Object.values(state.keys).filter((k) => k.memberId === member && k.activation && !k.revoked)

  function issue(member = MEMBER) {
    if (activeOf(member).length >= MAX_ACTIVE) return null
    const payload = { v: 1, kid: KID, memberId: member, keyId: randomUUID(), issuedAt: now() }
    state.keys[payload.keyId] = {
      memberId: member,
      revoked: false,
      activation: null,
      lastUsed: null,
    }
    save()
    return signed(payload)
  }
  for (const keyId of options.revoke) {
    if (state.keys[keyId]) state.keys[keyId].revoked = true
  }
  save()
  if (options.issue) {
    const key = issue()
    if (!key) throw new Error('member dev already has 3 active keys')
    writeFileSync(options.issue, JSON.stringify(key))
  }

  const verifyKey = (doc) => {
    try {
      const p = doc?.payload
      if (!p || p.v !== 1 || doc.kid !== KID || typeof doc.sig !== 'string') return null
      const ok = verify(
        null,
        Buffer.from(canonicalJson(p), 'utf8'),
        publicKey,
        Buffer.from(doc.sig, 'base64'),
      )
      return ok ? p : null
    } catch {
      return null
    }
  }

  const server = createServer((req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) req.destroy()
      else chunks.push(c)
    })
    req.on('end', () => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      let body
      try {
        body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null
      } catch {
        return reply(400, { error: 'bad json' })
      }
      if (req.method === 'POST' && url.pathname === '/keys') {
        const key = issue(typeof body?.memberId === 'string' ? body.memberId : MEMBER)
        return key ? reply(200, key) : reply(429, { error: 'limit' })
      }
      if (req.method === 'POST' && url.pathname === '/keys/activate') {
        const key = verifyKey(body?.key)
        const record = key && state.keys[key.keyId]
        if (!key || !record || record.memberId !== key.memberId)
          return reply(403, { error: 'unknown key' })
        if (record.revoked) return reply(403, { error: 'revoked' })
        if (record.activation) return reply(409, { error: 'used' })
        if (activeOf(key.memberId).length >= MAX_ACTIVE) return reply(429, { error: 'limit' })
        const type = body.deviceType
        if ((type !== 'usb' && type !== 'pc') || !/^[0-9a-f]{64}$/.test(String(body.deviceId))) {
          return reply(400, { error: 'bad device' })
        }
        if (type === 'pc' && typeof body.pcConsentAt !== 'string')
          return reply(400, { error: 'no consent' })
        const activation = {
          v: 1,
          keyId: key.keyId,
          memberId: key.memberId,
          deviceType: type,
          deviceId: body.deviceId,
          activatedAt: now(),
          ...(type === 'pc' ? { pcConsentAt: body.pcConsentAt } : {}),
        }
        record.activation = activation
        save()
        return reply(200, signed(activation))
      }
      if (req.method === 'GET' && url.pathname === '/keys/status') {
        const keyId = url.searchParams.get('keyId') ?? ''
        const record = state.keys[keyId]
        if (!record) return reply(404, { error: 'unknown key' })
        record.lastUsed = new Date().toISOString()
        save()
        return reply(
          200,
          signed({ v: 1, keyId, status: record.revoked ? 'revoked' : 'active', serverTime: now() }),
        )
      }
      const revoke = /^\/keys\/([^/]+)\/revoke$/.exec(url.pathname)
      if (req.method === 'POST' && revoke) {
        const record = state.keys[decodeURIComponent(revoke[1])]
        if (!record) return reply(404, { error: 'unknown key' })
        record.revoked = true
        save()
        return reply(200, { ok: true })
      }
      return reply(404, { error: 'not found' })
    })
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port, '127.0.0.1', resolve)
  })
  const port = server.address().port
  return {
    server,
    url: `http://127.0.0.1:${port}`,
    publicKeys: { [KID]: publicRaw },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isMain) {
  try {
    const running = await startDevServer(argsOf(process.argv.slice(2)))
    process.stdout.write(`HANPAN_KEY_SERVER=${running.url}\n`)
    process.stdout.write(`HANPAN_KEY_PUBKEYS=${JSON.stringify(running.publicKeys)}\n`)
  } catch (error) {
    process.stderr.write(
      `securekey-dev-server: ${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exit(2)
  }
}
