/**
 * 다른 앱으로 보내기의 흐름: 어떤 탭에서 무엇으로 보낼 수 있는지, 원본을 어떻게 읽는지
 * (편집 중인 글은 화면에서, 파일 문서는 저장된 파일에서), 저장하지 않은 문서는 저장을 묻고,
 * 결과는 새 제목 없는 탭으로 열린다. 원본은 고치지 않는다.
 */
import { describe, expect, it, vi } from 'vitest'
import { openPptx } from '@genoffice/pptx-engine'
import type { ParsedFile } from '@genoffice/file-parse'
import { loadEngine } from '../../../../packages/hanpan-core/tests/engine'
import {
  canSendFrom,
  parseSendTarget,
  sendTargetsFor,
  SEND_TARGETS,
} from '../../src/main/send-to-app/targets'
import {
  sendToApp,
  sourceMarkdown,
  type SendDeps,
  type SendSource,
} from '../../src/main/send-to-app/send-to-app'

function deps(
  source: SendSource,
  extra: Partial<SendDeps> = {},
): SendDeps & { opened: Parameters<SendDeps['openDocument']>[0][] } {
  const opened: Parameters<SendDeps['openDocument']>[0][] = []
  let current: SendSource | undefined = source
  return {
    opened,
    document: async (id) => (id === current?.id ? current : undefined),
    readLive: async () => '',
    liveDeck: async () => null,
    activeSheet: async () => null,
    parse: async () => ({ ok: true, kind: 'text', text: '' }) as ParsedFile,
    confirmSave: async () => true,
    save: () => {
      if (current)
        current = { ...current, dirty: false, filePath: current.filePath ?? 'C:\\d\\새.docx' }
    },
    loadHwpEngine: loadEngine,
    openDocument: async (doc) => {
      opened.push(doc)
      return `t${opened.length + 10}`
    },
    korean: () => true,
    untitled: '제목 없음',
    waitMs: 1,
    ...extra,
  }
}

const docx = (extra: Partial<SendSource> = {}): SendSource => ({
  id: 't2',
  kind: 'docs',
  title: '보고서.docx',
  filePath: 'C:\\d\\보고서.docx',
  dirty: false,
  ...extra,
})

describe('targets', () => {
  it('offers every other editor, AI 한글 only with the Korean document features', () => {
    expect(sendTargetsFor('docs', true)).toEqual(['slides', 'hwp', 'markdown', 'mindmap', 'html'])
    expect(sendTargetsFor('docs', false)).toEqual(['slides', 'markdown', 'mindmap', 'html'])
    expect(sendTargetsFor('sheets', true)).toEqual([...SEND_TARGETS])
    expect(sendTargetsFor('markdown', true)).toEqual(['docs', 'slides', 'hwp', 'mindmap', 'html'])
  })

  it('sends from document tabs, not from Home, help or picture tabs', () => {
    for (const kind of [
      'docs',
      'sheets',
      'slides',
      'pdf',
      'markdown',
      'html',
      'mindmap',
      'hwp',
      'epub',
    ] as const)
      expect(canSendFrom(kind)).toBe(true)
    for (const kind of ['home', 'help', 'photo', 'illust'] as const) {
      expect(canSendFrom(kind)).toBe(false)
      expect(sendTargetsFor(kind, true)).toEqual([])
    }
  })

  it('reads the names an agent may use', () => {
    expect(parseSendTarget('word')).toBe('docs')
    expect(parseSendTarget('PPTX')).toBe('slides')
    expect(parseSendTarget('powerpoint')).toBe('slides')
    expect(parseSendTarget('hwpx')).toBe('hwp')
    expect(parseSendTarget('md')).toBe('markdown')
    expect(parseSendTarget('mind map')).toBe('mindmap')
    expect(parseSendTarget('web')).toBe('html')
    expect(parseSendTarget('excel')).toBeNull()
  })
})

describe('reading the source', () => {
  it('reads a Markdown tab live, with its withheld spans as labels', async () => {
    const d = deps(
      { id: 't3', kind: 'markdown', title: '메모.md', dirty: true },
      {
        readLive: async () =>
          '# 메모\n\n연락처 <span class="redact-span" data-redaction="" data-label="전화">010-1234</span>\n',
      },
    )
    const read = await sourceMarkdown(d, 't3')
    expect(read).toMatchObject({ ok: true, title: '메모' })
    if (!read.ok) return
    expect(read.markdown).toContain('{{전화}}')
    expect(read.markdown).not.toContain('010-1234')
  })

  it('reads a slides tab from its live deck, unsaved', async () => {
    const { buildDeck } = await import('../../src/main/generate/convert')
    const { outlineToOps } = await import('../../src/main/mcp/pptx-outline')
    const deck = (
      await openPptx(
        await buildDeck(
          outlineToOps([
            { title: '분기 실적', paragraphs: [{ text: '매출 증가', bullet: 'char' }] },
          ]),
        ),
      )
    ).deck
    const save = vi.fn()
    const d = deps(
      { id: 't4', kind: 'slides', title: '발표', dirty: true },
      {
        liveDeck: async () => deck,
        save,
      },
    )
    const read = await sourceMarkdown(d, 't4')
    expect(save).not.toHaveBeenCalled()
    expect(read).toMatchObject({ ok: true, markdown: '# 분기 실적\n\n- 매출 증가\n' })
  })

  it('reads a Word document from its saved file', async () => {
    const parse = vi.fn(
      async () => ({ ok: true, kind: 'text', text: '# 제목\n본문' }) as ParsedFile,
    )
    const read = await sourceMarkdown(deps(docx(), { parse }), 't2')
    expect(parse).toHaveBeenCalledWith('C:\\d\\보고서.docx')
    expect(read).toEqual({ ok: true, title: '보고서', markdown: '# 제목\n\n본문\n' })
  })

  it('asks to save a Word document with unsaved changes first, then reads the saved file', async () => {
    const confirmSave = vi.fn(async () => true)
    const parse = vi.fn(async () => ({ ok: true, kind: 'text', text: '본문' }) as ParsedFile)
    const d = deps(docx({ dirty: true }), { confirmSave, parse })
    const read = await sourceMarkdown(d, 't2')
    expect(confirmSave).toHaveBeenCalledWith(false)
    expect(read.ok).toBe(true)
  })

  it('names the result after the file an untitled document was just saved as', async () => {
    // the tab may still say 제목 없는 문서 when the save lands; the new deck is named WORD1
    const untitled = docx({ title: '제목 없는 문서', filePath: undefined, dirty: true })
    const saved = { ...docx(), title: '제목 없는 문서', filePath: 'C:\\d\\WORD1.docx' }
    let calls = 0
    const d = deps(untitled, {
      document: async () => (calls++ === 0 ? untitled : saved),
      parse: async () => ({ ok: true, kind: 'text', text: '본문' }) as ParsedFile,
    })
    const read = await sourceMarkdown(d, 't2')
    expect(read.ok && read.title).toBe('WORD1')
  })

  it('stops when the person does not want to save', async () => {
    const parse = vi.fn()
    const d = deps(docx({ dirty: true, filePath: undefined }), {
      confirmSave: async () => false,
      parse: parse as never,
    })
    expect(await sourceMarkdown(d, 't2')).toEqual({ ok: false, problem: 'canceled' })
    expect(parse).not.toHaveBeenCalled()
  })

  it('reads the active sheet of a spreadsheet', async () => {
    const d = deps(
      { id: 't5', kind: 'sheets', title: '실적.xlsx', filePath: 'C:\\d\\실적.xlsx', dirty: false },
      {
        activeSheet: async () => '상세',
        parse: async () =>
          ({
            ok: true,
            kind: 'text',
            text: '# 요약\n합계 | 1\n\n# 상세\n이름 | 값\n가 | 2',
          }) as ParsedFile,
      },
    )
    const read = await sourceMarkdown(d, 't5')
    expect(read.ok && read.markdown).toBe('# 상세\n\n| 이름 | 값 |\n| --- | --- |\n| 가 | 2 |\n')
  })

  it('says why a file could not be read', async () => {
    const withheld = deps(docx(), {
      parse: async () =>
        ({
          ok: false,
          error: 'Redaction marks in this file could not be processed: x',
        }) as ParsedFile,
    })
    expect(await sourceMarkdown(withheld, 't2')).toEqual({ ok: false, problem: 'redaction' })
    const broken = deps(docx(), { parse: async () => ({ ok: false, error: 'bad' }) as ParsedFile })
    expect(await sourceMarkdown(broken, 't2')).toEqual({ ok: false, problem: 'unreadable' })
  })

  it('refuses an empty document', async () => {
    const d = deps(
      { id: 't3', kind: 'markdown', title: '빈.md', dirty: false },
      {
        readLive: async () => '  \n',
      },
    )
    expect(await sourceMarkdown(d, 't3')).toEqual({ ok: false, problem: 'empty' })
  })
})

describe('sending', () => {
  it('워드 → 파워포인트: a new untitled deck tab named after the source', async () => {
    const d = deps(docx(), {
      parse: async () =>
        ({ ok: true, kind: 'text', text: '# 보고\n## 배경\n- 이유\n## 결론\n- 끝' }) as ParsedFile,
    })
    const result = await sendToApp(d, 't2', 'slides')
    expect(result).toEqual({ ok: true, tabId: 't11', target: 'slides' })
    expect(d.opened).toHaveLength(1)
    expect(d.opened[0]).toMatchObject({
      editor: 'slides',
      fileName: '보고서.pptx',
      title: '보고서',
    })
    const deck = (await openPptx(d.opened[0]!.bytes)).deck
    expect(deck.slides).toHaveLength(3)
  })

  it('opens the intermediate Markdown in AI 마크다운 when asked', async () => {
    const d = deps(docx(), {
      parse: async () => ({ ok: true, kind: 'text', text: '# 보고\n본문' }) as ParsedFile,
    })
    expect(await sendToApp(d, 't2', 'markdown')).toMatchObject({ ok: true, target: 'markdown' })
    expect(d.opened[0]).toMatchObject({ editor: 'markdown', fileName: '보고서.md' })
    expect(new TextDecoder().decode(d.opened[0]!.bytes)).toBe('# 보고\n\n본문\n')
  })

  it('refuses a target the source cannot go to', async () => {
    const d = deps(docx())
    expect(await sendToApp(d, 't2', 'docs')).toEqual({ ok: false, problem: 'unsupported' })
    const off = deps(docx(), { korean: () => false })
    expect(await sendToApp(off, 't2', 'hwp')).toEqual({ ok: false, problem: 'unsupported' })
    expect(await sendToApp(deps(docx()), 'gone', 'slides')).toMatchObject({ ok: false })
  })

  it('reports a tab that did not open', async () => {
    const d = deps(docx(), {
      parse: async () => ({ ok: true, kind: 'text', text: '본문' }) as ParsedFile,
      openDocument: async () => null,
    })
    expect(await sendToApp(d, 't2', 'html')).toEqual({ ok: false, problem: 'failed' })
  })

  it('never saves or edits a source that is already saved', async () => {
    const save = vi.fn()
    const d = deps(docx(), {
      save,
      parse: async () => ({ ok: true, kind: 'text', text: '본문' }) as ParsedFile,
    })
    await sendToApp(d, 't2', 'mindmap')
    expect(save).not.toHaveBeenCalled()
  })
})
