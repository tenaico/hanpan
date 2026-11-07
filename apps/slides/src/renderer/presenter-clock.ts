import type { Lang } from '@genoffice/i18n'
import { DATE_LOCALES } from './i18n/locale'

/**
 * 발표자 보기 오른쪽 위 시계. 화면 언어의 시각 표기를 따른다:
 * 12시간제 언어는 오전/오후(AM/PM)를 붙이고, 24시간제 언어는 그대로 쓴다.
 */
export function fmtWallClock(d: Date, lang: Lang): string {
  return d.toLocaleTimeString(DATE_LOCALES[lang], { hour: 'numeric', minute: '2-digit' })
}
