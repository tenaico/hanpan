import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LANGS } from '@genoffice/i18n'
import { describe, expect, it } from 'vitest'
import {
  SECUREKEY_STRING_KEYS,
  secureKeyStrings,
  tSecureKey,
} from '../../src/main/securekey/strings'

const source = readFileSync(join(__dirname, '../../src/main/securekey/strings.ts'), 'utf8')
const json = JSON.parse(
  readFileSync(join(__dirname, '../../src/main/securekey/strings.json'), 'utf8'),
) as Record<string, Record<string, string>>
const TRANSLATED = ['ko', 'en', 'zh', 'zh-TW', 'ja', 'th', 'ru', 'ar', 'he', 'hi', 'vi']

describe('security key strings', () => {
  it('every security key string exists in all 21 languages', () => {
    expect(LANGS).toHaveLength(21)
    for (const lang of LANGS) {
      const strings = secureKeyStrings(lang)
      for (const key of SECUREKEY_STRING_KEYS) {
        expect(strings[key], `${lang}.${key}`).toBeTruthy()
        expect(strings[key], `${lang}.${key}`).not.toBe(key)
      }
    }
    // each block holds the keys itself, not through the English fallback
    for (const lang of LANGS) {
      const head = lang.includes('-') ? `  '${lang}': {` : `  ${lang}: {`
      const start = source.indexOf(`\n${head}\n`)
      expect(start, lang).toBeGreaterThan(-1)
      const block = source.slice(start, source.indexOf('\n  },', start))
      for (const key of SECUREKEY_STRING_KEYS) expect(block, `${lang}.${key}`).toContain(`${key}:`)
    }
  })

  it('the JSON translates every key into the eleven languages', () => {
    expect(Object.keys(json).sort()).toEqual([...SECUREKEY_STRING_KEYS].sort())
    for (const [key, entry] of Object.entries(json)) {
      expect(Object.keys(entry).sort(), key).toEqual([...TRANSLATED].sort())
      for (const lang of TRANSLATED.filter((l) => l !== 'en')) {
        expect(entry[lang], `${lang}.${key}`).not.toBe(entry.en)
      }
      expect(secureKeyStrings('vi')[key]).toBe(tSecureKey('vi', key as never))
    }
  })

  it('the Korean terms and warnings are the spec text', () => {
    const ko = secureKeyStrings('ko')
    expect(ko.skTerms2).toBe(
      '한판을 쓰면서 생긴 문서 손실, AI 서비스 요금, API 키 유출, 보안키 분실의 책임은 사용자에게 있습니다. 다만 TEN AI의 고의로 생긴 손해는 예외입니다.',
    )
    for (const lang of LANGS) {
      expect(secureKeyStrings(lang).skTerms2).not.toMatch(/중대한 과실|gross negligence/i)
    }
    expect(ko.skPcAgree).toBe(
      '이 PC를 쓰는 다른 사람이 한판과 내 API 키를 쓸 수 있으며, 그로 인한 요금과 피해는 제 책임임을 이해했습니다.',
    )
    expect(ko.skNoteSubscription).toBe(
      'Claude·ChatGPT 구독 로그인은 각 회사 프로그램이 따로 관리하며, 보안키와 관계없습니다.',
    )
    expect(tSecureKey('ko', 'skReplaced', { when: '11월 21일 오후 3:32' })).toBe(
      '11월 21일 오후 3:32에 이 PC에서 보안키가 새로 만들어져 이 USB는 더 이상 쓸 수 없습니다. 본인이 한 일이 아니라면 Windows 비밀번호를 확인하세요.',
    )
    for (const lang of LANGS) {
      expect(tSecureKey(lang, 'skReplaced', { when: 'WHEN' }), lang).toContain('WHEN')
      expect(tSecureKey(lang, 'skUsbDrive', { letter: 'E' }), lang).toContain('E')
    }
  })

  it('promises nothing the key cannot keep', () => {
    for (const lang of LANGS) {
      for (const text of Object.values(secureKeyStrings(lang))) {
        expect(text).not.toMatch(/복제 불가|해킹 불가|unhackable|cannot be copied/i)
      }
    }
  })
})
