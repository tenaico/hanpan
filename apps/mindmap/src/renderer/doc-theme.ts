import type { DocTheme } from '../shared/ipc'

/**
 * Settings › Document page theme, as `data-doc-theme` on the page. Absent
 * means "follow the app". `styles.css` reads it to show a light map dark on
 * screen; the map's colours and everything made from them stay the file's.
 */
export function applyDocumentTheme(theme: DocTheme): void {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-doc-theme', theme)
  else root.removeAttribute('data-doc-theme')
}
