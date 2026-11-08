/**
 * Whether the provider a request would go to can take a picture. Slides send
 * a slide picture for checking, the graphics tabs a canvas picture.
 */
import { selectAiProvider } from './provider-selection'
import { getProviderAdapter, modelLacksVision } from './registry'
import type { AiSettings, AiSubscriptionStatuses } from './types'

/**
 * Unknown providers are treated as text-only: omitting an image is safer than a user-visible 400.
 * `auto` is judged by the subscription provider it resolves to, so `statuses` must be the live
 * ones; with nothing connected there is no provider to send a picture to.
 */
export function settingsSupportVision(
  settings: Pick<AiSettings, 'provider' | 'providers' | 'meteredAccepted'>,
  statuses: AiSubscriptionStatuses = {},
): boolean {
  try {
    const provider = selectAiProvider(settings, statuses).provider
    if (!provider) return false
    if (!getProviderAdapter(provider).capabilities.vision) return false
    return !modelLacksVision(settings.providers?.[provider]?.model ?? '')
  } catch {
    return false
  }
}
