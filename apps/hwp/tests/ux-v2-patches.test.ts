/**
 * 0.17 UI/UX review v2 (hwp-design): the build patches of scripts/studio-ux-patches.mjs, applied
 * to the studio source the build fetched.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { showCorrectedLabels, tidyStudioMenus } from '../studio-plugin/hancom-keys.mjs'
import { DIALOG_THEME_CSS, markClippedToolbarButtons } from '../studio-plugin/dialog-theme.mjs'
import { OPEN_LICENSES_EVENT } from '../studio-plugin/agent-plugin.mjs'
import { APP_STRINGS } from '../studio-plugin/studio-locales.mjs'
import { STUDIO_PATCHES, applyPatch, patchTargets } from '../scripts/rhwp-patches.mjs'
import { UX_PATCHES } from '../scripts/studio-ux-patches.mjs'

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

/** The file as the build compiles it: every studio patch that targets it, in build order. */
function patched(file: string): string {
  const path = join(studio, file)
  let code = readFileSync(path, 'utf8')
  for (const name of STUDIO_PATCHES) {
    if (patchTargets(name, path)) code = applyPatch(name, code)
  }
  return code
}

describe('the UX patches', () => {
  it('are all in the studio build', () => {
    for (const name of Object.keys(UX_PATCHES)) expect(STUDIO_PATCHES, name).toContain(name)
  })
})

describe.skipIf(!fetched)('the document history dialog (#4, #10)', () => {
  const code = () => patched('src/ui/history-dialog.ts')

  it('shows a note while nothing is saved', () => {
    expect(code()).toContain("t('hanpan.history.empty')")
  })

  it('turns the buttons for a chosen entry off until one is chosen', () => {
    const c = code()
    expect(c).toContain('this.syncButtons();')
    expect(c).toMatch(/for \(const btn of this\.chosenButtons\) btn\.disabled = !this\.selectedId;/)
    expect(c).toContain('this.clearAllButton.disabled = this.entries.length === 0;')
  })

  it('closes with Esc, and stops listening when closed', () => {
    const c = code()
    expect(c).toContain("document.addEventListener('keydown', this.onEscape, true);")
    expect(c).toContain("document.removeEventListener('keydown', this.onEscape, true);")
    expect(c).toMatch(/if \(e\.key !== 'Escape'\) return;/)
  })
})

describe.skipIf(!fetched)('Esc on the dialogs that missed it (#10)', () => {
  it('reaches the paragraph shape dialog: it takes the focus when it opens', () => {
    const c = patched('src/ui/para-shape-dialog.ts')
    expect(c).toContain('this.dialog.tabIndex = -1;')
    expect(c).toContain('this.dialog.focus({ preventScroll: true })')
  })

  it('reaches the table grid picker: it takes the focus when it opens', () => {
    const c = patched('src/ui/table-create-dialog.ts')
    expect(c).toContain('this.popup.focus({ preventScroll: true })')
  })
})

describe.skipIf(!fetched)('the preferences dialog (#5)', () => {
  it('leaves out the PDF section: the app writes PDFs itself, the browser print guide never shows', () => {
    const c = patched('src/ui/options-dialog.ts')
    expect(c).not.toContain('    panel.appendChild(pdfSection);')
  })
})

describe('the studio menus (#14, #23)', () => {
  const page = () =>
    new JSDOM(
      [
        '<div class="menu-item" data-menu="edit"><div class="menu-dropdown">',
        '<div class="md-item" data-cmd="edit:find"></div>',
        '<div class="md-item" data-cmd="edit:compare-documents"></div>',
        '<div class="md-item" data-cmd="edit:document-history"></div>',
        '<div class="md-item" data-cmd="edit:find-replace"></div>',
        '</div></div>',
        '<div class="menu-item" data-menu="view"><div class="menu-dropdown">',
        '<div class="md-item" data-cmd="view:zoom-in"></div><div class="md-sep"></div>',
        '<div class="md-sub"><span class="md-label">테마</span><div class="md-sub-panel">',
        '<div class="md-item" data-cmd="view:theme-system"></div><div class="md-item" data-cmd="view:skin-flat"></div>',
        '</div></div><div class="md-sep"></div><div class="md-item" data-cmd="view:ctrl-mark"></div>',
        '</div></div>',
        '<div class="menu-item" data-menu="tool"><div class="menu-dropdown">',
        '<div class="md-item" data-cmd="tool:options"></div>',
        '</div></div>',
        '<div class="tb-split-menu"><button class="tb-split-item" data-cmd="edit:find"></button>',
        '<button class="tb-split-item" data-cmd="edit:document-history"></button>',
        '<button class="tb-split-item" data-cmd="edit:find-replace"></button></div>',
      ].join(''),
    ).window.document

  const cmds = (doc: Document, selector: string) =>
    [...doc.querySelectorAll(`${selector} > *`)].map(
      (el) => (el as HTMLElement).dataset.cmd ?? el.className,
    )

  it('move the document history out of the find items, to the Tools menu', () => {
    const doc = page()
    tidyStudioMenus(doc)
    expect(cmds(doc, '[data-menu="edit"] .menu-dropdown')).toEqual([
      'edit:find',
      'edit:find-replace',
    ])
    expect(cmds(doc, '[data-menu="tool"] .menu-dropdown')).toEqual([
      'edit:compare-documents',
      'edit:document-history',
      'md-sep',
      'tool:options',
    ])
    expect(cmds(doc, '.tb-split-menu')).toEqual(['edit:find', 'edit:find-replace'])
  })

  it("drop the editor's own theme menu: the tab follows the app's theme", () => {
    const doc = page()
    tidyStudioMenus(doc)
    expect(doc.querySelector('[data-cmd="view:theme-system"]')).toBeNull()
    expect(cmds(doc, '[data-menu="view"] .menu-dropdown')).toEqual([
      'view:zoom-in',
      'md-sep',
      'view:ctrl-mark',
    ])
  })

  it('change nothing the second time', () => {
    const doc = page()
    tidyStudioMenus(doc)
    const once = doc.body.innerHTML
    tidyStudioMenus(doc)
    expect(doc.body.innerHTML).toBe(once)
  })
})

describe('menu items that are on (#29)', () => {
  it('show a pressed box at their icon, or a check where they have none', () => {
    const css = DIALOG_THEME_CSS.replace(/\s+/g, ' ')
    expect(css).toContain('.menu-dropdown .md-item:is(.active, [aria-checked="true"]) > .md-icon')
    expect(css).toContain(
      '.menu-dropdown .md-item[aria-checked="true"]:not(:has(> .md-icon))::before',
    )
  })
})

describe('corrected menu names in the page markup (#21, #23)', () => {
  // the studio translates its markup only outside Korean, so the Korean menu kept "찾기(F)"
  it('replace the text the markup carries, keeping the shortcut beside it', () => {
    const doc = new JSDOM(
      [
        '<div class="md-item" data-cmd="edit:find"><span class="md-icon"></span>',
        '<span class="md-label" data-i18n="command.edit.find.label">찾기(F)</span>',
        '<span class="md-shortcut">Ctrl+F</span></div>',
        '<button class="tb-split-item" data-i18n="command.edit.find.splitLabel">찾기(F) <span class="tb-split-shortcut">Ctrl+F</span></button>',
        '<span class="md-label" data-i18n="command.insert.field.label">필드 입력</span>',
      ].join(''),
    ).window.document
    showCorrectedLabels(doc, 'ko')
    expect(doc.querySelector('.md-label')?.textContent).toBe('찾기')
    expect(doc.querySelector('.md-shortcut')?.textContent).toBe('Ctrl+F')
    const split = doc.querySelector('.tb-split-item')!
    expect(split.textContent).toBe('찾기 Ctrl+F')
    expect(split.querySelector('.tb-split-shortcut')).not.toBeNull()
    expect(doc.querySelector('[data-i18n="command.insert.field.label"]')?.textContent).toBe(
      '누름틀 넣기',
    )
    showCorrectedLabels(doc, 'vi')
    expect(doc.querySelector('.md-label')?.textContent).toBe('Tìm')
  })
})

describe.skipIf(!fetched)('the status bar after Save As (#7)', () => {
  it('names the file the document was saved under', () => {
    const c = patched('src/main.ts')
    const save = c.slice(c.indexOf('async function completeHostSave'))
    expect(save.slice(0, 600)).toContain(
      "sbMessage().textContent = t('ui.sbMessage.filePages', { p1: wasm.fileName, p2: wasm.pageCount });",
    )
  })
})

describe.skipIf(!fetched)('the About box (#6)', () => {
  it("lists no crates and no file the app cannot open, and points to the app's licence list", () => {
    const c = patched('src/ui/about-dialog.ts')
    const body = c.slice(c.indexOf('protected createBody()'), c.indexOf('private rhwpLicenseList('))
    // rhwp's list stays in the file, in a method nothing calls
    expect(c.split('rhwpLicenseList(').length - 1).toBe(1)
    expect(body).not.toContain('THIRD_PARTY_LICENSES')
    expect(body).not.toContain("t('dialog.about.licenseNote.text')")
    expect(body).not.toContain('Edward Kim')
    expect(body).toContain("t('hanpan.about.licenses')")
    expect(body).toContain(`new CustomEvent('${OPEN_LICENSES_EVENT}')`)
    // the HWP specification notice stays: rhwp's use of the spec requires it
    expect(body).toContain("t('dialog.about.notice.text')")
  })

  it('has its words in every studio language', () => {
    for (const locale of ['ko', 'en', 'vi'] as const) {
      expect(APP_STRINGS[locale]['hanpan.about.licenses'], locale).toBeTruthy()
      expect(APP_STRINGS[locale]['hanpan.about.licensesButton'], locale).toBeTruthy()
    }
  })
})

describe('the scrolling toolbar at 1366 (#12)', () => {
  /** A toolbar 300px wide showing buttons 60px apart, scrolled by `offset`, with « and » out. */
  function toolbar(offset: number) {
    const doc = new JSDOM(
      [
        '<div id="icon-toolbar"><button class="tb-scroll-nav" id="icon-toolbar-prev"></button>',
        '<div class="tb-scroll-viewport"><div class="tb-scroll-track">',
        ...Array.from({ length: 8 }, (_, i) => `<button class="tb-btn" data-i="${i}"></button>`),
        '<div class="tb-split"><button class="tb-btn tb-split-main"></button><button class="tb-btn tb-split-arrow"></button></div>',
        '</div></div><button class="tb-scroll-nav" id="icon-toolbar-next"></button></div>',
      ].join(''),
    ).window.document
    const rect = (left: number, width: number) =>
      ({ left, right: left + width, width, top: 0, bottom: 50, height: 50 }) as DOMRect
    doc.querySelector('.tb-scroll-viewport')!.getBoundingClientRect = () => rect(0, 300)
    doc.querySelector('#icon-toolbar-prev')!.getBoundingClientRect = () => rect(4, 24)
    doc.querySelector('#icon-toolbar-next')!.getBoundingClientRect = () => rect(272, 24)
    doc.querySelectorAll<HTMLElement>('.tb-scroll-track > .tb-btn').forEach((b, i) => {
      b.getBoundingClientRect = () => rect(i * 60 - offset, 56)
    })
    doc.querySelector<HTMLElement>('.tb-split')!.getBoundingClientRect = () =>
      rect(480 - offset, 70)
    return doc
  }
  const hidden = (doc: Document) =>
    [...doc.querySelectorAll<HTMLElement>('.tb-scroll-track > *')]
      .map((el, i) => (el.style.visibility === 'hidden' ? i : -1))
      .filter((i) => i >= 0)

  it('hides a button the edge or the » button cuts, and shows it again once whole', () => {
    const doc = toolbar(0)
    markClippedToolbarButtons(doc)
    // 0 sits under «, 4 runs under » (240..296), 5.. are past the edge
    expect(hidden(doc)).toEqual([0, 4, 5, 6, 7, 8])
    const moved = toolbar(0)
    moved.querySelectorAll<HTMLElement>('.tb-scroll-track > .tb-btn').forEach((b, i) => {
      b.getBoundingClientRect = () =>
        ({
          left: 30 + i * 60,
          right: 86 + i * 60,
          width: 56,
          top: 0,
          bottom: 50,
          height: 50,
        }) as DOMRect
    })
    markClippedToolbarButtons(moved)
    expect(hidden(moved)).toEqual([4, 5, 6, 7, 8])
  })

  it('makes the split button arrow (▾ beside 찾기) readable, not a dot', () => {
    expect(DIALOG_THEME_CSS.replace(/\s+/g, ' ')).toContain(
      '#icon-toolbar .tb-split-arrow .tb-arrow-icon',
    )
  })
})

describe('the header and footer presets (#11)', () => {
  // the engine writes templates 6-10 exactly as 1-5 (same text, same plain character shape;
  // checked on rhwp 0.8.7 with applyHfTemplate), so the second, bold-printed group only looked
  // like a different choice
  it('offer each preset once', () => {
    const items = (from: number, to: number) =>
      Array.from(
        { length: to - from + 1 },
        (_, i) =>
          `<div class="md-item" data-cmd="page:apply-hf-template" data-template-id="${from + i}"></div>`,
      ).join('')
    const doc = new JSDOM(
      `<div class="md-sub-panel md-hf-template-panel">${items(0, 0)}<div class="md-sep"></div>${items(1, 5)}<div class="md-sep"></div>${items(6, 10)}</div>`,
    ).window.document
    tidyStudioMenus(doc)
    const ids = [...doc.querySelectorAll<HTMLElement>('.md-hf-template-panel > *')].map(
      (el) => el.dataset.templateId ?? el.className,
    )
    expect(ids).toEqual(['0', 'md-sep', '1', '2', '3', '4', '5'])
  })
})

describe.skipIf(!fetched)('small dialog fixes (#25, #27, #28)', () => {
  it('page border: the line controls are off while "no border" is on, and 굵기 has a row of its own', () => {
    const c = patched('src/ui/page-border-dialog.ts')
    expect(c).toContain('private syncBorderControls(): void {')
    expect(c.split('this.syncBorderControls();').length - 1).toBeGreaterThanOrEqual(3)
    expect(c).toContain('controls.append(lineRow, widthRow, colorRow,')
  })

  it('equation: the template buttons and the input say what they are', () => {
    const c = patched('src/ui/equation-editor-dialog.ts')
    expect(c).toContain("{ label: i18nText('hanpan.equation.cases'),")
    expect(c).toContain("{ label: i18nText('hanpan.equation.lim'),")
    expect(c).toContain("this.modeBtn.title = i18nText('hanpan.equation.modeTip');")
    expect(c).toContain("this.scriptArea.placeholder = i18nText('hanpan.equation.inputHint');")
    for (const locale of ['ko', 'en', 'vi'] as const) {
      for (const key of ['cases', 'lim', 'modeTip', 'inputHint']) {
        expect(APP_STRINGS[locale][`hanpan.equation.${key}`], `${locale} ${key}`).toBeTruthy()
      }
    }
    expect(APP_STRINGS.ko['dialog.equationEditor.showPreviewMessage.label']).toMatch(/미리 보기/)
  })

  it('character and paragraph shape: 확인 at the bottom, as every other dialog', () => {
    expect(APP_STRINGS.ko['dialog.charShape.okBtn.text']).toBe('확인')
    expect(APP_STRINGS.ko['dialog.paraShape.okBtn.text']).toBe('확인')
    const css = DIALOG_THEME_CSS.replace(/\s+/g, ' ')
    expect(css).toContain(':is(.cs-dialog, .ps-dialog) > .cs-main-row')
  })
})

describe('the page setup dialog at 1366 (#26)', () => {
  it('keeps the three binding cards on one row', () => {
    expect(DIALOG_THEME_CSS.replace(/\s+/g, ' ')).toContain(
      '.page-setup-sections > .dialog-section:last-child .dialog-icon-radio-group',
    )
  })
})
