import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import type { DocBlock } from '../src/blocks'
import { GONGMUN_THEME } from '../src/doc-theme'
import { blocksToDocx } from '../src/docx-writer'
import { blocksToHtml } from '../src/html-writer'

/** 0.19.2: what the trend briefing showed in Word (a chapter without a label, a table, a headline) */
const xmlOf = async (blocks: DocBlock[]) =>
  (await JSZip.loadAsync(await blocksToDocx(blocks, GONGMUN_THEME)))
    .file('word/document.xml')!
    .async('string')

describe('the Word writer', () => {
  it('starts a chapter without a label at its text, not at a space', async () => {
    const xml = await xmlOf([{ kind: 'chapter', label: '', text: '현황' }])
    expect(xml).toContain('>현황</w:t>')
    expect(xml).not.toContain('> 현황</w:t>')
  })

  it('shares the table width by how much each column holds', async () => {
    const xml = await xmlOf([
      {
        kind: 'table',
        header: true,
        rows: [
          ['분야', '날씨', '한 줄'],
          [
            '반도체',
            '맑음',
            '삼성전자와 SK하이닉스가 3분기 사상 최대 실적을 확정했고 D램 가격도 올랐습니다',
          ],
        ],
      },
    ])
    const widths = [...xml.matchAll(/<w:gridCol w:w="(\d+)"/g)].map((m) => Number(m[1]))
    expect(widths).toHaveLength(3)
    expect(widths[2]!).toBeGreaterThan(widths[0]! * 2)
    expect(widths[2]!).toBeGreaterThan(widths[1]! * 2)
  })

  it('writes a bold paragraph bold', async () => {
    const xml = await xmlOf([
      { kind: 'para', depth: 0, role: 'lead', text: '헤드라인', bold: true },
    ])
    const run = xml.slice(
      xml.lastIndexOf('<w:r>', xml.indexOf('헤드라인')),
      xml.indexOf('헤드라인'),
    )
    expect(run).toMatch(/<w:b\/>|<w:b w:val="true"\/>/)
  })
})

describe('the HTML writer', () => {
  it('writes a bold paragraph bold', () => {
    const html = blocksToHtml(
      [{ kind: 'para', depth: 0, role: 'lead', text: '헤드라인', bold: true }],
      GONGMUN_THEME,
    )
    expect(html).toMatch(/font-weight:700[^>]*>헤드라인/)
  })
})

const LINKED: DocBlock = {
  kind: 'item',
  depth: 0,
  marker: '[1]',
  text: '제목 — 연합뉴스, 2026-11-09',
  href: 'https://news.google.com/rss/articles/x?a=1&b=2',
}

describe('item links', () => {
  it('makes an item with an https link a Word hyperlink, the marker outside it', async () => {
    const zip = await JSZip.loadAsync(await blocksToDocx([LINKED], GONGMUN_THEME))
    const xml = await zip.file('word/document.xml')!.async('string')
    expect(xml).toContain('<w:hyperlink')
    expect(xml).toContain('<w:rStyle w:val="Hyperlink"/>')
    // the style the link names is defined, so Word shows it as a link
    expect(await zip.file('word/styles.xml')!.async('string')).toContain('w:styleId="Hyperlink"')
    expect(xml).toMatch(/>\[1\] <\/w:t><\/w:r><w:hyperlink/)
    expect(await zip.file('word/_rels/document.xml.rels')!.async('string')).toContain(
      'Target="https://news.google.com/rss/articles/x?a=1&amp;b=2" TargetMode="External"',
    )
  })

  it('links an item in the page the PDF prints, escaping the address', () => {
    expect(blocksToHtml([LINKED], GONGMUN_THEME)).toContain(
      '<a href="https://news.google.com/rss/articles/x?a=1&amp;b=2">제목 — 연합뉴스, 2026-11-09</a>',
    )
  })

  it('ignores a link that is not https', async () => {
    const bad: DocBlock = { ...LINKED, href: 'javascript:alert(1)' } as DocBlock
    expect(blocksToHtml([bad], GONGMUN_THEME)).not.toContain('<a ')
    expect(await xmlOf([bad])).not.toContain('w:hyperlink')
  })
})
