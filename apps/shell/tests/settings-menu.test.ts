import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { settingsMenuItem } from '../src/main/settings-menu'

// 0.17 리뷰 #5: 설정으로 가는 길이 왼쪽 아래 계정 칩뿐이었다. ☰ 메뉴에도 "설정…"을 둔다.
describe('the Settings item of the ☰ menu', () => {
  it('reads 설정… in Korean and Settings… elsewhere, with the Ctrl+, hint', () => {
    const open = vi.fn()
    const ko = settingsMenuItem('ko', open)
    expect(ko.label).toBe('설정…')
    expect(ko.accelerator).toBe('CmdOrCtrl+,')
    // the key itself is handled by the tab shortcuts (Word keeps Ctrl+, inside a document)
    expect(ko.registerAccelerator).toBe(false)
    ;(ko.click as () => void)()
    expect(open).toHaveBeenCalledTimes(1)
    expect(settingsMenuItem('en', open).label).toBe('Settings…')
    expect(settingsMenuItem('ja', open).label).toBe('設定…')
  })

  it('shows the Ctrl+, hint only on Home, where the key opens Settings (0.17 review v2 #21)', () => {
    const item = settingsMenuItem('ko', vi.fn(), false)
    expect(item.accelerator).toBeUndefined()
  })

  it('is in the ☰ popup for every tab and opens Home on the general section', () => {
    const source = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    const handler = source.slice(source.indexOf('TABS_CHANNELS.showAppMenu'))
    expect(handler.slice(0, handler.indexOf('appMenuPopupTemplate('))).toContain(
      "settingsMenuItem(currentLang(), () => openSettingsFromMenu(), front?.kind === 'home')",
    )
    expect(source).toContain('openSettings: () => openSettingsFromMenu()')
  })
})
