/** @vitest-environment jsdom */
/**
 * 한글 문서 내보내기(0.17): Word(.docx), 쪽 그림(PNG, 모든 쪽 또는 지금 쪽), 인쇄 미리 보기.
 * - Word: 플러그인이 엔진의 HTML(문단·표·그림)을 문서 순서대로 모으고, 메인 프로세스가
 *   html2docx로 docx를 쓴다. 여기서는 모으는 쪽을 실제 엔진으로 본다.
 * - 그림: 인쇄와 같은 쪽 SVG를 숨은 창에서 쪽 크기 그대로 찍는다.
 * - 미리 보기: 인쇄는 곧장 가지 않고, 쪽을 화면에 보인 뒤 사용자가 인쇄를 눌러야 간다.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import init, { HwpDocument } from '@rhwp/core'
import { agentPlugin, documentHtml, type AgentPluginHost } from '../studio-plugin/agent-plugin.mjs'
import { badPngRequest, pngPageNames } from '../src/main/print-document'
import { gatherPageJob, pageImageUrl } from '../src/renderer/print-flow'
import { PrintPreview } from '../src/renderer/PrintPreview'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { AgentBridge } from '../src/renderer/ai/agent-bridge'
import type { PrintJob } from '../src/shared/ipc'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))

beforeAll(async () => {
  const wasm = join(dirname(require.resolve('@rhwp/core')), 'rhwp_bg.wasm')
  await init({ module_or_path: readFileSync(wasm) })
})

const fixture = (name: string) =>
  new HwpDocument(new Uint8Array(readFileSync(join(here, 'fixtures', name))))

function hostFor(doc: HwpDocument, caretPage = 0) {
  const commands = new Map<string, (services: unknown, params?: unknown) => void>()
  const services = { getInputHandler: () => ({ cursor: { rect: { pageIndex: caretPage } } }) }
  const host = {
    read: (fn: (d: never) => unknown) => fn(doc as never),
    transaction: () => {
      throw new Error('exporting changes nothing')
    },
    events: { on: () => 0 },
    automation: {
      registerCommand: (command: { id: string; execute: (s: unknown, p?: unknown) => void }) =>
        commands.set(command.id, command.execute),
      execute: (id: string, params?: unknown) => {
        commands.get(id)?.(services, params)
        return { ok: true }
      },
    },
  } as unknown as AgentPluginHost
  return agentPlugin.activate(host)
}

describe('the document as HTML for Word', () => {
  it('keeps the text, the tables with their cells, and the formatting the engine writes', () => {
    const html = documentHtml(fixture('title-table-then-inline-table.hwpx') as never)
    expect(html).toMatch(/^<!DOCTYPE html>/)
    // body text with its font and size
    expect(html).toContain('가. 라마바사아 차카타 하가')
    expect(html).toContain("font-family:'나눔스퀘어 ExtraBold';font-size:12.0pt")
    // the tables, in document order before the paragraph that follows them
    expect(html.match(/<table/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html.indexOf('<table')).toBeLessThan(html.indexOf('가. 라마바사아'))
    expect(html).toContain('colspan="2"')
    // the engine's notes about what it left out are not part of the document
    expect(html).not.toContain('rhwp:')
  })

  it('keeps pictures as data URLs', () => {
    const html = documentHtml(fixture('square-picture-after-page-reset.hwpx') as never)
    expect(html).toMatch(/<img[^>]+src="data:image\/png;base64,/)
  })

  it('keeps an empty paragraph as an empty line', () => {
    const doc = HwpDocument.createEmpty()
    doc.createBlankDocument()
    doc.insertText(0, 0, 0, '첫 줄')
    doc.splitParagraph(0, 0, 3)
    doc.splitParagraph(0, 1, 0)
    doc.insertText(0, 2, 0, '셋째 줄')
    const html = documentHtml(doc as never)
    const body = html.slice(html.indexOf('<body'))
    expect(body.indexOf('첫 줄')).toBeLessThan(body.indexOf('&nbsp;'))
    expect(body.indexOf('&nbsp;')).toBeLessThan(body.indexOf('셋째 줄'))
  })

  it('is what the plugin hands the app', () => {
    const plugin = hostFor(fixture('title-table-then-inline-table.hwpx'))
    expect(plugin.exportHtml().html).toContain('<table')
  })
})

describe('the current page', () => {
  it('is the page the caret is on', () => {
    expect(hostFor(fixture('title-table-then-inline-table.hwpx'), 0).currentPage()).toBe(0)
    const doc = HwpDocument.createEmpty()
    doc.createBlankDocument()
    doc.insertText(0, 0, 0, 'a')
    doc.insertPageBreak(0, 0, 1)
    expect(hostFor(doc, 1).currentPage()).toBe(1)
    // a caret past the document (it changed meanwhile) means its last page
    expect(hostFor(doc, 9).currentPage()).toBe(1)
  })
})

describe('gathering one page', () => {
  it('takes the page asked for, with its pictures kept once', async () => {
    const logo = 'data:image/png;base64,iVBORw0KGgo='
    const bridge: Pick<AgentBridge, 'printPages'> = {
      printPages: async (from) => ({
        pageCount: 3,
        from,
        pages: [
          { svg: `<svg><image href="${logo}"/>${from}</svg>`, width: 10, height: 20 },
          { svg: '<svg>next</svg>', width: 10, height: 20 },
        ],
      }),
    }
    const job = await gatherPageJob(bridge, 'pngPage', 2)
    expect(job.mode).toBe('pngPage')
    expect(job.pages).toEqual([
      { svg: '<svg><image href="ieum-image:0"/>2</svg>', width: 10, height: 20 },
    ])
    expect(job.images).toEqual([logo])
    // a picture of the page for the screen puts the picture back
    expect(decodeURIComponent(pageImageUrl(job, 0))).toContain(`href="${logo}"`)
  })
})

describe('pages as PNG', () => {
  it('are named after the document, numbered to the same width', () => {
    expect(pngPageNames('보고서', 3)).toEqual(['보고서-1.png', '보고서-2.png', '보고서-3.png'])
    expect(pngPageNames('a', 12)[0]).toBe('a-01.png')
  })

  it('come from the renderer as PNG bytes, one per page, and nothing else is written', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])
    expect(badPngRequest({ mode: 'png', pngs: [png, png] })).toBeNull()
    expect(badPngRequest({ mode: 'pngPage', pngs: [png] })).toBeNull()
    expect(badPngRequest({ mode: 'pngPage', pngs: [png, png] })).toMatch(/one page/)
    expect(badPngRequest({ mode: 'png', pngs: [] })).toMatch(/no pages/)
    expect(badPngRequest({ mode: 'png', pngs: [new Uint8Array([1, 2, 3])] })).toMatch(/not a PNG/)
    expect(badPngRequest({ mode: 'pdf', pngs: [png] })).toMatch(/mode/)
    expect(badPngRequest(null)).toMatch(/not/)
  })
})

describe('print preview', () => {
  let container: HTMLElement
  let root: Root
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    // the locale provider listens for language changes from the main process
    vi.stubGlobal('hwpApi', { onLanguageChanged: () => () => {} })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  const job: PrintJob = {
    mode: 'print',
    pages: [
      { svg: '<svg>1</svg>', width: 794, height: 1123 },
      { svg: '<svg>2</svg>', width: 794, height: 1123 },
    ],
    images: [],
  }

  it('shows every page and prints only when Print is pressed', async () => {
    const onPrint = vi.fn()
    const onCancel = vi.fn()
    await act(async () => {
      root.render(
        createElement(LocaleProvider, {
          initial: 'ko',
          children: createElement(PrintPreview, { job, onPrint, onCancel }),
        }),
      )
    })
    const dialog = container.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('인쇄 미리 보기')
    expect(dialog.textContent).toContain('2쪽')
    expect(container.querySelectorAll('img.hwp-preview-page')).toHaveLength(2)
    expect(onPrint).not.toHaveBeenCalled()
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-preview="print"]')!.click()
    })
    expect(onPrint).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('closes without printing on Cancel and on Escape', async () => {
    const onPrint = vi.fn()
    const onCancel = vi.fn()
    await act(async () => {
      root.render(
        createElement(LocaleProvider, {
          initial: 'ko',
          children: createElement(PrintPreview, { job, onPrint, onCancel }),
        }),
      )
    })
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-preview="cancel"]')!.click()
    })
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onPrint).not.toHaveBeenCalled()
  })
})

describe('the app', () => {
  const source = (file: string) => readFileSync(join(here, '..', file), 'utf8')

  it('shows the preview before printing instead of printing straight away', () => {
    const app = source('src/renderer/App.tsx')
    expect(app).toMatch(/<PrintPreview[\s\S]*onPrint=/)
    expect(app).toMatch(/mode === 'print'[\s\S]{0,200}setPreviewJob\(job\)/)
  })

  it('exports Word through the main process and pictures as print jobs', () => {
    const app = source('src/renderer/App.tsx')
    expect(app).toContain('agentBridge.exportHtml()')
    expect(app).toContain('window.hwpApi.exportDocx(')
    expect(app).toContain('gatherPageJob(agentBridge')
    expect(app).toContain('rasterizePage(job, index')
    expect(app).toContain('window.hwpApi.savePngs(')
  })
})

describe("the shell's ☰ menu for hwp tabs", () => {
  it('offers Word and the page images next to PDF', () => {
    const shell = readFileSync(join(here, '..', '..', 'shell', 'src', 'main', 'index.ts'), 'utf8')
    const menu = shell.slice(
      shell.indexOf('function buildHwpMenu'),
      shell.indexOf('function buildEpubMenu'),
    )
    expect(menu).toContain("requestHwpPrint(tab.webContents, 'docx')")
    expect(menu).toContain("requestHwpPrint(tab.webContents, 'png')")
    expect(menu.indexOf("'pdf'")).toBeLessThan(menu.indexOf("'docx'"))
  })
})
