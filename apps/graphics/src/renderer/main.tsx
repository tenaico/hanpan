import { useEffect, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import { installScreenTips } from '@genoffice/ui'
import App from './App'
import { LocaleProvider } from './i18n/locale'
import { APP_GLOBAL, GRAPHICS_KINDS, type GraphicsKind } from '../shared/kinds'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import './styles.css'
import { graphicsApi, takeGraphicsApi } from './bridge'
import { watchTheme, type ResolvedTheme, type ThemeWatch } from './theme'

installScreenTips()

// before the app's frame exists: the frame's own take then gets nothing
if (!takeGraphicsApi()) throw new Error('the graphics bridge is missing or was already taken')

/** The tab's own bar, AI panel and dialogs take their colours from this attribute. */
function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

/** Renders the tab and re-renders it when Hanpan's theme changes (the frame is not restarted). */
function Root({
  watch,
  subscribe,
  children,
}: {
  watch: ThemeWatch
  subscribe: (set: (theme: ResolvedTheme) => void) => void
  children: (theme: ResolvedTheme) => ReactNode
}) {
  const [theme, setTheme] = useState<ResolvedTheme>(watch.theme)
  useEffect(() => subscribe(setTheme), [subscribe])
  return <>{children(theme)}</>
}

const requested = new URLSearchParams(location.search).get('kind')
const kind: GraphicsKind = GRAPHICS_KINDS.find((k) => k === requested) ?? 'illust'

/**
 * The web build is there when its page is the app's own. In the app, main reads
 * it (the host page's origin does not serve the app); the dev server answers
 * unknown paths with the host page, hence the marker.
 */
async function probeWeb(): Promise<boolean> {
  if (location.protocol === 'genoffice-app:') return graphicsApi().webPresent()
  const response = await fetch(`./web/${kind}/index.html`)
  return response.ok && (await response.text()).includes(`${APP_GLOBAL[kind]}_`)
}

void (async () => {
  const lang = await graphicsApi()
    .getLanguage()
    .catch(() => 'en' as Lang)
  document.documentElement.lang = htmlLang(lang)
  document.documentElement.dir = htmlDir(lang)
  let setTheme: ((theme: ResolvedTheme) => void) | null = null
  const watch = await watchTheme(graphicsApi(), (theme) => {
    applyTheme(theme)
    setTheme?.(theme)
  })
  applyTheme(watch.theme)
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <Root
        watch={watch}
        subscribe={(set) => {
          setTheme = set
        }}
      >
        {(theme) => <App kind={kind} lang={lang} theme={theme} probeWeb={probeWeb} />}
      </Root>
    </LocaleProvider>,
  )
})()
