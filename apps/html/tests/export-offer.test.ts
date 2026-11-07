import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ExportedFiles } from '../src/main/exported-files'
import { exportedFileLabel } from '../src/renderer/export-offer'

const MAIN = '../src/main/html-main.ts'
const APP = '../src/renderer/App.tsx'
const source = (relative: string) =>
  readFile(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')

describe('after an export the tab stays put', () => {
  it('main remembers the exported file instead of opening it in a new tab', async () => {
    const main = await source(MAIN)
    for (const channel of ['HTML_CHANNELS.exportPdf,', 'HTML_CHANNELS.exportDocx,']) {
      const handler = main.slice(main.indexOf(channel), main.indexOf(channel) + 2500)
      expect(handler, channel).not.toMatch(/openExported(Pdf|Docx)\(/)
      expect(handler, channel).toContain('exportedFiles.remember(')
    }
    expect(main).toMatch(/ipcMain\.handle\(HTML_CHANNELS\.openExported,/)
    expect(main).toMatch(/ipcMain\.handle\(HTML_CHANNELS\.revealExported,/)
  })

  it('the status bar offers Open / Open folder for it', async () => {
    const app = await source(APP)
    expect(app).toContain('window.htmlApi.openExported(')
    expect(app).toContain('window.htmlApi.revealExported(')
  })

  it('names the file, not its full path', () => {
    expect(exportedFileLabel(String.raw`C:\Users\ten\long\안내문.pdf`)).toBe('안내문.pdf')
    expect(exportedFileLabel(undefined)).toBe('')
  })

  it('only lets a tab open what it exported itself', () => {
    const files = new ExportedFiles()
    files.remember(1, '/x/a.pdf')
    expect(files.allows(1, '/x/a.pdf')).toBe(true)
    expect(files.allows(2, '/x/a.pdf')).toBe(false)
    expect(files.allows(1, 42)).toBe(false)
    files.forget(1)
    expect(files.allows(1, '/x/a.pdf')).toBe(false)
  })
})
