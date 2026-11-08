import { describe, expect, it } from 'vitest'
import { revisionDateLabel } from '../src/renderer/editor/revision-date'

describe('revisionDateLabel', () => {
  it('shows the local calendar day, not the UTC day', () => {
    // 02:30 in Seoul is 17:30 the day before in UTC
    const utc = '2026-11-06T17:30:00Z'
    const local = new Date(utc)
    const expected = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
    expect(revisionDateLabel(utc)).toBe(expected)
  })

  it('reads a zone-less Word date as local time', () => {
    expect(revisionDateLabel('2026-11-07T02:30:00')).toBe('2026-11-07')
  })

  it('falls back to the raw prefix for an unparsable date', () => {
    expect(revisionDateLabel('garbage-date')).toBe('garbage-da')
    expect(revisionDateLabel(null)).toBe('')
  })
})
