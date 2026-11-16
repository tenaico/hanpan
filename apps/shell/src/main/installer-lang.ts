import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Lang } from '@genoffice/i18n'

/**
 * The language picked on the Windows installer's first screen (decision 0100).
 * build/installer.nsh writes the Windows language id (LANGID) the installer ran
 * in to this file next to Hanpan.exe.
 */
export const INSTALLER_LANGUAGE_FILE = 'installer-language.txt'

/** Hanpan's language for each Windows primary language id (LANGID & 0x3ff) */
const BY_PRIMARY: Readonly<Record<number, Lang>> = {
  0x01: 'ar',
  0x05: 'cs',
  0x07: 'de',
  0x09: 'en',
  0x0a: 'es',
  0x0c: 'fr',
  0x0d: 'he',
  0x10: 'it',
  0x11: 'ja',
  0x12: 'ko',
  0x13: 'nl',
  0x15: 'pl',
  0x16: 'pt',
  0x19: 'ru',
  0x1e: 'th',
  0x21: 'id',
  0x2a: 'vi',
  0x39: 'hi',
  0x3e: 'ms',
}

/** Chinese in Taiwan, Hong Kong and Macao is written in traditional characters */
const TRADITIONAL_CHINESE = new Set([0x0404, 0x0c04, 0x1404])

export function langFromWindowsLangId(id: number): Lang | null {
  if (!Number.isInteger(id) || id <= 0) return null
  if ((id & 0x3ff) === 0x04) return TRADITIONAL_CHINESE.has(id) ? 'zh-TW' : 'zh'
  return BY_PRIMARY[id & 0x3ff] ?? null
}

/**
 * The Windows language id for each Hanpan language, among the installer's own
 * languages (electron-builder.cjs installerLanguages). Spanish is NSIS's
 * SpanishInternational (3082), Portuguese the Brazilian one.
 */
const LANG_IDS: Readonly<Record<Lang, number>> = {
  ar: 1025,
  cs: 1029,
  de: 1031,
  en: 1033,
  es: 3082,
  fr: 1036,
  he: 1037,
  hi: 1081,
  id: 1057,
  it: 1040,
  ja: 1041,
  ko: 1042,
  ms: 1086,
  nl: 1043,
  pl: 1045,
  pt: 1046,
  ru: 1049,
  th: 1054,
  vi: 1066,
  zh: 2052,
  'zh-TW': 1028,
}

export function windowsLangIdFor(lang: Lang): number {
  return LANG_IDS[lang]
}

/**
 * reg.exe arguments that leave the language for the next installer to read
 * (build/installer.nsh, GENOFFICE_LANG_KEY / GENOFFICE_LANG_VALUE): an update's
 * installer window then opens in the language chosen in Settings
 */
export function installerLanguageRegArgs(lang: Lang): string[] {
  return [
    'add',
    'HKCU\\Software\\Hanpan',
    '/v',
    'InstallerLanguage',
    '/t',
    'REG_SZ',
    '/d',
    String(windowsLangIdFor(lang)),
    '/f',
  ]
}

/** The installer's language, or null when the installer wrote none Hanpan has */
export function readInstallerLang(exeDir: string): Lang | null {
  let text: string
  try {
    text = readFileSync(join(exeDir, INSTALLER_LANGUAGE_FILE), 'utf8').trim()
  } catch {
    return null
  }
  return /^\d{1,5}$/.test(text) ? langFromWindowsLangId(Number(text)) : null
}
