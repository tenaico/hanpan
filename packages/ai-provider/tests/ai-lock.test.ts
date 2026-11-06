import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AiLockedError,
  aiLockSignal,
  assertAiUnlocked,
  isAiLocked,
  setAiLocked,
} from '../src/ai-lock'
import { aiFetch } from '../src/fetch'
import { AiRunError } from '../src/run-error'
import { chatForProvider } from '../src/chat'
import { streamForProvider } from '../src/stream'
import { spawnSubscriptionProgram } from '../src/subscription/process'
import { listCustomModels } from '../src/custom-models'
import { listLocalModels } from '../src/local-models'

afterEach(() => {
  setAiLocked(false)
  vi.unstubAllGlobals()
})

describe('the security key AI lock', () => {
  it('is an AiRunError of the not-connected kind', () => {
    setAiLocked(true)
    expect(isAiLocked()).toBe(true)
    let caught: unknown
    try {
      assertAiUnlocked()
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(AiLockedError)
    expect(caught).toBeInstanceOf(AiRunError)
    expect((caught as AiLockedError).kind).toBe('not-connected')
    expect((caught as AiLockedError).code).toBe('ai-locked')
    setAiLocked(false)
    expect(() => assertAiUnlocked()).not.toThrow()
  })

  it('aiFetch refuses while locked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)
    setAiLocked(true)
    await expect(aiFetch('https://x/', {})).rejects.toBeInstanceOf(AiLockedError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('locking aborts running calls and unlocking lets new ones start', async () => {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const signal = init?.signal
          if (signal?.aborted) return reject(signal.reason)
          signal?.addEventListener('abort', () => reject(signal.reason))
          if (fetchMock.mock.calls.length > 1) resolve(new Response('second'))
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const caller = new AbortController()
    const running = aiFetch('https://x/', { signal: caller.signal })
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    setAiLocked(true)
    await expect(running).rejects.toBeTruthy()
    // the caller's own signal was not touched: only the lock ended the call
    expect(caller.signal.aborted).toBe(false)
    setAiLocked(false)
    expect(aiLockSignal().aborted).toBe(false)
    const again = await aiFetch('https://x/', {})
    expect(await again.text()).toBe('second')
  })

  it('does not start subscription programs while locked', () => {
    const spawn = vi.fn()
    setAiLocked(true)
    expect(() =>
      spawnSubscriptionProgram({ command: 'claude', prefixArgs: [], env: {} } as never, ['-p'], {
        spawn: spawn as never,
      }),
    ).toThrow(AiLockedError)
    expect(spawn).not.toHaveBeenCalled()
  })

  it('streamForProvider refuses while locked with the not-connected kind', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    setAiLocked(true)
    const run = streamForProvider('anthropic', { apiKey: 'k', model: 'm' }, 'sys', [], [], 100, {
      signal: new AbortController().signal,
      onDelta: () => {},
      onToolCall: () => {},
    })
    await expect(run).rejects.toBeInstanceOf(AiLockedError)
    await expect(run).rejects.toMatchObject({ kind: 'not-connected' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('chatForProvider fails while locked', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    setAiLocked(true)
    await expect(
      chatForProvider('anthropic', { apiKey: 'k', model: 'm' }, 'sys', 'hi'),
    ).rejects.toBeInstanceOf(AiLockedError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('the model lists that use fetch directly ask nothing while locked', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    setAiLocked(true)
    await listCustomModels('http://127.0.0.1:1234/v1', 'k').catch(() => undefined)
    await listLocalModels({ baseUrl: 'http://127.0.0.1:11434' } as never).catch(() => undefined)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
