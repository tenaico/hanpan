/**
 * The apps of the new card and "모든 앱" (spec 7.4): which apps this build and
 * these settings offer, their names, their one-line descriptions and what
 * starts them. Starting an app records it first, for "최근에 쓴 앱".
 */
import type { ReactElement } from 'react'
import { APP_KEYS, type AppKey } from '../../../shared/home-apps'
import type { HomeAppCard } from '../HomeWidgets'
import type { StringKey } from '../locale'

export interface HomeAppsDeps {
  t: (key: StringKey) => string
  koreanDocs: boolean
  /** the Hanpan features this build has */
  offers: { templates: boolean; design: boolean; converter: boolean }
  iconFor: (key: AppKey) => ReactElement
  actions: Record<AppKey, () => unknown>
  onLaunch: (key: AppKey) => void
}

/** the name key and the one-line description key of each app */
const APP_TEXT: Record<AppKey, { title: StringKey; sub: StringKey }> = {
  xmind: { title: 'newMindmap', sub: 'hpCardMapSub' },
  hwp: { title: 'newHwp', sub: 'hpCardHwpSub' },
  pptx: { title: 'newSlide', sub: 'hpCardPptSub' },
  docx: { title: 'newDoc', sub: 'hbAppDocxSub' },
  xlsx: { title: 'newSheet', sub: 'hbAppXlsxSub' },
  md: { title: 'newMarkdown', sub: 'hbAppMdSub' },
  html: { title: 'newHtml', sub: 'hbAppHtmlSub' },
  templates: { title: 'hpTemplatesCard', sub: 'hpTemplatesCardSub' },
  pdf: { title: 'newPdf', sub: 'hbAppPdfSub' },
  'pdf-tools': { title: 'pdfToolsCard', sub: 'pdfToolsCardSub' },
  'md-convert': { title: 'hpConvCard', sub: 'hpConvCardSub' },
  photo: { title: 'newPhoto', sub: 'hpPhotoTip' },
  illust: { title: 'newIllust', sub: 'hpIllustTip' },
  design: { title: 'hpDesignCard', sub: 'hpDesignCardSub' },
  open: { title: 'openLocal', sub: 'hbAppOpenSub' },
}

function isOffered(key: AppKey, deps: HomeAppsDeps): boolean {
  switch (key) {
    case 'hwp':
      return deps.koreanDocs
    case 'templates':
      return deps.koreanDocs && deps.offers.templates
    case 'design':
      return deps.koreanDocs && deps.offers.design
    case 'md-convert':
      return deps.offers.converter
    default:
      return true
  }
}

/** the apps this build and these settings offer, in APP_KEYS order */
export function buildHomeApps(deps: HomeAppsDeps): HomeAppCard[] {
  return APP_KEYS.filter((key) => isOffered(key, deps)).map((key) => ({
    key,
    title: deps.t(APP_TEXT[key].title),
    sub: deps.t(APP_TEXT[key].sub),
    icon: deps.iconFor(key),
    action: () => {
      deps.onLaunch(key)
      return deps.actions[key]()
    },
  }))
}
