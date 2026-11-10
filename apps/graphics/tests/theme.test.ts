import { describe, expect, it, vi } from 'vitest'
import { resolveTheme, watchTheme } from '../src/renderer/theme'
import type { UiTheme } from '../src/shared/ipc'

describe('resolveTheme', () => {
  it('resolves the system setting by the OS', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

function fakeMedia(initial: boolean) {
  let handler: (() => void) | null = null
  const media = {
    matches: initial,
    addEventListener: (_: string, h: () => void) => void (handler = h),
    removeEventListener: () => void (handler = null),
  }
  return {
    media: media as unknown as MediaQueryList,
    flip(value: boolean) {
      media.matches = value
      handler?.()
    },
  }
}

describe('watchTheme', () => {
  it('follows Hanpan, and the OS only while the setting is system', async () => {
    let push: (t: UiTheme) => void = () => {}
    const api = {
      getTheme: async (): Promise<UiTheme> => 'system',
      onThemeChanged: (h: (t: UiTheme) => void) => {
        push = h
        return () => {}
      },
    }
    const os = fakeMedia(false)
    const seen: string[] = []
    const watch = await watchTheme(api, (t) => seen.push(t), os.media)
    expect(watch.theme).toBe('light')
    os.flip(true)
    expect(seen).toEqual(['dark'])
    push('light')
    expect(seen).toEqual(['dark', 'light'])
    os.flip(false)
    os.flip(true)
    // set to light: the OS no longer matters
    expect(seen).toEqual(['dark', 'light'])
    push('system')
    expect(seen.at(-1)).toBe('dark')
    watch.stop()
  })

  it('falls back to the OS when Hanpan cannot say', async () => {
    const api = {
      getTheme: vi.fn(async () => Promise.reject(new Error('no'))),
      onThemeChanged: () => () => {},
    }
    const watch = await watchTheme(api, () => {}, fakeMedia(true).media)
    expect(watch.theme).toBe('dark')
  })
})
