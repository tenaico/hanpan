import { describe, expect, it } from 'vitest'
import { isSelectionDrag, selectionAskPosition } from '../src/renderer/ai/selection-ask'

const viewport = { left: 100, top: 50, right: 900, bottom: 650 }

describe('selection Ask AI gesture', () => {
  it('ignores click jitter and accepts a deliberate drag', () => {
    expect(isSelectionDrag({ x: 20, y: 20 }, { x: 22, y: 21 })).toBe(false)
    expect(isSelectionDrag({ x: 20, y: 20 }, { x: 24, y: 20 })).toBe(true)
  })

  it('places the trigger after the drag endpoint when there is room', () => {
    expect(selectionAskPosition({ x: 300, y: 200 }, viewport, 92, 32)).toEqual({
      left: 308,
      top: 208,
    })
  })

  it('flips and clamps the trigger at the grid edges', () => {
    expect(selectionAskPosition({ x: 895, y: 645 }, viewport, 92, 32)).toEqual({
      left: 795,
      top: 605,
    })
  })

  it('uses the measured localized-label width when clamping', () => {
    const position = selectionAskPosition({ x: 895, y: 200 }, viewport, 220, 32)
    expect(position.left).toBe(667)
    expect(position.left + 220).toBeLessThanOrEqual(viewport.right - 4)
  })
})

describe('X8: the trigger sits beside the selection, not on the cells under it', () => {
  it('goes to the right of the selection, level with its top row', () => {
    const selection = { left: 200, top: 120, right: 400, bottom: 260 }
    // the drag ended at the bottom-right cell; the old rule put the trigger on the row below
    expect(selectionAskPosition({ x: 390, y: 250 }, viewport, 92, 32, 8, selection)).toEqual({
      left: 408,
      top: 120,
    })
  })

  it('goes above the selection when there is no room to the right', () => {
    const selection = { left: 600, top: 300, right: 880, bottom: 400 }
    expect(selectionAskPosition({ x: 870, y: 390 }, viewport, 92, 32, 8, selection)).toEqual({
      left: 788,
      top: 260,
    })
  })
})
