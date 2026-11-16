// Release notes in two parts (decision 0100): the body is Korean, then a heading
// "English" and the English text. A Korean UI shows the part before the heading,
// every other UI the part after it. A release without the heading shows whole.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizeReleaseNotes, notesForLang } from '../src/main/update-notes'

// GitHub's own rendering of "한국어 본문 / --- / ## English / English body"
const BILINGUAL = `<p>설치할 때 언어를 고를 수 있습니다.</p>
<ul><li>설치 언어 고르기</li></ul>
<hr>
<div class="markdown-heading"><h2 class="heading-element">English</h2><a id="user-content-english" class="anchor" aria-label="Permalink: English" href="#english"><svg class="octicon"><path d="M0"></path></svg></a></div>
<p>You can pick the language when you install.</p>
<ul><li>Installer language</li></ul>`

const texts = (notes: ReturnType<typeof notesForLang>) =>
  JSON.stringify(notes?.sections.map((s) => s.blocks))

describe('notesForLang', () => {
  const notes = normalizeReleaseNotes(BILINGUAL)

  it('shows the Korean part to a Korean UI', () => {
    const ko = texts(notesForLang(notes, 'ko'))
    expect(ko).toContain('설치할 때 언어를 고를 수 있습니다.')
    expect(ko).not.toContain('English')
    expect(ko).not.toContain('You can pick')
  })

  it.each(['en', 'vi', 'zh-TW', 'ar'] as const)('shows the English part to a %s UI', (lang) => {
    const other = texts(notesForLang(notes, lang))
    expect(other).toContain('You can pick the language when you install.')
    expect(other).toContain('Installer language')
    expect(other).not.toContain('설치')
    expect(other).not.toContain('"English"')
  })

  it('shows a release without an English heading whole, to every UI', () => {
    const old = normalizeReleaseNotes('<p>마크다운 편집기를 고쳤습니다.</p>')
    expect(notesForLang(old, 'vi')).toEqual(old)
    expect(notesForLang(old, 'ko')).toEqual(old)
  })

  it('splits each version of a full changelog on its own', () => {
    const notes2 = normalizeReleaseNotes([
      { version: '0.20.3', note: BILINGUAL },
      { version: '0.20.2', note: '<p>한국어만</p>' },
    ])
    const vi = notesForLang(notes2, 'vi')!
    expect(vi.sections.map((s) => s.version)).toEqual(['0.20.3', '0.20.2'])
    expect(JSON.stringify(vi.sections[0]!.blocks)).not.toContain('설치')
    expect(JSON.stringify(vi.sections[1]!.blocks)).toContain('한국어만')
  })

  it('keeps null as null', () => {
    expect(notesForLang(null, 'en')).toBeNull()
  })
})

describe('the update window and the notes language', () => {
  it('builds its notes for the UI language', () => {
    const src = readFileSync(new URL('../src/main/updater.ts', import.meta.url), 'utf8')
    expect(src).toMatch(/releaseNotes: notesForLang\(releaseNotes, getUiLang\(\)\)/)
  })
})
