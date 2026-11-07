// 수식 삽입 예시: 글자 상자에 그대로 들어가므로 "^(…)"·"_" 같은 선형 표기가 남지 않는다(0.17 UX v2 #30)
import { describe, expect, it } from 'vitest'
import { EQUATION_GALLERY } from '../src/renderer/insert-presets'
import { setModuleLang } from '../src/renderer/i18n/locale'

describe('equation gallery', () => {
  it('has no caret/underscore linear notation', () => {
    for (const e of EQUATION_GALLERY) {
      expect(e.text).not.toMatch(/[\^_]/)
    }
  })
  it('every example has a translated label', () => {
    setModuleLang('ko')
    for (const e of EQUATION_GALLERY) expect(e.label).not.toMatch(/^(ribbon|app)Eq/)
    setModuleLang('zh')
  })
})
