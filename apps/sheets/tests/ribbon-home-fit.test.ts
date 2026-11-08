/**
 * The Home tab fits 1366- and 1920-wide windows (Hanpan 0.17 #9). Measured in the built
 * app (ko UI) the band needed 2162px at 1920 and 2115px at 1366, so both windows showed
 * a scrollbar under the ribbon; English and Vietnamese labels are longer still. The band
 * takes the first of two denser layouts at which it stops overflowing (data-fit), so the
 * step depends on what the labels need in the UI language, not on a fixed window width.
 * Layout itself is checked in the built app (jsdom computes none).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { RIBBON_FIT_LEVELS, fitRibbonBand } from '../src/renderer/ribbon-fit'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')

/** a band whose content width shrinks with each density level */
function band(widths: readonly number[], client: number) {
  const attrs = new Map<string, string>()
  return {
    clientWidth: client,
    get scrollWidth() {
      return Math.max(client, widths[Number(attrs.get('data-fit') ?? 0)]!)
    },
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    removeAttribute: (k: string) => void attrs.delete(k),
    getAttribute: (k: string) => attrs.get(k) ?? null,
  } as unknown as HTMLElement
}

describe('fitRibbonBand', () => {
  it('keeps the full layout when it fits', () => {
    const el = band([1800, 1500, 1300], 1920)
    expect(fitRibbonBand(el)).toBe(0)
    expect(el.getAttribute('data-fit')).toBeNull()
  })

  it('takes the first denser layout that fits', () => {
    const el = band([2160, 1900, 1360], 1920)
    expect(fitRibbonBand(el)).toBe(1)
    expect(el.getAttribute('data-fit')).toBe('1')
    const narrow = band([2110, 1420, 1360], 1366)
    expect(fitRibbonBand(narrow)).toBe(2)
    expect(narrow.getAttribute('data-fit')).toBe('2')
  })

  it('stays at the densest layout when nothing fits, and returns to full when room comes back', () => {
    const el = band([3000, 2900, 2800], 1366)
    expect(fitRibbonBand(el)).toBe(RIBBON_FIT_LEVELS)
    const wide = band([1800, 1500, 1300], 1920)
    wide.setAttribute('data-fit', '2')
    expect(fitRibbonBand(wide)).toBe(0)
    expect(wide.getAttribute('data-fit')).toBeNull()
  })
})

describe('the Home band', () => {
  const shell = read('src/renderer/ExcelShell.tsx')
  const css = read('src/renderer/styles.css')

  it('is fitted, and names its groups for the denser layouts', () => {
    expect(shell).toMatch(/useRibbonFit\(homeBandRef/)
    expect(shell).toMatch(/<div className="ribbon" data-ribbon-body="" ref=\{homeBandRef\}>/)
    for (const name of [
      'ai',
      'clipboard',
      'font',
      'alignment',
      'number',
      'styles',
      'cells',
      'editing',
    ])
      expect(shell).toContain(`name="${name}"`)
  })

  it('lays the Editing tools out in three rows by column', () => {
    expect(css).toMatch(
      /\.editing-grid \{[^}]*grid-template-rows: repeat\(3, 21px\);[^}]*grid-auto-flow: column;/s,
    )
  })

  it('keeps every hidden name for screen readers', () => {
    expect(css).toMatch(/\.ribbon\[data-fit\] \.ribbon-group-font \.tool-label/)
    expect(css).toMatch(/\.ribbon\[data-fit='2'\] \.ribbon-group-editing \.tool-label/)
    // hidden by clipping, never display: none, so the accessible name stays
    const fitRules = css.slice(css.indexOf('.editing-grid {'))
    expect(fitRules).not.toMatch(/tool-label[^{]*\{[^}]*display: none/)
  })
})
