// The language picked on the Windows installer's first screen (decision 0100):
// the installer writes the Windows language id it ran in next to Hanpan.exe,
// and a first launch with no language chosen in Settings takes it.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LANGS } from '@genoffice/i18n'
import { afterEach, describe, expect, it } from 'vitest'
import {
  INSTALLER_LANGUAGE_FILE,
  installerLanguageRegArgs,
  langFromWindowsLangId,
  readInstallerLang,
  windowsLangIdFor,
} from '../src/main/installer-lang'

describe('langFromWindowsLangId', () => {
  it.each([
    [1033, 'en'],
    [2057, 'en'],
    [1042, 'ko'],
    [1066, 'vi'],
    [2052, 'zh'],
    [1028, 'zh-TW'],
    [3076, 'zh-TW'],
    [1041, 'ja'],
    [3082, 'es'],
    [1034, 'es'],
    [1046, 'pt'],
    [2070, 'pt'],
    [1025, 'ar'],
    [1037, 'he'],
    [1081, 'hi'],
    [1057, 'id'],
    [1086, 'ms'],
    [1054, 'th'],
  ] as const)('%i → %s', (id, lang) => expect(langFromWindowsLangId(id)).toBe(lang))

  it.each([1055, 1053, 0, -1, Number.NaN])('%s is a language Hanpan does not have', (id) => {
    expect(langFromWindowsLangId(id)).toBeNull()
  })
})

describe('readInstallerLang', () => {
  let dir = ''
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
    dir = ''
  })
  const write = (text: string) => {
    dir = mkdtempSync(join(tmpdir(), 'hanpan-installer-lang-'))
    writeFileSync(join(dir, INSTALLER_LANGUAGE_FILE), text)
    return dir
  }

  it('reads the language id the installer wrote', () => {
    expect(readInstallerLang(write('1066'))).toBe('vi')
  })

  it('takes the id with the line end NSIS or an editor may leave', () => {
    expect(readInstallerLang(write('1042\r\n'))).toBe('ko')
  })

  it('is null with no file, an empty file or anything that is not an id', () => {
    dir = mkdtempSync(join(tmpdir(), 'hanpan-installer-lang-'))
    expect(readInstallerLang(dir)).toBeNull()
    expect(readInstallerLang(write(''))).toBeNull()
    expect(readInstallerLang(write('vi'))).toBeNull()
    expect(readInstallerLang(write('1066abc'))).toBeNull()
  })
})

describe('windowsLangIdFor', () => {
  it('gives every Hanpan language an id that maps back to it', () => {
    for (const lang of LANGS) expect(langFromWindowsLangId(windowsLangIdFor(lang))).toBe(lang)
  })

  it('gives each language an id the installer has', () => {
    const require = createRequire(import.meta.url)
    const config = require('../electron-builder.cjs') as { nsis: { installerLanguages: string[] } }
    const { lcid } = require('app-builder-lib/out/util/langs') as { lcid: Record<string, number> }
    // Spanish is NSIS's SpanishInternational, LANGID 3082, whatever lcid says
    const ids = new Set([...config.nsis.installerLanguages.map((l) => lcid[l]), 3082])
    for (const lang of LANGS) expect(ids.has(windowsLangIdFor(lang))).toBe(true)
  })
})

describe('installerLanguageRegArgs', () => {
  it('writes the id where the installer reads it', () => {
    expect(installerLanguageRegArgs('vi')).toEqual([
      'add',
      'HKCU\\Software\\Hanpan',
      '/v',
      'InstallerLanguage',
      '/t',
      'REG_SZ',
      '/d',
      '1066',
      '/f',
    ])
  })

  it('names the key and value installer.nsh reads', () => {
    const nsh = readFileSync(new URL('../build/installer.nsh', import.meta.url), 'utf8')
    expect(nsh).toContain('!define GENOFFICE_LANG_KEY "Software\\Hanpan"')
    expect(nsh).toContain('!define GENOFFICE_LANG_VALUE "InstallerLanguage"')
  })
})

describe('the installer offers exactly the languages Hanpan has', () => {
  const require = createRequire(import.meta.url)
  const config = require('../electron-builder.cjs') as {
    nsis: { installerLanguages: string[]; displayLanguageSelector?: boolean }
  }
  const { lcid } = require('app-builder-lib/out/util/langs') as { lcid: Record<string, number> }

  it('lists one installer language or more for every Hanpan language, English first', () => {
    const langs = config.nsis.installerLanguages
    expect(langs[0]).toBe('en_US')
    const covered = new Set(langs.map((l) => langFromWindowsLangId(lcid[l]!)))
    expect([...covered].sort()).toEqual([...LANGS].sort())
  })

  it('shows the picker from installer.nsh, not from electron-builder', () => {
    // electron-builder's own picker also opens in an update's window and in the
    // elevated second run of an all-users install
    expect(config.nsis.displayLanguageSelector).not.toBe(true)
    const nsh = readFileSync(new URL('../build/installer.nsh', import.meta.url), 'utf8')
    expect(nsh).toMatch(/!macro customInit[\s\S]*MUI_LANGDLL_DISPLAY[\s\S]*!macroend/)
    expect(nsh).toContain(`$INSTDIR\\${INSTALLER_LANGUAGE_FILE}`)
  })
})

describe('the shell main and the installer language', () => {
  it('takes the installer language before the OS languages, and keeps it', () => {
    const src = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    const at = (re: RegExp) => src.search(re)
    expect(at(/readInstallerLang\(/)).toBeGreaterThan(0)
    expect(at(/readInstallerLang\(/)).toBeLessThan(at(/uiLang \?\?= fallbackUiLang/))
    expect(src).toMatch(/if \(chosen\) \{\s*uiLang = chosen\s*persistLang\(chosen\)/)
  })

  it('hands a language chosen in Settings to the installer of the next update', () => {
    const src = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    // a saved language at startup (chosen before this version) and every new choice
    expect(src).toMatch(
      /if \(isLang\(saved\)\) \{\s*uiLang = saved\s*syncInstallerLanguage\(saved\)/,
    )
    expect(src).toMatch(
      /uiLang = persisted\s*setUiLang\(persisted\)\s*syncInstallerLanguage\(persisted\)/,
    )
  })
})
