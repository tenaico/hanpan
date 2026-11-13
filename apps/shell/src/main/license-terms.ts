import { join } from 'node:path'

/**
 * The installer's license and disclaimer (spec 2026-11-12 5-6): one Korean
 * and one English file, build/license_<lang>.txt. electron-builder picks them
 * by the installer's language, and the app ships them so Settings › About and
 * the first-run terms can open the same text.
 */

export type LicenseTermsLang = 'ko' | 'en'

/** Korean for a Korean UI, English for every other language */
export function licenseTermsLang(lang: string): LicenseTermsLang {
  return lang === 'ko' ? 'ko' : 'en'
}

/** Where the file is: next to the app's resources, or in build/ while developing */
export function licenseTermsPath(
  lang: string,
  where: { packaged: boolean; resourcesPath: string; appPath: string },
): string {
  const name = `license_${licenseTermsLang(lang)}.txt`
  return where.packaged ? join(where.resourcesPath, name) : join(where.appPath, 'build', name)
}
