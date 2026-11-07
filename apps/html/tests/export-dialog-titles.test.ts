import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// html-main imports electron, so the save dialogs are pinned by reading the source
const MAIN = '../src/main/html-main.ts'
const source = () => readFile(fileURLToPath(new URL(MAIN, import.meta.url)), 'utf8')

describe('export save dialogs', () => {
  it('each export names itself instead of the generic "Save As" title', async () => {
    const main = await source()
    for (const [ext, key] of [
      ['docx', 'dlgExportDocx'],
      ['odt', 'dlgExportOdt'],
      ['pdf', 'dlgExportPdf'],
    ] as const) {
      const at = main.indexOf(`extensions: ['${ext}']`)
      expect(at, ext).toBeGreaterThan(0)
      const before = main.slice(Math.max(0, at - 400), at)
      expect(before, ext).toContain(`title: tm('${key}')`)
    }
    const single = main.indexOf('singleFileExportBaseName(exportFileName')
    expect(main.slice(single - 300, single)).toContain("title: tm('dlgExportHtml')")
  })
})
