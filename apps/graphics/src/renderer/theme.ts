/**
 * Hanpan's theme as the tab sees it: the setting ("light", "dark" or "system") resolved to the
 * colours the tab and the app in its frame draw with. "System" follows the OS and keeps following
 * it while the setting stays "system".
 */
import type { GraphicsApi, UiTheme } from '../shared/ipc'

export type ResolvedTheme = 'light' | 'dark'

export function resolveTheme(setting: UiTheme, prefersDark: boolean): ResolvedTheme {
  if (setting === 'system') return prefersDark ? 'dark' : 'light'
  return setting
}

export interface ThemeWatch {
  /** the theme of the moment (read when asked, so it is never the first value alone) */
  readonly theme: ResolvedTheme
  stop(): void
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Reads Hanpan's theme and reports every change of the resolved theme to `onChange` (the first
 * value is returned, not reported). `media` is the OS colour-scheme query (a test passes its own).
 */
export async function watchTheme(
  api: Pick<GraphicsApi, 'getTheme' | 'onThemeChanged'>,
  onChange: (theme: ResolvedTheme) => void,
  media: MediaQueryList | null = typeof matchMedia === 'function' ? matchMedia(DARK_QUERY) : null,
): Promise<ThemeWatch> {
  let setting: UiTheme = await api.getTheme().catch(() => 'system' as const)
  let current = resolveTheme(setting, media?.matches ?? false)
  const update = (): void => {
    const next = resolveTheme(setting, media?.matches ?? false)
    if (next === current) return
    current = next
    onChange(next)
  }
  const offApp = api.onThemeChanged((next) => {
    setting = next
    update()
  })
  media?.addEventListener('change', update)
  return {
    get theme() {
      return current
    },
    stop: () => {
      offApp()
      media?.removeEventListener('change', update)
    },
  }
}
