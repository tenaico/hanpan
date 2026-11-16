import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import { applyKoreanDocFeatures, installScreenTips } from '@genoffice/ui'
import App from './App'
import { LocaleProvider } from './i18n/locale'
import type { UiTheme } from '../shared/ipc'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import './styles.css'

installScreenTips()

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

void (async () => {
  const [lang, theme, koreanDocs] = await Promise.all([
    window.cadApi.getLanguage().catch(() => 'zh' as const),
    window.cadApi.getTheme().catch(() => 'system' as const),
    window.cadApi.getKoreanDocFeatures?.().catch(() => null) ?? null,
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  window.cadApi.onThemeChanged(applyTheme)
  // Hanpan: the Korean document features follow the shell's switch (decision 0091)
  applyKoreanDocFeatures(koreanDocs)
  window.cadApi.onKoreanDocFeaturesChanged?.(applyKoreanDocFeatures)
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <App />
    </LocaleProvider>,
  )
})()
