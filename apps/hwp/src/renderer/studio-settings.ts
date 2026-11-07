import type { Lang } from '@genoffice/i18n'
import type { UiTheme } from '../shared/ipc'

/** localStorage key the studio reads its settings from before its first paint. */
export const STUDIO_SETTINGS_KEY = 'rhwp-settings'

type Json = Record<string, unknown>

const asObject = (value: unknown): Json =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {}

function parseStored(stored: string | null): Json {
  try {
    return asObject(JSON.parse(stored ?? '{}'))
  } catch {
    return {}
  }
}

/**
 * The settings the studio must boot with, merged over whatever it stored itself.
 *
 * - theme: follows the app, so the editor chrome matches the tab around it.
 * - autosave: off. The studio keeps recovery drafts of the document in
 *   IndexedDB, and in embed mode it never offers them back, so a draft would
 *   only be a second copy of the user's document left in the app profile. The
 *   app's own autosave writes the user's file (renderer/autosave-flow.ts) and
 *   is separate from this draft autosave.
 */
export function seededStudioSettings(stored: string | null, theme: UiTheme): string {
  const settings = parseStored(stored)
  return JSON.stringify({
    ...settings,
    theme: { ...asObject(settings.theme), mode: theme },
    autosave: { ...asObject(settings.autosave), recoveryEnabled: false, idleSaveEnabled: false },
  })
}

/** Studio languages beyond rhwp's Korean and English (studio-plugin/studio-locales.mjs). */
const EXTRA_STUDIO_LOCALES = ['vi'] as const
type StudioLocale = 'ko' | 'en' | (typeof EXTRA_STUDIO_LOCALES)[number]

/**
 * The studio's language for a UI language: Korean and English as rhwp ships them, the
 * languages this app adds to the studio, and English for every other one.
 */
export function studioLocale(lang: Lang): StudioLocale {
  if (lang === 'ko') return 'ko'
  return (EXTRA_STUDIO_LOCALES as readonly string[]).includes(lang) ? (lang as StudioLocale) : 'en'
}

/**
 * `chrome=embed` makes the studio drop its own document lifecycle (new, open,
 * save, print, document drops): the tab owns the file, and a document swapped
 * inside the editor would later be saved over the tab's file.
 */
export function studioUrl(lang: Lang): string {
  return `./studio/index.html?chrome=embed&lang=${studioLocale(lang)}`
}
