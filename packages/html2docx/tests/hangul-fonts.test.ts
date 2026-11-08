import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'

import { generateDocx } from '../src/generate'
import { mapFont, runFont } from '../src/generate/fonts'

/**
 * 한글 글꼴 이름(한글 문서를 Word로 내보낼 때의 함초롬바탕·함초롬돋움·HY헤드라인M 등)은
 * 그 이름 그대로 모든 글꼴 칸(ascii·hAnsi·eastAsia·cs)에 쓴다. 영문 칸을 Times New Roman이나
 * Arial로 바꾸면 숫자·영문이 원본과 다른 글꼴로 나오고, Word의 글꼴 칸에도 그 이름이 보인다.
 */
describe('Hangul-named fonts', () => {
  it('keep their own name in every slot', () => {
    for (const name of ['함초롬바탕', '함초롬돋움', 'HY헤드라인M', '나눔명조']) {
      expect(runFont(`'${name}'`, false, '2026년 2학기')).toEqual({
        ascii: name,
        hAnsi: name,
        eastAsia: name,
        cs: name,
      })
      expect(mapFont(`"${name}", serif`, false, 'abc')).toBe(name)
    }
  })

  it('leave the Windows faces and monospace as they were mapped', () => {
    expect(mapFont("'맑은 고딕'", false, '가')).toBe('Malgun Gothic')
    expect(mapFont("'바탕'", false, '가')).toBe('Batang')
    expect(mapFont("'함초롬바탕'", true, '가')).toBe('Consolas')
  })

  it('go into the docx as written, symbols included, with no CJK/digit auto spacing', async () => {
    const run = (text: string, extra = {}) => ({ text, fontFamily: "'함초롬바탕'", ...extra })
    const buffer = await generateDocx(
      [
        { type: 'para', runs: [run('2026 학년도 2학기 교수학습')] },
        { type: 'para', runs: [run('○○○', { symbol: true }), run(' (서명)')] },
      ],
      {},
    )
    const zip = await JSZip.loadAsync(buffer)
    const doc = (await zip.file('word/document.xml')?.async('string')) ?? ''
    const fonts = [...doc.matchAll(/<w:rFonts [^>]*\/>/g)].map((m) => m[0])
    expect(fonts.length).toBeGreaterThan(0)
    for (const tag of fonts) {
      expect(tag).toContain('w:ascii="함초롬바탕"')
      expect(tag).toContain('w:eastAsia="함초롬바탕"')
    }
    expect(doc).not.toContain('Arial Unicode MS')
    expect(doc).not.toContain('Times New Roman')
    // Word puts a gap between Hangul and digits ("2 학기") unless told not to; a browser
    // and Hangul do not
    const styles = (await zip.file('word/styles.xml')?.async('string')) ?? ''
    const defaults = /<w:docDefaults>[\s\S]*<\/w:docDefaults>/.exec(styles)?.[0] ?? ''
    expect(defaults).toMatch(/<w:autoSpaceDN w:val="(false|0)"\/>/)
  })
})
