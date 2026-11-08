// New Word documents start in Malgun Gothic (맑은 고딕) under a Korean UI,
// like Korean Word, instead of Calibri (Hanpan 0.17 #9). Other languages keep
// Calibri. When the face is not installed the renderer's Korean sans chain
// (Malgun Gothic → GenOffice Sans KR → …) draws it.
import { describe, expect, it } from 'vitest'
import { buildBlankDocx, parseDocx } from '@genoffice/docx-engine'
import { blankDocxFontsFor } from '../src/renderer/font-list'
import { docBodyFont } from '../src/renderer/doc-style-css'

async function bodyFontFor(lang: Parameters<typeof blankDocxFontsFor>[0]) {
  const parsed = await parseDocx(await buildBlankDocx(blankDocxFontsFor(lang)))
  return { parsed, body: docBodyFont(parsed) }
}

describe('default font of a new document', () => {
  it('is Malgun Gothic for every script slot under a Korean UI', async () => {
    const { parsed, body } = await bodyFontFor('ko')
    expect(body).toBe('Malgun Gothic')
    expect(parsed.docDefaults?.asciiFont).toBe('Malgun Gothic')
    expect(parsed.docDefaults?.eastAsiaFont).toBe('Malgun Gothic')
  })

  it('stays Calibri for English and Japanese', async () => {
    expect((await bodyFontFor('en')).body).toBe('Calibri')
    const ja = await bodyFontFor('ja')
    expect(ja.body).toBe('Calibri')
    expect(ja.parsed.docDefaults?.eastAsiaFont).toBe('Yu Mincho')
  })
})

describe('Malgun Gothic without the installed face', () => {
  it('falls back through the bundled Korean sans', async () => {
    const { cssFontFamily } = await import('../src/renderer/line-metrics')
    const chain = cssFontFamily('Malgun Gothic')
    expect(chain).toContain('Malgun Gothic')
    expect(chain).toContain('GenOffice Sans KR')
  })
})

describe('font box display name (0.17 review #11)', () => {
  it('shows the Korean family name in a Korean UI', async () => {
    const { fontBoxDisplayName } = await import('../src/renderer/font-list')
    expect(fontBoxDisplayName('Malgun Gothic', 'ko')).toBe('맑은 고딕')
    expect(fontBoxDisplayName('Batang', 'ko')).toBe('바탕')
    // the font's own Korean name, read from its name table, wins
    expect(
      fontBoxDisplayName(
        'NanumGothic',
        'ko',
        new Map([['NanumGothic', { ko: '나눔고딕', hangul: true }]]),
      ),
    ).toBe('나눔고딕')
    expect(fontBoxDisplayName('Calibri', 'ko')).toBe('Calibri')
    expect(fontBoxDisplayName('Malgun Gothic', 'en')).toBe('Malgun Gothic')
  })
})
