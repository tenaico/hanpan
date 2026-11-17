/**
 * The texts the AI Drawing main process shows itself (the save dialog, the
 * close prompt): every language has every text, none is empty, and the
 * product name reads as the glossary says.
 */
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { CAD_MAIN_TEXTS } from '../src/main/i18n-main'

describe('main-process texts of the AI Drawing editor', () => {
  const keys = Object.keys(CAD_MAIN_TEXTS.zh).sort()

  it('covers all 21 languages', () => {
    expect(LANGS).toHaveLength(21)
    expect(Object.keys(CAD_MAIN_TEXTS).sort()).toEqual([...LANGS].sort())
  })

  it.each([...LANGS])('%s has the same keys as zh and no empty text', (lang) => {
    const dict = CAD_MAIN_TEXTS[lang] as Record<string, string>
    expect(Object.keys(dict).sort()).toEqual(keys)
    for (const key of keys) expect(dict[key]!.trim(), `${lang}.${key}`).not.toBe('')
    // the close prompt names the drawing
    expect(dict.closeUnsavedMessage).toContain('{name}')
  })

  it('has the texts the main process uses', () => {
    expect(keys).toEqual(
      [
        'dlgSaveTitle',
        'filterCad',
        'untitledFile',
        'closeUnsavedTitle',
        'closeUnsavedMessage',
        'closeUnsavedDetail',
        'btnSave',
        'btnDontSave',
        'btnCancel',
        'saveRefused',
        'dlgExportTitle',
        'filterModel3d',
        'filterImage',
      ].sort(),
    )
  })

  it('follows the glossary in Korean and English', () => {
    expect(CAD_MAIN_TEXTS.en.filterCad).toBe('AI Drawing')
    expect(CAD_MAIN_TEXTS.ko.filterCad).toBe('AI 도면')
    expect(CAD_MAIN_TEXTS.en.untitledFile).toBe('Untitled Drawing')
    expect(CAD_MAIN_TEXTS.ko.untitledFile).toBe('제목 없는 도면')
  })

  it('no language falls back to the English text, apart from the product name', () => {
    for (const lang of LANGS) {
      if (lang === 'en') continue
      const dict = CAD_MAIN_TEXTS[lang] as Record<string, string>
      for (const key of ['dlgSaveTitle', 'closeUnsavedDetail', 'saveRefused', 'dlgExportTitle']) {
        expect(dict[key], `${lang}.${key}`).not.toBe(
          (CAD_MAIN_TEXTS.en as Record<string, string>)[key],
        )
      }
    }
  })
})
