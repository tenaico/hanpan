// 한국어 화면에 영어 문구가 남지 않게 한다(0.17 리뷰 #14). 제품·글꼴·서비스 이름처럼
// 원래 영어로 쓰는 고유 명사만 예외로 둔다.
import { describe, expect, it } from 'vitest'
import { strings } from '../src/renderer/i18n/strings'

const PROPER_NOUNS = new Set([
  'WordArt',
  'WordArt({name})',
  'Office',
  'Office (DengXian)',
  'SimSun',
  'Microsoft YaHei',
  'Pretendard',
  'KaiTi',
  'Times New Roman',
  'Arial',
  'Zotero',
])

describe('Korean UI strings', () => {
  it('has no English-only label left', () => {
    const ko = (strings as unknown as Record<string, Record<string, unknown>>).ko!
    const english = Object.entries(ko)
      .filter(([, v]) => typeof v === 'string' && !/[가-힣]/.test(v) && /[A-Za-z]{3,}/.test(v))
      .filter(([, v]) => !PROPER_NOUNS.has(v as string))
      .map(([k, v]) => `${k}: ${v}`)
    expect(english).toEqual([])
  })
})
