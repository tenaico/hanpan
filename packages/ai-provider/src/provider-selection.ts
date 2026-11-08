/**
 * Which provider an AI request runs on, from the stored selection and the
 * connection status of the two subscription CLIs. Pure and browser-safe: the
 * renderer uses it to decide what to show, the main process to decide what to
 * run.
 *
 * The rule that shapes everything here: nothing that costs money is ever
 * picked on the user's behalf. `auto` only lands on a subscription login;
 * API-key providers and metered CLI logins run only when the user selected
 * them, and a selected provider that cannot run is reported, never replaced.
 */
import { AI_PROVIDERS, AI_SUBSCRIPTION_PROVIDERS } from './providers'
import type {
  AiProviderId,
  AiProviderSelection,
  AiRunErrorKind,
  AiSettings,
  AiSubscriptionProviderId,
  AiSubscriptionStatus,
  AiSubscriptionStatuses,
} from './types'

export { AI_SUBSCRIPTION_PROVIDERS } from './providers'

/** Why no provider can run; `no-subscription` is the `auto` case, the rest name the selected provider */
export type AiNotConnectedReason =
  | 'no-subscription'
  | 'checking'
  | 'not-installed'
  | 'signed-out'
  | 'metered-not-accepted'
  | 'error'
  | 'not-configured'

export type AiProviderChoice =
  | {
      connected: true
      provider: AiProviderId
      /** an accepted metered CLI login: usable, but the UI must mark it as costing money */
      metered: boolean
    }
  | {
      connected: false
      /** the stored selection as understood (`auto` for removed or unknown ids) */
      selection: AiProviderSelection
      /** the selected provider that cannot run; absent for `auto` */
      provider?: AiProviderId
      reason: AiNotConnectedReason
      /** the run error to report when a request is attempted anyway */
      errorKind: AiRunErrorKind
      /** the status check's own error text, on reason `error` */
      detail?: string
    }

export function isSubscriptionProvider(id: unknown): id is AiSubscriptionProviderId {
  return AI_SUBSCRIPTION_PROVIDERS.includes(id as AiSubscriptionProviderId)
}

/**
 * How a subscription provider can be used right now: on its subscription, on
 * a metered login the user accepted, or not at all (null). Acceptance needs
 * both the stored setting and the status built from it, so a flag that
 * outlived a login change can never start a paid run.
 */
export function subscriptionConnection(
  settings: Pick<AiSettings, 'meteredAccepted'>,
  status: AiSubscriptionStatus | undefined,
): 'subscription' | 'metered' | null {
  if (!status) return null
  if (status.state === 'ready') return 'subscription'
  if (
    status.state === 'metered' &&
    status.meteredAccepted === true &&
    settings.meteredAccepted?.[status.provider] === true
  ) {
    return 'metered'
  }
  return null
}

/**
 * A key provider with enough filled in to send a request: a model plus a key,
 * or for a self-hosted endpoint a model plus a base URL. Subscription
 * providers and removed ids are never "configured".
 */
export function isKeyProviderConfigured(
  settings: Pick<AiSettings, 'providers'>,
  provider: AiProviderId,
): boolean {
  if (isSubscriptionProvider(provider)) return false
  const meta = AI_PROVIDERS.find((m) => m.id === provider)
  const config = settings.providers?.[provider]
  if (!meta || !config) return false
  if (!config.model?.trim()) return false
  if (meta.needsBaseUrl) return !!config.baseUrl?.trim()
  return !!config.apiKey?.trim()
}

/** The stored selection as understood: unknown ids (a removed provider among them) read as `auto` */
export function providerSelectionOf(settings: Pick<AiSettings, 'provider'>): AiProviderSelection {
  const stored: unknown = settings.provider
  return AI_PROVIDERS.find((m) => m.id === stored)?.id ?? 'auto'
}

/**
 * A provider's state as the choice reads it. A status the check has not
 * answered yet is `checking`, and so is a missing CLI status: the check is
 * still out. A missing ChatGPT status is different: the same service makes
 * all three at once, so a map without it comes from where the direct
 * connection does not exist (an older app, a caller that lists the CLIs
 * alone), and it reads as signed out instead of holding `auto` for ever.
 */
export function subscriptionStateOf(
  statuses: AiSubscriptionStatuses,
  id: AiSubscriptionProviderId,
): AiSubscriptionStatus['state'] {
  return statuses[id]?.state ?? (id === 'chatgpt' ? 'signed-out' : 'checking')
}

const SUBSCRIPTION_BLOCKERS: Record<
  Exclude<AiSubscriptionStatus['state'], 'ready'>,
  { reason: AiNotConnectedReason; errorKind: AiRunErrorKind }
> = {
  checking: { reason: 'checking', errorKind: 'not-connected' },
  'not-installed': { reason: 'not-installed', errorKind: 'not-installed' },
  'signed-out': { reason: 'signed-out', errorKind: 'signed-out' },
  metered: { reason: 'metered-not-accepted', errorKind: 'metered-not-accepted' },
  error: { reason: 'error', errorKind: 'not-connected' },
}

/**
 * The provider to run on, or why none can.
 *
 * - `auto`: Claude Code when it is `ready`, else Codex when it is `ready`,
 *   else not connected. Key providers and metered logins are not candidates.
 *   A provider is passed over only once its status check has answered: while
 *   an earlier one is still `checking` (or has no status yet) nothing is
 *   decided, so a later provider is not picked just because it answered first.
 * - a selected provider is used when it can run (a ready subscription, an
 *   accepted metered login, a configured key provider) and is reported as not
 *   connected otherwise. There is no fallback from an explicit selection.
 */
export function selectAiProvider(
  settings: Pick<AiSettings, 'provider' | 'providers' | 'meteredAccepted'>,
  statuses: AiSubscriptionStatuses,
): AiProviderChoice {
  const selection = providerSelectionOf(settings)
  if (selection === 'auto') {
    let ready: AiSubscriptionProviderId | undefined
    for (const id of AI_SUBSCRIPTION_PROVIDERS) {
      const state = subscriptionStateOf(statuses, id)
      if (state === 'ready') ready = id
      if (state === 'ready' || state === 'checking') break
    }
    return ready
      ? { connected: true, provider: ready, metered: false }
      : {
          connected: false,
          selection,
          reason: 'no-subscription',
          errorKind: 'not-connected',
        }
  }
  if (!isSubscriptionProvider(selection)) {
    return isKeyProviderConfigured(settings, selection)
      ? { connected: true, provider: selection, metered: false }
      : {
          connected: false,
          selection,
          provider: selection,
          reason: 'not-configured',
          errorKind: 'not-connected',
        }
  }
  const status = statuses[selection]
  const connection = subscriptionConnection(settings, status)
  if (connection) {
    return { connected: true, provider: selection, metered: connection === 'metered' }
  }
  // connection is null, so a present status is in a non-ready state
  const state = !status || status.state === 'ready' ? 'checking' : status.state
  return {
    connected: false,
    selection,
    provider: selection,
    ...SUBSCRIPTION_BLOCKERS[state],
    ...(state === 'error' && status?.error ? { detail: status.error } : {}),
  }
}

/**
 * Hanpan: the account a default AI should run on, read the same for every
 * editor — a subscription `auto` would land on (Claude Code, then ChatGPT,
 * then Codex, as `auto` orders them), else a key provider the user filled in.
 * A server entry (`custom`) is never an account: the PC model lives there.
 * `checking` while a subscription check that would decide has not answered,
 * null when nothing is signed in. The selection itself is not read: the
 * caller decides whether the stored choice is still a default it may change.
 */
export function accountDefaultProvider(
  settings: Pick<AiSettings, 'providers' | 'meteredAccepted'>,
  statuses: AiSubscriptionStatuses,
): AiProviderId | 'checking' | null {
  const auto = selectAiProvider({ ...settings, provider: 'auto' }, statuses)
  if (auto.connected) return auto.provider
  if (AI_SUBSCRIPTION_PROVIDERS.some((id) => subscriptionStateOf(statuses, id) === 'checking')) {
    return 'checking'
  }
  const key = AI_PROVIDERS.find(
    (meta) => meta.id !== 'custom' && isKeyProviderConfigured(settings, meta.id),
  )
  return key?.id ?? null
}
