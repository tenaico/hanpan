import { useKoreanDocFeatures } from '@genoffice/ui'
import type { StringKey } from '../i18n/locale'
import { useI18n } from '../i18n/locale'
import type { SendTarget } from './send'

/**
 * Where "send" goes, as the mind map decides it (decision 0091): a Hangul
 * document (HWPX) while the Korean document features are on, a Word document
 * when they are off. Follows the switch while the tab is open.
 */
export function useSendTarget(): { target: SendTarget; label: StringKey } {
  const { lang } = useI18n()
  const korean = useKoreanDocFeatures(lang)
  return korean ? { target: 'hwp', label: 'sendHwp' } : { target: 'docx', label: 'sendDocx' }
}
