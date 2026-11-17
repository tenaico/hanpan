// @vitest-environment node
/**
 * The glossary (AGENTS.md, its 21-language table in src/renderer/i18n/glossary.md)
 * is the one list of terms for all 21 languages. This reads that table and checks that the strings the user reads use
 * those words: the editor's own dictionaries, the main process dialogs, the
 * shell (home card, menu, file type name) and the help topic `cad`.
 *
 * A cell may hold several forms split by " / " (cases and numbers of the same
 * word); a text uses one of them. Words in parentheses are notes, not forms.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LANGS, type Lang } from '@genoffice/i18n'
import { strings } from '../src/renderer/i18n/strings'
import { CAD_MAIN_TEXTS } from '../src/main/i18n-main'
import { strings as shellStrings } from '../../shell/src/renderer/src/strings'
import { recoveryListStrings } from '../../shell/src/renderer/src/i18n/strings-recovery'

const ROOT = join(__dirname, '..')
const SHELL = join(ROOT, '../shell/src')

type Term =
  | 'AI 도면'
  | '도형'
  | '구멍'
  | '묶기'
  | '풀기'
  | '줄 맞추기'
  | '작업판'
  | '치수 도면'
  | '표제란'
  | '축척'
  | '치수 재기'
  | '직접 그리기'
  | '문서로 보내기'

/** The per-language table: language → term → its forms (the first is the base form). */
function readGlossary(): Map<string, Map<string, string[]>> {
  const text = readFileSync(join(ROOT, 'src/renderer/i18n/glossary.md'), 'utf8')
  const lines = text.split('\n')
  const head = lines.findIndex((line) => /^\|\s*언어\s*\|/.test(line))
  if (head < 0) throw new Error('no per-language table in the glossary')
  const cells = (line: string): string[] =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
  const columns = cells(lines[head])
  const table = new Map<string, Map<string, string[]>>()
  for (const line of lines.slice(head + 2)) {
    if (!line.startsWith('|')) break
    const row = cells(line)
    const terms = new Map<string, string[]>()
    columns.slice(1).forEach((column, i) => {
      const forms = row[i + 1]
        .replace(/\([^)]*\)/g, '')
        .split(' / ')
        .map((form) => form.trim())
        .filter((form) => form !== '')
      terms.set(column, forms)
    })
    table.set(row[0], terms)
  }
  return table
}

const glossary = readGlossary()

function forms(lang: Lang, term: Term): string[] {
  const found = glossary.get(lang)?.get(term)
  if (!found || found.length === 0) throw new Error(`no ${term} for ${lang} in the glossary`)
  return found
}

const fold = (text: string): string => text.toLocaleLowerCase()

/** Whether `text` uses one of the forms of `term` (case does not matter). */
function uses(lang: Lang, term: Term, text: string): boolean {
  return forms(lang, term).some((form) => fold(text).includes(fold(form)))
}

/** The base form, for texts that are the term itself (a button, a menu item). */
function base(lang: Lang, term: Term): string {
  return forms(lang, term)[0]
}

/** The shell's main-process table is an inline object; its values are read out of the source. */
const shellMain = readFileSync(join(SHELL, 'main/index.ts'), 'utf8')
function shellMainBlock(lang: Lang): string {
  const header = lang === 'zh-TW' ? "'zh-TW'" : lang
  const start = shellMain.search(new RegExp(`\\n {2}${header}: \\{\\n {4}\\w+: `))
  if (start < 0) throw new Error(`no ${lang} block in the shell's main-process table`)
  const rest = shellMain.slice(start + 1)
  const end = rest.search(/\n {2}\}/)
  return rest.slice(0, end)
}
function shellMainText(lang: Lang, key: string): string {
  const value = shellMainBlock(lang).match(new RegExp(`\\n {4}${key}: '([^']*)'`))?.[1]
  if (value === undefined) throw new Error(`no ${key} in the shell's ${lang} block`)
  return value
}
function shellMainValues(lang: Lang): string[] {
  return [...shellMainBlock(lang).matchAll(/\n {4,6}(?:\w+: )?'([^']*)'/g)].map((m) => m[1])
}

function helpTopic(lang: Lang): string {
  return readFileSync(join(SHELL, `renderer/src/i18n/help/topics/cad.${lang}.md`), 'utf8')
}

describe('the AI Drawing glossary', () => {
  it('has a row for each of the 21 languages', () => {
    expect([...glossary.keys()].sort()).toEqual([...LANGS].sort())
  })

  for (const lang of LANGS) {
    describe(lang, () => {
      const t = strings[lang] as Record<string, string>
      const main = CAD_MAIN_TEXTS[lang]
      const shell = shellStrings[lang] as Record<string, string>

      it('names the editor the same everywhere', () => {
        const name = fold(base(lang, 'AI 도면'))
        expect(fold(shell.newCad), 'home newCad').toBe(name)
        expect(fold(shell.filterCad), 'home filterCad').toBe(name)
        expect(fold(shellMainText(lang, 'menuNewCad')), 'menu menuNewCad').toBe(name)
        expect(fold(shellMainText(lang, 'filterCad')), 'menu filterCad').toBe(name)
        expect(fold(main.filterCad), 'main filterCad').toBe(name)
        expect(
          uses(lang, 'AI 도면', main.dlgSaveTitle),
          `main dlgSaveTitle: ${main.dlgSaveTitle}`,
        ).toBe(true)
        expect(
          uses(lang, 'AI 도면', main.dlgExportTitle),
          `main dlgExportTitle: ${main.dlgExportTitle}`,
        ).toBe(true)
      })

      it('names an untitled drawing the same in the tab, the editor and the save dialog', () => {
        expect(shellMainText(lang, 'untitledCad'), 'shell untitledCad').toBe(t.untitled)
        expect(main.untitledFile, 'main untitledFile').toBe(t.untitled)
      })

      it('uses the word for a shape in the steps of the AI and the sheet', () => {
        for (const key of [
          'selectFirst',
          'sheetEmpty',
          'aiToolUpdateShapes',
          'aiToolDeleteShapes',
          'aiToolGroupShapes',
          'aiToolAlignShapes',
        ]) {
          expect(uses(lang, '도형', t[key]), `${key}: ${t[key]}`).toBe(true)
        }
      })

      it('uses the word for a hole', () => {
        for (const key of ['hole', 'shortcutHole']) {
          expect(uses(lang, '구멍', t[key]), `${key}: ${t[key]}`).toBe(true)
        }
      })

      it('uses the word for the workplane', () => {
        for (const key of [
          'statusWorkplane',
          'sketchHint',
          'aiToolSetWorkplane',
          'aiQuickRoomPrompt',
        ]) {
          expect(uses(lang, '작업판', t[key]), `${key}: ${t[key]}`).toBe(true)
        }
      })

      it('uses the word for the dimension sheet', () => {
        for (const key of ['sheet', 'aiQuickSheet']) {
          expect(uses(lang, '치수 도면', t[key]), `${key}: ${t[key]}`).toBe(true)
        }
      })

      it('names the tools as the glossary does', () => {
        expect(fold(t.sheetFieldScale)).toBe(fold(base(lang, '축척')))
        expect(fold(t.measure)).toBe(fold(base(lang, '치수 재기')))
        expect(fold(t.sketch)).toBe(fold(base(lang, '직접 그리기')))
        expect(fold(t.sketchTitle)).toBe(fold(base(lang, '직접 그리기')))
        expect(fold(t.groupSend)).toBe(fold(base(lang, '문서로 보내기')))
        expect(fold(t.group)).toBe(fold(base(lang, '묶기')))
        expect(fold(t.ungroup)).toBe(fold(base(lang, '풀기')))
        expect(fold(t.align)).toBe(fold(base(lang, '줄 맞추기')))
      })

      it('uses the glossary in the help topic', () => {
        const help = helpTopic(lang)
        for (const term of ['구멍', '작업판', '치수 도면', '표제란', 'AI 도면'] as const) {
          expect(uses(lang, term, help), `${term} in cad.${lang}.md`).toBe(true)
        }
      })

      it('puts in bold only names the user sees on the screen', () => {
        const shown = new Set(
          [
            ...Object.values(t),
            ...Object.values(main),
            ...Object.values(shell),
            ...Object.values(recoveryListStrings[lang]),
            ...shellMainValues(lang),
          ].map((text) => text.trim()),
        )
        const bold = [...helpTopic(lang).matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1])
        const missing = bold
          .flatMap((name) => name.split(' › '))
          .map((name) => name.trim())
          .filter((name) => !shown.has(name))
        expect(missing).toEqual([])
      })

      it('gives the View tab and the views group different names', () => {
        expect(t.groupViews).not.toBe(t.tabView)
      })

      it('gives the snap in the status line a word other than the Align button', () => {
        const snapWord = t.statusWorkplane.split('·')[1]
        expect(fold(snapWord)).not.toContain(fold(t.align))
      })
    })
  }
  it('writes German key names the German way in the help and the AI pane', () => {
    // the other German help topics and the German menus say Strg and Umschalt
    const help = helpTopic('de')
    expect(help).not.toMatch(/\bCtrl\b|\bShift\b/)
    expect(help).toContain('Strg+Z')
    expect(strings.de.aiEmptyBody).toContain('Strg+Z')
  })
})
