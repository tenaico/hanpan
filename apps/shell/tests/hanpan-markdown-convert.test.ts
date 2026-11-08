import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { docxToOdt } from '@genoffice/odt-engine'
import type { HwpEngine } from '@genoffice/hanpan-core'
import { loadEngine } from '../../../packages/hanpan-core/tests/engine'
import {
  checkConvertRequest,
  convertBlocks,
  convertMarkdown,
  freePath,
  markdownTitle,
  safeFileName,
  type ConvertDeps,
} from '../src/main/hanpan/markdown-convert'

const MARKDOWN = `기준본: v1 · 규격: 1920×1080, 편당 45초

## 1편 — ACP215 장비 소개

| 요청 | 반영 |
|---|---|
| 장비를 밝고 선명하게 | 장비 실사 장면 전체의 **밝기**·대비를 높였습니다. |
| 중국어 화면 제거 | 중국어 라벨이 보이는 장면을 뺐습니다. |

- 첫 장면 인물 톤에 맞춤
- 설명선 구간을 모두 뺐습니다
`

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function folder(): string {
  const dir = mkdtempSync(join(tmpdir(), 'hp-convert-'))
  dirs.push(dir)
  return dir
}

function deps(over: Partial<ConvertDeps> = {}): ConvertDeps {
  return {
    loadHwpEngine: loadEngine as () => Promise<HwpEngine>,
    docxToOdt: async (docx) => (await docxToOdt(docx)).odtBytes,
    // no browser here: a stand-in "PDF" proves the page reached the printer
    htmlToPdf: async (html) => {
      expect(html).toContain('<table')
      return new TextEncoder().encode('%PDF-1.7 stand-in')
    },
    writeFile: async (path, bytes) => writeFileSync(path, bytes),
    exists: existsSync,
    ...over,
  }
}

describe('checkConvertRequest', () => {
  it('keeps known formats in a fixed order and drops the rest', () => {
    const request = checkConvertRequest({
      markdown: '# a',
      name: 'x',
      formats: ['pdf', 'exe', 'hwp'],
      theme: 'nope',
    })
    expect(request.formats).toEqual(['hwp', 'pdf'])
    expect(request.theme).toBe('report')
  })

  it('refuses an empty text or no format', () => {
    expect(() => checkConvertRequest({ markdown: '  ', name: 'x', formats: ['hwp'] })).toThrow()
    expect(() => checkConvertRequest({ markdown: '# a', name: 'x', formats: [] })).toThrow()
  })

  it('makes the name a file name Windows takes', () => {
    expect(safeFileName('  a/b:c*?  ')).toBe('a b c')
    expect(safeFileName('보고서. ')).toBe('보고서')
    expect(safeFileName('<>')).toBe('변환 문서')
  })
})

describe('the converted document', () => {
  it('takes the file name as its title when the text has no # heading', () => {
    const blocks = convertBlocks(
      checkConvertRequest({ markdown: MARKDOWN, name: 'ACP215 수정 내역', formats: ['hwp'] }),
    )
    expect(blocks[0]).toEqual({ kind: 'title', text: 'ACP215 수정 내역' })
    expect(blocks.find((b) => b.kind === 'table')).toMatchObject({
      rows: [['요청', '반영'], expect.any(Array), expect.any(Array)],
    })
  })

  it('reads the title from the first # heading', () => {
    expect(markdownTitle('intro\n# **홍보영상** 수정\n## a')).toBe('홍보영상 수정')
    expect(markdownTitle('## only a chapter')).toBeNull()
  })

  it('never overwrites: a taken name gets (2), (3)', () => {
    const dir = folder()
    writeFileSync(join(dir, 'a.hwp'), '')
    writeFileSync(join(dir, 'a (2).hwp'), '')
    expect(freePath(dir, 'a', 'hwp', existsSync)).toBe(join(dir, 'a (3).hwp'))
  })
})

describe('convertMarkdown', () => {
  it('writes every ticked format side by side in one folder', async () => {
    const dir = folder()
    const request = checkConvertRequest({
      markdown: MARKDOWN,
      name: '수정 내역',
      formats: ['hwp', 'hwpx', 'docx', 'odt', 'pdf', 'html'],
    })
    const result = await convertMarkdown(request, dir, deps())
    expect(result.failed).toEqual([])
    expect(result.written.map((w) => w.path)).toEqual(
      ['hwp', 'hwpx', 'docx', 'odt', 'pdf', 'html'].map((ext) => join(dir, `수정 내역.${ext}`)),
    )
    const html = readFileSync(join(dir, '수정 내역.html'), 'utf8')
    expect(html).toContain('<title>수정 내역</title>')
    expect(html).toContain('<th>요청</th>')

    const bytes = (ext: string) => readFileSync(join(dir, `수정 내역.${ext}`))
    // HWP is an OLE compound file; HWPX, Word and ODT are zips
    expect([...bytes('hwp').subarray(0, 4)]).toEqual([0xd0, 0xcf, 0x11, 0xe0])
    for (const ext of ['hwpx', 'docx', 'odt'])
      expect(bytes(ext).subarray(0, 2).toString()).toBe('PK')

    // the HWP reads back with the table cells and the list lines in it
    const engine = await loadEngine()
    const doc = new engine.HwpDocument(new Uint8Array(bytes('hwp')))
    try {
      const text: string[] = []
      for (let i = 0; i < doc.getParagraphCount(0); i++)
        text.push(doc.getTextRange(0, i, 0, doc.getParagraphLength(0, i)))
      expect(text[0]).toBe('수정 내역')
      expect(text.join('\n')).toContain('설명선 구간을 모두 뺐습니다')
    } finally {
      doc.free()
    }
  })

  it('makes only what was ticked and keeps going when one format fails', async () => {
    const dir = folder()
    const request = checkConvertRequest({ markdown: MARKDOWN, name: 'a', formats: ['docx', 'pdf'] })
    const result = await convertMarkdown(
      request,
      dir,
      deps({ htmlToPdf: async () => Promise.reject(new Error('printer gone')) }),
    )
    expect(result.written).toEqual([{ format: 'docx', path: join(dir, 'a.docx') }])
    expect(result.failed).toEqual([{ format: 'pdf', error: 'printer gone' }])
    expect(existsSync(join(dir, 'a.hwp'))).toBe(false)
  })
})
