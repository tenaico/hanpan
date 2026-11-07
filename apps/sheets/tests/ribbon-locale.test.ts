/**
 * Hanpan 0.17 review #9 and #14: the Home tab's currency button showed "$" in every
 * language, and about twenty ribbon controls named themselves to screen readers in
 * English ("Font family", "AutoSum") whatever the UI language.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { accountingStyle, ribbonCurrency } from '../src/renderer/excel-format-shortcuts'
import { numfmtOptionsOf } from '../src/renderer/numfmt-dialog'
import { strings } from '../src/renderer/i18n/strings'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')

describe('the ribbon currency button', () => {
  it.each([
    ['ko', '₩', 0],
    ['vi', '₫', 0],
    ['ja', '¥', 0],
    ['en', '$', 2],
    ['fr', '€', 2],
    ['de', '€', 2],
    ['zh-TW', 'NT$', 2],
    ['pt', 'R$', 2],
  ] as const)('uses the %s currency %s with %i decimals', (lang, symbol, decimals) => {
    expect(ribbonCurrency(lang)).toEqual({ symbol, decimals })
  })

  it('applies an accounting format the Format Cells dialog reads back', () => {
    const won = accountingStyle('₩', 0)
    expect(won).toBe('_("₩"* #,##0_);_("₩"* \\(#,##0\\);_("₩"* "-"_);_(@_)')
    expect(numfmtOptionsOf(won)).toMatchObject({ category: 'accounting', symbol: '₩', decimals: 0 })
    // the two-decimal form is unchanged
    expect(accountingStyle('$')).toBe(accountingStyle('$', 2))
  })

  it('shows and applies the UI language currency', () => {
    const shell = read('src/renderer/ExcelShell.tsx')
    expect(shell).toMatch(/ribbonCurrency\(lang\)/)
    expect(shell).not.toMatch(/accountingStyle\(RIBBON_CURRENCY_SYMBOL\)/)
  })
})

describe('ribbon control names', () => {
  it('are never written in English in the sheets ribbon', () => {
    const shell = read('src/renderer/ExcelShell.tsx')
    expect(shell.match(/\blabel="[A-Za-z][^"]*"/g) ?? []).toEqual([])
    expect(read('src/renderer/ColorDropdown.tsx')).not.toContain('`${label} options`')
  })

  it('name the colour menu button in every language', () => {
    for (const lang of LANGS) {
      const text = (strings[lang] as Record<string, string>).appColorOptions
      expect(text, lang).toContain('{label}')
      if (lang !== 'en') expect(text, lang).not.toBe(strings.en.appColorOptions)
    }
    expect(strings.ko.appColorOptions).toBe('{label} 옵션')
  })
})
