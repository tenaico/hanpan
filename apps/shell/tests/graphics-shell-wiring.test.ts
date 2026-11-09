import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { strings } from '../src/renderer/src/strings'
import { OPEN_EXTS } from '../../graphics/src/shared/kinds'
import { LAUNCHABLE_EXTS } from '../src/main/launch-paths'
import { TREE_FILE_EXTENSIONS } from '../src/main/folder-tree'
import { OPENABLE_DOC_RE } from '@genoffice/electron-utils/drop-open'
import { HOME_FILTER_GROUPS } from '../src/shared/home-filter-groups'
import { APP_GROUPS } from '../src/shared/home-apps'

/**
 * The AI Photo and AI Illustration tabs (decision 0093) are hosted like the
 * mind map: every place the shell routes, lists, menus and serves an editor has
 * an entry for them. index.ts and Home.tsx cannot be imported in a node test,
 * so their wiring is read out of the source, as epub-shell-wiring.test.ts does.
 */
const main = readFileSync(join(__dirname, '../src/main/index.ts'), 'utf8')
const home = readFileSync(join(__dirname, '../src/renderer/src/Home.tsx'), 'utf8')
const ALL_EXTS = [...OPEN_EXTS.photo, ...OPEN_EXTS.illust]

function literal(source: string, name: string): string {
  const start = source.indexOf(`const ${name}`)
  if (start < 0) throw new Error(`no ${name}`)
  const end = source.indexOf('\n\n', start)
  return source.slice(start, end < 0 ? undefined : end)
}

function fnSource(name: string): string {
  const start = main.indexOf(`function ${name}(`)
  if (start < 0) throw new Error(`no ${name}`)
  const end = main.indexOf('\nfunction ', start + 1)
  return main.slice(start, end < 0 ? undefined : end)
}

function localeBlock(locale: string): string {
  const head = locale.includes('-') ? `'${locale}'` : locale
  const start = main.indexOf(`\n  ${head}: {\n`)
  if (start < 0) throw new Error(`no ${locale} block`)
  const rest = main.slice(start + 1)
  const end = rest.search(/\n {2}\S+: \{/)
  return end < 0 ? rest : rest.slice(0, end)
}

function mainString(locale: string, key: string): string | undefined {
  const match = localeBlock(locale).match(new RegExp(`\\n {4}${key}:\\s*(['"])(.*?)\\1,`, 's'))
  return match?.[2]
}

describe('opening pictures and illustrations', () => {
  it('routes photo and illustration files to their tabs', () => {
    const route = fnSource('routeDocumentPath')
    expect(route).toContain('if (PHOTO_RE.test(filePath)) {')
    expect(route).toContain('tabManager.findPhotoTabByPath(filePath)')
    expect(route).toContain('tabManager.openPhotoTab(filePath)')
    expect(route).toContain('if (ILLUST_RE.test(filePath)) {')
    expect(route).toContain('tabManager.findIllustTabByPath(filePath)')
    expect(route).toContain('tabManager.openIllustTab(filePath)')
  })

  it('the open dialog, the folder tree and drops take every extension the tabs open', () => {
    expect(main).toContain('...OPEN_EXTS.photo,')
    expect(main).toContain('...OPEN_EXTS.illust,')
    expect(main).toContain("{ name: tm('filterPhoto'), extensions: [...OPEN_EXTS.photo] },")
    expect(main).toContain("{ name: tm('filterIllust'), extensions: [...OPEN_EXTS.illust] },")
    for (const ext of ALL_EXTS) {
      expect(TREE_FILE_EXTENSIONS.has(ext)).toBe(true)
      expect(OPENABLE_DOC_RE.test(`a.${ext}`)).toBe(true)
    }
  })

  it('graphics extensions are not launchable from the OS', () => {
    for (const ext of ALL_EXTS) expect(LAUNCHABLE_EXTS as readonly string[]).not.toContain(ext)
  })

  it('follows renames and Save As into the tab', () => {
    expect(fnSource('afterFileMoved')).toContain(
      "else if (t.kind === 'photo' || t.kind === 'illust')",
    )
    const at = main.indexOf('setGraphicsFileSavedHook((wc, path) => {')
    expect(at).toBeGreaterThan(0)
    const hook = main.slice(at, main.indexOf('\n  })', at))
    expect(hook).toContain('manager.setTabFileFor(wc.id, path)')
    expect(hook).toContain('detachedSetFileFor(wc.id, path)')
    expect(hook).toContain('recordRecentFile(path)')
    expect(hook).toContain('applyPendingDir(wc.id, path)')
  })
})

describe('the graphics editor runtime and hosts', () => {
  it('is configured with its build and the new-tab and open commands', () => {
    const at = main.indexOf('configureGraphicsRuntime({')
    const config = main.slice(at, main.indexOf('\n})', at))
    expect(config).toContain("preloadPath: join(GRAPHICS_OUT, 'preload', 'index.js')")
    expect(config).toContain('rendererUrl: process.env.GRAPHICS_RENDERER_URL')
    expect(config).toContain('openFileDialog: () => void openFileViaDialog()')
    expect(config).toContain(
      "newDocument: (kind) => (kind === 'photo' ? newPhotoTab() : newIllustTab())",
    )
  })

  it('serves the host pages and the web apps on separate origins, each its own files only', () => {
    expect(main).toContain("photo: join(GRAPHICS_OUT, 'renderer'),")
    expect(main).toContain("illust: join(GRAPHICS_OUT, 'renderer'),")
    expect(main).toContain("'photo-app': join(GRAPHICS_OUT, 'renderer'),")
    expect(main).toContain("'illust-app': join(GRAPHICS_OUT, 'renderer'),")
    expect(main).toContain('{ headers: graphicsResponseHeaders, allow: graphicsRequestAllowed },')
  })
})

describe('menus', () => {
  it('the graphics menu saves through requestGraphicsSave and New opens the same kind', () => {
    expect(main).toMatch(/case 'photo':\s*case 'illust':\s*buildGraphicsMenu\(kind\)/)
    const menu = fnSource('buildGraphicsMenu')
    expect(menu).toContain("requestGraphicsSave(tab.webContents, 'save')")
    expect(menu).toContain("requestGraphicsSave(tab.webContents, 'saveAs')")
    expect(menu).toContain("sendGraphicsMenuCommand(tab.webContents, 'export')")
    expect(menu).toContain("kind === 'photo' ? newPhotoTab() : newIllustTab()")
  })

  it('the graphics menu (and so ☰) prints through the page, with Ctrl+P shown', () => {
    const menu = fnSource('buildGraphicsMenu')
    expect(menu).toMatch(
      /label: tm\('menuPrint'\),\s*accelerator: 'CmdOrCtrl\+P',[\s\S]*?sendGraphicsMenuCommand\(tab\.webContents, 'print'\)/,
    )
    expect(main).toContain(
      "printGraphics: (contents) => sendGraphicsMenuCommand(contents, 'print')",
    )
  })

  it('the new-tab menu and File > New list both, with no Korean-documents switch', () => {
    expect(main.split("label: tm('menuNewPhoto')").length - 1).toBe(2)
    expect(main.split("label: tm('menuNewIllust')").length - 1).toBe(2)
  })

  it('new strings exist in all 21 main-process languages and are translated', () => {
    const keys = [
      'menuNewPhoto',
      'menuNewIllust',
      'untitledPhoto',
      'untitledIllust',
      'filterPhoto',
      'filterIllust',
      'menuExportImage',
    ]
    for (const lang of LANGS) {
      for (const key of keys) {
        const text = mainString(lang, key)
        expect(text, `${lang}.${key}`).toBeTruthy()
        if (lang !== 'en') expect(text, `${lang}.${key}`).not.toBe(mainString('en', key))
      }
    }
  })
})

describe('Home', () => {
  it('starts the two graphics apps from the board, in the selected folder', () => {
    // 0.19: the new card's apps come in APP_GROUPS order; each starts as the old card did
    const graphics = APP_GROUPS.find((group) => group.id === 'graphics')!.keys
    expect(graphics.slice(0, 2)).toEqual(['photo', 'illust'])
    expect(home).toContain("photo: made('psd'),")
    expect(home).toContain("illust: made('vectorcraft'),")
    expect(home).toContain('window.aiOffice.newPhoto(newFileOpts)')
    expect(home).toContain('window.aiOffice.newIllust(newFileOpts)')
  })

  it('lists the formats, icons and filters', () => {
    expect(literal(home, 'OPEN_LOCAL_EXTENSIONS')).toContain('.psd')
    expect(literal(home, 'OPEN_LOCAL_EXTENSIONS')).toContain('.svg')
    // Hanpan's Home lists pictures under the "mind maps & images" tab (0.17 #12)
    expect(home).toContain("{ key: 'others', label: 'hpFilterOthers' },")
    expect(HOME_FILTER_GROUPS.others).toEqual(expect.arrayContaining(['png', 'psd', 'svg']))
    for (const lang of LANGS) {
      for (const key of [
        'newPhoto',
        'newIllust',
        'hpPhotoTip',
        'hpIllustTip',
        'filterPhoto',
        'filterIllust',
      ] as const) {
        expect((strings[lang] as Record<string, string>)[key], `${lang}.${key}`).toBeTruthy()
      }
    }
  })
})
