/**
 * 시트를 그림(PNG)으로 내보내기(0.17): 인쇄와 같은 칸 모양을 종이 나눔 없이 한 장에 놓는다.
 * 그림의 크기는 내용(쓴 범위 또는 고른 범위)에 맞고, 머리말·꼬리말·쪽 번호는 없다.
 */
import { describe, expect, it } from 'vitest'

import { layoutSheetImage, type PrintWorksheet } from '../src/renderer/print-html'
import type { EffectivePageSetup } from '../src/renderer/print-settings'

/** `rows` × `columns` cells of 20px × 100px, each holding its own address. */
function grid(rows: number, columns: number): PrintWorksheet {
  const label = (r: number, c: number) => `${String.fromCharCode(65 + c)}${r + 1}`
  const block = (row: number, column: number, numRows = 1, numColumns = 1) =>
    Array.from({ length: numRows }, (_, i) =>
      Array.from({ length: numColumns }, (_, j) => label(row + i, column + j)),
    )
  return {
    getLastRow: () => rows - 1,
    getLastColumn: () => columns - 1,
    getRowHeight: () => 20,
    getColumnWidth: () => 100,
    getMergedRanges: () => [],
    getRange: ((row: number, column: number, numRows?: number, numColumns?: number) => ({
      getDisplayValues: () => block(row, column, numRows, numColumns),
      getValues: () => block(row, column, numRows, numColumns),
      getCellStyleData: () => null,
    })) as PrintWorksheet['getRange'],
  }
}

function setup(overrides: Partial<EffectivePageSetup> = {}): EffectivePageSetup {
  return {
    orientation: 'portrait',
    paperSize: 9,
    scale: 100,
    fitToWidth: 0,
    fitToHeight: 0,
    fitToPage: false,
    margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    printGridlines: false,
    printHeadings: false,
    printAreas: [],
    printTitles: null,
    printTitleColumns: null,
    header: { center: '&P / &N' },
    footer: { center: 'footer text' },
    firstPage: null,
    evenPages: null,
    headerFooterScaleWithDoc: true,
    headerFooterPictures: [],
    ...overrides,
  }
}

const image = (worksheet: PrintWorksheet, selection: string | null = null, s = setup()) =>
  layoutSheetImage(worksheet, s, 'Book', 'S1', { visuals: [], css: '' }, selection)

describe('layoutSheetImage', () => {
  it('puts a sheet far longer than a page on one picture sized to its cells', () => {
    // 200 rows × 15pt = 3000pt: many A4 pages when printed
    const result = image(grid(200, 3))
    expect(result.html.match(/<div class="page /g)).toHaveLength(1)
    expect(result.html).toContain('A1')
    expect(result.html).toContain('C200')
    // 3 columns × 75pt and 200 rows × 15pt, plus a small white border on each side
    const border = (result.widthPx - 3 * 100) / 2
    expect(border).toBeGreaterThan(0)
    expect(border).toBeLessThan(20)
    expect(Math.abs(result.heightPx - (200 * 20 + 2 * border))).toBeLessThanOrEqual(2)
  })

  it('takes the selected range instead of the whole sheet', () => {
    const result = image(grid(10, 5), 'B2:C3')
    expect(result.html).toContain('B2')
    expect(result.html).toContain('C3')
    expect(result.html).not.toContain('>A1<')
    expect(result.html).not.toContain('>D4<')
    const border = (result.widthPx - 2 * 100) / 2
    expect(Math.abs(result.heightPx - (2 * 20 + 2 * border))).toBeLessThanOrEqual(2)
  })

  it('leaves out headers, footers and page numbers, and ignores print areas and scaling', () => {
    const result = image(
      grid(3, 2),
      null,
      setup({ printAreas: ['A1:A1'], scale: 50, fitToPage: true, fitToWidth: 1, fitToHeight: 1 }),
    )
    expect(result.html).not.toContain('footer text')
    expect(result.html).not.toContain('class="hf')
    expect(result.html).toContain('B3')
    expect(result.html).toContain('zoom:1;')
  })

  it('draws the gridlines as the sheet shows them on screen', () => {
    const plain = image(grid(2, 2))
    expect(plain.html).toContain('#c0c0c0')
  })

  it('leaves the last row and column room for their borders (the box is rounded to 0.01 in)', () => {
    const { html } = image(grid(4, 4))
    const box = /<div class="content" style="[^"]*width:([\d.]+)in;height:([\d.]+)in/.exec(html)
    expect(box).not.toBeNull()
    // 4 columns of 75pt and 4 rows of 15pt
    expect(Number(box![1]) * 72).toBeGreaterThanOrEqual(4 * 75)
    expect(Number(box![2]) * 72).toBeGreaterThanOrEqual(4 * 15)
  })
})
