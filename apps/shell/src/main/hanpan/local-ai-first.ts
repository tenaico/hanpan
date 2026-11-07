/**
 * Hanpan: the default AI, the same for every editor (0.17, item 8).
 *
 * Every editor reads the one AI setting (ai-settings.json), so the default is
 * decided once here, at start, and written there; a change in Settings reaches
 * every editor the same way. While the choice is still a default (never picked
 * by the person), each start settles it again:
 *
 * - an account the person is signed in to comes first: a subscription login
 *   (`auto` runs on it) or an API key they filled in (selected);
 * - otherwise the AI server on this PC (Ollama, LM Studio, vLLM including
 *   TenOS, llama.cpp: loopback addresses only) with the most Korean-capable
 *   model it offers, registered once as a local server entry and selected.
 *
 * Decision records: docs/tracking/decisions/0084-hanpan-local-ai-first.md and
 * its 0.17 amendment there. The mark file remembers what was written last; a
 * selection that differs from it was the person's, and from then on nothing
 * here touches the settings again. With no account and no server, the next
 * start looks again (installing Ollama later is the common case).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import {
  accountDefaultProvider,
  activeCustomEndpoint,
  isSubscriptionProvider,
  newCustomEndpointId,
  selectCustomEndpoint,
  upsertCustomEndpoint,
  type AiCustomEndpoint,
  type AiProviderId,
  type AiProviderSelection,
  type AiSettings,
} from '@genoffice/ai-provider'
import { checkSharedSubscriptionStatuses } from '@genoffice/ai-provider/subscription'
import { chooseLocalAi, type LocalAiChoice } from '@genoffice/local-ai'

/**
 * What hanpan-local-ai.json remembers. `kept`: the person chose, never touched
 * again. `auto`: a default was written, `wrote` is the selection it left.
 * `adopted` is what 0.16 wrote after selecting a local server (`custom`).
 */
export interface DefaultAiMark {
  outcome: 'auto' | 'kept' | 'adopted'
  wrote?: AiProviderSelection
}

export interface LocalAiFirstDeps {
  readSettings(): AiSettings
  writeSettings(settings: AiSettings): boolean
  readMark(): DefaultAiMark | null
  writeMark(mark: DefaultAiMark): void
  /**
   * The account to run on (accountDefaultProvider over fresh statuses), null
   * when nothing is signed in, `unknown` when the check gave no answer.
   */
  account(): Promise<AiProviderId | null | 'unknown'>
  choose(): Promise<LocalAiChoice | null>
}

/** Models listed in the entry for the composer's picker, as the settings card keeps them. */
const MAX_LISTED_MODELS = 200

export function localEndpointFor(choice: LocalAiChoice): AiCustomEndpoint {
  return {
    id: newCustomEndpointId(),
    name: `${choice.server.name} (내 PC)`,
    baseUrl: choice.server.baseUrl,
    apiKey: '',
    model: choice.model,
    models: choice.server.models.slice(0, MAX_LISTED_MODELS),
    kind: 'local',
  }
}

export type LocalAiFirstOutcome =
  | 'settled-before'
  | 'kept-choice'
  | 'undecided'
  | 'account'
  | 'local'
  | 'none-found'
  | 'adopted'
  | 'write-refused'

/** The selection the last default left, or undefined when none was written. */
function writtenBy(mark: DefaultAiMark | null): AiProviderSelection | undefined {
  if (!mark) return undefined
  return mark.wrote ?? (mark.outcome === 'adopted' ? 'custom' : undefined)
}

/** Whether the stored choice is still a default this start may change. */
function stillDefault(settings: AiSettings, mark: DefaultAiMark | null): boolean {
  const wrote = writtenBy(mark)
  if (wrote === undefined) {
    // first look: only the untouched `auto`, without a server the person set up
    const hasLocal = (settings.customEndpoints ?? []).some((e) => e.kind === 'local')
    return settings.provider === 'auto' && !hasLocal
  }
  if (settings.provider !== wrote) return false
  // a default on a server must still be on a PC model, not one the person switched to
  return wrote !== 'custom' || activeCustomEndpoint(settings)?.kind === 'local'
}

export async function settleDefaultAi(deps: LocalAiFirstDeps): Promise<LocalAiFirstOutcome> {
  const mark = deps.readMark()
  if (mark?.outcome === 'kept') return 'settled-before'
  const keep = (): LocalAiFirstOutcome => {
    deps.writeMark({ outcome: 'kept' })
    return 'kept-choice'
  }
  const before = deps.readSettings()
  if (!stillDefault(before, mark)) return keep()

  const account = await deps.account()
  if (account === 'unknown') return 'undecided'
  // read again: the person may have changed the settings while the check ran
  const now = deps.readSettings()
  if (now.provider !== before.provider) return keep()
  const write = (next: AiSettings, outcome: LocalAiFirstOutcome): LocalAiFirstOutcome => {
    if (next !== now && !deps.writeSettings(next)) return 'write-refused'
    deps.writeMark({ outcome: 'auto', wrote: next.provider })
    return outcome
  }

  if (account) {
    // `auto` already runs on a ready subscription; a key provider is selected
    const target: AiProviderSelection = isSubscriptionProvider(account) ? 'auto' : account
    return write(now.provider === target ? now : { ...now, provider: target }, 'account')
  }

  if (now.provider === 'custom') return write(now, 'local')
  // a PC model registered before (by an earlier default): back to it without a probe
  const active = activeCustomEndpoint(now)
  const local =
    active?.kind === 'local' ? active : (now.customEndpoints ?? []).find((e) => e.kind === 'local')
  if (writtenBy(mark) !== undefined && local) {
    return write({ ...selectCustomEndpoint(now, local.id), provider: 'custom' }, 'local')
  }

  const choice = await deps.choose()
  if (!choice) return 'none-found'
  const latest = deps.readSettings()
  if (latest.provider !== now.provider) return keep()
  const next: AiSettings = {
    ...upsertCustomEndpoint(latest, localEndpointFor(choice), true),
    provider: 'custom',
  }
  if (!deps.writeSettings(next)) return 'write-refused'
  deps.writeMark({ outcome: 'auto', wrote: 'custom' })
  return 'adopted'
}

export const defaultChoose = () => chooseLocalAi({ timeoutMs: 1500 })

/** How long the start waits for the sign-in checks before leaving the default alone this time */
const ACCOUNT_CHECK_MS = 60_000

/** The mark file as written, or null when there is none (or it is unreadable: decided again) */
function readMarkFile(path: string): DefaultAiMark | null {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<DefaultAiMark> | null
    const outcome = raw?.outcome
    if (outcome !== 'auto' && outcome !== 'kept' && outcome !== 'adopted') return null
    return typeof raw?.wrote === 'string' ? { outcome, wrote: raw.wrote } : { outcome }
  } catch {
    return null
  }
}

/** The app's own dependencies: the settings file, the mark file, the live sign-in checks. */
export function defaultAiDeps(options: {
  markPath: string
  readSettings(): AiSettings
  writeSettings(settings: AiSettings): boolean
}): LocalAiFirstDeps {
  return {
    readSettings: options.readSettings,
    writeSettings: options.writeSettings,
    readMark: () => readMarkFile(options.markPath),
    writeMark: (mark) =>
      writeFileSync(options.markPath, JSON.stringify({ ...mark, at: new Date().toISOString() })),
    account: async () => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ACCOUNT_CHECK_MS)
      })
      try {
        const statuses = await Promise.race([checkSharedSubscriptionStatuses(), timeout])
        if (!statuses) return 'unknown'
        const account = accountDefaultProvider(options.readSettings(), statuses)
        return account === 'checking' ? 'unknown' : account
      } finally {
        clearTimeout(timer)
      }
    },
    choose: defaultChoose,
  }
}
