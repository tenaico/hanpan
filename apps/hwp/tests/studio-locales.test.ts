/** @vitest-environment jsdom */
/**
 * The rhwp studio ships Korean and English only, so a Vietnamese tab showed English menus
 * over Korean style names, and its About box named the engine as a developer would
 * ("HWP/HWPX Compatible Module for Rust · Version 0.8.7-ieum.12"). The build registers the
 * app's own studio languages over the English catalog (studio-plugin/studio-locales.mjs),
 * the style list shows a style's name in the UI language where the document carries one,
 * and the About box names Hanpan while keeping rhwp's credit, licence list and the HWP
 * specification notice. (0.17 review #12 and the HWP multi-language item.)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  STUDIO_LOCALES_MODULE,
  STUDIO_PATCHES,
  applyPatch,
  patchTargets,
} from '../scripts/rhwp-patches.mjs'
import {
  APP_STRINGS,
  EXTRA_LOCALES,
  LOCALE_LAYOUT_CSS,
  aboutText,
  installLocaleLayout,
  diffTitleText,
  styleDisplayName,
  studioLocaleOf,
} from '../studio-plugin/studio-locales.mjs'
import { syncStyleList } from '../studio-plugin/agent-plugin.mjs'
import { studioLocale, studioUrl } from '../src/renderer/studio-settings'

const core = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'vendor', 'rhwp-core', 'package.json'), 'utf8'),
)
const studio = join(
  __dirname,
  '..',
  'node_modules',
  '.cache',
  'rhwp-studio',
  core.rhwp.tag,
  'rhwp-studio',
)
const fetched = existsSync(studio)
const read = (file: string) => readFileSync(join(studio, file), 'utf8')

const LOCALE_PATCHES = {
  'studio-locale-supported': 'src/i18n/core.ts',
  'studio-locale-register': 'src/i18n/index.ts',
  'studio-locale-toolbar-overflow': 'src/ui/style-toolbar-overflow.ts',
  'studio-style-display-names': 'src/ui/toolbar.ts',
  'studio-about-hanpan': 'src/ui/about-dialog.ts',
} as const

describe('the studio language a tab asks for', () => {
  it('is the UI language where the studio has it, English otherwise', () => {
    expect(studioLocale('ko')).toBe('ko')
    expect(studioLocale('vi')).toBe('vi')
    expect(studioLocale('en')).toBe('en')
    expect(studioLocale('ja')).toBe('en')
    expect(studioUrl('vi')).toBe('./studio/index.html?chrome=embed&lang=vi')
  })

  it('reads back from the studio address', () => {
    expect(studioLocaleOf('?chrome=embed&lang=vi')).toBe('vi')
    expect(studioLocaleOf('?chrome=embed&lang=en')).toBe('en')
    expect(studioLocaleOf('')).toBe('ko')
  })
})

describe('the Vietnamese studio catalog', () => {
  it.skipIf(!fetched)('covers the menus, commands and toolbar with the same placeholders', () => {
    const en = Object.fromEntries(
      [...read('src/i18n/locales/en.ts').matchAll(/^ {2}"([^"]+)": "((?:[^"\\]|\\.)*)",?$/gm)].map(
        (m) => [m[1], m[2]],
      ),
    )
    const vi = EXTRA_LOCALES.vi as Record<string, string>
    // every studio string, the dialogs included (no English left in a Vietnamese tab)
    const wanted = Object.keys(en)
    expect(wanted.length).toBeGreaterThan(1900)
    for (const key of wanted) expect(vi[key], key).toBeTruthy()
    const holes = (s: string) => [...s.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort()
    for (const [key, text] of Object.entries(vi)) {
      expect(en[key], `${key} is a studio key`).toBeDefined()
      expect(holes(text), key).toEqual(holes(JSON.parse(`"${en[key]}"`)))
    }
    expect(vi['menu.file']).toBe('Tệp')
  })

  // a toolbar label breaks into two lines only where the studio's markup renders the break
  // (data-i18n-lines); elsewhere "\n" collapses to a space and widens the button
  it.skipIf(!fetched)('breaks a toolbar label only where the markup renders the break', () => {
    const html = read('index.html')
    const vi = EXTRA_LOCALES.vi as Record<string, string>
    for (const [key, text] of Object.entries(vi)) {
      if (!key.includes('toolbarLabel') || !text.includes('\n')) continue
      const plain = html.includes(`data-i18n="${key}"`)
      expect(plain, `${key} is shown with data-i18n, which drops the break`).toBe(false)
    }
  })

  it('keeps the note buttons as short as the English ones', () => {
    const vi = EXTRA_LOCALES.vi as Record<string, string>
    expect(vi['command.insert.footnote.toolbarLabel.x195a3d']).toBe('Cước chú')
    expect(vi['command.insert.endnote.toolbarLabel.x25a949']).toBe('Hậu chú')
  })
})

describe('style names in the toolbar list', () => {
  const normal = { id: 0, name: '바탕글', englishName: 'Normal' }
  const outline = { id: 3, name: '개요 2', englishName: 'Outline 2' }
  const own = { id: 22, name: 'My heading', englishName: '' }

  it('stay as the document has them in Korean', () => {
    expect(styleDisplayName(normal, 'ko')).toBe('바탕글')
  })

  it('use the English name in English and a translation in Vietnamese', () => {
    expect(styleDisplayName(normal, 'en')).toBe('Normal')
    expect(styleDisplayName(outline, 'en')).toBe('Outline 2')
    expect(styleDisplayName(normal, 'vi')).toBe('Bình thường')
    expect(styleDisplayName(outline, 'vi')).toBe('Đề mục 2')
  })

  it("keep a style's own name when it is not Korean or has no English name", () => {
    expect(styleDisplayName(own, 'vi')).toBe('My heading')
    expect(styleDisplayName({ id: 1, name: '내 스타일', englishName: '' }, 'en')).toBe('내 스타일')
  })

  it('are what the plugin refills the list with', () => {
    const select = document.createElement('select')
    expect(syncStyleList(select, [normal, outline], 'vi')).toBe(true)
    expect(Array.from(select.options, (o) => o.textContent)).toEqual(['Bình thường', 'Đề mục 2'])
    // the same styles shown the same way are left alone
    expect(syncStyleList(select, [normal, outline], 'vi')).toBe(false)
  })
})

describe('the About box', () => {
  it('names Hanpan and the rhwp release it is built on', () => {
    const ko = aboutText('ko', '0.8.7-ieum.12')
    expect(ko.product).toContain('한판')
    expect(ko.engine).toContain('rhwp 0.8.7')
    expect(`${ko.product}${ko.subtitle}${ko.engine}${ko.credit}`).not.toMatch(
      /ieum|Compatible Module/,
    )
    expect(aboutText('vi', '0.8.7-ieum.12').subtitle).not.toBe(aboutText('en', '0.8.7').subtitle)
    expect(aboutText('fr', '0.8.7').product).toBe(aboutText('en', '0.8.7').product)
  })
})

describe('the studio language patches', () => {
  it('are in the studio build', () => {
    for (const name of Object.keys(LOCALE_PATCHES)) expect(STUDIO_PATCHES).toContain(name)
  })

  it('are built with the app module aliased and stamped', () => {
    const build = readFileSync(join(__dirname, '..', 'scripts', 'build-studio.mjs'), 'utf8')
    expect(build).toContain('[STUDIO_LOCALES_MODULE]')
    expect(build).toMatch(/studio-locales/)
    expect(STUDIO_LOCALES_MODULE).toBe('@ieum/studio-locales')
  })

  it.skipIf(!fetched)('apply once to the fetched studio', () => {
    for (const [name, file] of Object.entries(LOCALE_PATCHES)) {
      expect(patchTargets(name, join(studio, file)), name).toBe(true)
      expect(() => applyPatch(name, read(file)), name).not.toThrow()
    }
  })

  it.skipIf(!fetched)('register every extra language over English', () => {
    const coreTs = applyPatch('studio-locale-supported', read('src/i18n/core.ts'))
    expect(coreTs).toContain(`from '${STUDIO_LOCALES_MODULE}'`)
    expect(coreTs).toMatch(/SUPPORTED[^=]*= \['ko', 'en', \.\.\./)
    const index = applyPatch('studio-locale-register', read('src/i18n/index.ts'))
    expect(index).toMatch(/registerCatalog\(locale as Locale, \{ \.\.\.enCatalog, .*\.\.\.catalog/)
  })

  it.skipIf(!fetched)(
    'keep the licence list, the copyright and the HWP notice in the About box',
    () => {
      const about = applyPatch('studio-about-hanpan', read('src/ui/about-dialog.ts'))
      expect(about).not.toContain("'HWP/HWPX Compatible Module for Rust'")
      expect(about).not.toContain('`Version ${__APP_VERSION__}`')
      expect(about).toContain('THIRD_PARTY_LICENSES')
      expect(about).toContain("t('dialog.about.notice.text')")
      expect(about).toContain('rhwp: Edward Kim')
    },
  )
})

/**
 * Text the studio writes straight into its markup instead of asking its catalogs: the page
 * setup dialog's orientation, binding and margin names and the editing input's accessible
 * name stayed Korean in an English or Vietnamese tab (0.17 acceptance D3/D7). The app gives
 * them keys of its own (APP_STRINGS, in every studio language) and patches the studio to ask
 * for them.
 */
describe('studio text with no catalog key', () => {
  const HANGUL_LITERAL = /(['"`])((?:(?!\1).)*?[가-힣](?:(?!\1).)*?)\1/g
  /** Korean string literals in code, comments left out. */
  const koreanLiterals = (code: string) =>
    code
      .split(/\r?\n/)
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .map((l) => l.replace(/\s\/\/.*$/, ''))
      .flatMap((l) => [...l.matchAll(HANGUL_LITERAL)].map((m) => m[2]))

  /** The studio source as the build compiles it: every studio patch that targets it applied. */
  const patched = (file: string) => {
    let code = read(file)
    for (const name of STUDIO_PATCHES) {
      if (patchTargets(name, join(studio, file))) code = applyPatch(name, code)
    }
    return code
  }

  it('has the same keys in Korean, English and every added language', () => {
    const keys = Object.keys(APP_STRINGS.ko).sort()
    expect(keys.length).toBeGreaterThan(10)
    for (const locale of ['en', ...Object.keys(EXTRA_LOCALES)]) {
      const words = (APP_STRINGS as Record<string, Record<string, string>>)[locale]
      expect(Object.keys(words ?? {}).sort(), locale).toEqual(keys)
      for (const [key, text] of Object.entries(words)) {
        expect(text, `${locale} ${key}`).toBeTruthy()
        expect(text, `${locale} ${key}`).not.toMatch(/[가-힣]/)
      }
    }
  })

  it.skipIf(!fetched)('leaves no Korean in the page setup dialog or the editing input', () => {
    for (const file of ['src/ui/page-setup-dialog.ts', 'src/engine/input-handler.ts']) {
      const code = patched(file)
      const left = koreanLiterals(code)
      if (file.endsWith('page-setup-dialog.ts')) expect(left, file).toEqual([])
      else expect(left, file).not.toContain('문서 편집 입력')
      const keys = [...code.matchAll(/i18nText\('(hanpan\.[^']+)'\)/g)].map((m) => m[1])
      expect(keys.length, file).toBeGreaterThan(0)
      for (const key of keys) expect(APP_STRINGS.ko, key).toHaveProperty([key])
    }
  })

  it.skipIf(!fetched)('registers the app strings with every studio language', () => {
    const index = applyPatch('studio-locale-register', read('src/i18n/index.ts'))
    expect(index).toContain("registerCatalog('ko', { ...koCatalog, ...APP_STRINGS.ko }")
    expect(index).toContain("registerCatalog('en', { ...enCatalog, ...APP_STRINGS.en }")
    expect(index).toMatch(
      /registerCatalog\(locale as Locale, \{ \.\.\.enCatalog, \.\.\.APP_STRINGS\.en, \.\.\.catalog, \.\.\.APP_STRINGS\[locale as keyof typeof APP_STRINGS\] \}/,
    )
  })

  it("names the cell's vertical-writing options as Hangul does, not 'Door flat'", () => {
    // 셀 속성 > 세로 쓰기: Hangul's 영문 눕힘/영문 세움 (Latin letters turned or upright);
    // rhwp wrote 문 눕힘/문 세움, which its English catalog took for a door
    const flat = 'dialog.tableCellProps.buildCellTab.label.x872cd2'
    const upright = 'dialog.tableCellProps.buildCellTab.label.xd9f9d6'
    expect(APP_STRINGS.ko[flat]).toBe('영문 눕힘(Q)')
    expect(APP_STRINGS.ko[upright]).toBe('영문 세움(U)')
    expect(APP_STRINGS.en[flat]).toBe('Latin text sideways(Q)')
    expect(APP_STRINGS.en[upright]).toBe('Latin text upright(U)')
    for (const [key, text] of Object.entries(APP_STRINGS.en)) expect(text, key).not.toMatch(/Door/)
  })

  it.skipIf(!fetched)("finds the keys it corrects in rhwp's catalogs", () => {
    const en = read('src/i18n/locales/en.ts')
    for (const key of Object.keys(APP_STRINGS.en).filter((k) => !k.startsWith('hanpan.'))) {
      expect(en, key).toContain(`"${key}":`)
    }
  })

  it('keeps every placeholder of the Korean text in each language', () => {
    const holes = (text: string) => [...text.matchAll(/\{(\w+)\}|\$\d/g)].map((m) => m[0]).sort()
    for (const locale of ['en', ...Object.keys(EXTRA_LOCALES)]) {
      const words = (APP_STRINGS as Record<string, Record<string, string>>)[locale]
      for (const [key, text] of Object.entries(APP_STRINGS.ko)) {
        expect(holes(words[key] ?? ''), `${locale} ${key}`).toEqual(holes(text))
      }
    }
  })

  // Korean that stays in the studio source after the patches: data the code compares, writes
  // into a document or hands to another program, not interface text. Each entry says why.
  // Console output is not counted (developer logs, never shown).
  const DIFF_ENGINE_DATA = {
    '(없음)':
      "the diff engine's empty-value marker in its summaries, compared before a value is shown",
    '텍스트 변경': 'a diff item title the diff engine writes, matched to pick the summary',
    '속성 변경': 'a diff item title the diff engine writes, matched to pick the summary',
  }
  const FONT_NAME = 'a font family name'
  const LOGGED_ERROR = 'an internal error, caught and written to the console only'
  const CONSOLE_ARGUMENT = 'a console message continued on its own line'
  const PICTURE_DESCRIPTION =
    'the description written into the document with an inserted picture, as Hangul writes it'
  const CLIPBOARD_TEXT = 'the plain text put on the clipboard for a copied object, as Hangul does'
  const ENGINE_MESSAGE = 'part of an engine error message, matched to tell the error apart'
  const DATA_NOT_TEXT: Record<string, Record<string, string>> = {
    'ui/compare-dialog.ts': DIFF_ENGINE_DATA,
    'ui/history-dialog.ts': DIFF_ENGINE_DATA,
    'ui/compare-result-window.ts': { '(없음)': DIFF_ENGINE_DATA['(없음)'] },
    'compare/diff-location-label.ts': { '(없음)': DIFF_ENGINE_DATA['(없음)'] },
    'ui/font-set-edit-dialog.ts': { 함초롬바탕: FONT_NAME },
    'ui/numbering-dialog.ts': {
      '제^1장': 'the Korean outline preset, whose sample label is Korean in every language',
      '제^2절': 'the Korean outline preset, whose sample label is Korean in every language',
      가나다라마바사아자차카타파하: 'the Hangul numbering glyphs a number format draws',
    },
    'ui/toolbar.ts': {
      함초롬바탕: FONT_NAME,
      함초롬돋움: FONT_NAME,
      '맑은 고딕': FONT_NAME,
      나눔고딕: FONT_NAME,
      바탕: FONT_NAME,
      돋움: FONT_NAME,
      궁서: FONT_NAME,
    },
    'ui/style-dialog.ts': { '[StyleDialog] 스타일 삭제 실패': LOGGED_ERROR },
    'ui/style-edit-dialog.ts': {
      '[StyleEditDialog] 생성한 스타일의 모양 적용 실패': LOGGED_ERROR,
      '[StyleEditDialog] 스타일 모양 적용 실패': LOGGED_ERROR,
    },
    'engine/input-handler.ts': {
      '그림입니다.\\r\\n원본 그림의 이름: ${fileName}\\r\\n원본 그림의 크기: 가로 ${naturalWidth}pixel, 세로 ${naturalHeight}pixel':
        PICTURE_DESCRIPTION,
      '[그림]': CLIPBOARD_TEXT,
      '[표]': CLIPBOARD_TEXT,
    },
    'engine/input-handler-table.ts': {
      '그림입니다.\\r\\n원본 그림의 이름: ${imgData.fileName}\\r\\n원본 그림의 크기: 가로 ${imgData.naturalWidth}pixel, 세로 ${imgData.naturalHeight}pixel':
        PICTURE_DESCRIPTION,
    },
    'engine/input-handler-keyboard.ts': { '[그림]': CLIPBOARD_TEXT },
    'engine/cursor.ts': { '인라인 컨트롤 위치': ENGINE_MESSAGE },
    'command/commands/table.ts': { '표 크기': ENGINE_MESSAGE, 초과: ENGINE_MESSAGE },
    'core/canvas-metric-recovery.ts': { '렌더링 오류: ${DESCRIPTOR_MISMATCH}': ENGINE_MESSAGE },
    'main.ts': {
      '비밀번호가 필요한 암호 문서': ENGINE_MESSAGE,
      '비밀번호가 일치하지 않거나 암호화 데이터가 손상되었습니다': ENGINE_MESSAGE,
      '지원하지 않는 암호화 방식': ENGINE_MESSAGE,
    },
    'view/canvaskit-renderer.ts': { '(인)': 'the seal mark a form field draws into the page' },
    'core/font-loader.ts': {
      함초롬바탕: FONT_NAME,
      함초롬돋움: FONT_NAME,
      '맑은 고딕': FONT_NAME,
      바탕: FONT_NAME,
      돋움: FONT_NAME,
      굴림: FONT_NAME,
      굴림체: FONT_NAME,
      바탕체: FONT_NAME,
      궁서: FONT_NAME,
      mmmmmmmmmwwwwwwwWMWMWM한글글꼴측정0123456789:
        'text measured to tell whether a font is installed',
    },
    'core/local-fonts.ts': {
      가나다라마바사아자차카타파하: 'text measured to tell whether a font is installed',
      '한글과 English 12345': 'text measured to tell whether a font is installed',
    },
  }
  // Files whose Korean (beyond the data above) is not interface text, with how many such
  // literals they hold, so a string added to one of them fails here until it is looked at.
  const AUTOMATION = 'HwpCtrl automation names and errors, for scripts that drive the studio'
  const INTERNAL = 'internal errors and checks of the engine, renderer or undo history'
  const DEV = 'developer tools and debug output'
  const AGENT = "errors of the document-agent protocol the app's AI plugin speaks, not shown"
  const FONT_TABLE = 'generated font tables: font family names'
  const NOT_INTERFACE: Record<string, [number, string]> = {
    'automation/host.ts': [4, 'errors for automation scripts calling studio commands'],
    'command/commands/file.ts': [2, CONSOLE_ARGUMENT],
    'command/commands/insert.ts': [3, LOGGED_ERROR],
    'command/commands/table.ts': [20, 'names of table operations in the console log of a failure'],
    'command/file-open-picker.ts': [1, CONSOLE_ARGUMENT],
    'command/print-pages.ts': [1, INTERNAL],
    'command/print-surface.ts': [7, INTERNAL],
    'compare/diff-engine.ts': [
      84,
      'item titles and summaries the compare views match on (shown through diffTitleText), its empty marker and debug output',
    ],
    'core/canvaskit-document-preflight.ts': [3, INTERNAL],
    'core/char-shape-runs.ts': [3, INTERNAL],
    'core/export-content-loss.ts': [4, INTERNAL],
    'core/font-loader.ts': [1, DEV],
    'core/generated/font-rule-projections/canvas2d-paint.ts': [501, FONT_TABLE],
    'core/generated/font-rule-projections/canvaskit-sfnt.ts': [548, FONT_TABLE],
    'core/generated/font-rule-projections/webfont-supply.ts': [152, FONT_TABLE],
    'core/hwp-constants.ts': [169, AUTOMATION],
    'core/local-text-replace-result.ts': [1, INTERNAL],
    'core/numbering-defaults.ts': [
      13,
      'numbering preset names, a Korean sample of each format; the numbering dialog shows nameEn outside Korean',
    ],
    'core/paper-defaults.ts': [13, 'paper names in a table nothing in the studio imports'],
    'core/rhwp-dev.ts': [5, DEV],
    'core/subsecond-runtime.ts': [26, DEV],
    'core/user-settings.ts': [32, 'built-in font sets: font family names'],
    'core/wasm-bridge.ts': [329, INTERNAL],
    'dev/page-scroll-probe.ts': [34, DEV],
    'dev/scroll-observation.ts': [3, DEV],
    'dev/zoom-session-observation.ts': [1, DEV],
    'document-agent/contract.ts': [12, AGENT],
    'document-agent/controller.ts': [39, AGENT],
    'embed/runtime.ts': [2, 'embed protocol errors for the host app'],
    'engine/command.ts': [14, INTERNAL],
    'engine/input-handler.ts': [7, INTERNAL],
    'engine/picture-resize-journal.ts': [1, INTERNAL],
    'hwpctl/action-registry.ts': [30, AUTOMATION],
    'hwpctl/action.ts': [3, AUTOMATION],
    'hwpctl/actions/clipboard.ts': [7, AUTOMATION],
    'hwpctl/actions/format.ts': [5, AUTOMATION],
    'hwpctl/actions/navigate.ts': [5, AUTOMATION],
    'hwpctl/actions/page.ts': [5, AUTOMATION],
    'hwpctl/actions/table-edit.ts': [5, AUTOMATION],
    'hwpctl/actions/table.ts': [1, AUTOMATION],
    'hwpctl/actions/text.ts': [4, AUTOMATION],
    'hwpctl/index.ts': [1, AUTOMATION],
    'main.ts': [7, 'console messages on their own lines and internal errors'],
    'plugin/dev-probe-plugin.ts': [2, DEV],
    'plugin/host.ts': [10, 'errors of the plugin API, for plugins'],
    'view/canvas-pool.ts': [4, INTERNAL],
    'view/canvas-view.ts': [2, INTERNAL],
    'view/canvaskit-renderer.ts': [12, INTERNAL],
    'view/page-renderer.ts': [1, INTERNAL],
    'view/renderer-session.ts': [2, INTERNAL],
    'view/zoom-input-settle.ts': [1, INTERNAL],
  }

  /** Korean literals the user can see: console output and comments left out. */
  const shownKorean = (code: string) =>
    koreanLiterals(
      code
        .split(/\r?\n/)
        .filter((l) => !/\bconsole\.(log|warn|error|info|debug)\(/.test(l))
        .join('\n'),
    )

  /** Every studio source file the build compiles, but the catalogs themselves. */
  const sourceFiles = (): string[] => {
    if (!fetched) return []
    const out: string[] = []
    const walk = (dir: string, rel: string) => {
      for (const entry of readdirSync(join(studio, 'src', dir), { withFileTypes: true })) {
        const path = rel ? `${rel}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          if (!['i18n', '__tests__'].includes(entry.name)) walk(join(dir, entry.name), path)
        } else if (/\.ts$/.test(entry.name) && !/\.(test|spec|d)\.ts$/.test(entry.name)) {
          out.push(path)
        }
      }
    }
    walk('', '')
    return out
  }

  it.skipIf(!fetched)('writes no Korean into the studio interface outside the catalogs', () => {
    const left: string[] = []
    for (const path of sourceFiles()) {
      if (NOT_INTERFACE[path]) continue
      for (const text of shownKorean(patched(`src/${path}`))) {
        if (!DATA_NOT_TEXT[path]?.[text]) left.push(`${path}: ${text}`)
      }
    }
    expect(left, 'Korean written into the interface; give it keys (APP_STRINGS)').toEqual([])
  })

  it.skipIf(!fetched)('keeps the files that hold no interface text as they were looked at', () => {
    for (const [path, [count]] of Object.entries(NOT_INTERFACE)) {
      const left = shownKorean(patched(`src/${path}`)).filter(
        (text) => !DATA_NOT_TEXT[path]?.[text],
      )
      expect(left.length, path).toBe(count)
    }
  })

  it.skipIf(!fetched)('lists only data that is still there', () => {
    for (const [path, allowed] of Object.entries(DATA_NOT_TEXT)) {
      const found = new Set(shownKorean(patched(`src/${path}`)))
      for (const text of Object.keys(allowed))
        expect(found.has(text), `${path}: ${text}`).toBe(true)
    }
  })

  it.skipIf(!fetched)('asks only for app keys that every language has', () => {
    const used = new Set<string>()
    for (const path of sourceFiles()) {
      const code = patched(`src/${path}`)
      for (const m of code.matchAll(/\b(?:i18nText|hanpanText|t)\('(hanpan\.[^']+)'/g))
        used.add(m[1])
    }
    expect(used.size).toBeGreaterThan(300)
    for (const key of used) expect(APP_STRINGS.ko, key).toHaveProperty([key])
  })

  it.skipIf(!fetched)('writes dates in the UI language, not always in Korean', () => {
    for (const path of sourceFiles()) {
      expect(patched(`src/${path}`), path).not.toMatch(/toLocale(?:Date|Time)?String\('ko-KR'\)/)
    }
  })

  it.skipIf(!fetched)('shows style names in the UI language in the style dialog', () => {
    const code = patched('src/ui/style-dialog.ts')
    expect(code).toContain('name.textContent = styleDisplayName(s, getLocale());')
    expect(code).not.toMatch(/textContent = [^;]*\.name\b[^;]*;/)
  })

  it.skipIf(!fetched)('names a numbering preset in English outside Korean', () => {
    const code = patched('src/ui/numbering-dialog.ts')
    expect(code).toContain("cell.title = getLocale() === 'ko' ? preset.name : preset.nameEn;")
  })

  it.skipIf(!fetched)(
    'shows a compare item title in the UI language, keeping the stored one',
    () => {
      for (const file of ['ui/compare-dialog.ts', 'ui/history-dialog.ts']) {
        const code = patched(`src/${file}`)
        expect(code, file).toContain('${this.escape(diffTitleText(item.title, getLocale()))}')
        expect(code, file).toContain("item.title.includes('텍스트 변경')")
      }
      const result = patched('src/ui/compare-result-window.ts')
      expect(result.match(/\$\{diffTitleText\(item\.title, getLocale\(\)\)\}/g)).toHaveLength(2)
    },
  )
})

describe('a compare item title', () => {
  it('stays as the diff engine wrote it in Korean', () => {
    for (const title of ['문단 추가 (구역 0, 문단 3)', '표 텍스트 변경(2셀)', '그림 크기 변경'])
      expect(diffTitleText(title, 'ko')).toBe(title)
  })

  it('reads in English and Vietnamese', () => {
    const cases: [string, string, string][] = [
      ['텍스트 변경', 'Text changed', 'Thay đổi văn bản'],
      [
        '문단 추가 (구역 0, 문단 3)',
        'Paragraph added (section 0, paragraph 3)',
        'Đã thêm đoạn văn (phần 0, đoạn 3)',
      ],
      [
        '문단 이동 감지 (구역 1, 문단 2)',
        'Paragraph move detected (section 1, paragraph 2)',
        'Phát hiện di chuyển đoạn văn (phần 1, đoạn 2)',
      ],
      ['표 텍스트 변경(2셀)', 'Table text changed (2 cells)', 'Thay đổi văn bản bảng (2 ô)'],
      [
        '테이블 텍스트 변경(구조변경 동반, 3셀)',
        'Table text changed (with structure change, 3 cells)',
        'Thay đổi văn bản bảng (kèm thay đổi cấu trúc, 3 ô)',
      ],
      ['그림 자르기 변경', 'Picture crop changed', 'Thay đổi vùng cắt hình'],
      ['도형 회전/대칭 변경', 'Shape rotation/flip changed', 'Thay đổi xoay/lật hình vẽ'],
      ['이미지 추가', 'Image added', 'Đã thêm hình ảnh'],
      ['메타 삭제', 'Metadata deleted', 'Đã xóa siêu dữ liệu'],
    ]
    for (const [ko, en, vi] of cases) {
      expect(diffTitleText(ko, 'en'), ko).toBe(en)
      expect(diffTitleText(ko, 'vi'), ko).toBe(vi)
    }
  })

  it('keeps a title it does not know', () => {
    expect(diffTitleText('무엇인가 다른 것', 'en')).toBe('무엇인가 다른 것')
  })
})

describe('the style bar in Vietnamese (0.17 recheck: "Bình thường" and "Bộ phông" ran under the arrows)', () => {
  it('widens the style and font-set boxes the way rhwp widens them for English', () => {
    // "Bình thường" is 69px and "Bộ phông" 49px at the bar's font; a box keeps about 40px for its
    // padding and arrow on Windows (100px still cut the name), so 112px and 84px hold them
    expect(LOCALE_LAYOUT_CSS).toMatch(
      /html\[lang='vi'\] \.sb-field-grid \{[^}]*112px 84px 136px 86px 86px/,
    )
    expect(LOCALE_LAYOUT_CSS).toMatch(
      /html\[lang='vi'\] \.sb-field-grid \{[^}]*minmax\(68px, 112px\)/,
    )
    expect(LOCALE_LAYOUT_CSS).toMatch(/text-overflow: ellipsis/)
    // rhwp's `#style-name { width: 88px }` outranks the grid's `.sb-combo { width: 100% }`
    expect(LOCALE_LAYOUT_CSS).toMatch(/html\[lang='vi'\] #style-name \{\s*width: 100%;/)
  })

  it('goes into the editor page once, and the plugin puts it there', () => {
    installLocaleLayout(document)
    installLocaleLayout(document)
    const styles = document.querySelectorAll('style#ieum-locale-layout')
    expect(styles).toHaveLength(1)
    expect(styles[0]!.textContent).toBe(LOCALE_LAYOUT_CSS)
    const plugin = readFileSync(join(process.cwd(), 'studio-plugin/agent-plugin.mjs'), 'utf8')
    expect(plugin).toMatch(/activate\(host\) \{[\s\S]{0,600}installLocaleLayout\(\)/)
  })
})
