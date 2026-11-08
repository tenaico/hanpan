/**
 * 다른 앱으로 보내기: 원본 → Markdown → 대상 문서의 변환 왕복.
 * 실제 파일 엔진(docx 작성기, 슬라이드 엔진, 마인드맵 엔진, rhwp)으로 만들고 다시 읽는다.
 */
import { describe, expect, it } from 'vitest'
import { openPptx } from '@genoffice/pptx-engine'
import { docxToText, hwpToText, xlsxToText } from '@genoffice/file-parse'
import {
  createXmindDocumentFromOutline,
  noteText,
  openXmind,
  sheetsToOutline,
  type XmindTopic,
} from '@genoffice/xmind-engine'
import { loadEngine } from '../../../../packages/hanpan-core/tests/engine'
import { buildXlsxFixture } from '../../../../packages/file-parse/tests/helpers/fixtures'
import {
  deckToMarkdown,
  docxTextToMarkdown,
  htmlToMarkdown,
  mapOutlineToMarkdown,
  plainTextToMarkdown,
  sheetTextToMarkdown,
} from '../../src/main/send-to-app/to-markdown'
import {
  buildTargetDocument,
  markdownToMapOutline,
  markdownToSlides,
  normalizeMarkdown,
} from '../../src/main/send-to-app/from-markdown'

const REPORT = `# 2027 사업 계획

올해 계획을 정리한다.

## 추진 배경

- 시장이 커졌다
  - 작년보다 20% 성장
- 경쟁사가 늘었다

## 예산

| 항목 | 금액 |
|---|---|
| 인건비 | 3억 |
| 장비 | 1억 |

## 일정

1. 1분기 준비
2. 2분기 출시
`

const opts = (extra: Partial<Parameters<typeof buildTargetDocument>[2]> = {}) => ({
  title: '사업 계획',
  untitled: '제목 없음',
  korean: true,
  loadHwpEngine: loadEngine,
  ...extra,
})

describe('Markdown → 파워포인트 (H1/H2마다 슬라이드)', () => {
  it('makes a title slide and one slide per H2 with bullets at their levels', () => {
    const slides = markdownToSlides(REPORT, '사업 계획')
    expect(slides.map((s) => s.title)).toEqual(['2027 사업 계획', '추진 배경', '예산', '일정'])
    expect(slides[0]!.paragraphs).toEqual([{ text: '올해 계획을 정리한다.' }])
    expect(slides[1]!.paragraphs).toEqual([
      { text: '시장이 커졌다', bullet: 'char' },
      { text: '작년보다 20% 성장', bullet: 'char', level: 1 },
      { text: '경쟁사가 늘었다', bullet: 'char' },
    ])
    expect(slides[2]!.paragraphs.map((p) => p.text)).toEqual([
      '항목 · 금액',
      '인건비 · 3억',
      '장비 · 1억',
    ])
    expect(slides[3]!.paragraphs).toEqual([
      { text: '1분기 준비', bullet: 'number' },
      { text: '2분기 출시', bullet: 'number' },
    ])
  })

  it('carries a long section over to a continued slide instead of overflowing', () => {
    const items = Array.from({ length: 20 }, (_, i) => `- 항목 ${i + 1}`).join('\n')
    const slides = markdownToSlides(`## 긴 목록\n\n${items}\n`, '목록')
    expect(slides.map((s) => s.title)).toEqual(['긴 목록', '긴 목록 (2)', '긴 목록 (3)'])
    expect(slides.flatMap((s) => s.paragraphs)).toHaveLength(20)
  })

  it('splits text without headings into slides under the document title', () => {
    const slides = markdownToSlides('첫 문단\n\n둘째 문단\n', '메모')
    expect(slides).toEqual([
      { title: '메모', paragraphs: [{ text: '첫 문단' }, { text: '둘째 문단' }] },
    ])
  })

  it('round-trips through a real deck: pptx → Markdown keeps titles and bullet levels', async () => {
    const built = await buildTargetDocument(REPORT, 'slides', opts())
    expect(built.editor).toBe('slides')
    expect(built.fileName).toBe('사업 계획.pptx')
    const opened = await openPptx(built.bytes)
    expect(opened.deck.slides).toHaveLength(4)
    const back = deckToMarkdown(opened.deck)
    expect(back).toContain('## 추진 배경')
    expect(back).toContain('- 시장이 커졌다\n  - 작년보다 20% 성장')
    expect(back).toContain('1. 1분기 준비')
    // and back to slides again: the same four titles
    expect(markdownToSlides(back, 'x').map((s) => s.title)).toEqual([
      '2027 사업 계획',
      '추진 배경',
      '예산',
      '일정',
    ])
  })
})

describe('Markdown → 워드 / 한글 / 웹 문서 / 마크다운', () => {
  it('writes a Word document whose headings, items and table read back', async () => {
    const built = await buildTargetDocument(REPORT, 'docs', opts())
    expect(built).toMatchObject({ editor: 'docs', fileName: '사업 계획.docx' })
    const text = await docxToText(built.bytes)
    expect(text).toContain('2027 사업 계획')
    expect(text).toContain('추진 배경')
    expect(text).toContain('작년보다 20% 성장')
    expect(text).toContain('인건비 | 3억')
    // and back to Markdown: the table is a real table again
    expect(docxTextToMarkdown(text)).toMatch(/\| 인건비 \| 3억 \|/)
  })

  it('writes plain bullets, not the Korean report symbols, when the Korean features are off', async () => {
    const built = await buildTargetDocument(REPORT, 'docs', opts({ korean: false }))
    const text = await docxToText(built.bytes)
    expect(text).not.toMatch(/[□○]/)
  })

  it('writes an HWPX the HWP engine opens', async () => {
    const built = await buildTargetDocument(REPORT, 'hwp', opts())
    expect(built).toMatchObject({ editor: 'hwp', fileName: '사업 계획.hwpx' })
    const text = await hwpToText(built.bytes)
    expect(text).toContain('추진 배경')
    expect(text).toContain('인건비')
  })

  it('writes a web page with a real table', async () => {
    const built = await buildTargetDocument(REPORT, 'html', opts())
    const html = new TextDecoder().decode(built.bytes)
    expect(built.fileName).toBe('사업 계획.html')
    expect(html).toContain('<table')
    expect(html).toContain('추진 배경')
    expect(htmlToMarkdown(html)).toContain('| 인건비 | 3억 |')
  })

  it('opens the Markdown itself for AI 마크다운', async () => {
    const built = await buildTargetDocument(REPORT, 'markdown', opts())
    expect(built.fileName).toBe('사업 계획.md')
    expect(new TextDecoder().decode(built.bytes)).toBe(normalizeMarkdown(REPORT, '사업 계획'))
  })
})

describe('Markdown → 마인드맵', () => {
  const rootOf = async (outline: string): Promise<XmindTopic> => {
    const doc = await createXmindDocumentFromOutline(outline, { untitled: '제목 없음' })
    return doc.sheets[0]!.rootTopic
  }
  const kids = (t: XmindTopic): XmindTopic[] => t.children?.attached ?? []

  it('makes the title the central topic, sections its branches and lists their topics', async () => {
    const root = await rootOf(markdownToMapOutline(REPORT, '사업 계획'))
    expect(root.title).toBe('2027 사업 계획')
    expect(kids(root).map((t) => t.title)).toEqual(['추진 배경', '예산', '일정'])
    expect(kids(kids(root)[0]!).map((t) => t.title)).toEqual(['시장이 커졌다', '경쟁사가 늘었다'])
    expect(kids(kids(kids(root)[0]!)[0]!).map((t) => t.title)).toEqual(['작년보다 20% 성장'])
  })

  it('keeps one sheet when the document has several level-1 headings', async () => {
    const outline = markdownToMapOutline('머리말\n\n# 1장\n\n본문\n\n# 2장\n\n- 가\n', '책')
    const doc = await createXmindDocumentFromOutline(outline, { untitled: '제목 없음' })
    expect(doc.sheets).toHaveLength(1)
    const root = doc.sheets[0]!.rootTopic
    expect(root.title).toBe('책')
    expect(kids(root).map((t) => t.title)).toEqual(['1장', '2장'])
    expect(noteText(kids(root)[0]!.notes)).toBe('본문')
  })

  it('takes inline marks off topic titles', async () => {
    const root = await rootOf(
      markdownToMapOutline('# **굵은** 제목\n\n- [링크](https://a.b) 항목\n', 'x'),
    )
    expect(root.title).toBe('굵은 제목')
    expect(kids(root)[0]!.title).toBe('링크 항목')
  })

  it('writes a map file the engine opens', async () => {
    const built = await buildTargetDocument(REPORT, 'mindmap', opts())
    expect(built).toMatchObject({ editor: 'mindmap', fileName: '사업 계획.xmind' })
    const opened = await openXmind(built.bytes)
    expect(opened.status).toBe('ok')
  })
})

describe('원본 → Markdown', () => {
  it('마인드맵: central topic as the title, branches as sections, deeper topics as lists', async () => {
    const doc = await createXmindDocumentFromOutline(
      '# 회의\n\n- 안건\n  - 예산\n    - 장비\n  - 일정\n- 결정\n',
      { untitled: '제목 없음' },
    )
    const md = mapOutlineToMarkdown(sheetsToOutline(doc.sheets), '제목 없음')
    expect(md).toBe('# 회의\n\n## 안건\n\n- 예산\n  - 장비\n- 일정\n\n## 결정\n')
  })

  it('마인드맵 → 워드 end to end keeps the structure', async () => {
    const doc = await createXmindDocumentFromOutline('# 보고\n\n- 배경\n  - 이유 하나\n- 결론\n', {
      untitled: '제목 없음',
    })
    const md = mapOutlineToMarkdown(sheetsToOutline(doc.sheets), '제목 없음')
    const built = await buildTargetDocument(md, 'docs', opts({ title: '보고' }))
    const text = await docxToText(built.bytes)
    expect(text).toMatch(/보고[\s\S]*배경[\s\S]*이유 하나[\s\S]*결론/)
  })

  it('워드: blank lines between blocks and a table with its header rule', () => {
    const md = docxTextToMarkdown('# 제목\n본문 한 줄\n- 하나\n- 둘\n이름 | 값\n가 | 1\n끝.')
    expect(md).toBe(
      '# 제목\n\n본문 한 줄\n\n- 하나\n- 둘\n\n| 이름 | 값 |\n| --- | --- |\n| 가 | 1 |\n\n끝.\n',
    )
  })

  it('엑셀: the named sheet as a Markdown table, header row first', async () => {
    const text = await xlsxToText(await buildXlsxFixture())
    const md = sheetTextToMarkdown(text, 'Grades')
    expect(md).toMatch(
      /^# Grades\n\n\| Name \| Scores \| {2}\| {2}\|\n\| --- \| --- \| --- \| --- \|\n/,
    )
    expect(md).toContain('| Alice | 95 |  | TRUE |')
    expect(md).toContain('| 02139 |')
  })

  it('엑셀: picks the active sheet among several and pads short rows', () => {
    const text = '# 요약\n합계 | 10\n\n# 상세\n이름 | 부서 | 점수\n가 | 영업\n나 | 개발 | 9'
    expect(sheetTextToMarkdown(text, '상세')).toBe(
      '# 상세\n\n| 이름 | 부서 | 점수 |\n| --- | --- | --- |\n| 가 | 영업 |  |\n| 나 | 개발 | 9 |\n',
    )
    // no active sheet known: the first one
    expect(sheetTextToMarkdown(text, null)).toContain('# 요약')
  })

  it('엑셀 → 워드 end to end makes a Word table', async () => {
    const md = sheetTextToMarkdown('# 실적\n지점 | 매출\n서울 | 100\n부산 | 80', '실적')
    const built = await buildTargetDocument(md, 'docs', opts({ title: '실적' }))
    const text = await docxToText(built.bytes)
    expect(text).toContain('지점 | 매출')
    expect(text).toContain('부산 | 80')
  })

  it('엑셀: decodes character references a writer left in inline strings (openpyxl)', () => {
    expect(sheetTextToMarkdown('# S\n&#51648;&#51216; | &#x41;', 'S')).toContain('| 지점 | A |')
  })

  it('엑셀: escapes a pipe inside a cell', () => {
    expect(sheetTextToMarkdown('# S\na|b | c\nd | e', 'S')).toContain('| a\\|b | c |')
  })

  it('웹 문서: headings, lists, tables, emphasis and links; scripts and styles dropped', () => {
    const md = htmlToMarkdown(
      '<html><head><style>p{}</style><title>t</title></head><body>' +
        '<h1>제목</h1><p>본문 <strong>굵게</strong> <a href="https://a.b">링크</a></p>' +
        '<ul><li>하나<ul><li>하나의 하나</li></ul></li><li>둘</li></ul>' +
        '<ol><li>첫째</li></ol>' +
        '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>' +
        '<script>alert(1)</script></body></html>',
    )
    expect(md).toBe(
      '# 제목\n\n본문 **굵게** [링크](https://a.b)\n\n- 하나\n  - 하나의 하나\n- 둘\n\n1. 첫째\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n',
    )
  })

  it('한글: report symbols become headings and nested lists', () => {
    const md = plainTextToMarkdown(
      '사업 보고\nⅠ. 추진 배경\n□ 시장 확대\n ○ 성장률 20%\n일반 문단',
      {
        firstLineTitle: true,
      },
    )
    expect(md).toBe('# 사업 보고\n\n## Ⅰ. 추진 배경\n\n- 시장 확대\n  - 성장률 20%\n\n일반 문단\n')
  })

  it('PDF: lines as paragraphs, no title guessed', () => {
    expect(plainTextToMarkdown('첫 줄\n둘째 줄\n\n다음 쪽')).toBe('첫 줄\n\n둘째 줄\n\n다음 쪽\n')
  })
})

describe('Markdown 다듬기', () => {
  it('puts the title on top when the text has none', () => {
    expect(normalizeMarkdown('본문\n', '보고서')).toBe('# 보고서\n\n본문\n')
  })
  it('keeps a text that already starts with its title', () => {
    expect(normalizeMarkdown('# 제목\n\n본문', 'x')).toBe('# 제목\n\n본문\n')
  })
  it('gives a text with several level-1 headings one title above them', () => {
    expect(normalizeMarkdown('머리말\n\n# 1장\n\n## 1.1\n\n# 2장\n', '책')).toBe(
      '# 책\n\n머리말\n\n## 1장\n\n### 1.1\n\n## 2장\n',
    )
  })
  it('keeps a leading level-1 heading as the title (Word: Title and Heading 1 both read as #)', () => {
    expect(normalizeMarkdown('# 보고\n\n요약\n\n# 배경\n\n## 세부\n', 'x')).toBe(
      '# 보고\n\n요약\n\n## 배경\n\n### 세부\n',
    )
  })
  it('does not read a heading inside a code fence', () => {
    expect(normalizeMarkdown('# 제목\n\n```\n# 주석\n```\n', 'x')).toBe(
      '# 제목\n\n```\n# 주석\n```\n',
    )
  })
})
