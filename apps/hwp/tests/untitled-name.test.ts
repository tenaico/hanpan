// 0.17 review #12: a new HWP tab showed the bundled file's name "blank.hwp" in the editor's
// status bar. It shows the name the shell gives the tab ("제목 없는 한글 문서") instead.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { strings } from '../src/renderer/i18n/strings'

const shell = readFileSync(join(__dirname, '..', '..', 'shell', 'src', 'main', 'index.ts'), 'utf8')
const app = readFileSync(join(__dirname, '..', 'src', 'renderer', 'App.tsx'), 'utf8')

describe('the name of a new HWP document', () => {
  it('is the tab name the shell gives, in every language', () => {
    const shellNames = [...shell.matchAll(/untitledHwp: '([^']+)'/g)].map((m) => m[1])
    expect(shellNames).toHaveLength(LANGS.length)
    for (const lang of LANGS) expect(shellNames, lang).toContain(strings[lang].untitledHwp)
    expect(strings.ko.untitledHwp).toBe('제목 없는 한글 문서')
    expect(strings.vi.untitledHwp).toBe('HWP chưa có tiêu đề')
  })

  it('is what the editor gets for the blank document, not the bundled file name', () => {
    expect(app).not.toContain("'blank.hwp'")
    expect(app).toMatch(/loadFile\(blank, tNow\('untitledHwp'\)/)
  })
})
