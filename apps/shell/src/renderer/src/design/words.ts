/**
 * Hanpan design board: its words, one table per language under words/ (Korean, English,
 * Vietnamese); every other UI language reads the English table.
 */
import type { DesignIcon } from './icons'
import { EN } from './words/en'
import { KO, type Words } from './words/ko'
import { VI } from './words/vi'

export type { Words }

const TABLES: Readonly<Record<string, Words>> = { ko: KO, en: EN, vi: VI }

export const wordsFor = (lang: string): Words => TABLES[lang] ?? EN

/** Every UI language under its own name, for the translation target picker. */
export const LANG_NATIVE_NAMES: Readonly<Record<string, string>> = {
  ko: '한국어',
  en: 'English',
  vi: 'Tiếng Việt',
  zh: '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  cs: 'Čeština',
  ru: 'Русский',
  ar: 'العربية',
  he: 'עברית',
  hi: 'हिन्दी',
}

/** A font's name in the picker: its Korean label under a Korean UI, else the family name. */
export const fontLabel = (font: { family: string; label: string }, lang: string): string =>
  lang === 'ko' ? font.label : font.family

/** An icon's tooltip: its Korean words under a Korean UI, else its English name. */
export const iconLabel = (icon: Pick<DesignIcon, 'name' | 'label'>, lang: string): string =>
  lang === 'ko' ? icon.label : icon.name.replace(/-/g, ' ')
