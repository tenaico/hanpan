/**
 * X22: 피벗 대상 셀 예시 "F1"이 원본(A1:F6) 안이었고, 비우면 같은 시트의 A1에
 * 놓였다(원본과 겹침). 원본 오른쪽 한 칸 띄운 셀을 예시·기본값으로 쓴다.
 */
import { describe, expect, it } from 'vitest'
import { suggestPivotTarget } from '../src/renderer/PivotDialog'

describe('suggestPivotTarget', () => {
  it('suggests the first cell past the source with a one-column gap', () => {
    expect(suggestPivotTarget('A1:F6')).toBe('H1')
    expect(suggestPivotTarget("'매출'!$B$2:$D$5")).toBe('F2')
    expect(suggestPivotTarget('Y3:Z9')).toBe('AB3')
  })
  it('falls back to H1 for an unreadable range', () => {
    expect(suggestPivotTarget('')).toBe('H1')
  })
})
