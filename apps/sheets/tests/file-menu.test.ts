/** @vitest-environment jsdom */
/**
 * The on-screen File menu (0.17 #6): open, save, save as, PDF and CSV export and print, the
 * way the slide editor shows them. Each item hands the same action the shell's ☰ menu sends
 * (`MenuAction`), so the app runs one handler for both.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FileMenu } from '../src/renderer/FileMenu'
import { LocaleProvider } from '../src/renderer/i18n/locale'

let container: HTMLElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  // the locale provider listens for language changes from the main process
  vi.stubGlobal('desktopApi', { onLanguageChanged: () => () => {} })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

async function render(onAction: (action: string) => void, hasWorkbook = true): Promise<void> {
  await act(async () => {
    root.render(
      createElement(LocaleProvider, {
        initial: 'ko',
        children: createElement(FileMenu, {
          hasWorkbook,
          canSave: hasWorkbook,
          canSaveAs: hasWorkbook,
          onAction,
        }),
      }),
    )
  })
}

const toggle = async () => {
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-action="file-menu"]')!.click()
  })
}

const items = () =>
  [...container.querySelectorAll<HTMLButtonElement>('[data-file]')].map((item) => ({
    id: item.dataset.file,
    label: item.textContent ?? '',
    disabled: item.disabled,
  }))

describe('the File menu', () => {
  it('is a button named 파일 that lists the file items in the slide editor order', async () => {
    await render(() => {})
    expect(container.querySelector('[data-action="file-menu"]')!.textContent).toBe('파일')
    expect(items()).toEqual([])
    await toggle()
    expect(items().map((item) => item.id)).toEqual([
      'open',
      'save',
      'save-as',
      'export-pdf',
      'export-png',
      'export-csv',
      'export-csv-all',
      'print',
    ])
    const labels = items().map((item) => item.label)
    expect(labels[0]).toContain('열기')
    expect(labels[2]).toContain('다른 이름으로 저장')
    expect(labels[4]).toContain('이미지')
    expect(labels[6]).toContain('모든 시트')
    expect(labels[7]).toContain('인쇄')
  })

  it('hands the menu action of the picked item and closes', async () => {
    const onAction = vi.fn()
    await render(onAction)
    for (const id of [
      'open',
      'save',
      'save-as',
      'export-pdf',
      'export-png',
      'export-csv',
      'export-csv-all',
      'print',
    ]) {
      await toggle()
      await act(async () => {
        container.querySelector<HTMLButtonElement>(`[data-file="${id}"]`)!.click()
      })
    }
    expect(onAction.mock.calls.map((call) => call[0])).toEqual([
      'open',
      'save',
      'save-as',
      'export-pdf',
      'export-png',
      'export-csv',
      'export-csv-all',
      'print',
    ])
    expect(items()).toEqual([])
  })

  it('keeps Open while no workbook is open, and greys out the rest', async () => {
    await render(() => {}, false)
    await toggle()
    const state = Object.fromEntries(items().map((item) => [item.id, item.disabled]))
    expect(state).toEqual({
      open: false,
      save: true,
      'save-as': true,
      'export-pdf': true,
      'export-png': true,
      'export-csv': true,
      'export-csv-all': true,
      print: true,
    })
  })
})

describe('the File menu in the workbook window', () => {
  // ExcelShell mounts Univer, which jsdom cannot run: pin the wiring in the source instead
  const source = (file: string) =>
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', file), 'utf8')

  it('stands first in the tab row and hands its actions to the ☰ menu handler', () => {
    const shell = source('src/renderer/ExcelShell.tsx')
    const tabRow = shell.indexOf('className={`ribbon-tabs')
    const fileMenu = shell.indexOf('<FileMenu', tabRow)
    expect(fileMenu).toBeGreaterThan(tabRow)
    expect(fileMenu).toBeLessThan(shell.indexOf('className="qa-btn"', tabRow))
    expect(shell).toContain('onAction={onFileAction}')
    expect(source('src/renderer/App.tsx')).toContain(
      'onFileAction={(action) => menuActionRef.current(action)}',
    )
  })
})

describe('the image and all-sheets CSV exports in the ☰ menu (0.17)', () => {
  const source = (file: string) =>
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', file), 'utf8')

  it('are items of the application File menu, sent as the same menu actions', () => {
    const main = source('src/main/sheets-main.ts')
    expect(main).toContain("click: () => sendMenuAction('export-png')")
    expect(main).toContain("click: () => sendMenuAction('export-csv-all')")
  })

  it('reach the renderer through the preload', () => {
    const preload = source('src/preload/index.ts')
    expect(preload).toContain("action === 'export-png'")
    expect(preload).toContain("action === 'export-csv-all'")
  })

  it('are run by the one menu handler', () => {
    const app = source('src/renderer/App.tsx')
    expect(app).toContain("action === 'export-png'")
    expect(app).toContain("action === 'export-csv-all'")
  })
})
