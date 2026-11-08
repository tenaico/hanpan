import { readAppSettings } from './app-settings'

/** app-settings.json key of Hanpan's Korean document features switch (decision 0091) */
export const KOREAN_DOC_FEATURES_KEY = 'koreanDocFeatures'

/** the stored switch: true or false once the user set it, null before (the UI language decides) */
export function readKoreanDocFeatures(settingsPath: string): boolean | null {
  const value = readAppSettings(settingsPath)[KOREAN_DOC_FEATURES_KEY]
  return typeof value === 'boolean' ? value : null
}
