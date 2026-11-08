// 0.17 UX v2 G10: 닫기 확인 창이 어느 문서인지 이름으로 말한다
import { afterEach, describe, expect, it } from 'vitest'
import { LANGS, getUiLang, setUiLang } from '@genoffice/i18n'
import { closeUnsavedMessage, tm } from '../src/main/i18n-main'

const initial = getUiLang()
afterEach(() => setUiLang(initial))

describe('closeUnsavedMessage', () => {
  it('names the document', () => {
    setUiLang('ko')
    expect(closeUnsavedMessage('테스트사진.jpg')).toBe(
      "'테스트사진.jpg'에 저장하지 않은 변경 사항이 있습니다.",
    )
    setUiLang('en')
    expect(closeUnsavedMessage('logo.svg')).toBe('“logo.svg” has unsaved changes.')
    setUiLang('vi')
    expect(closeUnsavedMessage('logo.svg')).toBe('“logo.svg” có thay đổi chưa được lưu.')
  })

  it('falls back to the plain question without a name', () => {
    setUiLang('ko')
    expect(closeUnsavedMessage(undefined)).toBe(tm('closeUnsavedMsg'))
    expect(closeUnsavedMessage('  ')).toBe(tm('closeUnsavedMsg'))
  })

  it.each(LANGS)('%s names the document in its own words', (lang) => {
    setUiLang(lang)
    const text = closeUnsavedMessage('X-name.psd')
    expect(text).toContain('X-name.psd')
    if (lang !== 'en') expect(text).not.toBe(`“X-name.psd” has unsaved changes.`)
  })
})
