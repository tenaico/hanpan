// Strings added for the Vietnam demo (decision 0091) are written in all
// 21 languages, as docs/standards.md asks: no language carries a copy of the
// English text, in the JSON dictionaries or in strings.ts.
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { strings } from '../src/renderer/src/strings'
import hanpan from '../src/renderer/src/hanpan/strings.json'

const KEYS: Record<string, Record<string, Record<string, string>>> = {
  setKoreanDocs: hanpan,
  setKoreanDocsDesc: hanpan,
}
const shown = strings as unknown as Record<string, Record<string, string>>

describe('the Vietnam demo strings', () => {
  for (const [key, dict] of Object.entries(KEYS)) {
    it(`${key} is written in every language`, () => {
      const entry = dict[key]
      expect(entry, key).toBeTruthy()
      expect(Object.keys(entry!).sort()).toEqual([...LANGS].sort())
      const en = entry!.en
      for (const lang of LANGS) {
        expect(shown[lang]![key], `${lang}.${key}`).toBe(entry![lang])
        if (lang !== 'en') expect(entry![lang], `${lang}.${key}`).not.toBe(en)
      }
    })
  }
})

/** short labels that may stay as they are in English (names, file kinds) */
const SAME_OK = /^[A-Za-z0-9 .()+:·-]{1,12}$/

describe('Hanpan strings.json', () => {
  it('every key is written in every language and shown as written', () => {
    const missing: string[] = []
    for (const [key, entry] of Object.entries(hanpan as Record<string, Record<string, string>>)) {
      for (const lang of LANGS) {
        const text = entry[lang]
        if (!text || (lang !== 'en' && text === entry.en && !SAME_OK.test(entry.en!)))
          missing.push(`${lang}.${key}`)
        else if (shown[lang]![key] !== text) missing.push(`${lang}.${key} (strings.ts)`)
      }
    }
    expect(missing).toEqual([])
  })
})
