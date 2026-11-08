// Hanpan's first-run language (decision 0092): with no language chosen in
// Settings, the UI follows the first OS display language Hanpan has, and is
// Korean when it has none of them.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fallbackUiLang } from '../src/main/ui-lang-fallback'

describe('fallbackUiLang', () => {
  it.each([
    [['vi-VN'], 'vi'],
    [['ko-KR'], 'ko'],
    [['en-US'], 'en'],
    [['zh-Hant-TW'], 'zh-TW'],
    [['sw-KE'], 'ko'],
    [['sw-KE', 'en-GB'], 'en'],
    [[], 'ko'],
  ] as const)('%j → %s', (locales, lang) => expect(fallbackUiLang(locales)).toBe(lang))
})

describe('the shell main and the first-run language', () => {
  it('falls back to the OS languages, not to a fixed Korean', () => {
    const src = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    expect(src).toMatch(/uiLang \?\?= fallbackUiLang\(app\.getPreferredSystemLanguages\(\)\)/)
    expect(src).not.toMatch(/uiLang \?\?= 'ko'/)
  })
})
