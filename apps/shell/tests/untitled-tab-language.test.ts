import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 화면 언어를 바꿔도 아직 제목이 없는 탭("제목 없는 한글 문서", "제목 없는 문서 2")은 예전 언어로
 * 남았다. 언어를 바꾸면 그 탭들이 새 언어의 이름을 받는다(저장한 파일은 이름 그대로).
 * index.ts는 Electron 없이 돌 수 없어서 소스를 읽어 확인한다; 이름을 바꾸는 동작 자체는
 * tab-manager.test.ts가 본다.
 */
const index = readFileSync(fileURLToPath(new URL('../src/main/index.ts', import.meta.url)), 'utf8')

describe('a UI language change', () => {
  const handler = index.slice(
    index.indexOf('ipcMain.handle(HOME_CHANNELS.setLanguage'),
    index.indexOf('ipcMain.handle(HOME_CHANNELS.getUpdateChannel'),
  )

  it('renames the untitled tabs from the names of the language it leaves', () => {
    expect(handler).toMatch(/const before = currentLang\(\)/)
    expect(handler).toMatch(
      /persistLang\(lang\)[\s\S]*tabManager\?\.retitleUntitled\(\(kind\) => untitledTabTitle\(kind, before\)\)/,
    )
  })

  it('renames the untitled detached windows the same way', () => {
    expect(handler).toMatch(
      /persistLang\(lang\)[\s\S]*retitleUntitledDetached\(\s*\(kind\) => untitledTabTitle\(kind, before\),\s*\(kind\) => untitledTabTitle\(kind, lang\),?\s*\)/,
    )
  })

  it('names a new tab and an old one the same way', () => {
    // the tab manager gets its names from the same function the rename compares with
    expect(index).toMatch(/\(kind\) => untitledTabTitle\(kind, currentLang\(\)\)/)
    expect(index).toMatch(/function untitledTabTitle\(kind: TabKind, lang: Lang\): string/)
  })
})
