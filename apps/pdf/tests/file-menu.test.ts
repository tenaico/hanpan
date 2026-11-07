// The on-screen File menu offers the tab bar ☰ menu's commands: open, save,
// save as, the exports and print (Hanpan 0.17 #6).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { FileMenu } from '../src/renderer/FileMenu'
import { strings } from '../src/renderer/i18n/strings'
import { t } from '../src/renderer/i18n/locale'

const zh = strings.zh

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

function render(over: { saveDisabled?: boolean; busy?: boolean } = {}) {
  const handlers = {
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onConvert: vi.fn(),
    onConvertDialog: vi.fn(),
    onPrint: vi.fn(),
    onExportImages: vi.fn(),
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() =>
    root.render(
      createElement(FileMenu, {
        t,
        saveDisabled: over.saveDisabled ?? false,
        busy: over.busy ?? false,
        ...handlers,
      }),
    ),
  )
  cleanups.push(() => {
    act(() => root.unmount())
    host.remove()
  })
  const open = () => {
    const tab = host.querySelector<HTMLButtonElement>('.ribbon-tab-file')
    expect(tab).not.toBeNull()
    expect(tab!.textContent).toBe(zh.fileMenu)
    act(() => tab!.click())
    const menu = host.querySelector<HTMLElement>('.pdf-file-menu')
    expect(menu).not.toBeNull()
    return menu!
  }
  const item = (label: string) => {
    const b = [...open().querySelectorAll('button')].find(
      (x) => x.firstChild?.textContent?.trim() === label,
    )
    expect(b, label).toBeDefined()
    return b!
  }
  return { host, open, item, ...handlers }
}

describe('PDF File menu', () => {
  it('lists open, save, save as, the exports and print', () => {
    const r = render()
    const labels = [...r.open().querySelectorAll('button')].map((b) =>
      b.firstChild?.textContent?.trim(),
    )
    expect(labels).toEqual([
      zh.fileMenuOpen,
      zh.fileMenuSave,
      zh.fileMenuSaveAs,
      zh.fileMenuExportDocx,
      zh.fileMenuExportXlsx,
      zh.fileMenuExportPptx,
      zh.fileMenuExportMd,
      zh.fileMenuExportEpub,
      zh.fileMenuExportImages,
      zh.fileMenuPrint,
    ])
  })

  it('runs the handlers the tab bar menu uses and closes', () => {
    const r = render()
    const press = (label: string) => {
      const b = r.item(label)
      act(() => b.click())
      expect(r.host.querySelector('.pdf-file-menu')).toBeNull()
    }
    press(zh.fileMenuOpen)
    expect(r.onOpen).toHaveBeenCalledOnce()
    press(zh.fileMenuSave)
    expect(r.onSave).toHaveBeenCalledOnce()
    press(zh.fileMenuSaveAs)
    expect(r.onSaveAs).toHaveBeenCalledOnce()
    press(zh.fileMenuExportDocx)
    expect(r.onConvert).toHaveBeenLastCalledWith('docx')
    press(zh.fileMenuExportXlsx)
    expect(r.onConvert).toHaveBeenLastCalledWith('xlsx')
    press(zh.fileMenuExportPptx)
    expect(r.onConvert).toHaveBeenLastCalledWith('pptx')
    press(zh.fileMenuExportMd)
    expect(r.onConvertDialog).toHaveBeenLastCalledWith('md')
    press(zh.fileMenuExportEpub)
    expect(r.onConvertDialog).toHaveBeenLastCalledWith('epub')
    press(zh.fileMenuExportImages)
    expect(r.onExportImages).toHaveBeenCalledOnce()
    press(zh.fileMenuPrint)
    expect(r.onPrint).toHaveBeenCalledOnce()
  })

  it('disables Save with nothing to save and the exports while one runs', () => {
    const r = render({ saveDisabled: true, busy: true })
    const buttons = [...r.open().querySelectorAll('button')]
    const find = (label: string) =>
      buttons.find((b) => b.firstChild?.textContent?.trim() === label)!
    expect(find(zh.fileMenuSave).disabled).toBe(true)
    expect(find(zh.fileMenuExportDocx).disabled).toBe(true)
    expect(find(zh.fileMenuOpen).disabled).toBe(false)
  })

  it('is wired to the ribbon flows, and Open / Save As ask the shell', () => {
    const app = readFileSync(resolve(__dirname, '../src/renderer/App.tsx'), 'utf8')
    expect(app).toContain('<FileMenu')
    expect(app).toMatch(/onConvert=\{\(format\) => void convertTo\(format\)\}/)
    expect(app).toMatch(/onConvertDialog=\{openConvertDialog\}/)
    expect(app).toMatch(/onPrint=\{openPrintDlg\}/)
    // the spreadsheet File menu has an image export too (UI/UX review P10)
    expect(app).toMatch(/onExportImages=\{\(\) => void exportImages\(true\)\}/)
    expect(strings.ko.fileMenuExportImages).toBe('이미지(PNG)로 내보내기…')
    expect(app).toMatch(/onOpen=\{\(\) =>\s+void window\.pdfApi\s*\.openFileDialog\(\)/)
    expect(app).toMatch(/onSaveAs=\{\(\) =>\s+void window\.pdfApi\s*\.saveAsDialog\(\)/)
    const preload = readFileSync(resolve(__dirname, '../src/preload/index.ts'), 'utf8')
    expect(preload).toContain("openFileDialog: () => ipcRenderer.invoke('app:open-file-dialog')")
    expect(preload).toContain('saveAsDialog: () => ipcRenderer.invoke(PDF_CHANNELS.saveAsDialog)')
  })
})
