import { describe, expect, it } from 'vitest'
import { createRenderContext } from '../src/generate/render-context'

describe('createRenderContext degenerate inputs', () => {
  it('matches defaults for honest settings', () => {
    const ctx = createRenderContext({})
    expect(ctx.pageWidthDxa).toBe(794 * 15)
    expect(ctx.contentDxa).toBeGreaterThan(0)
  })

  it('degrades non-finite page size, squeeze, and margins to finite geometry', () => {
    const ctx = createRenderContext({
      pageSizePx: { width: Infinity, height: NaN },
      pageFitSqueeze: Infinity,
      viewportWidthPx: -100,
      marginsPx: { top: NaN, left: Infinity, right: -50 },
    })
    for (const v of [
      ctx.pageWidthDxa,
      ctx.pageHeightDxa,
      ctx.contentDxa,
      ctx.pageMargins.top,
      ctx.pageMargins.left,
      ctx.pageMargins.right,
      ctx.measurementScale,
    ]) {
      expect(Number.isFinite(v)).toBe(true)
    }
    expect(ctx.pxToTwips(NaN)).toBe(0)
    expect(ctx.pxToTwips(10)).toBeGreaterThan(0)
  })

  it('falls back to A4 for a zero page size (display:none root)', () => {
    const ctx = createRenderContext({ pageSizePx: { width: 0, height: 0 } })
    expect(ctx.pageWidthDxa).toBe(794 * 15)
    expect(ctx.pageHeightDxa).toBe(1123 * 15)
  })

  it('floors the content width when the horizontal margins overrun the page', () => {
    // each margin is clamped on its own, but two healthy ones can still add up
    // past the page: the negative width then scales every floating image to a
    // negative extent, which Word reports as a corrupt file
    const ctx = createRenderContext({ marginsPx: { left: 700, right: 700 } })
    expect(ctx.contentDxa).toBeGreaterThan(0)
  })
})

describe('createRenderContext page margin floor', () => {
  // the HTML editor's Word export: a flowed web page has no print margins of
  // its own, and the extractor's 24px floor put text 0.6cm from the paper edge
  it('raises a flowed page to the floor and keeps the content scale', () => {
    const settings = {
      pageSizePx: { width: 794, height: 1123 },
      viewportWidthPx: 794,
      marginsPx: { top: 24, bottom: 24, left: 24, right: 24 },
    }
    const plain = createRenderContext(settings)
    const floored = createRenderContext(settings, { minPageMarginPx: 96 })
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      expect(floored.pageMargins[side]).toBeGreaterThanOrEqual(1440 - 2)
    }
    // the body measured at 794 - 48 px must now fit the narrower column:
    // content shrinks with the column instead of running past the margin
    expect(floored.contentDxa).toBeLessThan(plain.contentDxa)
    expect(floored.measurementScale).toBeLessThan(plain.measurementScale)
    const bodyPx = 794 - 48
    expect(floored.pxToTwips(bodyPx)).toBeLessThanOrEqual(floored.contentDxa + 2)
  })

  it('leaves wider authored margins and composed pages as they are', () => {
    const wide = createRenderContext(
      { viewportWidthPx: 794, marginsPx: { top: 150, bottom: 150, left: 150, right: 150 } },
      { minPageMarginPx: 96 },
    )
    expect(wide.pageMargins.left).toBe(Math.round(150 * 15 * wide.measurementScale))
    const composed = createRenderContext(
      { composed: true, viewportWidthPx: 794, marginsPx: { top: 0, bottom: 0, left: 0, right: 0 } },
      { minPageMarginPx: 96 },
    )
    expect(composed.pageMargins.left).toBe(0)
    expect(composed.pageMargins.top).toBe(0)
  })
})
