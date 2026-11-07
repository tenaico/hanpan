// The on-screen File menu offers the tab bar ☰ menu's commands: open, save,
// save as, the exports and print (Hanpan 0.17 #6).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { buildExtensions } from '../src/renderer/editor/extensions'
import { Ribbon } from '../src/renderer/components/Ribbon'
import { strings } from '../src/renderer/i18n/strings'

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

// the test locale is zh (the module default)
const zh = strings.zh

function renderRibbon(disabled = false) {
  const editor = new Editor({
    extensions: buildExtensions({
      slashController: { onOpen() {}, onUpdate() {}, onKeyDown: () => false, onClose() {} },
      slashItems: () => [],
    }),
    content: '<p>doc</p>',
  })
  const handlers = {
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onExport: vi.fn(),
    onPrint: vi.fn(),
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const props = {
    ...handlers,
    disabled,
    dirty: true,
    onFind: vi.fn(),
    autoSave: false,
    onToggleAutoSave: vi.fn(),
    aiOpen: false,
    onToggleAi: vi.fn(),
    onAiPreset: vi.fn(),
    editor,
    imageEnabled: true,
    onInsertImage: vi.fn(),
    frontmatterOpen: false,
    onToggleFrontmatter: vi.fn(),
    outlineOpen: false,
    onToggleOutline: vi.fn(),
  }
  act(() => root.render(createElement(Ribbon, props as never)))
  cleanups.push(() => {
    act(() => root.unmount())
    editor.destroy()
    container.remove()
  })
  return { container, ...handlers }
}

function openMenu(container: HTMLElement): HTMLElement {
  const fileTab = container.querySelector<HTMLButtonElement>('.ribbon-tabs .ribbon-tab-file')
  expect(fileTab, 'a File button leads the top row').not.toBeNull()
  expect(fileTab!.textContent).toBe(zh.fileMenu)
  act(() => fileTab!.click())
  const menu = container.querySelector<HTMLElement>('.file-menu')
  expect(menu).not.toBeNull()
  return menu!
}

const item = (menu: HTMLElement, label: string) => {
  const button = [...menu.querySelectorAll('button')].find(
    (b) => b.firstChild?.textContent?.trim() === label,
  )
  expect(button, `menu item "${label}"`).toBeDefined()
  return button!
}

describe('Markdown File menu', () => {
  it('lists open, save, save as, the exports and print', () => {
    const { container } = renderRibbon()
    const menu = openMenu(container)
    const labels = [...menu.querySelectorAll('button')].map((b) =>
      b.firstChild?.textContent?.trim(),
    )
    expect(labels).toEqual([
      zh.fileMenuOpen,
      zh.fileMenuSave,
      zh.fileMenuSaveAs,
      zh.fileMenuExportDocx,
      zh.fileMenuExportOdt,
      zh.fileMenuExportPdf,
      zh.fileMenuExportImages,
      zh.fileMenuOpenInDocs,
      zh.fileMenuPrint,
    ])
  })

  it('runs the handlers the tab bar menu uses and closes', () => {
    const r = renderRibbon()
    const click = (label: string) => {
      const button = item(openMenu(r.container), label)
      act(() => button.click())
    }
    click(zh.fileMenuOpen)
    expect(r.onOpen).toHaveBeenCalledOnce()
    expect(r.container.querySelector('.file-menu')).toBeNull()
    click(zh.fileMenuSave)
    expect(r.onSave).toHaveBeenCalledOnce()
    click(zh.fileMenuSaveAs)
    expect(r.onSaveAs).toHaveBeenCalledOnce()
    const exports: Array<[string, string]> = [
      [zh.fileMenuExportDocx, 'docx'],
      [zh.fileMenuExportOdt, 'odt'],
      [zh.fileMenuExportPdf, 'pdf'],
      [zh.fileMenuExportImages, 'png'],
      [zh.fileMenuOpenInDocs, 'docs'],
    ]
    for (const [label, format] of exports) {
      click(label)
      expect(r.onExport).toHaveBeenLastCalledWith(format)
    }
    click(zh.fileMenuPrint)
    expect(r.onPrint).toHaveBeenCalledOnce()
  })

  it('keeps Open available while the document is not ready', () => {
    const { container } = renderRibbon(true)
    const menu = openMenu(container)
    expect(item(menu, zh.fileMenuOpen).disabled).toBe(false)
    expect(item(menu, zh.fileMenuExportPdf).disabled).toBe(true)
    expect(item(menu, zh.fileMenuPrint).disabled).toBe(true)
  })

  it('is wired to the same export and print flows as the shell menu, and Open asks the shell', () => {
    const app = readFileSync(resolve(__dirname, '../src/renderer/App.tsx'), 'utf8')
    expect(app).toMatch(/onExport=\{\(format\) => void runExport\(format\)\}/)
    expect(app).toMatch(/onPrint=\{\(\) => void printDoc\(\)\}/)
    expect(app).toMatch(/onOpen=\{\(\) =>\s+void window\.markdownApi\s*\.openFileDialog\(\)/)
    const preload = readFileSync(resolve(__dirname, '../src/preload/index.ts'), 'utf8')
    expect(preload).toContain("openFileDialog: () => ipcRenderer.invoke('app:open-file-dialog')")
  })
})
