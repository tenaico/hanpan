/**
 * The Home band fits a 1366-wide window (0.17 acceptance): it ran past the window edge, cut
 * "이미지 내보내기" and showed a scrollbar under the ribbon. Like the sheets ribbon, the band
 * takes the first of two denser layouts at which it stops overflowing (data-fit), so the
 * step follows what the labels need in the UI language rather than a fixed window width.
 * Layout itself is checked in the built app (jsdom computes none).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { RIBBON_FIT_LEVELS, fitRibbonBand, watchRibbonBand } from '../src/renderer/ribbon-fit'

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
    const el = band([1300, 1200, 1100], 1366)
    expect(fitRibbonBand(el)).toBe(0)
    expect(el.getAttribute('data-fit')).toBeNull()
  })

  it('takes the first denser layout that fits', () => {
    const el = band([1500, 1350, 1200], 1366)
    expect(fitRibbonBand(el)).toBe(1)
    expect(el.getAttribute('data-fit')).toBe('1')
    const narrow = band([1500, 1400, 1300], 1366)
    expect(fitRibbonBand(narrow)).toBe(2)
  })

  it('stays at the densest layout when nothing fits, and returns to full when room comes back', () => {
    const el = band([3000, 2900, 2800], 1366)
    expect(fitRibbonBand(el)).toBe(RIBBON_FIT_LEVELS)
    const wide = band([1300, 1200, 1100], 1920)
    wide.setAttribute('data-fit', '2')
    expect(fitRibbonBand(wide)).toBe(0)
    expect(wide.getAttribute('data-fit')).toBeNull()
  })
})

describe('the pdf ribbon band', () => {
  it('refits when the window, the UI language or the tab shown changes', () => {
    const app = read('src/renderer/App.tsx')
    expect(app).toMatch(/useRibbonFit\(ribbonBody, \[lang, ribbonTab/)
    expect(app).toMatch(/<div className="ribbon-body" data-ribbon-body="" ref=\{setRibbonBody\}>/)
  })

  it('has both denser layouts, which clip a label instead of removing it', () => {
    const css = read('src/renderer/styles.css')
    expect(css).toMatch(/\.ribbon-body\[data-fit\] \.rb-big \{/)
    expect(css).toMatch(/\.ribbon-body\[data-fit='2'\]/)
    expect(css).not.toMatch(/\.ribbon-body\[data-fit[^{]*\{[^}]*display: none/s)
  })
})

describe('watchRibbonBand', () => {
  // the band is laid out before the document has loaded; the zoom box and the page count
  // come in later and widen a group, not the band, so a band-only observer never refits
  it('refits when a group inside the band changes size, not only the band', () => {
    const observed: Element[] = []
    let fire: (() => void) | null = null
    class FakeObserver {
      constructor(cb: () => void) {
        fire = cb
      }
      observe(el: Element) {
        observed.push(el)
      }
      disconnect() {}
    }
    const original = globalThis.ResizeObserver
    globalThis.ResizeObserver = FakeObserver as unknown as typeof ResizeObserver
    try {
      const host = document.createElement('div')
      const group = document.createElement('div')
      host.appendChild(group)
      let content = 1300
      Object.defineProperty(host, 'clientWidth', { get: () => 1366 })
      Object.defineProperty(host, 'scrollWidth', {
        get: () => (host.hasAttribute('data-fit') ? 1366 : content),
      })
      const stop = watchRibbonBand(host)
      expect(observed).toContain(host)
      expect(observed).toContain(group)
      expect(host.getAttribute('data-fit')).toBeNull()
      content = 1445
      fire!()
      expect(host.getAttribute('data-fit')).toBe('1')
      stop()
    } finally {
      globalThis.ResizeObserver = original
    }
  })
})
