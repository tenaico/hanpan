// The home board's strings (plan Task 10, spec 7.12) are written in every
// language they ship in: the card bodies in Hanpan's 11 languages, the card
// names and the customize words in all 21. No language keeps the English copy
// that Task 1 put in as a placeholder.
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { strings } from '../src/renderer/src/strings'
import home from '../src/renderer/src/hanpan/home-strings.json'
import {
  homeCustomText,
  type HomeCustomStringKey,
} from '../src/renderer/src/i18n/strings-home-custom'

/** short labels that may stay as they are in English (names, file kinds) */
const SAME_OK = /^[A-Za-z0-9 .()+:·{}-]{1,12}$/

/** the languages home-strings.json is written in */
const HANPAN_LANGS = ['ko', 'en', 'zh', 'zh-TW', 'ja', 'th', 'ru', 'ar', 'he', 'hi', 'vi']

/** the home-custom keys the board added or changed (plan Global Constraints) */
const BOARD_KEYS: HomeCustomStringKey[] = [
  'navHome',
  'cardStart',
  'cardApps',
  'cardTrend',
  'descTrend',
  'widgetRecent',
  'descFavorites',
  'favoritesEmpty',
  'pin',
  'unpin',
  'sizeOption',
  'customizeHint',
  'addCard',
  'resetBoard',
  'listView',
  'resetBoardAsk',
  'cardMenu',
  'removeCard',
  'unpinApp',
  'dragHandle',
  'resizeCorner',
  'addAppSlot',
  'boardCards',
  'boardApps',
  'boardFull',
]

const shown = strings as unknown as Record<string, Record<string, string>>
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join()

describe('the home board strings', () => {
  it('every hb key in home-strings is written in all 11 languages and shown as written', () => {
    const missing: string[] = []
    const entries = Object.entries(home as Record<string, Record<string, string>>)
    const hb = entries.filter(([key]) => key.startsWith('hb'))
    expect(hb.length).toBeGreaterThan(0)
    for (const [key, entry] of hb) {
      for (const lang of HANPAN_LANGS) {
        const text = entry[lang]
        if (!text) missing.push(`${lang}.${key}`)
        else if (lang !== 'en' && text === entry.en && !SAME_OK.test(entry.en!))
          missing.push(`${lang}.${key} (English copy)`)
        else if (placeholders(text) !== placeholders(entry.en!))
          missing.push(`${lang}.${key} (placeholders)`)
        else if (shown[lang]![key] !== text) missing.push(`${lang}.${key} (strings.ts)`)
      }
    }
    expect(missing).toEqual([])
  })

  it('the board names and customize words are written in every language', () => {
    const missing: string[] = []
    for (const key of BOARD_KEYS) {
      const en = homeCustomText('en', key)
      for (const lang of LANGS) {
        if (lang === 'en') continue
        const text = homeCustomText(lang, key)
        if (text === en && !SAME_OK.test(en)) missing.push(`${lang}.${key}`)
        else if (placeholders(text) !== placeholders(en))
          missing.push(`${lang}.${key} (placeholders)`)
      }
    }
    expect(missing).toEqual([])
  })
})
