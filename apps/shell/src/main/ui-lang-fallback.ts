import { normalizeLang, type Lang } from '@genoffice/i18n'

/** a locale that really names English: normalizeLang also answers 'en' for languages it does not have */
const ENGLISH = /^en(\b|[-_])/i

/**
 * Hanpan's UI language while none is chosen in Settings (decision 0092): the
 * first of the OS's preferred display languages that Hanpan has, else Korean.
 */
export function fallbackUiLang(osLocales: readonly string[]): Lang {
  for (const locale of osLocales) {
    const lang = normalizeLang(locale)
    if (lang !== 'en' || ENGLISH.test(locale.trim())) return lang
  }
  return 'ko'
}
