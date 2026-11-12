import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import App from './App'
import { LocaleProvider } from './i18n/locale'
import type { UiTheme } from '../shared/ipc'
import { applyDocumentTheme } from './doc-theme'
import { applyKoreanDocFeatures, installAiHelperHint, installScreenTips } from '@genoffice/ui'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import '@genoffice/ui/dropdown.css'
import 'mind-elixir/style.css'
import './styles.css'
import './map.css'

installScreenTips()
installAiHelperHint('mindmap')

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

void (async () => {
  const [lang, theme, docTheme, koreanDocs] = await Promise.all([
    window.mindmapApi.getLanguage().catch(() => 'zh' as const),
    window.mindmapApi.getTheme().catch(() => 'system' as const),
    window.mindmapApi.getDocumentTheme?.().catch(() => 'follow' as const),
    window.mindmapApi.getKoreanDocFeatures?.().catch(() => null) ?? null,
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  window.mindmapApi.onThemeChanged(applyTheme)
  // a light map is shown dark on a dark page (0.17 review v2 slides-mindmap #37)
  applyDocumentTheme(docTheme ?? 'follow')
  window.mindmapApi.onDocumentThemeChanged?.(applyDocumentTheme)
  // Hanpan: the Korean export targets follow the shell's switch (decision 0091)
  applyKoreanDocFeatures(koreanDocs)
  window.mindmapApi.onKoreanDocFeaturesChanged?.(applyKoreanDocFeatures)
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <App />
    </LocaleProvider>,
  )
})()
