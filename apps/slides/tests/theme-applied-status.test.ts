// 테마 적용 상태줄: 갤러리와 같은 번역 이름을 쓰고 "을(를)" 같은 조사 꼼수를 쓰지 않는다(0.17 UX v2 #12)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyThemePreset } from '../src/renderer/style-actions'
import { THEME_PRESETS } from '../src/renderer/themes'
import { setModuleLang } from '../src/renderer/i18n/locale'
import type { ActionCtx } from '../src/renderer/action-context'

afterEach(() => {
  vi.unstubAllGlobals()
  setModuleLang('zh')
})

async function statusFor(lang: 'ko' | 'vi', id: string): Promise<string> {
  setModuleLang(lang)
  vi.stubGlobal('window', { slidesApi: { applyTheme: vi.fn(async () => []) } })
  const setStatus = vi.fn()
  const noop = (): void => {}
  const ctx = {
    slide: {},
    setSlides: noop,
    setSelectedIds: noop,
    setEditing: noop,
    setDirty: noop,
    setStatus,
  } as unknown as ActionCtx
  const preset = THEME_PRESETS.find((p) => p.id === id)!
  await applyThemePreset(ctx, preset)
  return setStatus.mock.calls[0][0] as string
}

describe('theme applied status', () => {
  it('ko: gallery name, no 을(를)', async () => {
    const s = await statusFor('ko', 'midnight')
    expect(s).toContain('미드나이트')
    expect(s).not.toContain('Midnight')
    expect(s).not.toContain('(를)')
  })
  it('vi: gallery name', async () => {
    const s = await statusFor('vi', 'graphite')
    expect(s).toContain('Than chì')
    expect(s).not.toContain('Graphite')
  })
})
