import type { SlideThemePreset } from './themes'
import { t, type StringKey } from './i18n/locale'

// 화면에 보이는 테마 이름(번역). tp.name은 theme*.xml에 쓰는 이름이라 그대로 둔다.
const THEME_NAME: Record<string, StringKey> = {
  office: 'ribbonThemeOffice',
  ember: 'ribbonThemeEmber',
  indigo: 'ribbonThemeIndigo',
  forest: 'ribbonThemeForest',
  cream: 'ribbonThemeCream',
  rose: 'ribbonThemeRose',
  graphite: 'ribbonThemeGraphite',
  midnight: 'ribbonThemeMidnight',
}

export const themeDisplayName = (tp: SlideThemePreset): string =>
  THEME_NAME[tp.id] ? t(THEME_NAME[tp.id]) : tp.name
