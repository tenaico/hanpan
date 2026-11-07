/**
 * The slide styles of "send this map to PowerPoint" are named by what they look
 * like, not after real people or companies: the app is handed out for free and
 * used commercially, so a style name must not borrow a person's or a brand's name.
 */
import { describe, expect, it } from 'vitest'
import { SLIDE_STYLES } from '../src/slide-styles'

const BORROWED = [
  /잡스|jobs/i,
  /맥킨지|mckinsey/i,
  /토스|toss/i,
  /bcg/i,
  /\bted\b|테드/i,
  /구글|google|머티리얼|material/i,
  /노션|notion/i,
  /에어비앤비|airbnb/i,
  /캔바|canva/i,
]

describe('slide style names', () => {
  it('borrow no person or company name, in Korean or English', () => {
    for (const style of SLIDE_STYLES) {
      for (const text of [
        style.name.ko,
        style.name.en,
        style.description.ko,
        style.description.en,
      ]) {
        for (const pattern of BORROWED) expect(text, `${style.id}: ${text}`).not.toMatch(pattern)
      }
    }
  })

  it('keeps all ten styles under their ids, each with its own name', () => {
    expect(SLIDE_STYLES.map((s) => s.id)).toEqual([
      'jobs',
      'mckinsey',
      'toss',
      'bcg',
      'ted',
      'material',
      'notion',
      'airbnb',
      'canva',
      'pitch',
    ])
    expect(new Set(SLIDE_STYLES.map((s) => s.name.ko)).size).toBe(10)
    expect(new Set(SLIDE_STYLES.map((s) => s.name.en)).size).toBe(10)
  })
})
