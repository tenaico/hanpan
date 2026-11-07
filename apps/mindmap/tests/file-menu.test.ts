/**
 * @vitest-environment jsdom
 */
// The on-screen File menu (0.17 #6): open, save, save as, the three exports and print, the
// way the slide editor shows them. Each item runs the handler the shell's menu already uses.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { FileMenu } from '../src/renderer/components/FileMenu'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { MindmapApi } from '../src/shared/ipc'

let container: HTMLElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  ;(window as unknown as { mindmapApi: Partial<MindmapApi> }).mindmapApi = {
    onLanguageChanged: () => () => {},
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

function handlers() {
  return {
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onExport: vi.fn(),
    onPrint: vi.fn(),
  }
}

async function render(h: ReturnType<typeof handlers>, disabled = false): Promise<void> {
  await act(async () => {
    root.render(
      createElement(LocaleProvider, {
        initial: 'ko',
        children: createElement(FileMenu, { disabled, ...h }),
      }),
    )
  })
}

async function openMenu(): Promise<void> {
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-action="file-menu"]')!.click()
  })
}

const items = () =>
  [...container.querySelectorAll<HTMLButtonElement>('[data-file]')].map((item) => ({
    id: item.dataset.file,
    label: item.querySelector('.mm-file-label')?.textContent ?? item.textContent,
    disabled: item.disabled,
  }))

describe('the File menu', () => {
  it('is a labelled button that opens the file items in the slide editor order', async () => {
    await render(handlers())
    const button = container.querySelector<HTMLButtonElement>('[data-action="file-menu"]')!
    expect(button.textContent).toBe('파일')
    expect(items()).toEqual([])
    await openMenu()
    expect(items().map((item) => item.id)).toEqual([
      'open',
      'save',
      'save-as',
      'export-png',
      'export-pdf',
      'export-markdown',
      'print',
    ])
    expect(items().map((item) => item.label)).toContain('열기…')
    expect(items().map((item) => item.label)).toContain('인쇄…')
  })

  it('runs the handler of the picked item and closes', async () => {
    const h = handlers()
    await render(h)
    const pick = async (id: string) => {
      await openMenu()
      await act(async () => {
        container.querySelector<HTMLButtonElement>(`[data-file="${id}"]`)!.click()
      })
    }
    await pick('open')
    await pick('save')
    await pick('save-as')
    await pick('export-png')
    await pick('export-pdf')
    await pick('export-markdown')
    await pick('print')
    expect(h.onOpen).toHaveBeenCalledTimes(1)
    expect(h.onSave).toHaveBeenCalledTimes(1)
    expect(h.onSaveAs).toHaveBeenCalledTimes(1)
    expect(h.onExport.mock.calls).toEqual([['png'], ['pdf'], ['markdown']])
    expect(h.onPrint).toHaveBeenCalledTimes(1)
    expect(items()).toEqual([])
  })

  it('keeps Open while no map is open, and greys out the rest', async () => {
    await render(handlers(), true)
    await openMenu()
    const state = Object.fromEntries(items().map((item) => [item.id, item.disabled]))
    expect(state.open).toBe(false)
    expect(state.save).toBe(true)
    expect(state.print).toBe(true)
  })
})
