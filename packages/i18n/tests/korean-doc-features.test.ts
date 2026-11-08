import { describe, expect, it } from 'vitest'
import { koreanDocFeaturesOn } from '../src/index'

describe('koreanDocFeaturesOn', () => {
  it.each([
    [null, 'ko', true],
    [null, 'vi', false],
    [null, 'en', false],
    [true, 'en', true],
    [false, 'ko', false],
  ] as const)('stored %s on %s → %s', (stored, lang, on) =>
    expect(koreanDocFeaturesOn(stored, lang)).toBe(on),
  )
})
