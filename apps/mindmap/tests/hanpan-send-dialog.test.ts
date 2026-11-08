/**
 * @vitest-environment jsdom
 */
// Hanpan's send dialog: with the Korean document features off, a Word report
// skips the Korean report settings (layout, look, date, department) and goes
// out as a plain chapter report (decision 0091). PowerPoint keeps its slide style.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Lang } from '@genoffice/i18n'
import type { SendTarget } from '@genoffice/hanpan-core/renderer'
import { applyKoreanDocFeatures } from '@genoffice/ui'
import type { DocumentSession } from '../src/renderer/document/session'
import { SendDialog } from '../src/renderer/hanpan/SendDialog'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { MindmapApi } from '../src/shared/ipc'

// the map itself is not under test: one central topic with one branch
vi.mock('../src/renderer/hanpan/map-outline', () => ({
  sheetOutline: async () => ({
    sheetId: 'sheet-1',
    outline: { title: 'Plan', rootKey: 'root', nodes: [{ key: 'a', title: 'Goal', children: [] }] },
  }),
}))

let container: HTMLElement
let root: Root
let sendToDocument: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  sendToDocument = vi.fn(async () => ({ ok: true, title: 'Plan' }))
  ;(window as unknown as { mindmapApi: Partial<MindmapApi> }).mindmapApi = {
    onLanguageChanged: () => () => {},
    sendToDocument,
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  applyKoreanDocFeatures(null)
})

async function openDialog(lang: Lang, target: SendTarget): Promise<void> {
  await act(async () => {
    root.render(
      createElement(LocaleProvider, {
        initial: lang,
        children: createElement(SendDialog, {
          target,
          session: {} as DocumentSession,
          sheetKey: 'sheet-1',
          mapPath: null,
          flush: () => {},
          onClose: () => {},
          onSent: () => {},
        }),
      }),
    )
  })
}

async function send(): Promise<void> {
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-action="send-go"]')!.click()
  })
}

const selects = () => container.querySelectorAll('.hp-send-form select').length
const textFields = () => container.querySelectorAll('.hp-send-form input[type="text"]').length

describe('the send dialog and the Korean document features switch', () => {
  it('sends a numbered outline in a basic look to Word when Korean features are off', async () => {
    await openDialog('vi', 'docx')
    expect(selects()).toBe(0)
    expect(textFields()).toBe(0)
    await send()
    expect(sendToDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'docx',
        style: 'outline',
        theme: 'basic',
        date: undefined,
        department: undefined,
      }),
    )
  })

  it('keeps the Korean report settings when on', async () => {
    applyKoreanDocFeatures(true)
    await openDialog('en', 'docx')
    expect(selects()).toBe(2)
    expect(textFields()).toBe(2)
    await send()
    expect(sendToDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'docx',
        style: 'report',
        theme: undefined,
        date: expect.any(String),
      }),
    )
  })

  it('keeps the slide style for PowerPoint when off', async () => {
    await openDialog('vi', 'slides')
    expect(container.querySelector('[data-field="slide-style"]')).not.toBeNull()
  })
})
