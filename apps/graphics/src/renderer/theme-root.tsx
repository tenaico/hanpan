import { useEffect, useState, type ReactNode } from 'react'
import type { ResolvedTheme, ThemeWatch } from './theme'

/**
 * Renders the tab and re-renders it when Hanpan's theme changes (the frame is not restarted).
 * A change between the first render and the subscription reaches no one, so the root reads the
 * theme of the moment once it has subscribed.
 */
export function ThemeRoot({
  watch,
  subscribe,
  children,
}: {
  watch: ThemeWatch
  subscribe: (set: (theme: ResolvedTheme) => void) => void
  children: (theme: ResolvedTheme) => ReactNode
}) {
  const [theme, setTheme] = useState<ResolvedTheme>(watch.theme)
  useEffect(() => {
    subscribe(setTheme)
    setTheme(watch.theme)
  }, [subscribe, watch])
  return <>{children(theme)}</>
}
