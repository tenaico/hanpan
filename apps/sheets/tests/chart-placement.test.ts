/**
 * X4: 새 차트가 원본 오른쪽 열(비고 F열 등)의 데이터를 덮었다. 차트가 놓일
 * 행에서 데이터가 끝난 다음 빈 열에 둔다.
 */
import { describe, expect, it } from 'vitest'
import { chartDataFromValues } from '@genoffice/xlsx-gateway/domain/chart-visual'
import { chartAnchorColumn, newChartTitle } from '../src/renderer/chart-placement'

describe('chartAnchorColumn', () => {
  it('skips the filled columns right of the selection', () => {
    // A1:D5 selected, F1:F5 (비고) filled
    const filled = new Set(['0:5', '1:5', '2:5', '3:5', '4:5'])
    const isEmpty = (row: number, column: number) => !filled.has(`${row}:${column}`)
    expect(chartAnchorColumn({ startRow: 0, endColumn: 3, rows: 16, isEmpty })).toBe(7)
  })

  it('keeps the one-column gap when the right side is empty', () => {
    expect(chartAnchorColumn({ startRow: 0, endColumn: 3, rows: 16, isEmpty: () => true })).toBe(5)
  })

  it('gives up scanning past the limit and stays right of the selection', () => {
    expect(
      chartAnchorColumn({ startRow: 0, endColumn: 3, rows: 16, isEmpty: () => false, maxScan: 10 }),
    ).toBe(5)
  })
})

describe('newChartTitle (0.17 final: one column titled "Series 1")', () => {
  const fallback = '차트 제목'
  it('uses the UI-language title for one headerless column', () => {
    const parsed = chartDataFromValues([[10], [20], [30]])!
    expect(newChartTitle([[10], [20], [30]], parsed, fallback)).toBe(fallback)
  })
  it('keeps the header of a single labelled column', () => {
    const values = [['매출'], [10], [20]]
    expect(newChartTitle(values, chartDataFromValues(values)!, fallback)).toBe('매출')
  })
  it('uses the UI-language title for several series', () => {
    const values = [
      [10, 1],
      [20, 2],
      [30, 3],
    ]
    expect(newChartTitle(values, chartDataFromValues(values)!, fallback)).toBe(fallback)
  })
  it('uses the UI-language title for one headerless row', () => {
    const values = [[10, 20, 30]]
    expect(newChartTitle(values, chartDataFromValues(values)!, fallback)).toBe(fallback)
  })
})
