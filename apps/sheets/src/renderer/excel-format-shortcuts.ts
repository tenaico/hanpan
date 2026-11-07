/// Excel's Ctrl+Shift+<symbol> number-format and border shortcuts, matched
/// by `event.code` because the shifted digit keys report symbols in `key`.
/// The Home tab's quick buttons share the Excel style codes below.

export const PERCENT_STYLE = '0%'
export const COMMA_STYLE = '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)'

export function accountingStyle(symbol: string, decimals = 2): string {
  const s = `"${symbol}"`
  const n = `#,##0${decimals > 0 ? `.${'0'.repeat(decimals)}` : ''}`
  return `_(${s}* ${n}_);_(${s}* \\(${n}\\);_(${s}* "-"${'?'.repeat(decimals)}_);_(@_)`
}

export function currencyStyle(symbol: string): string {
  const s = symbol.length === 1 ? symbol : `"${symbol}"`
  return `${s}#,##0.00_);(${s}#,##0.00)`
}

export const RIBBON_CURRENCY_SYMBOL = '$'

export interface RibbonCurrency {
  readonly symbol: string
  /** decimals the currency is normally shown with (none for won, dong, yen, rupiah) */
  readonly decimals: number
}

/**
 * The currency of the Home tab's accounting button in each UI language (Hanpan 0.17 #9).
 * Excel's button follows the system's currency; the UI language stands in for it here.
 * Languages spoken across many currencies (English, Arabic) keep the dollar.
 */
const RIBBON_CURRENCY_BY_LANG: Readonly<Record<string, RibbonCurrency>> = {
  ko: { symbol: '₩', decimals: 0 },
  vi: { symbol: '₫', decimals: 0 },
  ja: { symbol: '¥', decimals: 0 },
  id: { symbol: 'Rp', decimals: 0 },
  zh: { symbol: '¥', decimals: 2 },
  'zh-TW': { symbol: 'NT$', decimals: 2 },
  fr: { symbol: '€', decimals: 2 },
  de: { symbol: '€', decimals: 2 },
  es: { symbol: '€', decimals: 2 },
  it: { symbol: '€', decimals: 2 },
  nl: { symbol: '€', decimals: 2 },
  pt: { symbol: 'R$', decimals: 2 },
  ru: { symbol: '₽', decimals: 2 },
  pl: { symbol: 'zł', decimals: 2 },
  cs: { symbol: 'Kč', decimals: 2 },
  th: { symbol: '฿', decimals: 2 },
  ms: { symbol: 'RM', decimals: 2 },
  he: { symbol: '₪', decimals: 2 },
  hi: { symbol: '₹', decimals: 2 },
}

export function ribbonCurrency(lang: string): RibbonCurrency {
  return RIBBON_CURRENCY_BY_LANG[lang] ?? { symbol: RIBBON_CURRENCY_SYMBOL, decimals: 2 }
}

export const NUMBER_FORMAT_SHORTCUTS: Readonly<Record<string, string>> = {
  Backquote: 'General',
  Digit1: '#,##0.00',
  Digit2: 'h:mm AM/PM',
  Digit3: 'd-mmm-yy',
  Digit4: currencyStyle(RIBBON_CURRENCY_SYMBOL),
  Digit5: PERCENT_STYLE,
  Digit6: '0.00E+00',
}

const BORDER_SHORTCUTS: Readonly<Record<string, string>> = {
  Digit7: 'outer',
  Minus: 'none',
}

/// Excel for Mac additionally binds outline / no border to Cmd+Opt+0 / Cmd+Opt+-.
const MAC_BORDER_SHORTCUTS: Readonly<Record<string, string>> = {
  Digit0: 'outer',
  Minus: 'none',
}

export interface FormatShortcutKey {
  readonly code: string
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly shiftKey: boolean
}

/// Ribbon command for a keydown, or null when it is not a format shortcut.
/// The mac border chords need `isMac`: without the gate the Windows key
/// combined with Alt would trigger borders on Windows and Linux too.
export function formatShortcutCommand(event: FormatShortcutKey, isMac = false): string | null {
  if (isMac && event.metaKey && event.altKey && !event.ctrlKey && !event.shiftKey) {
    const preset = MAC_BORDER_SHORTCUTS[event.code]
    return preset ? `border:${preset}` : null
  }
  if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.altKey) return null
  const pattern = NUMBER_FORMAT_SHORTCUTS[event.code]
  if (pattern) return `format:${pattern}`
  const preset = BORDER_SHORTCUTS[event.code]
  return preset ? `border:${preset}` : null
}
