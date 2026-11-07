import { describe, expect, it } from 'vitest'
import { defaultAiSettings, type AiProviderId, type AiSettings } from '@genoffice/ai-provider'
import {
  settleDefaultAi,
  type DefaultAiMark,
  type LocalAiFirstDeps,
} from '../src/main/hanpan/local-ai-first'

const choice = {
  server: {
    kind: 'ollama' as const,
    name: 'Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    models: ['llama3.2', 'exaone3.5:7.8b'],
  },
  model: 'exaone3.5:7.8b',
}

type Account = AiProviderId | null | 'unknown'

function harness(
  initial: AiSettings,
  found: typeof choice | null,
  account: Account = null,
  mark: DefaultAiMark | null = null,
) {
  let settings = initial
  let stored = mark
  let probes = 0
  const state = { account }
  const deps: LocalAiFirstDeps = {
    readSettings: () => settings,
    writeSettings: (next) => {
      settings = next
      return true
    },
    readMark: () => stored,
    writeMark: (next) => {
      stored = next
    },
    account: async () => state.account,
    choose: async () => {
      probes++
      return found
    },
  }
  return {
    deps,
    state,
    settings: () => settings,
    /** what Settings writes when the person picks an AI */
    pick: (next: Partial<AiSettings>) => {
      settings = { ...settings, ...next }
    },
    mark: () => stored,
    probes: () => probes,
  }
}

describe('Hanpan default AI: an account first, else the PC model', () => {
  it('adopts the local server when nothing is signed in', async () => {
    const h = harness(defaultAiSettings(), choice)
    expect(await settleDefaultAi(h.deps)).toBe('adopted')
    expect(h.settings().provider).toBe('custom')
    const endpoint = h.settings().customEndpoints?.find((e) => e.kind === 'local')
    expect(endpoint).toMatchObject({
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'exaone3.5:7.8b',
      name: 'Ollama (내 PC)',
    })
    expect(h.mark()).toMatchObject({ outcome: 'auto', wrote: 'custom' })
  })

  it('keeps a signed-in subscription as the default: no local server is adopted', async () => {
    const h = harness(defaultAiSettings(), choice, 'claude-code')
    expect(await settleDefaultAi(h.deps)).toBe('account')
    // auto runs on the ready subscription, in every editor alike
    expect(h.settings().provider).toBe('auto')
    expect(h.settings().customEndpoints ?? []).toEqual([])
    expect(h.probes()).toBe(0)
    expect(h.mark()).toMatchObject({ outcome: 'auto', wrote: 'auto' })
  })

  it('selects an API key the person filled in when no subscription is ready', async () => {
    const h = harness(defaultAiSettings(), choice, 'anthropic')
    expect(await settleDefaultAi(h.deps)).toBe('account')
    expect(h.settings().provider).toBe('anthropic')
    expect(h.mark()).toMatchObject({ outcome: 'auto', wrote: 'anthropic' })
  })

  it('hands an automatically adopted PC model over to an account signed in later', async () => {
    const h = harness(defaultAiSettings(), choice)
    await settleDefaultAi(h.deps)
    expect(h.settings().provider).toBe('custom')
    h.state.account = 'codex'
    expect(await settleDefaultAi(h.deps)).toBe('account')
    expect(h.settings().provider).toBe('auto')
    // and back to the PC model, without a new probe, once nothing is signed in
    h.state.account = null
    expect(await settleDefaultAi(h.deps)).toBe('local')
    expect(h.settings().provider).toBe('custom')
    expect(h.probes()).toBe(1)
  })

  it('moves a 0.16 adoption over to the signed-in account', async () => {
    const adopted = harness(defaultAiSettings(), choice)
    await settleDefaultAi(adopted.deps)
    const h = harness(adopted.settings(), choice, 'claude-code', { outcome: 'adopted' })
    expect(await settleDefaultAi(h.deps)).toBe('account')
    expect(h.settings().provider).toBe('auto')
  })

  it('never switches a person who chose an AI, then or later', async () => {
    const h = harness({ ...defaultAiSettings(), provider: 'claude-code' } as AiSettings, choice)
    expect(await settleDefaultAi(h.deps)).toBe('kept-choice')
    expect(h.settings().provider).toBe('claude-code')
    expect(h.mark()).toMatchObject({ outcome: 'kept' })
    expect(await settleDefaultAi(h.deps)).toBe('settled-before')
  })

  it('keeps the choice a person made in Settings after a default was written', async () => {
    const h = harness(defaultAiSettings(), choice)
    await settleDefaultAi(h.deps)
    // the person picked a subscription themselves, then signed out of it
    h.pick({ provider: 'chatgpt' })
    h.state.account = null
    expect(await settleDefaultAi(h.deps)).toBe('kept-choice')
    expect(h.settings().provider).toBe('chatgpt')
  })

  it('keeps a person who picked the PC model while an account was signed in', async () => {
    const h = harness(defaultAiSettings(), choice)
    await settleDefaultAi(h.deps)
    h.state.account = 'claude-code'
    await settleDefaultAi(h.deps)
    expect(h.settings().provider).toBe('auto')
    h.pick({ provider: 'custom' })
    expect(await settleDefaultAi(h.deps)).toBe('kept-choice')
    expect(h.settings().provider).toBe('custom')
  })

  it('changes nothing while the account check has no answer', async () => {
    const h = harness(defaultAiSettings(), choice, 'unknown')
    expect(await settleDefaultAi(h.deps)).toBe('undecided')
    expect(h.settings().provider).toBe('auto')
    expect(h.mark()).toBeNull()
  })

  it('looks again next start when no server is running', async () => {
    const h = harness(defaultAiSettings(), null)
    expect(await settleDefaultAi(h.deps)).toBe('none-found')
    expect(h.mark()).toBeNull()
  })
})
