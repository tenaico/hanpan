// The spelling checker follows the UI language (0.17), keeping the dictionaries the OS chose
// after it, and only asks for dictionaries this PC has.
import { describe, expect, it } from 'vitest'
import { spellcheckLanguagesFor } from '../src/main/hanpan/spellcheck-langs'

const WINDOWS_KO = ['ko', 'en-US', 'vi', 'ja', 'zh-TW', 'zh-CN', 'fr-FR', 'pt-BR', 'pt-PT']

describe('spellcheckLanguagesFor', () => {
  it('puts the UI language first and keeps the OS dictionaries after it', () => {
    expect(spellcheckLanguagesFor('vi', ['ko'], WINDOWS_KO)).toEqual(['vi', 'ko'])
    expect(spellcheckLanguagesFor('en', ['ko'], WINDOWS_KO)).toEqual(['en-US', 'ko'])
  })

  it('does not repeat a language', () => {
    expect(spellcheckLanguagesFor('ko', ['ko'], WINDOWS_KO)).toEqual(['ko'])
    expect(spellcheckLanguagesFor('vi', ['vi', 'ko'], WINDOWS_KO)).toEqual(['vi', 'ko'])
  })

  it('maps a UI language to the dictionary code this PC has', () => {
    expect(spellcheckLanguagesFor('zh', [], WINDOWS_KO)).toEqual(['zh-CN'])
    expect(spellcheckLanguagesFor('zh-TW', [], WINDOWS_KO)).toEqual(['zh-TW'])
    expect(spellcheckLanguagesFor('fr', [], WINDOWS_KO)).toEqual(['fr-FR'])
    expect(spellcheckLanguagesFor('pt', [], WINDOWS_KO)).toEqual(['pt-BR'])
    expect(spellcheckLanguagesFor('en', [], ['en-GB', 'en-US'])).toEqual(['en-US'])
  })

  it('keeps the OS choice when the PC has no dictionary for the UI language', () => {
    expect(spellcheckLanguagesFor('vi', ['ko'], ['ko', 'en-US'])).toEqual(['ko'])
    expect(spellcheckLanguagesFor('th', ['en-US'], ['en-US'])).toEqual(['en-US'])
  })

  it('drops OS dictionaries the PC does not list', () => {
    expect(spellcheckLanguagesFor('vi', ['ko', 'xx'], WINDOWS_KO)).toEqual(['vi', 'ko'])
  })
})
