/**
 * The language an AI answer is written in: the UI language, named in English for the
 * prompt (models follow an English instruction more reliably than a code). Hanpan's
 * prompts for a Korean UI stay written in Korean; every other UI language gets an
 * English prompt that names its language.
 */
const NAMES: Readonly<Record<string, string>> = {
  zh: 'Simplified Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  th: 'Thai',
  id: 'Indonesian',
  ru: 'Russian',
  ar: 'Arabic',
  pt: 'Portuguese',
  it: 'Italian',
  pl: 'Polish',
  cs: 'Czech',
  nl: 'Dutch',
  ms: 'Malay',
  he: 'Hebrew',
  hi: 'Hindi',
  'zh-TW': 'Traditional Chinese',
  vi: 'Vietnamese',
}

/** English name of a UI language for a prompt; English for a code it does not know. */
export const aiLanguageName = (lang: string): string => NAMES[lang] ?? 'English'
