import { BooleanNumber, WrapStrategy } from '@univerjs/core'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FONT_FAMILY,
  echoFontFamily,
  normalizeHexColor,
  numberFormatLabel,
  selectionFormatEquals,
  toSelectionFormat,
} from '../src/renderer/selection-format'

describe('toSelectionFormat', () => {
  it('maps Univer style fields onto the ribbon echo', () => {
    const format = toSelectionFormat(
      {
        ff: 'Calibri',
        fs: 14,
        bl: BooleanNumber.TRUE,
        it: BooleanNumber.FALSE,
        ul: { s: BooleanNumber.TRUE },
        st: { s: BooleanNumber.FALSE },
        cl: { rgb: '#c00000' },
        bg: { rgb: 'rgb(255, 242, 204)' },
        tb: WrapStrategy.WRAP,
      },
      '0.00%',
    )
    expect(format).toEqual({
      fontFamily: 'Calibri',
      fontSize: 14,
      bold: true,
      italic: false,
      underline: true,
      strike: false,
      vertAlign: null,
      wrap: true,
      horizontalAlignment: null,
      verticalAlignment: null,
      textRotation: null,
      indent: 0,
      fontColor: '#C00000',
      fillColor: '#FFF2CC',
      numberFormat: '0.00%',
      link: null,
    })
  })

  it('echoes alignment names and the OOXML rotation value', () => {
    const format = toSelectionFormat({ ht: 4, vt: 1, tr: { a: -45 } }, '')
    expect(format.horizontalAlignment).toBe('justify')
    expect(format.verticalAlignment).toBe('top')
    expect(format.textRotation).toBe(135)
    const stacked = toSelectionFormat({ tr: { a: 0, v: BooleanNumber.TRUE } }, '')
    expect(stacked.textRotation).toBe(255)
  })

  it('echoes indent steps derived from the left padding', () => {
    expect(toSelectionFormat({ pd: { l: 16 } }, '').indent).toBe(2)
    expect(toSelectionFormat({ pd: { l: 13 } }, '').indent).toBe(2)
    expect(toSelectionFormat({}, '').indent).toBe(0)
  })

  it('treats a bare style and empty pattern as defaults', () => {
    const format = toSelectionFormat({}, '')
    expect(format).toEqual({
      fontFamily: null,
      fontSize: null,
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      vertAlign: null,
      wrap: false,
      horizontalAlignment: null,
      verticalAlignment: null,
      textRotation: null,
      indent: 0,
      fontColor: null,
      fillColor: null,
      numberFormat: 'General',
      link: null,
    })
  })
})

describe('normalizeHexColor', () => {
  it.each([
    ['#aabbcc', '#AABBCC'],
    ['#AABBCCDD', '#AABBCC'],
    ['rgb(255, 0, 16)', '#FF0010'],
    ['rgba(0, 128, 255, 0.5)', '#0080FF'],
    ['', null],
    ['red', null],
  ])('%s → %s', (input, expected) => {
    expect(normalizeHexColor(input)).toBe(expected)
  })
})

describe('selectionFormatEquals', () => {
  const base = toSelectionFormat({ ff: 'Arial' }, 'General')

  it('is true for equal values and null pairs', () => {
    expect(selectionFormatEquals(base, toSelectionFormat({ ff: 'Arial' }, 'General'))).toBe(true)
    expect(selectionFormatEquals(null, null)).toBe(true)
  })

  it('is false across null and on any field change', () => {
    expect(selectionFormatEquals(base, null)).toBe(false)
    expect(selectionFormatEquals(base, { ...base, bold: true })).toBe(false)
    expect(selectionFormatEquals(base, { ...base, numberFormat: '0.00' })).toBe(false)
  })
})

describe('numberFormatLabel', () => {
  it.each([
    ['', 'General'],
    ['General', 'General'],
    ['0.00%', 'Percentage'],
    ['$#,##0.00', 'Currency'],
    ['"$"#,##0.00', 'Currency'],
    ['[$USD-409] #,##0.00', 'Currency'],
    ['_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)', 'Accounting'],
    ['_("$"* #,##0.00_);_("$"* \\(#,##0.00\\);_("$"* "-"??_);_(@_)', 'Accounting'],
    // Excel's Comma Style: accounting alignment without a symbol; the `@`
    // text section must not make it read as Text.
    ['_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)', 'Accounting'],
    ['0.00E+00', 'Scientific'],
    ['# ?/?', 'Fraction'],
    ['# ??/16', 'Fraction'],
    ['h:mm:ss AM/PM', 'Time'],
    ['mm:ss', 'Time'],
    ['yyyy-mm-dd', 'Date'],
    ['m/d/yyyy h:mm', 'Date'],
    ['[$-409]d-mmm-yy', 'Date'],
    ['@', 'Text'],
    ['#,##0', 'Number'],
    ['0.00', 'Number'],
    // [Red] must not read as a date letter; "kg" must not read as digits.
    ['[Red]0', 'Number'],
    ['0 "kg"', 'Number'],
  ])('%s → %s', (pattern, label) => {
    expect(numberFormatLabel(pattern)).toBe(label)
  })
})

// 0.17 #9: the font box of a cell with no font of its own names the workbook's Normal font,
// and 맑은 고딕 when there is none to read (it used to say Aptos whatever the file used)
describe('echoFontFamily', () => {
  it("prefers the cell's font, then the workbook's Normal font, then 맑은 고딕", () => {
    expect(DEFAULT_FONT_FAMILY).toBe('맑은 고딕')
    const blank = toSelectionFormat({}, 'General')
    expect(echoFontFamily(blank, undefined)).toBe('맑은 고딕')
    expect(echoFontFamily(null, undefined)).toBe('맑은 고딕')
    expect(echoFontFamily(blank, 'Calibri')).toBe('Calibri')
    expect(echoFontFamily(toSelectionFormat({ ff: 'Arial' }, 'General'), 'Calibri')).toBe('Arial')
  })

  // with no Normal font to read (an in-memory blank workbook), the box names the font a
  // new workbook gets in the UI language (new-workbook-lang.ts), not always 맑은 고딕
  it.each([
    ['ko', '맑은 고딕'],
    ['vi', 'Arial'],
    ['ja', '游ゴシック'],
    ['en', 'Calibri'],
  ])('falls back to the %s new-workbook font %s', (lang, font) => {
    expect(echoFontFamily(null, undefined, lang)).toBe(font)
    expect(echoFontFamily(toSelectionFormat({}, 'General'), undefined, lang)).toBe(font)
    expect(echoFontFamily(null, 'Calibri', lang)).toBe('Calibri')
  })

  it('is given the UI language by the ribbon', async () => {
    const { readFileSync } = await import('node:fs')
    const shell = readFileSync(new URL('../src/renderer/ExcelShell.tsx', import.meta.url), 'utf8')
    expect(shell).toContain('echoFontFamily(selectionFormat, normalFontFamily, lang)')
  })
})
