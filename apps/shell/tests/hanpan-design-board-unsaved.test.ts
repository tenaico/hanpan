/**
 * @vitest-environment jsdom
 */
// 0.17 UI/UX 점검 v2 (hwp-design #2·#19·#34·#35): the design board asks before it
// throws away unsaved work, tells the main process when there is some, shows what to
// do on an empty page, and closes the credit check with Esc.
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DesignBoard, type DesignApi } from '../src/renderer/src/design/DesignBoard'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let api: DesignApi & {
  setDirty: ReturnType<typeof vi.fn>
  askUnsaved: ReturnType<typeof vi.fn>
  onSaveThenClose: ReturnType<typeof vi.fn>
  closeAfterSave: ReturnType<typeof vi.fn>
}
let saveThenClose: (() => void) | null = null

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  saveThenClose = null
  api = {
    savePng: vi.fn(async () => null),
    savePdf: vi.fn(async () => null),
    copyImage: vi.fn(async () => true),
    saveDesign: vi.fn(async () => 'C:/d/a.hpdesign'),
    newDesign: vi.fn(async () => undefined),
    openDesign: vi.fn(async () => null),
    pickImage: vi.fn(async () => null),
    setDirty: vi.fn(),
    askUnsaved: vi.fn(async () => 'cancel' as const),
    onSaveThenClose: vi.fn((handler: () => void) => {
      saveThenClose = handler
      return () => undefined
    }),
    closeAfterSave: vi.fn(),
  }
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function render(lang = 'ko') {
  await act(async () => root.render(createElement(DesignBoard, { lang, api })))
}
const $ = <T extends Element>(sel: string) => host.querySelector<T>(sel)
async function click(el: Element | null) {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}
async function addTitle() {
  await click($('[data-tab="text"]'))
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent === '제목 넣기')
  await click(button!)
}
async function fileItem(id: string) {
  await click($('[data-action="design-file"]'))
  await click($(`[data-file-item="${id}"]`))
}

describe('unsaved work on the design board', () => {
  it('reports a change to the main process, and a save clears it', async () => {
    await render()
    expect(api.setDirty).toHaveBeenLastCalledWith(false)
    await addTitle()
    expect(api.setDirty).toHaveBeenLastCalledWith(true)
    await fileItem('save')
    expect(api.setDirty).toHaveBeenLastCalledWith(false)
  })

  it('asks before a new design replaces a changed one, and cancel keeps it', async () => {
    await render()
    await addTitle()
    const before = host.querySelectorAll('.dz-page [data-id]').length
    await fileItem('newDesign')
    expect(api.askUnsaved).toHaveBeenCalledTimes(1)
    expect(api.newDesign).not.toHaveBeenCalled()
    expect(host.querySelectorAll('.dz-page [data-id]').length).toBe(before)
  })

  it('"don\'t save" goes on to the new design; an unchanged design does not ask', async () => {
    await render()
    await fileItem('newDesign')
    expect(api.askUnsaved).not.toHaveBeenCalled()
    expect(api.newDesign).toHaveBeenCalledTimes(1)
    await addTitle()
    api.askUnsaved.mockResolvedValueOnce('discard')
    await fileItem('newDesign')
    expect(api.newDesign).toHaveBeenCalledTimes(2)
  })

  it('"save" saves first, then starts over', async () => {
    await render()
    await addTitle()
    api.askUnsaved.mockResolvedValueOnce('save')
    await fileItem('newDesign')
    expect(api.saveDesign).toHaveBeenCalledTimes(1)
    expect(api.newDesign).toHaveBeenCalledTimes(1)
  })

  it('a template asks the same way', async () => {
    await render()
    await addTitle()
    await click($('[data-tab="templates"]'))
    await click($('[data-template]'))
    expect(api.askUnsaved).toHaveBeenCalledTimes(1)
  })

  it('saves and then lets the window close when the main process asks', async () => {
    await render()
    await addTitle()
    expect(saveThenClose).toBeTypeOf('function')
    await act(async () => saveThenClose!())
    expect(api.saveDesign).toHaveBeenCalledTimes(1)
    expect(api.closeAfterSave).toHaveBeenCalledTimes(1)
  })

  it('a cancelled save keeps the window open', async () => {
    ;(api.saveDesign as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    await render()
    await addTitle()
    await act(async () => saveThenClose!())
    expect(api.closeAfterSave).not.toHaveBeenCalled()
  })
})

describe('the empty page and the credit check', () => {
  it('shows what to do on an empty new design', async () => {
    await render()
    expect($('[data-hanpan="design-empty"]')).toBeNull()
    await fileItem('newDesign')
    expect($('[data-hanpan="design-empty"]')?.textContent).toContain('템플릿')
  })

  it('closes the credit check with Esc', async () => {
    await render()
    await click($('[data-action="credit-check"]'))
    expect($('[data-hanpan="credit-check"]')).not.toBeNull()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect($('[data-hanpan="credit-check"]')).toBeNull()
  })
})
