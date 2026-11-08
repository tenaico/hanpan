// 0.17 v2 #12: a Korean UI offers Korean theme font pairs first, and the Office
// themes take a Korean East Asian face instead of the Chinese ones
import { describe, expect, it } from 'vitest'
import { themeFontPresets, themePresets } from '../src/renderer/components/ribbon-design-tab'

describe('Design > Fonts presets', () => {
  it('ko: Korean pairs come first, the Chinese-only pairs last', () => {
    const list = themeFontPresets('ko')
    expect(list[0]!.fonts.eastAsia).toBe('맑은 고딕')
    const firstChinese = list.findIndex((p) =>
      /宋体|微软雅黑|楷体|等线/.test(p.fonts.eastAsia ?? ''),
    )
    const lastKorean = list
      .map((p) => /고딕|바탕|Pretendard|Noto Sans KR/.test(p.fonts.eastAsia ?? ''))
      .lastIndexOf(true)
    expect(lastKorean).toBeLessThan(firstChinese)
    expect(list.some((p) => p.fonts.minor === 'Pretendard')).toBe(true)
  })

  it('zh keeps its own order', () => {
    expect(themeFontPresets('zh')[0]!.fonts.eastAsia).toBe('等线')
  })

  it('ko themes use a Korean East Asian face', () => {
    for (const p of themePresets('ko')) expect(p.fonts.eastAsia).toBe('맑은 고딕')
    expect(themePresets('zh')[0]!.fonts.eastAsia).toBe('等线')
  })
})
