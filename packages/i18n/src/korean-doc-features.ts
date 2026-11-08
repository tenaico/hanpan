import type { Lang } from './index'

/**
 * Hanpan's Korean document features (HWP documents, the official-letter tools,
 * Hanpan templates, the design board, Gongu): on when the user switched them
 * on, otherwise only on a Korean UI (decision 0091). `stored` is the switch as
 * saved in app-settings.json, null until the user sets it.
 */
export function koreanDocFeaturesOn(stored: boolean | null, lang: Lang): boolean {
  return stored ?? lang === 'ko'
}
