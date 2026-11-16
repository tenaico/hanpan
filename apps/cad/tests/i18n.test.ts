// @vitest-environment node
/**
 * The dictionaries: 21 languages, one key set (zh decides), real translations.
 */
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { strings } from '../src/renderer/i18n/strings'

const keys = Object.keys(strings.zh) as (keyof typeof strings.zh)[]
const placeholders = (text: string): string[] => (text.match(/\{\w+\}/g) ?? []).sort()

describe('the AI Drawing dictionaries', () => {
  it('cover all 21 languages with the keys of zh and no empty text', () => {
    expect(LANGS).toHaveLength(21)
    expect(Object.keys(strings).sort()).toEqual([...LANGS].sort())
    for (const lang of LANGS) {
      expect(Object.keys(strings[lang]).sort(), lang).toEqual([...keys].sort())
      for (const key of keys) expect(strings[lang][key].trim(), `${lang}.${key}`).not.toBe('')
    }
  })

  it('hold the keys of this stage', () => {
    expect([...keys].sort()).toEqual(
      [
        'untitled',
        'saved',
        'unsaved',
        'noWebGlTitle',
        'noWebGlBody',
        'noWebGlDriver',
        'noWebGlAccel',
        'noticeNotOk',
        'noticeTooLarge',
        'noticeUnreadable',
        'noticeUnsupported',
        'noticeImportFailed',
        'saveRefused',
        'saveFailed',
      ].sort(),
    )
  })

  it('name an untitled drawing as decided', () => {
    expect(strings.ko.untitled).toBe('제목 없는 도면')
    expect(strings.en.untitled).toBe('Untitled Drawing')
  })

  it('keep the same placeholders in every language', () => {
    for (const lang of LANGS) {
      for (const key of keys) {
        expect(placeholders(strings[lang][key]), `${lang}.${key}`).toEqual(
          placeholders(strings.en[key]),
        )
      }
    }
  })

  it('are translated: no language but English carries the English sentence', () => {
    for (const lang of LANGS) {
      if (lang === 'en') continue
      for (const key of keys) {
        const english = strings.en[key]
        if (english.length < 8) continue
        expect(strings[lang][key], `${lang}.${key}`).not.toBe(english)
      }
    }
  })
})
