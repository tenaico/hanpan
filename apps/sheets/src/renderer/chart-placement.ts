import type { ParsedChartData } from '@genoffice/xlsx-gateway/domain/chart-visual'

/**
 * 새 차트의 왼쪽 열. Excel처럼 원본 오른쪽에 한 칸 띄워 두되, 차트가 덮을
 * 행에 데이터가 있으면(비고 열 등) 그 데이터가 끝난 다음 빈 열로 민다(X4).
 * 오른쪽이 끝까지 차 있으면(검사 한도 초과) 원래 자리에 둔다.
 */
export function chartAnchorColumn(input: {
  startRow: number
  endColumn: number
  rows: number
  isEmpty: (row: number, column: number) => boolean
  maxScan?: number
}): number {
  const { startRow, endColumn, rows, isEmpty } = input
  const maxScan = input.maxScan ?? 200
  const preferred = endColumn + 2
  let lastFilled = -1
  let emptyRun = 0
  for (let column = endColumn + 1; column <= endColumn + maxScan; column += 1) {
    let columnEmpty = true
    for (let row = startRow; row < startRow + rows; row += 1) {
      if (!isEmpty(row, column)) {
        columnEmpty = false
        break
      }
    }
    if (columnEmpty) {
      emptyRun += 1
      // 차트 폭(8열)만큼 비었으면 거기서 멈춘다
      if (emptyRun >= 8) break
    } else {
      lastFilled = column
      emptyRun = 0
    }
  }
  if (lastFilled < 0) return preferred
  if (emptyRun === 0) return preferred
  return Math.max(preferred, lastFilled + 2)
}

/**
 * 새 차트의 제목. 계열이 하나이고 그 계열의 머리글 셀이 있으면 머리글을 쓰고,
 * 머리글 없는 한 열(A1:A3)이면 자동 이름 "Series 1" 대신 화면 언어의
 * "차트 제목"을 쓴다(설치판 점검).
 */
export function newChartTitle(
  values: readonly (readonly unknown[])[],
  parsed: ParsedChartData,
  fallback: string,
): string {
  const only = parsed.series.length === 1 ? parsed.series[0] : undefined
  if (!only || !parsed.hasHeaderRow) return fallback
  const header = parsed.byRow ? values[only.column]?.[0] : values[0]?.[only.column]
  return header === null || header === undefined || String(header).trim() === ''
    ? fallback
    : String(header)
}
