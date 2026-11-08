// 발표자 보기 시계: 12시간제 언어는 오전/오후(AM/PM)를 붙인다(0.17 UX v2 #23)
import { describe, expect, it } from 'vitest'
import { fmtWallClock } from '../src/renderer/presenter-clock'

describe('presenter wall clock', () => {
  const afternoon = new Date(2026, 10, 7, 14, 16)
  it('ko shows 오후', () => {
    expect(fmtWallClock(afternoon, 'ko')).toMatch(/오후\s*2:16/)
  })
  it('en shows PM', () => {
    expect(fmtWallClock(afternoon, 'en')).toMatch(/2:16\s*PM/)
  })
  it('vi uses its own 24h form', () => {
    expect(fmtWallClock(afternoon, 'vi')).toContain('14:16')
  })
})
