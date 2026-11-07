import { describe, it, expect } from 'vitest'
import { openPptx, savePptx, createBlankPptx, addElement, duplicateSlide } from '../src/index'
import { parseTheme, resolveFontRef } from '../src/theme'

describe('createBlankPptx', () => {
  it('opens as a 16:9 single blank slide', async () => {
    const opened = await openPptx(await createBlankPptx())
    expect(opened.deck.slides.length).toBe(1)
    expect(opened.deck.size).toEqual({ cx: 12192000, cy: 6858000 })
    expect(opened.deck.slides[0]!.elements.length).toBe(0)
  })

  it('theme default fonts: Calibri latin + empty ea carried by per-script entries', async () => {
    const opened = await openPptx(await createBlankPptx())
    const theme = opened.archive.readText('ppt/theme/theme1.xml')!
    expect(theme).toContain('<a:latin typeface="Calibri"/>')
    expect(theme.match(/<a:ea typeface=""\/>/g)?.length).toBe(2)
    // the per-script faces PowerPoint's own blank Office theme ships: Jpan/Hang/Hans/Hant
    expect(theme.match(/<a:font script=/g)?.length).toBe(8)
  })

  it('a theme ea ref resolves per script instead of a Windows-only pin', async () => {
    const opened = await openPptx(await createBlankPptx())
    const theme = parseTheme(opened.archive.readText('ppt/theme/theme1.xml')!)
    expect(theme.majorEaFont).toBeUndefined()
    expect(theme.minorEaFont).toBeUndefined()
    expect(resolveFontRef('+mj-ea', theme, 'sc')).toBe('\u7b49\u7ebf')
    expect(resolveFontRef('+mj-ea', theme, 'tc')).toBe('\u65b0\u7d30\u660e\u9ad4')
    expect(resolveFontRef('+mj-ea', theme, 'ja')).toBe('ＭＳ ゴシック')
    expect(resolveFontRef('+mj-ea', theme, 'ko')).toBe('맑은 고딕')
    expect(resolveFontRef('+mn-ea', theme, 'ja')).toBe('ＭＳ Ｐゴシック')
    expect(resolveFontRef('+mn-ea', theme, 'sc')).toBe('\u7b49\u7ebf')
  })

  it('supports the full edit pipeline: add element + add slide + save round-trip', async () => {
    const opened = await openPptx(await createBlankPptx())
    addElement(opened.deck.slides[0]!, {
      kind: 'textbox',
      offset: { x: 914400, y: 914400, cx: 6096000, cy: 914400 },
      paragraphs: [{ runs: [{ text: 'Generated Title', bold: true, fontSize: 40 }] }],
    })
    duplicateSlide(opened, 0, { clearText: true })

    const reopened = await openPptx(await savePptx(opened))
    expect(reopened.deck.slides.length).toBe(2)
    const texts = reopened.deck.slides[0]!.elements.flatMap((e: any) => e.text?.paragraphs ?? [])
      .flatMap((p: any) => p.runs)
      .map((r: any) => r.text)
      .join('')
    expect(texts).toBe('Generated Title')
  })
})

describe('createBlankPptx language defaults (Hanpan 0.17 #11)', () => {
  const latin = (theme: string, which: 'major' | 'minor') =>
    new RegExp(`<a:${which}Font><a:latin typeface="([^"]*)"`).exec(theme)?.[1]

  it('a Korean deck starts in 맑은 고딕, a Vietnamese one in Arial, others keep Calibri', async () => {
    for (const [lang, major, minor] of [
      ['ko', '맑은 고딕', '맑은 고딕'],
      ['vi', 'Arial', 'Arial'],
      ['en', 'Calibri Light', 'Calibri'],
      ['ja', 'Calibri Light', 'Calibri'],
    ] as const) {
      const opened = await openPptx(await createBlankPptx({ lang }))
      const theme = opened.archive.readText('ppt/theme/theme1.xml')!
      expect([lang, latin(theme, 'major'), latin(theme, 'minor')]).toEqual([lang, major, minor])
    }
  })
})

describe('createBlankPptx title slide (Hanpan 0.17 #17)', () => {
  it('starts with empty title and subtitle placeholders when asked', async () => {
    const opened = await openPptx(await createBlankPptx({ titleSlide: true }))
    const slide = opened.deck.slides[0]!
    const phs = slide.elements.map((e: any) => e.placeholder?.type ?? e.placeholder)
    expect(phs).toEqual(['ctrTitle', 'subTitle'])
    const reopened = await openPptx(await savePptx(opened))
    expect(reopened.deck.slides[0]!.elements.length).toBe(2)
  })

  it('keeps the plain blank deck by default (pipelines build on an empty first slide)', async () => {
    const opened = await openPptx(await createBlankPptx())
    expect(opened.deck.slides[0]!.elements.length).toBe(0)
  })
})

describe('createBlankPptx title slide text styles', () => {
  it('the master carries PowerPoint-like title/body styles in the theme fonts', async () => {
    const opened = await openPptx(await createBlankPptx({ titleSlide: true, lang: 'ko' }))
    const master = opened.archive.readText('ppt/slideMasters/slideMaster1.xml')!
    expect(master).toMatch(/<p:titleStyle><a:lvl1pPr[^>]*><a:defRPr sz="4400"[^>]*>.*\+mj-lt/)
    expect(master).toMatch(/<p:bodyStyle><a:lvl1pPr[^>]*>.*<a:defRPr sz="2400"[^>]*>.*\+mn-lt/)
  })
})

describe('createBlankPptx title slide typing defaults', () => {
  it('the empty title carries a paragraph mark that resolves to the title style', async () => {
    const opened = await openPptx(await createBlankPptx({ titleSlide: true, lang: 'ko' }))
    const title = opened.deck.slides[0]!.elements[0] as any
    const mark = title.text.paragraphs[0].runs[0]
    expect(mark?.paraMark).toBe(true)
    expect(mark.fontSize).toBe(60)
  })
})
