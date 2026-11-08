/// The first sheet name and the Normal font of a new workbook follow the UI language
/// (Hanpan 0.17): Korean gets 맑은 고딕 / 시트1, Vietnamese Arial / Trang tính1, Japanese and
/// Chinese the default font of their own Excel, and every other language the upstream
/// defaults (Calibri / Sheet1). Only new blank workbooks use this; an existing file keeps
/// its fonts and sheet names.
import { MINIMAL_STYLESHEET_XML } from './xlsx-default-styles'

interface NewWorkbookFont {
  readonly name: string
  /** OOXML charset (129 Korean, 128 Japanese, 134 Simplified, 136 Traditional); none for Latin faces */
  readonly charset?: number
}

interface NewWorkbookDefaults {
  readonly sheetName: string
  readonly font: NewWorkbookFont
}

const UPSTREAM: NewWorkbookDefaults = { sheetName: 'Sheet1', font: { name: 'Calibri' } }

/// Malgun Gothic carries only 33 of the 134 Vietnamese letters (checked with fontTools), so a
/// Vietnamese line in it mixes faces; Arial, Calibri and Segoe UI carry all 134.
const BY_LANG: Readonly<Record<string, NewWorkbookDefaults>> = {
  ko: { sheetName: '시트1', font: { name: '맑은 고딕', charset: 129 } },
  vi: { sheetName: 'Trang tính1', font: { name: 'Arial' } },
  ja: { sheetName: 'Sheet1', font: { name: '游ゴシック', charset: 128 } },
  zh: { sheetName: 'Sheet1', font: { name: '等线', charset: 134 } },
  'zh-TW': { sheetName: '工作表1', font: { name: '新細明體', charset: 136 } },
}

export function newWorkbookDefaults(lang: string): NewWorkbookDefaults {
  return BY_LANG[lang] ?? UPSTREAM
}

/// The first sheet of a new workbook; Sheet1 for a language without its own.
export const firstSheetNameFor = (lang: string): string => newWorkbookDefaults(lang).sheetName

/// Whether a new workbook starts with this sheet name in some language.
export function isDefaultFirstSheetName(name: string): boolean {
  return name === UPSTREAM.sheetName || Object.values(BY_LANG).some((d) => d.sheetName === name)
}

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/// The stylesheet of a new workbook: MINIMAL_STYLESHEET_XML with the language's Normal font,
/// written without `<scheme>`, which would let the theme's Latin face (Calibri) stand in.
export function newWorkbookStylesheetXml(lang: string): string {
  const { font } = newWorkbookDefaults(lang)
  const charset = font.charset ? `<charset val="${font.charset}"/>` : ''
  return MINIMAL_STYLESHEET_XML.replace(
    '<font><sz val="11"/><name val="Calibri"/></font>',
    `<font><sz val="11"/><name val="${escapeXml(font.name)}"/><family val="2"/>${charset}</font>`,
  )
}
