/**
 * 0.17 UI/UX review v2 (hwp-design): studio text that read as a developer's note or as a web
 * page's guidance in the desktop app.
 *
 * #4  편집 > 문서 이력 관리 said "문단 stable_id가 보존된 IR 스냅샷(JSON)", "identity(Map) 비교",
 *     "(legacy)", "정렬(alignment)로 폴백".
 * #5  도구 > 환경 설정 named Chrome/Edge and Firefox, and "대표 글꼴 등록", "감지 결과 초기화"
 *     meant nothing to a first-time user.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_STRINGS, EXTRA_LOCALES } from '../studio-plugin/studio-locales.mjs'

const LOCALES = ['ko', 'en', ...Object.keys(EXTRA_LOCALES)] as const
const words = (locale: string) => (APP_STRINGS as Record<string, Record<string, string>>)[locale]

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
// rhwp's own catalog is fetched by the studio build; a plain `npm test` (CI's test job) has none
const fetched = existsSync(studio)
const catalog = (locale: 'ko' | 'en') => {
  const file = join(studio, 'src', 'i18n', 'locales', `${locale}.ts`)
  if (!existsSync(file)) return {}
  const entries = [...readFileSync(file, 'utf8').matchAll(/^\s*"([^"]+)": (".*"),?$/gm)]
  return Object.fromEntries(entries.map((m) => [m[1], JSON.parse(m[2]) as string]))
}
/** What the studio shows for a key in a language: the app's word over rhwp's. */
const shown = (locale: string, key: string) =>
  words(locale)[key] ??
  (EXTRA_LOCALES as Record<string, Record<string, string>>)[locale]?.[key] ??
  (catalog(locale === 'ko' ? 'ko' : 'en') as Record<string, string>)[key]

describe('the document history dialog (#4)', () => {
  const DEVELOPER =
    /stable_id|IR|JSON|identity|Map\)|legacy|alignment|폴백|스냅샷|Snapshot|bytes|바이트/i
  it.each(LOCALES)('explains itself without developer words (%s)', (locale) => {
    for (const key of [
      'dialog.history.hint.text',
      'dialog.history.lab.text',
      'dialog.history.onCompareWithCurrent.text.x09d3e7',
      'dialog.history.onCompareWithCurrent.text.x9cae02',
      'dialog.history.refreshList.text',
      'dialog.history.onCompareWithCurrent.text',
      'dialog.history.resultMetaEl.text.x63539d',
      'dialog.history.resultMetaEl.text.xf2c8ca',
      'hanpan.history.snapshotLabel',
    ]) {
      expect(shown(locale, key), `${locale} ${key}`).toBeTruthy()
      expect(shown(locale, key), `${locale} ${key}`).not.toMatch(DEVELOPER)
    }
  })

  it.each(LOCALES)('has an empty-list note (%s)', (locale) => {
    expect(words(locale)['hanpan.history.empty']).toBeTruthy()
  })
})

describe('the preferences dialog (#5)', () => {
  const BROWSER = /Chrome|Edge|Firefox|브라우저|browser|trình duyệt|확장|extension|tiện ích/i
  const KEYS = [
    'dialog.options.localDesc.text',
    'dialog.options.localStatus.noStored',
    'dialog.options.localStatus.noStoredFirefox',
    'dialog.options.localStatus.text',
    'dialog.options.localStatus.text.xc0a701',
    'dialog.options.localStatus.unsupported',
    'dialog.options.updateLocalStatus.label.x97c46b',
    'dialog.localFontsModal.privacy.text',
    'dialog.localFontsModal.privacy.text.x1d928d',
  ]
  it.each(LOCALES)('names no browser (%s)', (locale) => {
    for (const key of KEYS) {
      expect(shown(locale, key), `${locale} ${key}`).toBeTruthy()
      expect(shown(locale, key), `${locale} ${key}`).not.toMatch(BROWSER)
    }
  })

  it('says what the font buttons do', () => {
    expect(words('ko')['dialog.options.localBtn.text']).toBe('이 PC 글꼴 찾기')
    expect(words('ko')['dialog.options.resetBtn.text']).toBe('찾은 목록 지우기')
    expect(words('ko')['dialog.options.fontSetDesc.text']).toMatch(/언어마다/)
  })
})

describe('menu names (#21, #23, #24)', () => {
  it('call the field insert 누름틀, as its AI hint and Hangul users do', () => {
    expect(words('ko')['command.insert.field.label']).toBe('누름틀 넣기')
    expect(words('ko')['dialog.fieldInsert.title']).toBe('누름틀 넣기')
    expect(words('ko')['dialog.fieldEdit.title']).toBe('누름틀 고치기')
  })

  it.each(LOCALES)(
    'give no Edit menu item a key letter, as the others have none (%s)',
    (locale) => {
      for (const id of ['find', 'findAgain', 'findReplace', 'goto']) {
        for (const kind of ['label', 'splitLabel']) {
          const key = `command.edit.${id}.${kind}`
          expect(shown(locale, key), `${locale} ${key}`).toBeTruthy()
          expect(shown(locale, key), `${locale} ${key}`).not.toMatch(/\([A-Z]\)/)
        }
      }
    },
  )

  it('name the paste of a copied format as the paste is named (붙이기)', () => {
    expect(words('ko')['command.edit.formatPaste.label']).toBe('모양 붙이기')
  })

  it.skipIf(!fetched)('name the paste itself 붙이기 in the fetched studio', () => {
    expect(shown('ko', 'command.edit.paste.label')).toBe('붙이기')
  })

  it.skipIf(!fetched)("name the cell's right-click item as the Table menu does", () => {
    for (const locale of LOCALES) {
      const menu = shown(locale, 'command.table.cellProps.label')
      expect(words(locale)['hanpan.ctx.cellProps'].replace(/\.\.\.$/, ''), locale).toBe(menu)
    }
  })
})
