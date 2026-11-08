/**
 * 0.17 UI/UX 점검 v2(sheets-pdf.md P1–P14)에서 고친 PDF 화면 동작.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { InlineModal } from '../src/renderer/InlineModal'
import { splitFileCount } from '../src/renderer/split-preview'
import { markupButtonAction, selectionPopupPosition } from '../src/renderer/markup-tool'
import { shouldShowFormBanner } from '../src/renderer/form-banner'
import { pageLooksBlank } from '../src/renderer/blank-document'
import { shouldFoldAiForBilingual } from '../src/renderer/bilingual/fold-ai'
import { printPreviewTarget } from '../src/renderer/print-preview'
import { FormFieldProps } from '../src/renderer/FormDesignLayer'
import { strings } from '../src/renderer/i18n/strings'

const APP = readFileSync(resolve(process.cwd(), 'src/renderer/App.tsx'), 'utf8')

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeAll(() => {
  ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  container?.remove()
  root = null
  container = null
})

async function mount(element: ReturnType<typeof createElement>) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(element)
    await Promise.resolve()
  })
  return container
}

describe('P7 문서 속성의 파일 크기', () => {
  it('pdf.js에 넘기기 전에 바이트 수를 잡아 둔다(넘긴 뒤에는 버퍼가 비어 1 KB로 보였다)', () => {
    expect(APP).not.toContain('setFileSize(data.byteLength)')
    const load = APP.indexOf('const fileByteLength = bytes.byteLength')
    const handOff = APP.indexOf('const task = getDocument({\n        data: bytes,')
    expect(load).toBeGreaterThan(0)
    expect(handOff).toBeGreaterThan(load)
    expect(APP).toContain('setFileSize(fileByteLength)')
  })
})

describe('P14 Esc로 닫히는 대화상자', () => {
  it('InlineModal은 Esc와 바깥 클릭으로 닫히고 dialog로 읽힌다', async () => {
    const onCancel = vi.fn()
    const el = await mount(
      createElement(
        InlineModal,
        { label: '페이지 크기', onCancel },
        createElement('button', null, 'A4'),
      ),
    )
    const dialog = el.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('페이지 크기')
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
    await act(async () => {
      el.querySelector<HTMLElement>('.pdf-modal-mask')!.click()
    })
    expect(onCancel).toHaveBeenCalledTimes(2)
    await act(async () => {
      el.querySelector<HTMLElement>('button')!.click()
    })
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('App의 페이지 대화상자는 모두 InlineModal을 쓴다', () => {
    expect(APP).not.toMatch(/<div className="pdf-modal-mask" onClick=\{\(\) => setPageSizeDlg/)
    expect(APP).not.toMatch(/<div className="pdf-modal-mask" onClick=\{\(\) => setSplitPagesDlg/)
    expect(APP).not.toMatch(/<div className="pdf-modal-mask" onClick=\{\(\) => setPrintDlg/)
    expect(APP).not.toMatch(/<div className="pdf-modal-mask" onClick=\{cancelSaveCopy\}/)
    expect(APP).toContain(
      "<InlineModal label={t('pageSize')} onCancel={() => setPageSizeDlg(false)}>",
    )
    expect(APP).toContain(
      "<InlineModal label={t('splitPages')} onCancel={() => setSplitPagesDlg(false)}>",
    )
  })
})

describe('P3 파일 나누기 창', () => {
  it('몇 개 파일이 나오는지 미리 계산한다', () => {
    expect(splitFileCount(5, 1)).toBe(5)
    expect(splitFileCount(5, 2)).toBe(3)
    expect(splitFileCount(5, 5)).toBe(1)
    expect(splitFileCount(5, 9)).toBe(1)
    expect(splitFileCount(5, 0)).toBeNull()
    expect(splitFileCount(5, Number.NaN)).toBeNull()
  })

  it('숫자 칸에 질문과 미리 계산을 붙인다', () => {
    expect(APP).toContain("t('splitDlgPrompt')")
    expect(APP).toContain("t('splitDlgPreview'")
    expect(strings.ko.splitDlgPrompt).toBe('몇 쪽마다 새 파일로 나눌까요?')
    expect(strings.vi.splitDlgPrompt).not.toBe(strings.en.splitDlgPrompt)
  })
})

describe('P9 페이지 탭 이름', () => {
  it('파일 나누기와 한 쪽 쪼개기를 다른 말로 부른다', () => {
    expect(strings.ko.splitPdf).toBe('파일 나누기')
    expect(strings.ko.splitPages).toBe('한 쪽 쪼개기')
    expect(strings.en.splitPdf).not.toBe(strings.en.splitPages)
    expect(strings.vi.splitPdf).not.toBe('Tách PDF')
    expect(APP).toContain("data-tip={t('splitPdfTip')}")
    expect(APP).toContain("data-tip={t('splitPagesTip')}")
  })
})

describe('P2 형광펜 도구', () => {
  it('선택 없이 누르면 도구를 켜고, 같은 단추를 다시 누르면 끈다', () => {
    expect(markupButtonAction({ hasSelection: true, tool: null, type: 'highlight' })).toEqual({
      kind: 'apply',
    })
    expect(markupButtonAction({ hasSelection: false, tool: null, type: 'highlight' })).toEqual({
      kind: 'tool',
      tool: 'highlight',
    })
    expect(
      markupButtonAction({ hasSelection: false, tool: 'highlight', type: 'highlight' }),
    ).toEqual({ kind: 'tool', tool: null })
    expect(
      markupButtonAction({ hasSelection: false, tool: 'highlight', type: 'underline' }),
    ).toEqual({ kind: 'tool', tool: 'underline' })
  })

  it('떠 있는 도구 모음은 선택 아래에 두고, 아래가 모자랄 때만 위로 올린다', () => {
    const viewport = { width: 1366, height: 768 }
    const below = selectionPopupPosition({ left: 270, top: 278, width: 240, bottom: 298 }, viewport)
    expect(below.y).toBe(306)
    const nearBottom = selectionPopupPosition(
      { left: 270, top: 700, width: 240, bottom: 720 },
      viewport,
    )
    expect(nearBottom.y).toBe(700 - 44)
    expect(selectionPopupPosition({ left: 0, top: 10, width: 10, bottom: 20 }, viewport).x).toBe(70)
  })

  it('도구가 켜져 있으면 끌기를 마치자마자 칠하고 Esc로 끈다', () => {
    expect(APP).toContain('if (markupTool && !readOnly)')
    expect(APP).toContain('else if (markupTool) setMarkupTool(null)')
    expect(APP).toContain('selectionPopupPosition(')
  })
})

describe('P13 양식 PDF', () => {
  it('원래 파일에 양식 칸이 있고 양식 탭이 아닐 때만 알림 줄을 보인다', () => {
    const base = {
      fileFieldCount: 4,
      ribbonTab: 'home',
      dismissed: false,
      readOnly: false,
    }
    expect(shouldShowFormBanner(base)).toBe(true)
    expect(shouldShowFormBanner({ ...base, fileFieldCount: 0 })).toBe(false)
    expect(shouldShowFormBanner({ ...base, ribbonTab: 'fillForm' })).toBe(false)
    expect(shouldShowFormBanner({ ...base, ribbonTab: 'formDesign' })).toBe(false)
    expect(shouldShowFormBanner({ ...base, dismissed: true })).toBe(false)
    expect(shouldShowFormBanner({ ...base, readOnly: true })).toBe(false)
    expect(APP).toContain('className="pdf-form-banner"')
  })

  it('새 필드 속성 창은 열리면 화면 안으로 끌어온다', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    await mount(
      createElement(FormFieldProps, {
        field: {
          id: 'f1',
          pageIndex: 0,
          rect: [0, 0, 100, 20],
          kind: 'text',
          existing: false,
          pending: {
            id: 'f1',
            input: { kind: 'text', pageIndex: 0, rect: [0, 0, 100, 20], name: 'f1' },
          },
        } as unknown as Parameters<typeof FormFieldProps>[0]['field'],
        isNew: true,
        style: { left: 0, top: 0 },
        labels: new Proxy({}, { get: (_t, key) => String(key) }) as Parameters<
          typeof FormFieldProps
        >[0]['labels'],
        onPatch: () => true,
        onDelete: () => {},
        onDone: () => {},
        onCancel: () => {},
      }),
    )
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
  })
})

describe('P11 빈 문서의 AI 제안', () => {
  it('글자도 그림도 그리기도 없는 쪽만 빈 쪽으로 본다', () => {
    const OPS = { paintImageXObject: 85, fill: 22, stroke: 20, showText: 44, save: 10, restore: 11 }
    expect(pageLooksBlank({ textChars: 0, fnArray: [], ops: OPS })).toBe(true)
    expect(pageLooksBlank({ textChars: 0, fnArray: [10, 11], ops: OPS })).toBe(true)
    expect(pageLooksBlank({ textChars: 3, fnArray: [], ops: OPS })).toBe(false)
    expect(pageLooksBlank({ textChars: 0, fnArray: [10, 85, 11], ops: OPS })).toBe(false)
    expect(pageLooksBlank({ textChars: 0, fnArray: [22], ops: OPS })).toBe(false)
  })
})

describe('P5 번역 나란히', () => {
  it('좁은 창에서 번역 칸을 열면 AI 패널을 접는다', () => {
    expect(shouldFoldAiForBilingual({ enabled: true, aiOpen: true, windowWidth: 1366 })).toBe(true)
    expect(shouldFoldAiForBilingual({ enabled: true, aiOpen: true, windowWidth: 2560 })).toBe(false)
    expect(shouldFoldAiForBilingual({ enabled: false, aiOpen: true, windowWidth: 1366 })).toBe(
      false,
    )
    expect(shouldFoldAiForBilingual({ enabled: true, aiOpen: false, windowWidth: 1366 })).toBe(
      false,
    )
    expect(APP).toContain('shouldFoldAiForBilingual(')
  })

  it('접기 질문이 무엇을 묻는지 말한다', () => {
    expect(strings.ko.blCollapseAsk).toContain('번역 칸을 접어')
    expect(strings.ko.blCollapse).toBe('번역 칸 접기')
  })
})

describe('P4 인쇄 창의 미리 보기', () => {
  it('고른 범위의 첫 쪽과 쪽 수를 알려 준다', () => {
    expect(printPreviewTarget({ mode: 'all', current: 3, input: '', pageCount: 5 })).toEqual({
      firstPage: 1,
      count: 5,
    })
    expect(printPreviewTarget({ mode: 'current', current: 3, input: '', pageCount: 5 })).toEqual({
      firstPage: 3,
      count: 1,
    })
    expect(printPreviewTarget({ mode: 'custom', current: 3, input: '2-4', pageCount: 5 })).toEqual({
      firstPage: 2,
      count: 3,
    })
    expect(printPreviewTarget({ mode: 'custom', current: 3, input: '9', pageCount: 5 })).toBeNull()
  })

  it('인쇄 창에 미리 보기와 다음 단계 안내를 둔다', () => {
    expect(APP).toContain('className="pdf-print-preview"')
    expect(APP).toContain("t('printSummary'")
    expect(APP).toContain("t('printNextStepHint')")
    expect(strings.ko.printNextStepHint).toContain('프린터')
  })
})
