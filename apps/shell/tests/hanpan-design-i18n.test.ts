// @vitest-environment node
// The design board speaks the UI language (0.17): its words in Korean, English and
// Vietnamese (other languages read English), templates whose texts follow the language,
// AI prompts that answer in it, a translation target the person picks, and a window that
// follows a language change without reopening.
import { describe, expect, it, vi } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { wordsFor, LANG_NATIVE_NAMES, fontLabel, iconLabel } from '../src/renderer/src/design/words'
import { templatesFor, DESIGN_TEMPLATES } from '../src/renderer/src/design/templates'
import {
  briefRequest,
  fillRequest,
  fillSlots,
  rewriteRequest,
  translateTarget,
} from '../src/renderer/src/design/ai'
import { FORMATS } from '../src/renderer/src/design/model'
import { ICONS } from '../src/renderer/src/design/icons'

const HANGUL = /[가-힣]/

/** every string leaf of a words table, by dotted path */
function leaves(value: unknown, path = ''): Map<string, string> {
  const out = new Map<string, string>()
  if (typeof value === 'string') out.set(path, value)
  else if (typeof value === 'function') out.set(path, String((value as (n: number) => string)(2)))
  else if (Array.isArray(value))
    value.forEach((v, i) => leaves(v, `${path}[${i}]`).forEach((s, k) => out.set(k, s)))
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value))
      leaves(v, path ? `${path}.${k}` : k).forEach((s, p) => out.set(p, s))
  return out
}

describe('design board words', () => {
  const ko = leaves(wordsFor('ko'))
  const en = leaves(wordsFor('en'))
  const viWords = leaves(wordsFor('vi'))

  it('has the same entries in Korean, English and Vietnamese', () => {
    expect([...en.keys()].sort()).toEqual([...ko.keys()].sort())
    expect([...viWords.keys()].sort()).toEqual([...ko.keys()].sort())
  })

  it('writes Vietnamese of its own, with no Korean or leftover English', () => {
    const SAME_OK = /^[A-Za-z0-9 .()+:·✦…/-]{1,12}$/
    const english = [...viWords].filter(([k, s]) => s === en.get(k) && !SAME_OK.test(s))
    expect(english).toEqual([])
    expect([...viWords.values()].filter((s) => HANGUL.test(s))).toEqual([])
    expect([...en.values()].filter((s) => HANGUL.test(s))).toEqual([])
  })

  it('falls back to English for the other languages', () => {
    for (const lang of LANGS.filter((l) => !['ko', 'vi'].includes(l)))
      expect(wordsFor(lang), lang).toBe(wordsFor('en'))
    expect(wordsFor('ko').undo).toBe('되돌리기')
  })

  it('names every UI language in its own script for the translation target', () => {
    expect(Object.keys(LANG_NATIVE_NAMES).sort()).toEqual([...LANGS].sort())
    expect(LANG_NATIVE_NAMES.vi).toBe('Tiếng Việt')
  })

  it('labels fonts and icons in the UI language', () => {
    expect(fontLabel({ family: 'Pretendard', label: '프리텐다드' }, 'ko')).toBe('프리텐다드')
    expect(fontLabel({ family: 'Pretendard', label: '프리텐다드' }, 'vi')).toBe('Pretendard')
    const calendar = ICONS.find((i) => i.name === 'calendar-days')!
    expect(iconLabel(calendar, 'ko')).toBe(calendar.label)
    expect(iconLabel(calendar, 'en')).toBe('calendar days')
  })
})

/** Vietnamese letters a Latin display face (Bebas Neue, Archivo Black) or a Hangul display face lacks */
const VI_ONLY =
  /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĂÂĐÊÔƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ]/
const NO_VIETNAMESE = ['Bebas Neue', 'Archivo Black', 'Black Han Sans', 'Do Hyeon']

describe('design templates', () => {
  it('stay Korean under a Korean UI', () => {
    const ko = templatesFor('ko')
    expect(ko.map((t) => t.name)).toEqual(DESIGN_TEMPLATES.map((t) => t.name))
    expect(JSON.stringify(ko[0]!.make().pages[0]!.elements.map((e) => e.text))).toBe(
      JSON.stringify(DESIGN_TEMPLATES[0]!.make().pages[0]!.elements.map((e) => e.text)),
    )
  })

  for (const lang of ['en', 'vi', 'de']) {
    it(`carry no Korean under a ${lang} UI`, () => {
      const korean: string[] = []
      for (const t of templatesFor(lang)) {
        if (HANGUL.test(t.name)) korean.push(`${t.id}: ${t.name}`)
        const doc = t.make()
        if (HANGUL.test(doc.name)) korean.push(`${t.id} doc: ${doc.name}`)
        for (const page of doc.pages)
          for (const e of page.elements)
            if (e.text && HANGUL.test(e.text)) korean.push(`${t.id}: ${e.text}`)
      }
      expect(korean).toEqual([])
    })
  }

  it('speak Vietnamese under a Vietnamese UI, in faces that carry its letters', () => {
    const texts = templatesFor('vi').flatMap((t) =>
      t.make().pages.flatMap((p) => p.elements.filter((e) => e.text)),
    )
    expect(texts.some((e) => VI_ONLY.test(e.text!))).toBe(true)
    const broken = texts.filter(
      (e) => VI_ONLY.test(e.text!) && NO_VIETNAMESE.includes(e.fontFamily ?? ''),
    )
    expect(broken.map((e) => `${e.fontFamily}: ${e.text}`)).toEqual([])
  })
})

describe('design AI language', () => {
  const card = FORMATS[0]!

  it('asks for the UI language under a non-Korean UI', () => {
    expect(briefRequest('x', card, 'vi', 'today').system).toContain('Vietnamese')
    expect(briefRequest('x', card, 'en', 'today').system).toContain('English')
    const slots = fillSlots(DESIGN_TEMPLATES[0]!.make())
    expect(fillRequest(slots, 'x', 'vi', 'today').system).toContain('Vietnamese')
  })

  it('keeps the text language when it polishes, shortens or sharpens', () => {
    expect(rewriteRequest('Xin chào', 'polish', 'vi').system).toMatch(/same language/i)
    expect(rewriteRequest('안녕하세요', 'shorter', 'ko').system).toContain('같은 언어')
  })

  it('translates into the language picked, or the UI language by default', () => {
    expect(rewriteRequest('학부모 설명회', 'translate', 'vi', 'ja').system).toContain('Japanese')
    expect(rewriteRequest('Parents evening', 'translate', 'ko', 'vi').system).toContain('베트남어')
    expect(rewriteRequest('학부모 설명회', 'translate', 'vi').system).toContain('Vietnamese')
  })

  it('picks a default target away from the language the text is already in', () => {
    expect(translateTarget('ko', '학부모 설명회')).toBe('en')
    expect(translateTarget('ko', 'Parents evening')).toBe('ko')
    expect(translateTarget('vi', 'Họp phụ huynh')).toBe('en')
    expect(translateTarget('vi', '학부모 설명회')).toBe('vi')
    expect(translateTarget('en', 'Parents evening')).toBe('ko')
    expect(translateTarget('en', '학부모 설명회')).toBe('en')
    expect(translateTarget('ja', '保護者説明会のお知らせ')).toBe('en')
    expect(translateTarget('de', 'Parents evening')).toBe('de')
  })
})

describe('design window language', () => {
  it('passes a language change on to the board', async () => {
    const exposed = new Map<string, unknown>()
    const on = vi.fn()
    vi.doMock('electron', () => ({
      contextBridge: { exposeInMainWorld: (name: string, api: unknown) => exposed.set(name, api) },
      ipcRenderer: { invoke: vi.fn(), send: vi.fn(), on, removeListener: vi.fn() },
      webUtils: { getPathForFile: () => '' },
    }))
    await import('../src/preload/design')
    const api = exposed.get('hanpanDesign') as {
      onLanguageChanged(h: (l: string) => void): () => void
    }
    const seen: string[] = []
    api.onLanguageChanged((lang) => seen.push(lang))
    const call = on.mock.calls.find(([channel]) => channel === 'app:language-changed')
    expect(call).toBeTruthy()
    ;(call![1] as (e: unknown, lang: unknown) => void)({}, 'vi')
    ;(call![1] as (e: unknown, lang: unknown) => void)({}, 'not-a-language')
    expect(seen).toEqual(['vi'])
  })
})
