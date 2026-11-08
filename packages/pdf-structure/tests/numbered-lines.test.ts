/**
 * P5: a stack of numbered lines ("1-1. …", "1-2. …") that pdf2docx keeps in
 * one block came out of the tree as one run of prose, so the side-by-side
 * translation column showed the page as a single lump of text. A line that
 * starts with a list number right after another numbered line begins a new
 * line; wrapped prose and a lone number keep joining as before.
 */
import { describe, expect, it } from 'vitest'
import type { Line, Span } from '../../pdf2docx/src/ir'
import { linesToRuns, runsText } from '../src/tree/inline'
import { normalizeSourceText } from '../src/store/keys'

const rect = (x0: number, x1: number) => ({ x0, y0: 0, x1, y1: 10 })

function line(text: string): Line {
  const span: Span = {
    text,
    box: rect(0, 300),
    fontSize: 11,
    fontFamily: 'malgun',
    bold: false,
    italic: false,
    color: '000000',
    dir: 'ltr',
    script: 'hangul',
  }
  return { spans: [span], box: rect(0, 300), baseline: 0, endsWithHyphen: false }
}

const text = (...lines: string[]) =>
  runsText(linesToRuns(lines.map(line), { pageNumberOf: (i) => i + 1 }))

describe('numbered lines', () => {
  it('keeps each numbered line on its own line', () => {
    expect(
      text(
        '1-1. 한판 PDF 뷰어 점검용 본문 줄입니다. 검색어: 매출 증가',
        '1-2. 한판 PDF 뷰어 점검용 본문 줄입니다. 검색어: 매출 증가',
        '1-3. 마지막 줄',
      ),
    ).toBe(
      '1-1. 한판 PDF 뷰어 점검용 본문 줄입니다. 검색어: 매출 증가\n' +
        '1-2. 한판 PDF 뷰어 점검용 본문 줄입니다. 검색어: 매출 증가\n' +
        '1-3. 마지막 줄',
    )
  })

  it.each([
    ['1. 첫째 항목', '2. 둘째 항목'],
    ['(1) 첫째', '(2) 둘째'],
    ['1) first item', '2) second item'],
    ['3.2.1 Scope', '3.2.2 Terms'],
    ['① 하나', '② 둘'],
    ['• 하나', '• 둘'],
    ['가. 하나', '나. 둘'],
  ])('breaks between %s / %s', (a, b) => {
    expect(text(a, b)).toBe(`${a}\n${b}`)
  })

  it('still joins wrapped prose, and a number in the middle of a sentence', () => {
    expect(text('1. 이 항목은 길어서', '다음 줄로 이어집니다')).toBe(
      '1. 이 항목은 길어서 다음 줄로 이어집니다',
    )
    expect(text('매출은 전년보다', '12. 3% 늘었다')).toBe('매출은 전년보다 12. 3% 늘었다')
    expect(text('The total was', '2024. The year')).toBe('The total was 2024. The year')
  })

  it('keeps the translation keys of such blocks (whitespace is collapsed)', () => {
    const runs = linesToRuns([line('1-1. 가'), line('1-2. 나')], { pageNumberOf: (i) => i + 1 })
    expect(normalizeSourceText(runs)).toBe('1-1. 가 1-2. 나')
  })
})
