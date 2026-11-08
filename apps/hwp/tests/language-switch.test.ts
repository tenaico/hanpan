/**
 * The studio picks its language once, when its page loads (`lang` in its address), so a
 * Hangul tab that was open when the UI language changed kept its Korean menus until it was
 * opened again (0.17 acceptance D3). A clean document is reloaded into a studio in the new
 * language at once; a document with something that a reload would lose (unsaved edits, a
 * restored recovery copy, a password, an untitled template copy) is left alone and the tab
 * says the language applies when it is opened again.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { languageSwitchPlan, reopenNoticeAfter } from '../src/renderer/language-switch'
import { strings } from '../src/renderer/i18n/strings'

const clean = {
  from: 'ko' as const,
  to: 'vi' as const,
  ready: true,
  dirty: false,
  restored: false,
  passwordProtected: false,
  untitledCopy: false,
}

describe('what a UI language change does to an open Hangul tab', () => {
  it('nothing when the studio language stays the same', () => {
    expect(languageSwitchPlan({ ...clean, to: 'ko' })).toBe('none')
    // French and German both show the studio in English
    expect(languageSwitchPlan({ ...clean, from: 'en', to: 'en', dirty: true })).toBe('none')
  })

  it('reloads a clean document into the new language', () => {
    expect(languageSwitchPlan(clean)).toBe('reload')
  })

  it('waits for the next open when a reload would lose something', () => {
    expect(languageSwitchPlan({ ...clean, dirty: true })).toBe('later')
    expect(languageSwitchPlan({ ...clean, restored: true })).toBe('later')
    expect(languageSwitchPlan({ ...clean, passwordProtected: true })).toBe('later')
    expect(languageSwitchPlan({ ...clean, untitledCopy: true })).toBe('later')
    expect(languageSwitchPlan({ ...clean, ready: false })).toBe('later')
  })

  it('takes the notice down when the language comes back to the one the tab was opened with', () => {
    // ko → vi with unsaved edits says "applies when reopened"; back to ko there is nothing to apply
    expect(reopenNoticeAfter(languageSwitchPlan({ ...clean, dirty: true }))).toBe('show')
    expect(reopenNoticeAfter(languageSwitchPlan({ ...clean, to: 'ko', dirty: true }))).toBe('clear')
    expect(reopenNoticeAfter('reload')).toBe('clear')
  })

  it('says so in every UI language', () => {
    for (const [lang, words] of Object.entries(strings)) {
      expect((words as Record<string, string>).languageOnReopen, lang).toBeTruthy()
    }
  })

  it('is wired into the tab: the editor boots again for a reload, from the file it shows', () => {
    const app = readFileSync(join(process.cwd(), 'src/renderer/App.tsx'), 'utf8')
    expect(app).toContain('languageSwitchPlan({')
    expect(app).toMatch(/\}, \[bootGen\]\)/)
    expect(app).toContain('reloadRef.current')
    expect(app).toContain("key: 'languageOnReopen'")
    // the effect does not stop before a change back to the booted language
    expect(app).not.toContain('if (!from || from === to) return')
    expect(app).toContain('reopenNoticeAfter(')
  })
})
