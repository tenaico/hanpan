import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import iconv from 'iconv-lite'
import { describe, expect, it } from 'vitest'
import { licenseTermsLang, licenseTermsPath } from '../src/main/license-terms'

/**
 * The license and disclaimer page of the installer (spec 2026-11-12 5-6): a
 * Korean and an English file in the build resources, which electron-builder
 * picks by the installer's language for NSIS and the dmg. The app ships the
 * same two files so Settings › About and the first-run terms can show them.
 */

const require = createRequire(import.meta.url)
const SHELL = resolve(import.meta.dirname, '..')
const BOM = Buffer.from([0xef, 0xbb, 0xbf])

function loadBuilderConfig() {
  const configModule = { exports: {} as ReturnType<typeof require> }
  runInNewContext(readFileSync(join(SHELL, 'electron-builder.cjs'), 'utf8'), {
    module: configModule,
    __dirname: SHELL,
    process: { platform: 'win32', arch: 'x64', env: {} },
    require: (id: string) =>
      id === 'node:fs' ? { ...require(id), existsSync: () => true } : require(id),
  })
  return configModule.exports as {
    nsis: Record<string, unknown>
    dmg: Record<string, unknown>
    extraResources: { from: string; to: string }[]
    directories?: { buildResources?: string }
  }
}

const read = (lang: 'ko' | 'en') => readFileSync(join(SHELL, 'build', `license_${lang}.txt`))
const text = (lang: 'ko' | 'en') => read(lang).toString('utf8')

describe('installer license', () => {
  it('the installer shows the license in Korean and English', () => {
    const config = loadBuilderConfig()
    // a set license names one file for every language; left unset,
    // electron-builder reads license_<lang>.txt from the build resources
    expect(config.nsis.license).toBeUndefined()
    expect(config.dmg.license).toBeUndefined()
    expect(config.directories?.buildResources ?? 'build').toBe('build')
    for (const lang of ['ko', 'en'] as const) {
      // no BOM in the file: electron-builder adds it for NSIS itself, and
      // the dmg's license reader would keep it as a character it cannot encode
      expect(read(lang).subarray(0, 3).equals(BOM)).toBe(false)
      expect(config.extraResources).toContainEqual({
        from: `build/license_${lang}.txt`,
        to: `license_${lang}.txt`,
      })
    }
  })

  it('the license keeps the six items', () => {
    const ko = text('ko')
    const en = text('en')
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(ko).toMatch(new RegExp(`^${n}\\. `, 'm'))
      expect(en).toMatch(new RegExp(`^${n}\\. `, 'm'))
    }
    expect(ko).toContain('다만 TEN AI의 고의로 생긴 손해는 그러하지 않습니다.')
    expect(ko).not.toContain('중대한 과실')
    expect(en).not.toMatch(/gross negligence/i)
    for (const body of [ko, en]) {
      expect(body).toContain('Apache License 2.0')
      expect(body).toContain('trend.tenai.kr')
      expect(body).toContain('GitHub')
    }
    expect(ko).toContain('보안키를 TEN AI로 보내지 않습니다')
  })

  it('the dmg can write each file in the Mac encoding of its language', () => {
    // dmgbuild encodes English as mac_roman and Korean as KS X 1001 (EUC-KR)
    expect(text('en')).toMatch(/^[\t\n\r\x20-\x7e]*$/)
    const ko = text('ko')
    expect(iconv.decode(iconv.encode(ko, 'euc-kr'), 'euc-kr')).toBe(ko)
  })

  it('the app opens the file in its language, Korean or English', () => {
    expect(licenseTermsLang('ko')).toBe('ko')
    expect(licenseTermsLang('en')).toBe('en')
    expect(licenseTermsLang('ja')).toBe('en')
    expect(licenseTermsPath('ko', { packaged: true, resourcesPath: 'R', appPath: 'A' })).toBe(
      join('R', 'license_ko.txt'),
    )
    expect(licenseTermsPath('vi', { packaged: false, resourcesPath: 'R', appPath: 'A' })).toBe(
      join('A', 'build', 'license_en.txt'),
    )
  })
})
