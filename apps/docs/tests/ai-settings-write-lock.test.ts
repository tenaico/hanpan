// @vitest-environment node
/**
 * While Hanpan's security key is locked nothing writes ai-settings.json: the
 * v2 keys cannot be opened then, so a write would put empty values (or plain
 * ones) over them. The metered-use switch writes the file too, so it seals
 * like the settings screen does.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const userData = mkdtempSync(join(tmpdir(), 'docs-write-lock-'))
type Handler = (event: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
let subscriptionDeps: { setMeteredAccepted(provider: string, accepted: boolean): void } | null =
  null

vi.mock('electron', () => ({
  app: {
    getPath: () => userData,
    getName: () => 'docs-test',
    getVersion: () => '0',
    on: () => {},
    once: () => {},
    whenReady: () => new Promise(() => {}),
  },
  ipcMain: {
    handle: (channel: string, fn: Handler) => handlers.set(channel, fn),
    on: () => {},
    removeHandler: () => {},
  },
  BrowserWindow: class {},
  Menu: { buildFromTemplate: () => ({}), setApplicationMenu: () => {} },
  WebContentsView: class {},
  clipboard: {},
  dialog: {},
  nativeImage: {},
  net: {},
  session: {},
  shell: {},
  webContents: { getAllWebContents: () => [], fromId: () => null },
}))
vi.mock('@genoffice/ai-search', async () => ({
  ...(await import('../../../packages/ai-search/src/media-call-abort')),
  generateImageTool: vi.fn(),
  analyzeMediaTool: vi.fn(),
  documentMediaRoots: () => [],
  createCodexImageCliGenerator: () => async () => ({ bytes: new Uint8Array(), mime: 'image/png' }),
  registerCodexImageGenerator: () => {},
}))
vi.mock('@genoffice/ai-provider/subscription', () => ({
  ensureSubscriptionIpc: (_ipc: unknown, deps: typeof subscriptionDeps) => {
    subscriptionDeps = deps
    return {}
  },
  sharedSubscriptionStatuses: () => ({}),
}))
vi.mock('@genoffice/ai-provider/codex-app-server', () => ({
  shutdownCodexAppServers: () => {},
}))
vi.mock('@genoffice/ai-provider/custom-models', () => ({}))
vi.mock('../src/main/lazy-media', () => ({ readLazyMedia: async () => null }))
vi.mock('../src/main/lazy-media-inline', () => ({}))

import {
  SEALED_PREFIX,
  defaultAiSettings,
  setAiLocked,
  setAiSecretCodec,
} from '@genoffice/ai-provider'
import { registerAiIpc, writeStoredAiSettings } from '../src/main/docs-main'

const path = join(userData, 'ai-settings.json')
const reversing = {
  seal: (plain: string) =>
    SEALED_PREFIX + Buffer.from([...plain].reverse().join('')).toString('base64'),
  open: (sealed: string) =>
    [...Buffer.from(sealed.slice(SEALED_PREFIX.length), 'base64').toString()].reverse().join(''),
}

beforeAll(() => {
  registerAiIpc()
})
afterEach(() => {
  setAiLocked(false)
  setAiSecretCodec(null)
})

describe('ai-settings.json while the security key is locked', () => {
  it('refuses to write ai-settings.json while locked', () => {
    writeFileSync(path, JSON.stringify({ providers: { openai: { apiKey: 'sealed:v2:keep' } } }))
    const before = readFileSync(path)
    setAiLocked(true)
    const settings = { ...defaultAiSettings(), provider: 'openai' as const }
    expect(() => writeStoredAiSettings(settings)).toThrow()
    expect(() => handlers.get('ai:set-settings')!({}, settings)).toThrow()
    expect(() => subscriptionDeps!.setMeteredAccepted('codex', true)).toThrow()
    expect(readFileSync(path).equals(before)).toBe(true)
  })

  it('refuses to write over v2 keys it cannot open, also outside a lock', () => {
    // a build without the key requirement, the stick out: the v2 key reads as empty
    setAiSecretCodec({ seal: () => null, open: () => null })
    writeFileSync(path, JSON.stringify({ providers: { openai: { apiKey: 'sealed:v2:keep' } } }))
    const before = readFileSync(path)
    const settings = { ...defaultAiSettings(), provider: 'openai' as const }
    expect(() => writeStoredAiSettings(settings)).toThrow()
    expect(() => handlers.get('ai:set-settings')!({}, settings)).toThrow()
    expect(() => subscriptionDeps!.setMeteredAccepted('codex', true)).toThrow()
    expect(readFileSync(path).equals(before)).toBe(true)
  })

  it('setMeteredAccepted writes sealed values', () => {
    setAiSecretCodec(reversing)
    writeFileSync(
      path,
      JSON.stringify({ providers: { openai: { apiKey: 'sk-plain', model: '' } } }),
    )
    subscriptionDeps!.setMeteredAccepted('codex', true)
    const text = readFileSync(path, 'utf8')
    expect(text).not.toContain('sk-plain')
    expect(JSON.parse(text).providers.openai.apiKey.startsWith(SEALED_PREFIX)).toBe(true)
  })
})
