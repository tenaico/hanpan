import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import App from './App'
import { LocaleProvider } from './i18n/locale'
import type { UiTheme } from '../shared/ipc'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import '@genoffice/ui/ai-model-picker.css'
import '@genoffice/ui/ai-queue-strip.css'
import '@genoffice/ui/ai-usage.css'
import '@genoffice/ui/ai-scope-quote.css'
import '@genoffice/ui/dropdown.css'
import '@genoffice/ui/markdown.css'
import '@genoffice/ui/ai-panel-prefs.css'
import '@genoffice/ui/gongu-picker.css'
import './styles.css'
import './ai-panel.css'
import './dialog-theme.css'
import {
  applyAiPanelPrefs,
  applyKoreanDocFeatures,
  installAiHelperHint,
  installScreenTips,
} from '@genoffice/ui'

installScreenTips()
installAiHelperHint('hwp')

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

void (async () => {
  const [lang, theme, koreanDocs] = await Promise.all([
    window.hwpApi.getLanguage().catch(() => 'zh' as const),
    window.hwpApi.getTheme().catch(() => 'system' as const),
    window.hwpApi.getKoreanDocFeatures?.().catch(() => null) ?? null,
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  window.hwpApi.onThemeChanged(applyTheme)
  await window.hwpApi
    .getAiPanelPrefs()
    .then(applyAiPanelPrefs)
    .catch(() => {})
  window.hwpApi.onAiPanelPrefsChanged(applyAiPanelPrefs)
  // Hanpan: the tools button follows the shell's Korean document features switch (decision 0091)
  applyKoreanDocFeatures(koreanDocs)
  window.hwpApi.onKoreanDocFeaturesChanged?.(applyKoreanDocFeatures)
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <App />
    </LocaleProvider>,
  )
})()
