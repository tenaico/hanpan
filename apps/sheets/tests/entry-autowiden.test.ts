/**
 * X9: typing a date (2026-11-07) into a default-width column showed ########.
 * Excel widens the column to fit a number or date the user just entered,
 * unless the column's width was set by hand.
 */
import { describe, expect, it } from 'vitest'

import { canAutoWidenColumn, isHashedDisplay, widthToShow } from '../src/renderer/entry-autowiden'
import { overflowHashes } from '../src/renderer/numfmt-fix'

// 7px per character, like an 11pt digit
const measure = (text: string): number => text.length * 7

describe('widthToShow', () => {
  it('gives a width at which the value no longer turns into ####', () => {
    const display = '2026-11-07'
    // a default 64px column hashes it
    expect(overflowHashes(display, 64, measure, 1, true)).not.toBeNull()
    const width = widthToShow(display, measure, 1)
    expect(width).toBeGreaterThan(64)
    expect(overflowHashes(display, width, measure, 1, true)).toBeNull()
    expect(overflowHashes(display, width, measure, 1, false)).toBeNull()
  })

  it('follows the Excel width scale of the font', () => {
    const display = '₩1,234,567,890'
    const width = widthToShow(display, measure, 1.1)
    expect(overflowHashes(display, width, measure, 1.1, true)).toBeNull()
  })
})

describe('canAutoWidenColumn', () => {
  it('widens columns at the sheet default width', () => {
    expect(canAutoWidenColumn(undefined, new Map(), 0)).toBe(true)
    expect(canAutoWidenColumn({}, new Map(), 0)).toBe(true)
  })
  it('leaves a column whose width was set by hand or by the file', () => {
    expect(canAutoWidenColumn({ w: 120 }, new Map(), 0)).toBe(false)
  })
  it('keeps widening a column it widened itself, until the user resizes it', () => {
    const widened = new Map([[3, 90]])
    expect(canAutoWidenColumn({ w: 90 }, widened, 3)).toBe(true)
    expect(canAutoWidenColumn({ w: 90 }, widened, 4)).toBe(false)
    // dragged to another width afterwards: the user's width now
    expect(canAutoWidenColumn({ w: 140 }, widened, 3)).toBe(false)
  })
})

describe('isHashedDisplay', () => {
  it('spots the #### fill of a too-narrow number', () => {
    expect(isHashedDisplay('########')).toBe(true)
    expect(isHashedDisplay('#')).toBe(true)
    expect(isHashedDisplay('#REF!')).toBe(false)
    expect(isHashedDisplay('2026-11-07')).toBe(false)
    expect(isHashedDisplay(12)).toBe(false)
  })
})
