import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// markdown-main imports electron, so the dialogs are pinned by reading the source
const MAIN = '../src/main/markdown-main.ts'
const source = () => readFile(fileURLToPath(new URL(MAIN, import.meta.url)), 'utf8')

describe('markdown save/close dialogs (UX v2 #18, #23)', () => {
  it('each export names itself instead of the generic "Save As" title', async () => {
    const main = await source()
    for (const [ext, key] of [
      ['docx', 'dlgExportDocx'],
      ['odt', 'dlgExportOdt'],
      ['pdf', 'dlgExportPdf'],
    ] as const) {
      const at = main.indexOf(`defaultPath: \`\${safeName}.${ext}\``)
      expect(at, ext).toBeGreaterThan(0)
      expect(main.slice(Math.max(0, at - 300), at + 200), ext).toContain(`title: tm('${key}')`)
    }
  })

  it('the unsaved-changes prompt names the document', async () => {
    const main = await source()
    expect(main).toContain("tm('closeUnsavedNamedMsg', { name: docName })")
    expect(main).toMatch(
      /closeUnsavedNamedMsg: '‘\{name\}’에 저장하지 않은 변경 사항이 있습니다\.'/,
    )
  })
})
