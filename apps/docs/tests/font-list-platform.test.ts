// 0.17 v2 #28: on Windows the Korean font list must not open with a Mac-only face
import { describe, expect, it } from 'vitest'
import { candidateFontFamilies } from '../src/renderer/font-list'

describe('font candidates per platform', () => {
  it('drops Mac-only faces off the Mac', () => {
    const win = candidateFontFamilies('ko', false)
    expect(win[0]).toBe('Malgun Gothic')
    expect(win).not.toContain('Apple SD Gothic Neo')
    expect(win).not.toContain('PingFang SC')
    expect(win).toContain('Pretendard')
  })

  it('keeps them on the Mac', () => {
    expect(candidateFontFamilies('ko', true)).toContain('Apple SD Gothic Neo')
  })
})
