/// 모든 시트를 CSV로(0.17): 시트마다 CSV 파일 하나를 사용자가 고른 폴더에 쓴다.
/// 압축 파일이 아니라 폴더에 따로 두는 것은, CSV를 받는 쪽(엑셀, 업로드 창, 다른 프로그램)이
/// 파일 하나씩을 열기 때문이다. 압축은 한 번 더 풀어야 쓸 수 있다.

import { join } from 'node:path'

/** Characters Windows refuses in a file name (sheet names already exclude \ / ? * [ ] :). */
// eslint-disable-next-line no-control-regex -- Windows file names must exclude ASCII controls.
const UNSAFE = /[\\/:*?"<>|\u0000-\u001f]/g

/** `<base>-<sheet>.csv` for every sheet, in order, never the same name twice (case-blind). */
export function csvFileNamesForSheets(baseName: string, sheetNames: readonly string[]): string[] {
  const base = baseName.replace(UNSAFE, '_').trim() || 'Book'
  const taken = new Set<string>()
  return sheetNames.map((sheet) => {
    const stem = `${base}-${sheet.replace(UNSAFE, '_').replace(/[. ]+$/, '') || '_'}`
    let name = `${stem}.csv`
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${stem} (${n}).csv`
    taken.add(name.toLowerCase())
    return name
  })
}

export interface CsvFileWrite {
  readonly path: string
  readonly bytes: Buffer
}

const BOM = Buffer.from([0xef, 0xbb, 0xbf])

/** The files to write: UTF-8 with a BOM (Excel then reads Korean right), one per sheet. */
export function planCsvAllExport(
  folder: string,
  baseName: string,
  sheets: readonly { name: string; content: string }[],
): CsvFileWrite[] {
  const names = csvFileNamesForSheets(
    baseName,
    sheets.map((sheet) => sheet.name),
  )
  return sheets.map((sheet, index) => ({
    path: join(folder, names[index]!),
    bytes: Buffer.concat([BOM, Buffer.from(sheet.content, 'utf8')]),
  }))
}
