/**
 * Page looks for the documents Hanpan writes: which font, size and spacing each
 * kind of block gets. Values follow common Korean public-sector practice:
 * the internal report (보고서: HY헤드라인M □ 16pt, 휴먼명조 ○ ― 15pt, 한양중고딕 ※ 13pt,
 * line spacing 160%) and the official letter (공문서: 맑은 고딕 11.5pt).
 * Hancom fonts missing on a PC are drawn with a substitute by the editor; the
 * file keeps the names, so Hancom Office shows the intended look.
 */
import type { MarkerStyle } from './numbering'

export interface TextLook {
  font: string
  /** points */
  size: number
  bold?: boolean | undefined
  color?: string | undefined
}

export interface ParaLook {
  align?: 'left' | 'center' | 'right' | 'justify' | undefined
  /** percent */
  lineSpacing?: number | undefined
  /** points */
  spacingBefore?: number | undefined
  spacingAfter?: number | undefined
}

export interface DocTheme {
  id: string
  title: TextLook & ParaLook
  meta: TextLook & ParaLook
  chapter: TextLook & ParaLook
  /** by item depth; deeper items use the last entry */
  items: (TextLook & ParaLook)[]
  body: TextLook & ParaLook
  reference: TextLook & ParaLook
  /** left indent per depth, points */
  indentStep: number
}

export const REPORT_THEME: DocTheme = {
  id: 'report',
  title: { font: 'HY헤드라인M', size: 22, align: 'center', spacingAfter: 6, lineSpacing: 160 },
  meta: { font: '휴먼명조', size: 13, align: 'right', spacingAfter: 12, lineSpacing: 160 },
  chapter: { font: 'HY헤드라인M', size: 17, color: '#1f3a8a', spacingBefore: 18, lineSpacing: 160 },
  items: [
    { font: 'HY헤드라인M', size: 16, spacingBefore: 15, lineSpacing: 160 },
    { font: '휴먼명조', size: 15, spacingBefore: 10, lineSpacing: 160 },
    { font: '휴먼명조', size: 15, spacingBefore: 6, lineSpacing: 160 },
    { font: '휴먼명조', size: 14, spacingBefore: 3, lineSpacing: 160 },
  ],
  body: { font: '휴먼명조', size: 15, spacingBefore: 3, lineSpacing: 160, align: 'justify' },
  reference: { font: '한양중고딕', size: 13, spacingBefore: 3, lineSpacing: 160 },
  indentStep: 15,
}

export const GONGMUN_THEME: DocTheme = {
  id: 'gongmun',
  title: {
    font: '맑은 고딕',
    size: 16,
    bold: true,
    align: 'center',
    spacingAfter: 6,
    lineSpacing: 130,
  },
  meta: { font: '맑은 고딕', size: 11.5, align: 'right', spacingAfter: 10, lineSpacing: 130 },
  chapter: { font: '맑은 고딕', size: 13, bold: true, spacingBefore: 10, lineSpacing: 130 },
  items: [{ font: '맑은 고딕', size: 11.5, spacingBefore: 4, lineSpacing: 130 }],
  body: { font: '맑은 고딕', size: 11.5, lineSpacing: 130, align: 'justify' },
  reference: { font: '맑은 고딕', size: 10.5, lineSpacing: 130 },
  // 편람: each lower level starts 2타 (one Hangul character) to the right
  indentStep: 11.5,
}

/** A plain look for fonts every PC has (함초롬, shipped with Hancom Office and many viewers). */
export const PLAIN_THEME: DocTheme = {
  id: 'plain',
  title: {
    font: '함초롬돋움',
    size: 20,
    bold: true,
    align: 'center',
    spacingAfter: 6,
    lineSpacing: 160,
  },
  meta: { font: '함초롬바탕', size: 11, align: 'right', spacingAfter: 10, lineSpacing: 160 },
  chapter: { font: '함초롬돋움', size: 15, bold: true, spacingBefore: 14, lineSpacing: 160 },
  items: [
    { font: '함초롬돋움', size: 14, bold: true, spacingBefore: 10, lineSpacing: 160 },
    { font: '함초롬바탕', size: 12, spacingBefore: 6, lineSpacing: 160 },
    { font: '함초롬바탕', size: 11, spacingBefore: 4, lineSpacing: 160 },
  ],
  body: { font: '함초롬바탕', size: 11, lineSpacing: 160, align: 'justify' },
  reference: { font: '함초롬돋움', size: 10, lineSpacing: 160 },
  indentStep: 12,
}

/**
 * Hanpan without its Korean document features (decision 0091): one font that
 * Windows and macOS both carry and that covers Vietnamese and the other
 * Latin, Cyrillic and Greek scripts the UI speaks.
 */
export const BASIC_THEME: DocTheme = {
  id: 'basic',
  title: {
    font: 'Arial',
    size: 18,
    bold: true,
    align: 'center',
    spacingAfter: 6,
    lineSpacing: 140,
  },
  meta: { font: 'Arial', size: 10.5, align: 'right', spacingAfter: 10, lineSpacing: 140 },
  chapter: { font: 'Arial', size: 14, bold: true, spacingBefore: 12, lineSpacing: 140 },
  items: [
    { font: 'Arial', size: 11.5, spacingBefore: 6, lineSpacing: 140 },
    { font: 'Arial', size: 11, spacingBefore: 4, lineSpacing: 140 },
  ],
  body: { font: 'Arial', size: 11, lineSpacing: 140, align: 'left' },
  reference: { font: 'Arial', size: 10, lineSpacing: 140 },
  indentStep: 12,
}

export const DOC_THEMES: Record<string, DocTheme> = {
  report: REPORT_THEME,
  gongmun: GONGMUN_THEME,
  plain: PLAIN_THEME,
  basic: BASIC_THEME,
}

export function themeFor(style: MarkerStyle, themeId?: string): DocTheme {
  if (themeId && DOC_THEMES[themeId]) return DOC_THEMES[themeId]!
  return style === 'gongmun' ? GONGMUN_THEME : REPORT_THEME
}

export function itemLook(theme: DocTheme, depth: number): TextLook & ParaLook {
  return theme.items[Math.min(depth, theme.items.length - 1)]!
}
