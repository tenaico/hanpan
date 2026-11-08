import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MARKDOWN_CHANNELS } from '../src/shared/ipc'

// main/preload import electron and App.tsx the whole editor, so the wiring is
// pinned by reading the sources (same approach as apps/html print-request.test.ts)
const source = (relative: string) =>
  readFile(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')

describe('markdown print wiring', () => {
  it('never prints from the tab itself (window.print blocked the tab on a stuck dialog)', async () => {
    const app = await source('../src/renderer/App.tsx')
    expect(app).not.toMatch(/\.print\(\)/)
    expect(app).toContain('<DocumentPrintDialog')
    expect(app).toMatch(/window\.markdownApi\s*\.printDocument\(/)
  })

  it('runs the job in main and aborts it on quit', async () => {
    const [preload, main] = await Promise.all([
      source('../src/preload/index.ts'),
      source('../src/main/markdown-main.ts'),
    ])
    expect(MARKDOWN_CHANNELS.printDocument).toBe('markdown:print-document')
    expect(preload).toMatch(/printDocument:.*MARKDOWN_CHANNELS\.printDocument/)
    expect(preload).toMatch(/listPrinters:.*MARKDOWN_CHANNELS\.listPrinters/)
    expect(main).toMatch(/ipcMain\.handle\(MARKDOWN_CHANNELS\.printDocument,/)
    expect(main).toMatch(/app\.on\('before-quit', \(\) => documentPrinter\.abortAll\(\)\)/)
  })
})
