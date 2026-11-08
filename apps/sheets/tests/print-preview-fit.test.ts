// @vitest-environment jsdom
/**
 * X14: the print preview said "100%" while an A4 page was drawn about 340px
 * wide (unreadable), and a sheet whose columns ran past the page gave no hint.
 * - the preview opens fitted to the pane's width, and shows its real zoom
 * - columns that spill onto further pages, or text cut at the right edge of
 *   the printed area, are reported so the dialog can offer Fit All Columns
 */
import { afterEach, describe, expect, it } from 'vitest'

import { edgeOverflow, previewZoom, sheetsSplitByColumns } from '../src/renderer/print-preview-fit'

const A4 = { width: 8.27 * 96, height: 11.69 * 96 }

describe('previewZoom', () => {
  const pane = { width: 740, height: 480 }
  it('fits the page width by default, which reads far larger than the whole page', () => {
    const width = previewZoom('width', pane, A4, 24)
    const page = previewZoom('page', pane, A4, 24)
    expect(width).toBeCloseTo((740 - 24 - 16) / A4.width, 3)
    expect(page).toBeCloseTo((480 - 24) / A4.height, 3)
    expect(width).toBeGreaterThan(page * 2)
  })
  it('shows the paper at its size for 100%', () => {
    expect(previewZoom('actual', pane, A4, 24)).toBe(1)
  })
  it('never collapses or blows up', () => {
    expect(previewZoom('width', { width: 0, height: 0 }, A4, 24)).toBe(0.05)
    expect(previewZoom('width', { width: 5000, height: 400 }, A4, 24)).toBe(2)
  })
})

describe('sheetsSplitByColumns', () => {
  const page = (area: number, colStart: number) => ({
    body: '',
    page: { area, rowStart: 0, rowEnd: 9, colStart, colEnd: colStart + 3 },
  })
  it('names the sheets whose columns go on to another page', () => {
    const documents = [
      { sheetName: '매출', pages: [page(0, 0), page(0, 0), page(0, 4)] },
      { sheetName: '비용', pages: [page(0, 0), page(0, 0)] },
      // two print areas side by side are two areas, not a split
      { sheetName: '요약', pages: [page(0, 0), page(1, 5)] },
    ]
    expect(sheetsSplitByColumns(documents)).toEqual(['매출'])
  })
})

describe('edgeOverflow', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  const cell = (text: string, scroll: number, client: number): HTMLTableCellElement => {
    const td = document.createElement('td')
    const div = document.createElement('div')
    div.className = 'c'
    const span = document.createElement('span')
    span.textContent = text
    div.append(span)
    // print cells use a fixed table layout: the box is as wide as the cell,
    // a single line of text runs past it and the cell clips it
    Object.defineProperty(span, 'scrollWidth', { value: scroll })
    Object.defineProperty(div, 'scrollWidth', { value: client })
    Object.defineProperty(td, 'clientWidth', { value: client })
    td.append(div)
    return td
  }
  it('counts text cut at the last printed column only', () => {
    document.body.innerHTML = '<div class="page"><table><tbody></tbody></table></div>'
    const body = document.querySelector('tbody')!
    const row1 = document.createElement('tr')
    // a clipped middle cell is the sheet's own look; the edge one runs off the page
    row1.append(cell('long middle text', 200, 60), cell('long note at the edge', 300, 120))
    const row2 = document.createElement('tr')
    row2.append(cell('a', 10, 60), cell('fits', 40, 120))
    body.append(row1, row2)
    expect(edgeOverflow(document)).toEqual({ pagesPastEdge: 0, clippedCells: 1 })
  })

  it('counts text wrapped onto a line the row height hides', () => {
    document.body.innerHTML = '<div class="page"><table><tbody><tr></tr></tbody></table></div>'
    const td = cell('a long note that wraps', 100, 120)
    const box = td.querySelector<HTMLElement>('.c')!
    Object.defineProperty(box.firstElementChild!, 'scrollHeight', { value: 40 })
    Object.defineProperty(box, 'clientHeight', { value: 20 })
    document.querySelector('tr')!.append(td)
    expect(edgeOverflow(document).clippedCells).toBe(1)
  })

  it('counts pages whose table runs past the printable area', () => {
    document.body.innerHTML =
      '<div class="page"><div class="content"></div></div><div class="page"><div class="content"></div></div>'
    const [first, second] = [...document.querySelectorAll<HTMLElement>('.content')]
    // 689px of columns in a 650px wide printable area
    Object.defineProperty(first, 'scrollWidth', { value: 689 })
    Object.defineProperty(first, 'clientWidth', { value: 650 })
    Object.defineProperty(second, 'scrollWidth', { value: 600 })
    Object.defineProperty(second, 'clientWidth', { value: 650 })
    expect(edgeOverflow(document).pagesPastEdge).toBe(1)
  })
})
