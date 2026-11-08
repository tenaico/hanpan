import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { htmlLang } from '@genoffice/i18n'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/ai-model-picker.css'
import './design.css'
import { DesignBoard, type DesignApi } from './DesignBoard'
import { registerBundledFonts } from './fonts'

type Theme = 'light' | 'dark' | 'system'

declare global {
  interface Window {
    hanpanDesign: DesignApi & {
      getInit(): Promise<{ lang: string; theme: Theme; outline?: string }>
      onThemeChanged(handler: (theme: Theme) => void): () => void
      onLanguageChanged(handler: (lang: string) => void): () => void
    }
  }
}

function applyTheme(theme: Theme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

/** The board in the UI language, redrawn in a new one when Settings changes it. */
function Root(p: { lang: string; outline: string | undefined }) {
  const [lang, setLang] = useState(p.lang)
  useEffect(
    () =>
      api.onLanguageChanged((next) => {
        document.documentElement.lang = htmlLang(next as never)
        setLang(next)
      }),
    [],
  )
  return <DesignBoard lang={lang} api={api} outline={p.outline} />
}

registerBundledFonts()
const api = window.hanpanDesign
void api.getInit().then(({ lang, theme, outline }) => {
  applyTheme(theme)
  api.onThemeChanged(applyTheme)
  document.documentElement.lang = htmlLang(lang as never)
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Root lang={lang} outline={outline} />
    </React.StrictMode>,
  )
})
