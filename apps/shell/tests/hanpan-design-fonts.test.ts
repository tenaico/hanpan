// The design board's font list offers every font the installer ships (a design looks the
// same on every PC and in every export), then the fonts installed on this PC.
import { describe, expect, it, vi } from 'vitest'
import { TEMPLATE_FONTS, TEMPLATE_FONT_FAMILY_NAMES } from '@genoffice/ui/template-fonts'
import {
  BUNDLED_FONTS,
  GONGU_FONTS,
  SYSTEM_FONTS,
  isDisplayFont,
  pcFontChoices,
  readPcFontsOnFirstGesture,
} from '../src/renderer/src/design/fonts'
import { FONTS } from '../src/renderer/src/design/model'

const shipped = [...BUNDLED_FONTS, ...GONGU_FONTS]

describe('design board fonts', () => {
  it('lists only shipped families in the bundled and Gongu groups, each once', () => {
    for (const f of shipped) expect(TEMPLATE_FONT_FAMILY_NAMES, f.family).toContain(f.family)
    expect(new Set(shipped.map((f) => f.family)).size).toBe(shipped.length)
  })

  it('offers every shipped family', () => {
    expect(shipped.map((f) => f.family).sort()).toEqual([...TEMPLATE_FONT_FAMILY_NAMES].sort())
  })

  it('puts the families taken from Gongu in their own group', () => {
    const gongu = TEMPLATE_FONTS.filter(
      (f) => f.license === 'KOGL-Type1' || f.sourceUrl.includes('gongu.copyright.or.kr'),
    ).map((f) => f.family)
    expect(gongu.length).toBeGreaterThan(0)
    for (const family of gongu) expect(GONGU_FONTS.map((f) => f.family)).toContain(family)
  })

  it('keeps bold off a one-file family, where it could only be smeared on', () => {
    for (const f of TEMPLATE_FONTS.filter((x) => x.script === 'korean' && x.faces.length === 1)) {
      if (GONGU_FONTS.some((g) => g.family === f.family))
        expect(isDisplayFont(f.family), f.family).toBe(true)
    }
    expect(isDisplayFont('Noto Sans KR')).toBe(false)
  })

  it('keeps every list in the picker order: bundled, Gongu, then the PC', () => {
    expect(FONTS).toEqual([...BUNDLED_FONTS, ...GONGU_FONTS, ...SYSTEM_FONTS].map((f) => f.family))
  })
})

// 0.17 item 10: every font installed on the PC, besides the bundled ones
describe('fonts on this PC', () => {
  const info = new Map([
    ['Malgun Gothic', { ko: '맑은 고딕', hangul: true }],
    ['Batang', { ko: '바탕', hangul: true }],
    ['NanumSquare', { hangul: true }],
    ['Arial', { hangul: false }],
  ])

  it('lists each installed family once, Hangul fonts first, under their Korean names', () => {
    const list = pcFontChoices(
      ['Arial', 'Batang', 'Malgun Gothic', 'NanumSquare', 'Arial', 'Consolas'],
      info,
    )
    expect(list.map((f) => f.label)).toEqual([
      '맑은 고딕',
      '바탕',
      'NanumSquare',
      'Arial',
      'Consolas',
    ])
    expect(new Set(list.map((f) => f.family)).size).toBe(list.length)
  })

  it('keeps the name a design already stores for a font the fixed list had', () => {
    // older designs keep "맑은 고딕"; the picker must still show it as chosen
    expect(SYSTEM_FONTS.map((f) => f.family)).toContain('맑은 고딕')
    const malgun = pcFontChoices(['Malgun Gothic'], info)[0]
    expect(malgun).toEqual({ family: '맑은 고딕', label: '맑은 고딕' })
    expect(pcFontChoices(['Batang'], info)[0]).toEqual({ family: 'Batang', label: '바탕' })
  })

  it('leaves out the bundled families and the vertical-writing twins', () => {
    const list = pcFontChoices(['Pretendard', 'Noto Sans KR', '@Malgun Gothic', 'Arial'], info)
    expect(list.map((f) => f.family)).toEqual(['Arial'])
  })

  it('works without the Korean names (the main process gave none)', () => {
    expect(pcFontChoices(['Gulim', 'Arial'], new Map()).map((f) => f.label)).toEqual([
      'Arial',
      'Gulim',
    ])
  })
})

// 점검 v2 hwp-design #17: the list was read only when the font box itself was pressed, so
// the box that opened still showed the 7 fixed fonts. The board now reads the installed
// fonts at the first press or key anywhere (the API wants a user gesture), once.
describe('reading the PC fonts early', () => {
  it('reads at the first press or key anywhere, once, and stops listening', () => {
    const target = new EventTarget()
    const read = vi.fn()
    const stop = readPcFontsOnFirstGesture(target, read)
    expect(read).not.toHaveBeenCalled()
    target.dispatchEvent(new Event('pointerdown'))
    target.dispatchEvent(new Event('keydown'))
    target.dispatchEvent(new Event('pointerdown'))
    expect(read).toHaveBeenCalledTimes(1)
    stop()
  })

  it('a key works as the gesture too, and stop() before any leaves it unread', () => {
    const target = new EventTarget()
    const read = vi.fn()
    readPcFontsOnFirstGesture(target, read)
    target.dispatchEvent(new Event('keydown'))
    expect(read).toHaveBeenCalledTimes(1)
    const other = new EventTarget()
    const never = vi.fn()
    readPcFontsOnFirstGesture(other, never)()
    other.dispatchEvent(new Event('pointerdown'))
    expect(never).not.toHaveBeenCalled()
  })
})
