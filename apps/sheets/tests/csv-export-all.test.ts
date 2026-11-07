/**
 * 모든 시트를 CSV로(0.17): 시트마다 CSV 한 개를 사용자가 고른 폴더에 쓴다. 압축 파일이
 * 아니라 폴더인 이유는 CSV를 받는 쪽(엑셀, 다른 프로그램, 업로드 창)이 파일 하나씩을 열기
 * 때문이다. 파일 이름은 `<통합 문서>-<시트>.csv`이고, Windows가 거부하는 글자는 `_`가 된다.
 */
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { exportBaseName, serializeAllSheetsCsv } from '../src/renderer/csv-export'
import { csvFileNamesForSheets, planCsvAllExport } from '../src/main/csv-all-export'
import { workbookExportCsvAllRequestSchema } from '../src/shared/desktop-api'

function fakeSheet(id: string, name: string, rows: string[][], formula = false) {
  const columns = Math.max(1, ...rows.map((row) => row.length))
  return {
    getLastRow: () => rows.length - 1,
    getLastColumn: () => columns - 1,
    getSheetId: () => id,
    getSheetName: () => name,
    getRange: (row: number, column: number, numRows: number, numColumns: number) => ({
      getDisplayValues: () =>
        rows
          .slice(row, row + numRows)
          .map((cells) =>
            Array.from({ length: numColumns }, (_, offset) => cells[column + offset] ?? ''),
          ),
    }),
    getSheet: () => ({
      getCellMatrix: () => ({
        forValue: (callback: (r: number, c: number, cell: { f?: string } | null) => unknown) => {
          callback(0, 0, formula ? { f: '=1+1' } : null)
        },
      }),
    }),
  }
}

const runtime = (sheets: ReturnType<typeof fakeSheet>[]) =>
  ({
    univerAPI: { getActiveWorkbook: () => ({ getSheets: () => sheets }) },
  }) as never

describe('serializeAllSheetsCsv', () => {
  it('serializes every sheet in tab order with its name, and says which carry formulas', () => {
    const result = serializeAllSheetsCsv(
      runtime([
        fakeSheet('s1', '시트1', [['a', 'b']]),
        fakeSheet('s2', '매출', [['1'], ['2']], true),
      ]),
      null,
    )
    expect(result).toEqual({
      sheets: [
        { name: '시트1', content: 'a,b\r\n' },
        { name: '매출', content: '1\r\n2\r\n' },
      ],
      hasFormulas: true,
    })
  })

  it('answers null without a workbook', () => {
    expect(serializeAllSheetsCsv(null, null)).toBeNull()
  })
})

describe('csvFileNamesForSheets', () => {
  it('names each file after the workbook and the sheet', () => {
    expect(csvFileNamesForSheets('매출 보고', ['시트1', '1월'])).toEqual([
      '매출 보고-시트1.csv',
      '매출 보고-1월.csv',
    ])
  })

  it('replaces characters Windows refuses in a file name, and never repeats a name', () => {
    expect(csvFileNamesForSheets('Book', ['a<b>|c"d', 'A', 'a', 'a<b>|c"d'])).toEqual([
      'Book-a_b__c_d.csv',
      'Book-A.csv',
      'Book-a (2).csv',
      'Book-a_b__c_d (2).csv',
    ])
  })
})

describe('planCsvAllExport', () => {
  it('writes UTF-8 with a BOM into the chosen folder, one file per sheet', () => {
    const plan = planCsvAllExport('C:\\out', 'Book', [
      { name: '시트1', content: '가,b\r\n' },
      { name: 'x', content: '' },
    ])
    expect(plan.map((file) => file.path)).toEqual([
      join('C:\\out', 'Book-시트1.csv'),
      join('C:\\out', 'Book-x.csv'),
    ])
    expect([...plan[0]!.bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(plan[0]!.bytes.subarray(3).toString('utf8')).toBe('가,b\r\n')
  })
})

describe('the request', () => {
  it('takes the sheets and refuses an empty list', () => {
    expect(
      workbookExportCsvAllRequestSchema.safeParse({
        baseName: 'Book',
        sheets: [{ name: 'a', content: 'x' }],
        hasFormulas: false,
      }).success,
    ).toBe(true)
    expect(
      workbookExportCsvAllRequestSchema.safeParse({
        baseName: 'Book',
        sheets: [],
        hasFormulas: false,
      }).success,
    ).toBe(false)
  })
})

describe('exportBaseName', () => {
  it('names exports after the file the user opened, not the session copy', () => {
    const state = (file: { name: string; path?: string }) => ({ file }) as never
    expect(
      exportBaseName(
        state({
          name: '85dd27b1-c8df-40bc-9eec-612d5fcffc5b.xlsx',
          path: 'C:\\문서\\매출 보고.xlsx',
        }),
      ),
    ).toBe('매출 보고')
    expect(exportBaseName(state({ name: 'Book2.xlsx' }))).toBe('Book2')
    expect(exportBaseName(null)).toBe('Book1')
  })
})
