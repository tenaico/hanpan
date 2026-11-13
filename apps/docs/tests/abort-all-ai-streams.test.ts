// @vitest-environment node
/**
 * The security key lock ends every AI stream the docs main runs (one handler
 * answers every editor in the suite, and the graphics tabs' helpers too). A
 * run cut by the lock ends like [Stop]: one `done` chunk, no error chunk, so
 * the editor keeps what was already written and unlocks itself. The provider
 * call is a stand-in that waits on the lock, as aiFetch does.
 */
import { EventEmitter } from 'node:events'
import { tmpdir } from 'node:os'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AiStreamChunk } from '@genoffice/ai-provider'

type Handler = (event: { sender: FakeContents }, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()

vi.mock('electron', () => ({
  app: {
    getPath: () => tmpdir(),
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

const streamStandIn = vi.fn()
vi.mock('@genoffice/ai-provider', async (original) => ({
  ...(await original<typeof import('@genoffice/ai-provider')>()),
  streamForProvider: (...args: unknown[]) => streamStandIn(...args),
}))
// any request runs: the provider choice is not what this test is about
vi.mock('../src/main/ai-run', async (original) => ({
  ...(await original<typeof import('../src/main/ai-run')>()),
  resolveAiRun: () => ({
    ok: true,
    settings: {},
    provider: 'anthropic',
    config: { apiKey: 'k', model: 'm' },
  }),
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
  ensureSubscriptionIpc: () => ({}),
  sharedSubscriptionStatuses: () => ({}),
}))
vi.mock('@genoffice/ai-provider/codex-app-server', () => ({
  shutdownCodexAppServers: () => {},
}))
vi.mock('@genoffice/ai-provider/custom-models', () => ({}))
vi.mock('../src/main/lazy-media', () => ({ readLazyMedia: async () => null }))
vi.mock('../src/main/lazy-media-inline', () => ({}))

import { AiLockedError, aiLockSignal, setAiLocked } from '@genoffice/ai-provider'
import { abortAllAiStreams, activeAiStreamCount, registerAiIpc } from '../src/main/docs-main'

let nextId = 100
class FakeContents extends EventEmitter {
  id = ++nextId
  isDestroyed = () => false
  chunks: AiStreamChunk[] = []
  send = (_channel: string, chunk: AiStreamChunk) => this.chunks.push(chunk)
}

/** a provider call that streams once, then waits until its signal or the lock ends it */
function waitingProvider(onStart?: () => void) {
  streamStandIn.mockImplementation(
    (...args: unknown[]) =>
      new Promise<void>((_resolve, reject) => {
        const cb = args[6] as { signal: AbortSignal; onDelta(t: string): void }
        cb.onDelta('half an answer')
        onStart?.()
        const lock = aiLockSignal()
        lock.addEventListener('abort', () => reject(new AiLockedError()))
        cb.signal.addEventListener('abort', () => reject(new Error('aborted')))
      }),
  )
}

const stream = (sender: FakeContents, requestId: string) =>
  handlers.get('ai:stream')!(
    { sender },
    { requestId, system: 's', messages: [], maxTokens: 10, settings: {} },
  ) as Promise<void>

beforeAll(() => {
  registerAiIpc()
})
afterEach(() => {
  setAiLocked(false)
  streamStandIn.mockReset()
})

describe('abortAllAiStreams', () => {
  it('aborts every running stream', async () => {
    waitingProvider()
    const a = new FakeContents()
    const b = new FakeContents()
    const runs = [stream(a, 'r1'), stream(b, 'r2')]
    await Promise.resolve()
    expect(activeAiStreamCount()).toBe(2)
    abortAllAiStreams()
    await Promise.all(runs)
    expect(activeAiStreamCount()).toBe(0)
    for (const sender of [a, b]) {
      expect(sender.chunks.at(-1)).toMatchObject({ type: 'done' })
      expect(sender.chunks.some((c) => c.type === 'error')).toBe(false)
    }
  })

  it('a run cut by the lock ends with done like Stop, not an error chunk', async () => {
    waitingProvider()
    const sender = new FakeContents()
    const run = stream(sender, 'r3')
    await Promise.resolve()
    // lockAi: both in one turn, so the controller is already aborted when the catch runs
    setAiLocked(true)
    abortAllAiStreams()
    await run
    expect(sender.chunks.some((c) => c.type === 'delta')).toBe(true)
    expect(sender.chunks.at(-1)).toMatchObject({ requestId: 'r3', type: 'done' })
    expect(sender.chunks.some((c) => c.type === 'error')).toBe(false)
  })

  it('a stream asked for while locked gets the not-connected error', async () => {
    const real =
      await vi.importActual<typeof import('@genoffice/ai-provider')>('@genoffice/ai-provider')
    streamStandIn.mockImplementation((...args: unknown[]) =>
      (real.streamForProvider as (...a: unknown[]) => Promise<void>)(...args),
    )
    setAiLocked(true)
    const sender = new FakeContents()
    await stream(sender, 'r4')
    expect(sender.chunks.at(-1)).toMatchObject({
      requestId: 'r4',
      type: 'error',
      errorCode: 'not-connected',
    })
  })
})
