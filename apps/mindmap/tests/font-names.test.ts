// @vitest-environment node
/**
 * The font list of the Format tab names a font as a Korean user knows it
 * (맑은 고딕, as the slide editor shows it), while the file keeps the
 * family name every program reads.
 */
import { describe, expect, it } from 'vitest'
import { FONT_FAMILIES, fontFamilyName } from '../src/renderer/map/style-edit'

describe('font names in the list', () => {
  it('are Korean for Korean fonts when the app is in Korean', () => {
    expect(fontFamilyName('Malgun Gothic', 'ko')).toBe('맑은 고딕')
    expect(fontFamilyName('Nanum Gothic', 'ko')).toBe('나눔고딕')
    expect(fontFamilyName('Nanum Myeongjo', 'ko')).toBe('나눔명조')
    expect(fontFamilyName('Arial', 'ko')).toBe('Arial')
  })

  it('stay the family name in other languages and for a font the list does not know', () => {
    expect(fontFamilyName('Malgun Gothic', 'en')).toBe('Malgun Gothic')
    expect(fontFamilyName('Some Font', 'ko')).toBe('Some Font')
  })

  it('every Korean font of the list has its Korean name', () => {
    for (const family of FONT_FAMILIES.filter((f) => /Gothic|Myeongjo|KR/.test(f))) {
      expect(fontFamilyName(family, 'ko'), family).toMatch(/[가-힣]/)
    }
  })
})
