// The mind map's Hanpan strings (send to a document, slide styles, sync, card news) carry real
// Vietnamese, and the vi language file holds exactly that text (tools/hanpan-add-strings.mjs).
// The sync and card news strings are written in all 21 languages.
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { vi as viTable } from '../src/renderer/i18n/app/vi'
import send from '../src/renderer/i18n/hanpan-strings.json'
import style from '../src/renderer/i18n/hanpan-style-strings.json'
import sync from '../src/renderer/i18n/hanpan-sync-strings.json'
import design from '../src/renderer/i18n/hanpan-design-strings.json'

/** short labels that may stay as they are in English (names, file kinds) */
const SAME_OK = /^[A-Za-z0-9 .()+:·-]{1,12}$/
const vi = viTable as Record<string, string>
const tables = import.meta.glob<Record<string, Record<string, string>>>(
  '../src/renderer/i18n/app/*.ts',
  { eager: true },
)
const tableOf = (lang: string): Record<string, string> => {
  const mod = tables[`../src/renderer/i18n/app/${lang}.ts`]!
  return Object.values(mod)[0]!
}

describe('mind map Hanpan strings in Vietnamese', () => {
  for (const [name, dict] of Object.entries({ send, style, sync, design })) {
    it(`${name}: every key has its own Vietnamese`, () => {
      for (const [key, text] of Object.entries(dict as Record<string, Record<string, string>>)) {
        expect(text.vi, key).toBeTruthy()
        if (!SAME_OK.test(text.en!)) expect(text.vi, key).not.toBe(text.en)
        expect(vi[key], key).toBe(text.vi)
      }
    })
  }
})

describe('mind map sync and card news strings in every language', () => {
  for (const [name, dict] of Object.entries({ sync, design })) {
    it(`${name}: written in all 21 languages, as the language files show`, () => {
      const missing: string[] = []
      for (const [key, text] of Object.entries(dict as Record<string, Record<string, string>>)) {
        for (const lang of LANGS) {
          const value = text[lang]
          if (!value || (lang !== 'en' && value === text.en && !SAME_OK.test(text.en!)))
            missing.push(`${lang}.${key}`)
          else if (tableOf(lang)[key] !== value) missing.push(`${lang}.${key} (table)`)
        }
      }
      expect(missing).toEqual([])
    })
  }
})
