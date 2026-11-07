import { describe, expect, it } from 'vitest'
import { MARKUP_AREA_W, markupWidthFor } from '../src/renderer/editor/margin-annotations'

describe('markupWidthFor', () => {
  it('keeps the full balloon column when nothing overflows', () => {
    expect(markupWidthFor(0)).toBe(MARKUP_AREA_W)
  })
  it('narrows the column by the sideways overflow (1366 + AI panel: 51px)', () => {
    expect(markupWidthFor(51)).toBe(MARKUP_AREA_W - 51)
  })
  it('never goes below the minimum', () => {
    expect(markupWidthFor(500)).toBe(120)
  })
})
