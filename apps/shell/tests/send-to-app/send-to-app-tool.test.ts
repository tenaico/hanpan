/**
 * AI 도우미(MCP·에이전트 모드)의 `send_to_app` 도구: 열린 문서를 다른 편집기의 새 문서로 보낸다.
 */
import { describe, expect, it, vi } from 'vitest'
import type { OpenDocumentTab } from '../../src/shared/tabs-api'
import { createSendToAppTools } from '../../src/main/mcp/tools/send-to-app-tools'

const docs: OpenDocumentTab[] = [
  {
    id: 't2',
    kind: 'docs',
    title: '보고서.docx',
    filePath: 'C:\\d\\보고서.docx',
    active: false,
    dirty: false,
  },
  { id: 't3', kind: 'markdown', title: '메모', active: true, dirty: true },
]

function tool(
  send = vi.fn(async () => ({ ok: true as const, tabId: 't9', target: 'slides' as const })),
) {
  const [def] = createSendToAppTools({ list: async () => docs, send })
  return { def: def!, send }
}

describe('send_to_app', () => {
  it('is one tool with a document and a target', () => {
    const { def } = tool()
    expect(def.name).toBe('send_to_app')
    expect(Object.keys(def.inputSchema ?? {}).sort()).toEqual(['document', 'target'])
  })

  it('sends the named document and reports the new tab', async () => {
    const { def, send } = tool()
    const out = await def.handler({ document: 't2', target: 'pptx' })
    expect(send).toHaveBeenCalledWith('t2', 'slides')
    expect(out).toMatchObject({ sent: true, newTabId: 't9', target: 'slides' })
  })

  it('sends the document in front when none is named', async () => {
    const { def, send } = tool()
    await def.handler({ target: 'word' })
    expect(send).toHaveBeenCalledWith('t3', 'docs')
  })

  it('refuses an unknown target and an unknown document with guidance', async () => {
    const { def } = tool()
    await expect(def.handler({ target: 'excel' })).rejects.toThrow(/target/)
    await expect(def.handler({ document: 'nope', target: 'md' })).rejects.toThrow(/nope/)
  })

  it('turns a refusal into a message the model can relay', async () => {
    const { def } = tool(vi.fn(async () => ({ ok: false as const, problem: 'canceled' as const })))
    await expect(def.handler({ document: 't2', target: 'html' })).rejects.toThrow(/did not save/)
  })

  it('says so when the app is not running', async () => {
    const [def] = createSendToAppTools(undefined)
    await expect(def!.handler({ target: 'md' })).rejects.toThrow(/not running/)
  })
})
