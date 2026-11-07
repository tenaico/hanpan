import { parsePageRanges } from './view-config'

/** 인쇄 창의 범위 고르기 */
export type PrintRangeMode = 'all' | 'current' | 'custom'

/**
 * 인쇄 창 미리 보기에 그릴 첫 쪽(1부터, 화면에 보이는 순서)과 인쇄할 쪽 수.
 * 직접 입력한 범위가 비었거나 틀리면 null.
 */
export function printPreviewTarget({
  mode,
  current,
  input,
  pageCount,
}: {
  mode: PrintRangeMode
  current: number
  input: string
  pageCount: number
}): { firstPage: number; count: number } | null {
  if (pageCount < 1) return null
  if (mode === 'all') return { firstPage: 1, count: pageCount }
  if (mode === 'current') return { firstPage: current, count: 1 }
  const pages = parsePageRanges(input, pageCount)
  if (!pages || pages.length === 0) return null
  return { firstPage: Math.min(...pages), count: new Set(pages).size }
}
