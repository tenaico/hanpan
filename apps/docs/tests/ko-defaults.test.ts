// 0.17 v2 #28: a Korean UI starts from Korean office defaults — A4 at the top of
// the Size gallery, no "Office 2003" margins, no English legal list styles, no
// English-only watermark presets
import { describe, expect, it } from 'vitest'
import { marginPresetsFor, paperSizesFor } from '../src/renderer/components/ribbon-layout-tab'
import { multilevelLibraryFor } from '../src/renderer/list-presets'
import { watermarkPresetTextsFor } from '../src/renderer/components/ribbon-design-tab'

describe('Korean defaults', () => {
  it('lists A4 first for ko, Letter first for en', () => {
    expect(paperSizesFor('ko')[0]!.key).toBe('a4')
    expect(paperSizesFor('en')[0]!.key).toBe('letter')
    expect(paperSizesFor('ko')).toHaveLength(paperSizesFor('en').length)
  })

  it('drops the Office 2003 margins for ko', () => {
    expect(marginPresetsFor('ko').some((m) => m.key === 'office2003')).toBe(false)
    expect(marginPresetsFor('en').some((m) => m.key === 'office2003')).toBe(true)
  })

  it('drops Article/Section and Chapter list styles for ko and adds the official-document one', () => {
    const texts = (lang: string) => multilevelLibraryFor(lang).map((levels) => levels[0]!.lvlText)
    expect(texts('ko').some((x) => /Article|Chapter/.test(x))).toBe(false)
    expect(texts('en').some((x) => /Article/.test(x))).toBe(true)
    expect(multilevelLibraryFor('ko').some((levels) => levels[1]!.numFmt === 'ganada')).toBe(true)
  })

  it('adds no English watermark presets for ko', () => {
    expect(watermarkPresetTextsFor('ko')).toEqual([])
    expect(watermarkPresetTextsFor('zh')).toEqual(['CONFIDENTIAL', 'DRAFT'])
  })
})
