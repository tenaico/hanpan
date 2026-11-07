/**
 * Hanpan 0.17: the spelling checker follows the UI language. Electron starts it on the
 * OS display language alone, so a Vietnamese UI on Korean Windows still checked Korean.
 * The UI language goes first and the dictionaries the OS chose stay after it: people
 * often write in the OS language too (a Korean PC with a Vietnamese UI checks both), and
 * a fixed extra Korean dictionary would only mark every word of a Vietnamese PC's text.
 * Only dictionaries the PC lists are asked for; without one for the UI language the OS
 * choice stays as it was.
 */
import type { Session } from 'electron'
import { onUiLangChange, type Lang } from '@genoffice/i18n'

/** Electron dictionary codes a UI language prefers, most likely first */
const PREFERRED: Partial<Record<Lang, readonly string[]>> = {
  en: ['en-US', 'en-GB'],
  zh: ['zh-CN', 'zh-Hans'],
  'zh-TW': ['zh-TW', 'zh-Hant', 'zh-HK'],
  pt: ['pt-BR', 'pt-PT'],
  es: ['es-ES', 'es-MX', 'es-419'],
}

function dictionaryFor(lang: Lang, available: readonly string[]): string | undefined {
  for (const code of [...(PREFERRED[lang] ?? []), lang]) {
    if (available.includes(code)) return code
  }
  const base = lang.split('-')[0]!
  return available.find((code) => code.split('-')[0] === base && !/^zh-(TW|HK|Hant)/.test(code))
}

/** The dictionaries to check with: the UI language's, then the OS choice, each once. */
export function spellcheckLanguagesFor(
  ui: Lang,
  osChoice: readonly string[],
  available: readonly string[],
): string[] {
  const out: string[] = []
  const first = dictionaryFor(ui, available)
  if (first) out.push(first)
  for (const code of osChoice) if (available.includes(code) && !out.includes(code)) out.push(code)
  return out
}

/**
 * Applies the UI language to a session's spelling checker now and on every language
 * change. The OS choice is read once, before the first change, so switching the UI back
 * and forth does not pile languages up.
 */
export function followUiLangForSpellcheck(session: Session, lang: Lang): void {
  const osChoice = session.getSpellCheckerLanguages()
  const apply = (next: Lang): void => {
    const langs = spellcheckLanguagesFor(next, osChoice, session.availableSpellCheckerLanguages)
    if (langs.length === 0) return
    try {
      session.setSpellCheckerLanguages(langs)
    } catch (err) {
      console.warn('[shell] spellcheck languages not set:', err)
    }
  }
  apply(lang)
  onUiLangChange(apply)
}
