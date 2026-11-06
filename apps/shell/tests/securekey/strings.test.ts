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

  it('the warning and privacy lines are the spec text in Korean', () => {
    const ko = secureKeyStrings('ko')
    expect(ko.skPcWarning).toBe(
      '이 PC가 해킹되면 AI 키가 함께 유출될 수 있습니다. USB 보관을 권장합니다.',
    )
    expect(ko.skPrivacy).toBe('등록하면 보안키 번호와 마지막 사용일이 tenai.kr에 기록됩니다')
    expect(ko.skLockStale).toBe('인터넷에 연결해 보안키를 확인해 주세요')
    expect(tSecureKey('ko', 'skLater', { date: '12월 4일' })).toBe('나중에 하기 (12월 4일까지)')
    expect(tSecureKey('ko', 'skGraceBanner', { date: '12월 4일' })).toBe(
      '12월 4일부터 보안키가 있어야 한판이 켜집니다. tenai.kr에서 가입하고 보안키를 등록하세요.',
    )
  })

  it('promises nothing the key cannot keep', () => {
    for (const lang of LANGS) {
      for (const text of Object.values(secureKeyStrings(lang))) {
        expect(text).not.toMatch(/복제 불가|해킹 불가|unhackable|cannot be copied/i)
      }
    }
  })
})
