/// X19: opening a CSV put the sheet under "시트1", kept 2020-03-02 as text and
/// left the date column too narrow. Excel names the sheet after the file,
/// reads year-first dates as dates and widens the column to show them.

import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'

import {
  csvDateCell,
  csvToXlsxBufferForOpen,
  sheetNameFromFileStem,
} from '../src/gateway/csv-import'

async function parts(buffer: Buffer): Promise<{ sheet: string; styles: string; workbook: string }> {
  const zip = await JSZip.loadAsync(buffer)
  const read = (name: string) => zip.file(name)!.async('string')
  return {
    sheet: await read('xl/worksheets/sheet1.xml'),
    styles: await read('xl/styles.xml'),
    workbook: await read('xl/workbook.xml'),
  }
}

describe('csvDateCell', () => {
  it('reads year-first dates with - or / as date serials', () => {
    expect(csvDateCell('2020-03-02')).toEqual({ serial: 43892, format: 'yyyy-mm-dd' })
    expect(csvDateCell('2019/7/15')).toEqual({ serial: 43661, format: 'yyyy/mm/dd' })
    expect(csvDateCell('1900-03-01')).toEqual({ serial: 61, format: 'yyyy-mm-dd' })
  })

  it('leaves anything else as it is', () => {
    for (const text of [
      '2023-02-30',
      '2023-13-01',
      '20200302',
      '2020-03-02 extra',
      '03/02/2020',
      '2020-03',
      '1899-12-31',
      '2020-03/02',
      '',
    ]) {
      expect(csvDateCell(text), text).toBeNull()
    }
  })
})

describe('sheetNameFromFileStem', () => {
  it('names the sheet after the file, within Excel sheet-name rules', () => {
    expect(sheetNameFromFileStem('직원_cp949')).toBe('직원_cp949')
    expect(sheetNameFromFileStem('a[1]:b*c?d/e\\f')).toBe('a_1__b_c_d_e_f')
    expect(sheetNameFromFileStem("'quoted'")).toBe('quoted')
    expect(sheetNameFromFileStem('x'.repeat(40))).toBe('x'.repeat(31))
  })

  it('gives up on names Excel refuses, so the default name is used', () => {
    expect(sheetNameFromFileStem('')).toBeUndefined()
    expect(sheetNameFromFileStem("''")).toBeUndefined()
    expect(sheetNameFromFileStem('History')).toBeUndefined()
  })
})

describe('csvToXlsxBufferForOpen', () => {
  const csv = '이름,입사일,급여\n김철수,2020-03-02,3500000\n이영희,2019/7/15,4200000\n'

  it('stores date-looking cells as dates with a matching format', async () => {
    const { buffer } = await csvToXlsxBufferForOpen(csv, '직원', ',')
    const { sheet, styles, workbook } = await parts(buffer)
    expect(workbook).toContain('<sheet name="직원"')
    expect(sheet).toContain('<c r="B2" s="1"><v>43892</v></c>')
    expect(sheet).toContain('<c r="B3" s="2"><v>43661</v></c>')
    // the header and the plain numbers are untouched
    expect(sheet).toContain('<c r="B1" t="inlineStr">')
    expect(sheet).toContain('<c r="C2"><v>3500000</v></c>')
    expect(styles).toContain('<numFmt numFmtId="164" formatCode="yyyy-mm-dd"/>')
    expect(styles).toContain('<numFmt numFmtId="165" formatCode="yyyy/mm/dd"/>')
    expect(styles).toContain('<cellXfs count="3">')
  })

  it('widens a date column to show its dates', async () => {
    const { buffer } = await csvToXlsxBufferForOpen(csv, '직원', ',')
    const { sheet } = await parts(buffer)
    const col = /<col min="2" max="2" width="([0-9.]+)"[^>]*\/>/.exec(sheet)
    expect(col).not.toBeNull()
    // ten characters plus Excel's cell padding (10.71 at Calibri 11)
    expect(Number(col![1])).toBeGreaterThanOrEqual(10.7)
    expect(sheet.indexOf('<cols>')).toBeLessThan(sheet.indexOf('<sheetData>'))
    // no other column gets a width
    expect(sheet.match(/<col /g)).toHaveLength(1)
  })

  it('writes the same plain workbook as before when there are no dates', async () => {
    const { buffer } = await csvToXlsxBufferForOpen('a,b\n1,2\n', undefined, ',')
    const { sheet, styles } = await parts(buffer)
    expect(sheet).not.toContain('<cols>')
    expect(styles).toContain('<cellXfs count="1">')
    expect(styles).not.toContain('numFmts')
  })
})
