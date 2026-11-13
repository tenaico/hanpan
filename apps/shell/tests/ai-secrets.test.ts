import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import {
  SEALED_PREFIX,
  SEALED_PREFIX_V2,
  openAiSecrets,
  setAiSecretCodec,
} from '@genoffice/ai-provider'
import { vaultCodec } from '../src/main/securekey/vault-codec'
import { normalizeFileSearchSettings } from '../src/main/file-index/rerank'
import {
  MAX_REVEAL_VALUES,
  assertFileSearchKeysWritable,
  clearSealedV2Secrets,
  fileSearchHoldsPlainKeys,
  openFileSearchKeys,
  sealFileSearchKeys,
  holdsPlainSecrets,
  revealAnswer,
  revealRequestOf,
  safeStorageCodec,
  sealStoredAiSettings,
  sealingKeyOnDisk,
  type SafeStorageLike,
} from '../src/main/ai-secrets'

/** safeStorage stand-in: "encryption" reverses the bytes */
const fakeStorage = (available = true): SafeStorageLike => ({
  isEncryptionAvailable: () => available,
  encryptString: (plain) => Buffer.from([...Buffer.from(plain, 'utf8')].reverse()),
  decryptString: (sealed) => Buffer.from([...sealed].reverse()).toString('utf8'),
})

const dirs: string[] = []
afterEach(() => {
  setAiSecretCodec(null)
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('safeStorageCodec', () => {
  it('seals on Windows and opens what it sealed', () => {
    const codec = safeStorageCodec(fakeStorage(), 'win32')
    const sealed = codec.seal('sk-키')!
    expect(sealed.startsWith(SEALED_PREFIX)).toBe(true)
    expect(sealed).not.toContain('sk-')
    expect(codec.open(sealed)).toBe('sk-키')
  })

  it('seals on Linux only with a real keyring', () => {
    const withBackend = (backend: string) => ({
      ...fakeStorage(),
      getSelectedStorageBackend: () => backend,
    })
    for (const backend of ['gnome_libsecret', 'kwallet', 'kwallet5', 'kwallet6']) {
      const codec = safeStorageCodec(withBackend(backend), 'linux', () => false)
      const sealed = codec.seal('sk')
      expect(sealed, backend).not.toBeNull()
      expect(codec.open(sealed!)).toBe('sk')
    }
    // no keyring: Chromium's built-in key protects nothing
    expect(safeStorageCodec(withBackend('basic_text'), 'linux').seal('sk')).toBeNull()
    expect(safeStorageCodec(withBackend('unknown'), 'linux').seal('sk')).toBeNull()
    expect(safeStorageCodec(fakeStorage(), 'linux').seal('sk')).toBeNull()
  })

  it('does not seal on macOS, or without encryption, but still opens', () => {
    const sealed = safeStorageCodec(fakeStorage(), 'win32').seal('sk')!
    expect(safeStorageCodec(fakeStorage(), 'darwin').seal('sk')).toBeNull()
    expect(safeStorageCodec(fakeStorage(false), 'win32').seal('sk')).toBeNull()
    expect(safeStorageCodec(fakeStorage(), 'darwin').open(sealed)).toBe('sk')
    expect(safeStorageCodec(fakeStorage(false), 'win32').open(sealed)).toBeNull()
  })
})

describe('sealing waits for the key on disk', () => {
  it('keeps values plain until Chromium has written its key', () => {
    let onDisk = false
    const codec = safeStorageCodec(fakeStorage(), 'win32', () => onDisk)
    expect(codec.seal('sk')).toBeNull()
    onDisk = true
    expect(codec.seal('sk')).not.toBeNull()
  })

  it('reads the key from Local State', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ai-secrets-ls-'))
    dirs.push(dir)
    const path = join(dir, 'Local State')
    expect(sealingKeyOnDisk(path)).toBe(false)
    writeFileSync(path, JSON.stringify({ os_crypt: {} }))
    expect(sealingKeyOnDisk(path)).toBe(false)
    writeFileSync(path, JSON.stringify({ os_crypt: { encrypted_key: 'RFBBUEk=' } }))
    expect(sealingKeyOnDisk(path)).toBe(true)
  })
})

describe('sealStoredAiSettings', () => {
  const file = (content: unknown) => {
    const dir = mkdtempSync(join(tmpdir(), 'ai-secrets-'))
    dirs.push(dir)
    const path = join(dir, 'ai-settings.json')
    writeFileSync(path, JSON.stringify(content))
    return path
  }
  const stored = {
    provider: 'auto',
    providers: { openai: { apiKey: 'sk-plain', model: '' } },
    meteredAccepted: { codex: true },
  }

  it('seals the plain keys an older file holds and keeps everything else', () => {
    setAiSecretCodec(safeStorageCodec(fakeStorage(), 'win32'))
    const path = file(stored)
    expect(sealStoredAiSettings(path)).toBe(true)
    const after = JSON.parse(readFileSync(path, 'utf8'))
    expect(readFileSync(path, 'utf8')).not.toContain('sk-plain')
    expect(after.meteredAccepted).toEqual({ codex: true })
    expect(holdsPlainSecrets(after)).toBe(false)
    expect(sealStoredAiSettings(path)).toBe(false)
  })

  it('upgrades v1 values to v2 once the vault is there', () => {
    const v1 = safeStorageCodec(fakeStorage(), 'win32')
    setAiSecretCodec(v1)
    const path = file(stored)
    expect(sealStoredAiSettings(path)).toBe(true)
    const sealedV1 = JSON.parse(readFileSync(path, 'utf8')).providers.openai.apiKey as string
    expect(sealedV1.startsWith(SEALED_PREFIX)).toBe(true)
    // without the vault there is nothing to upgrade to
    expect(sealStoredAiSettings(path, { upgrade: true })).toBe(false)
    const vault = randomBytes(32)
    setAiSecretCodec(vaultCodec(v1, () => vault))
    expect(holdsPlainSecrets(JSON.parse(readFileSync(path, 'utf8')), { upgrade: true })).toBe(true)
    expect(sealStoredAiSettings(path, { upgrade: true })).toBe(true)
    const after = JSON.parse(readFileSync(path, 'utf8'))
    expect(after.providers.openai.apiKey.startsWith(SEALED_PREFIX_V2)).toBe(true)
    expect(openAiSecrets(after).providers.openai.apiKey).toBe('sk-plain')
    expect(after.meteredAccepted).toEqual({ codex: true })
  })

  it('leaves v2 values alone', () => {
    const vault = randomBytes(32)
    setAiSecretCodec(vaultCodec(safeStorageCodec(fakeStorage(), 'win32'), () => vault))
    const path = file(stored)
    expect(sealStoredAiSettings(path, { upgrade: true })).toBe(true)
    const before = readFileSync(path, 'utf8')
    expect(sealStoredAiSettings(path, { upgrade: true })).toBe(false)
    expect(readFileSync(path, 'utf8')).toBe(before)
  })

  it('keeps a v1 value it cannot open instead of emptying it', () => {
    const vault = randomBytes(32)
    setAiSecretCodec(vaultCodec(safeStorageCodec(fakeStorage(), 'win32'), () => vault))
    const unreadable = `${SEALED_PREFIX}@@@`
    const path = file({ providers: { openai: { apiKey: unreadable, model: '' } } })
    expect(sealStoredAiSettings(path, { upgrade: true })).toBe(false)
    expect(JSON.parse(readFileSync(path, 'utf8')).providers.openai.apiKey).toBe(unreadable)
  })

  it('upgrades the home search keys the same way', () => {
    const v1 = safeStorageCodec(fakeStorage(), 'win32')
    setAiSecretCodec(v1)
    const disk = sealFileSearchKeys(
      normalizeFileSearchSettings({ rerank: true, keys: { openrouter: 'sk-or' } }),
    )
    expect(fileSearchHoldsPlainKeys(disk)).toBe(false)
    expect(fileSearchHoldsPlainKeys(disk, { upgrade: true })).toBe(true)
    const vault = randomBytes(32)
    setAiSecretCodec(vaultCodec(v1, () => vault))
    const again = sealFileSearchKeys(
      normalizeFileSearchSettings(openFileSearchKeys(disk) as Record<string, unknown>),
    )
    expect(again.keys.openrouter.startsWith(SEALED_PREFIX_V2)).toBe(true)
    expect(fileSearchHoldsPlainKeys(again, { upgrade: true })).toBe(false)
  })

  it('leaves the file alone where it cannot seal', () => {
    setAiSecretCodec(safeStorageCodec(fakeStorage(), 'darwin'))
    const path = file(stored)
    const before = readFileSync(path, 'utf8')
    expect(sealStoredAiSettings(path)).toBe(false)
    expect(readFileSync(path, 'utf8')).toBe(before)
  })
})

describe('the reveal entry', () => {
  const codec = safeStorageCodec(fakeStorage(), 'win32')

  it('opens the sealed values it is handed', () => {
    const sealed = codec.seal('sk-a')!
    const answer = JSON.parse(revealAnswer(revealRequestOf(JSON.stringify([sealed])), codec))
    expect(answer).toEqual({ status: 'ok', secrets: { [sealed]: 'sk-a' } })
  })

  it('refuses anything but a short list of sealed values', () => {
    for (const text of [
      'not json',
      '{"a":1}',
      JSON.stringify(['plain-key']),
      JSON.stringify(Array.from({ length: MAX_REVEAL_VALUES + 1 }, () => `${SEALED_PREFIX}x`)),
    ]) {
      expect(revealRequestOf(text), text.slice(0, 30)).toBeNull()
    }
    expect(JSON.parse(revealAnswer(null, codec)).status).toBe('error')
  })

  it('runs before the single-instance lock and any window', () => {
    const index = readFileSync(
      fileURLToPath(new URL('../src/main/index.ts', import.meta.url)),
      'utf8',
    )
    const reveal = index.indexOf('app.exit(await runRevealEntry(secretCodec))')
    expect(reveal).toBeGreaterThan(0)
    expect(reveal).toBeLessThan(index.indexOf('app.requestSingleInstanceLock('))
    expect(reveal).toBeLessThan(index.indexOf('installRendererProtocol('))
    expect(index.indexOf('setAiSecretCodec(secretCodec)')).toBeLessThan(reveal)
  })
})

describe('home search reranking keys', () => {
  it('are not written while a v2 key among them cannot be opened', () => {
    setAiSecretCodec({ seal: () => null, open: () => null })
    expect(() => assertFileSearchKeysWritable({ keys: { openrouter: 'sealed:v2:x' } })).toThrow()
    expect(() => assertFileSearchKeysWritable({ keys: { openrouter: 'sk-or' } })).not.toThrow()
    expect(() => assertFileSearchKeysWritable(undefined)).not.toThrow()
    setAiSecretCodec({ seal: () => null, open: () => 'sk-or' })
    expect(() =>
      assertFileSearchKeysWritable({ keys: { openrouter: 'sealed:v2:x' } }),
    ).not.toThrow()
  })

  it('seal on write and open before the settings are normalized', () => {
    setAiSecretCodec(safeStorageCodec(fakeStorage(), 'win32'))
    const settings = normalizeFileSearchSettings({ rerank: true, keys: { openrouter: 'sk-or' } })
    const disk = sealFileSearchKeys(settings)
    expect(disk.keys.openrouter.startsWith(SEALED_PREFIX)).toBe(true)
    expect(disk.keys.kev).toBe('')
    expect(fileSearchHoldsPlainKeys(disk)).toBe(false)
    expect(normalizeFileSearchSettings(openFileSearchKeys(disk))).toEqual(settings)
    // a pre-decision-model file keeps its old field name
    const old = openFileSearchKeys({ jevKeys: { openrouter: disk.keys.openrouter } })
    expect(normalizeFileSearchSettings(old).keys.openrouter).toBe('sk-or')
  })
})

describe('a new security key (spec 2026-11-12 5-4)', () => {
  it('clears the keys sealed with the old vault and keeps everything else', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ai-secrets-clear-'))
    const path = join(dir, 'ai-settings.json')
    writeFileSync(
      path,
      JSON.stringify({
        provider: 'anthropic',
        providers: {
          anthropic: { apiKey: 'sealed:v2:AAAA', model: 'claude' },
          openai: { apiKey: 'sealed:v1:BBBB' },
        },
      }),
    )
    expect(clearSealedV2Secrets(path)).toBe(1)
    const after = JSON.parse(readFileSync(path, 'utf8'))
    expect(after.providers).toEqual({
      anthropic: { apiKey: '', model: 'claude' },
      openai: { apiKey: 'sealed:v1:BBBB' },
    })
    expect(after.provider).toBe('anthropic')
    rmSync(dir, { recursive: true, force: true })
  })

  it('leaves a missing or unreadable file alone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ai-secrets-clear-'))
    expect(clearSealedV2Secrets(join(dir, 'none.json'))).toBe(0)
    writeFileSync(join(dir, 'bad.json'), '{')
    expect(clearSealedV2Secrets(join(dir, 'bad.json'))).toBe(0)
    rmSync(dir, { recursive: true, force: true })
  })
})
