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

installScreenTips()

// before the app's frame exists: the frame's own take then gets nothing
if (!takeGraphicsApi()) throw new Error('the graphics bridge is missing or was already taken')

/**
 * The editors in the frame are dark whatever Hanpan's theme, so the tab's own bar, AI panel and
 * dialogs stay dark with them: one theme in one tab (0.17 review v2, G7).
 */
function applyTheme(): void {
  document.documentElement.setAttribute('data-theme', 'dark')
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
  applyTheme()
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <App kind={kind} lang={lang} probeWeb={probeWeb} />
    </LocaleProvider>,
  )
})()
