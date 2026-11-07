/**
 * The studio languages this app adds to rhwp's Korean and English, and the words of the
 * studio that depend on the language but are not in its catalogs: the style names in the
 * toolbar list and the About box.
 *
 * A language is added by putting its catalog (studio key → text) in studio-locales/ and
 * naming it in EXTRA_LOCALES, and by letting studioLocale (src/renderer/studio-settings.ts)
 * ask for it. The build registers each catalog over the English one
 * (studio-locale-register in scripts/rhwp-patches.mjs), so a key a catalog leaves out (the
 * dialogs, in Vietnamese) shows in English, never in Korean.
 */
import { dialogStrings } from './studio-locales/dialog-strings.mjs'
import { uxStrings } from './studio-locales/ux-strings.mjs'
import vi from './studio-locales/vi.mjs'

/** Studio languages beyond rhwp's own ko and en. */
export const EXTRA_LOCALES = { vi }

/** The studio language a studio page was opened with (its `lang` query), as the studio resolves it. */
export function studioLocaleOf(search) {
  const lang = new URLSearchParams(search ?? '').get('lang')
  return lang === 'en' || Object.hasOwn(EXTRA_LOCALES, lang ?? '') ? lang : 'ko'
}

/** The studio language of this page; Korean outside a browser. */
export function studioLocaleNow() {
  const here = globalThis.location
  return here ? studioLocaleOf(here.search) : 'ko'
}

/**
 * Hangul's built-in styles by their English names, in the languages that have their own
 * words. Outline n and TOC n are matched by pattern.
 */
const STYLE_NAMES = {
  vi: {
    Normal: 'Bình thường',
    Body: 'Thân văn bản',
    'Page Number': 'Số trang',
    Header: 'Đầu trang',
    Footnote: 'Chú thích cuối trang',
    Endnote: 'Chú thích cuối văn bản',
    Memo: 'Ghi chú',
    'TOC Heading': 'Tiêu đề mục lục',
    Caption: 'Chú thích',
    'Outline {n}': 'Đề mục {n}',
    'TOC {n}': 'Mục lục {n}',
  },
}

const HANGUL = /[가-힣]/

/**
 * The name a style shows in the toolbar list and the style dialog. A document written in Korean names its styles
 * in Korean and carries an English name beside each; outside Korean the list shows that
 * English name, or this language's word for one of Hangul's built-in styles. A style named
 * in another script, or without an English name, keeps its own name. Only what is shown
 * changes (the toolbar list and the style dialog): the document and the AI keep the stored names.
 */
export function styleDisplayName(style, locale) {
  const name = String(style?.name ?? '')
  const english = String(style?.englishName ?? '').trim()
  if (locale === 'ko' || !english || !HANGUL.test(name)) return name
  const words = STYLE_NAMES[locale]
  if (!words) return english
  if (Object.hasOwn(words, english)) return words[english]
  const numbered = /^(Outline|TOC) (\d+)$/.exec(english)
  const pattern = numbered && words[`${numbered[1]} {n}`]
  return pattern ? pattern.replace('{n}', numbered[2]) : english
}

const ABOUT = {
  ko: {
    product: '한판 · AI 한글',
    subtitle: '한글(HWP·HWPX) 문서 편집기',
    engine: '편집 엔진: rhwp {version} (한판에 맞게 고친 판)',
    credit: '오픈소스 rhwp(MIT 라이선스)를 바탕으로 만들었습니다.',
  },
  en: {
    product: 'Hanpan · AI HWP',
    subtitle: 'Editor for Hangul (HWP, HWPX) documents',
    engine: 'Editing engine: rhwp {version} (adapted for Hanpan)',
    credit: 'Built on the open-source rhwp (MIT License).',
  },
  vi: {
    product: 'Hanpan · AI HWP',
    subtitle: 'Trình soạn thảo tài liệu Hangul (HWP, HWPX)',
    engine: 'Công cụ biên tập: rhwp {version} (bản điều chỉnh cho Hanpan)',
    credit: 'Xây dựng trên rhwp mã nguồn mở (Giấy phép MIT).',
  },
}

/**
 * The About box's head lines in a studio language. `version` is the engine build's version
 * (vendor/rhwp-core, e.g. 0.8.7-ieum.12); the line names the rhwp release it comes from.
 */
export function aboutText(locale, version) {
  const words = ABOUT[locale] ?? ABOUT.en
  const release = String(version).replace(/-.*$/, '')
  return { ...words, engine: words.engine.replace('{version}', release) }
}

/**
 * Layout the studio's style bar needs in the added languages. rhwp sizes the style box (88px)
 * and the font-set box (64px) for Korean and widens the font-set box to 84px for English
 * (style-bar.css, html[lang='en']); Vietnamese ran its words under the boxes' arrows ("Bình
 * thường" 69px, "Bộ phông" 49px; a box keeps about 40px for its padding and arrow on Windows).
 * The same rules for Vietnamese with a 112px style box (its own 88px rule, by id, gives way to the
 * grid column); a longer style name ends in an ellipsis.
 */
export const LOCALE_LAYOUT_CSS = `
html[lang='vi'] .sb-field-ribbon-group {
  width: min(520px, 100%);
}
html[lang='vi'] .sb-field-grid {
  grid-template-columns:
    minmax(68px, 112px)
    minmax(74px, 84px)
    136px
    minmax(72px, 86px)
    minmax(72px, 86px);
  width: min(520px, 100%);
}
html[lang='vi'] #style-name {
  width: 100%;
}
html[lang='vi'] #style-name,
html[lang='vi'] .sb-font-lang {
  text-overflow: ellipsis;
}
@media (max-width: 459px) {
  html[lang='vi'] .sb-field-grid {
    grid-template-columns:
      minmax(54px, 1fr)
      minmax(40px, 0.75fr)
      136px
      minmax(54px, 0.95fr)
      minmax(54px, 0.95fr);
  }
}
@media (min-width: 808px) {
  html[lang='vi'] .sb-field-ribbon-group {
    flex: 0 0 525px;
    width: 525px;
    min-width: 525px;
  }
  html[lang='vi'] .sb-field-grid {
    grid-template-columns: 112px 84px 136px 86px 86px;
    width: 100%;
  }
}
`

const LOCALE_LAYOUT_STYLE_ID = 'ieum-locale-layout'

/** Puts LOCALE_LAYOUT_CSS into the editor page, once. */
export function installLocaleLayout(doc = globalThis.document) {
  if (!doc?.documentElement) return false
  const style = doc.getElementById(LOCALE_LAYOUT_STYLE_ID) ?? doc.createElement('style')
  style.id = LOCALE_LAYOUT_STYLE_ID
  if (style.textContent !== LOCALE_LAYOUT_CSS) style.textContent = LOCALE_LAYOUT_CSS
  if (!style.parentNode) (doc.head ?? doc.documentElement).appendChild(style)
  return true
}

/**
 * rhwp catalog entries the app words differently, by studio key, in Korean, English and every
 * added language. The cell properties' vertical-writing options are Hangul's 영문 눕힘 and
 * 영문 세움 (Latin letters turned sideways or kept upright); rhwp wrote 문 눕힘/문 세움 and its
 * English catalog read the 문 as a door ("Door flat(Q)", "Door upright(U)").
 */
const CATALOG_CORRECTIONS = {
  ko: {
    'dialog.tableCellProps.buildCellTab.label.x872cd2': '영문 눕힘(Q)',
    'dialog.tableCellProps.buildCellTab.label.xd9f9d6': '영문 세움(U)',
  },
  en: {
    'dialog.tableCellProps.buildCellTab.label.x872cd2': 'Latin text sideways(Q)',
    'dialog.tableCellProps.buildCellTab.label.xd9f9d6': 'Latin text upright(U)',
  },
  vi: {
    'dialog.tableCellProps.buildCellTab.label.x872cd2': 'Chữ Latinh nằm ngang(Q)',
    'dialog.tableCellProps.buildCellTab.label.xd9f9d6': 'Chữ Latinh dựng đứng(U)',
  },
}

/**
 * Text the studio writes straight into its markup instead of asking its catalogs, under keys
 * of the app's own (`hanpan.*`), in Korean, English and every added language. The build
 * registers them with each studio language (studio-locale-register) and patches the studio
 * to ask for them (studio-page-setup-labels, studio-input-aria-label, and the dialogs' own in
 * scripts/studio-dialog-text.mjs, whose words are in studio-locales/dialog-strings.mjs). The
 * CATALOG_CORRECTIONS ride along under rhwp's own keys and win over its catalogs.
 */
export const APP_STRINGS = {
  ko: {
    'hanpan.pageSetup.portrait': '세로',
    'hanpan.pageSetup.landscape': '가로',
    'hanpan.pageSetup.bindingSingle': '한쪽',
    'hanpan.pageSetup.bindingFacing': '맞쪽',
    'hanpan.pageSetup.bindingTop': '위로',
    'hanpan.pageSetup.marginTop': '위쪽',
    'hanpan.pageSetup.marginBottom': '아래쪽',
    'hanpan.pageSetup.marginLeft': '왼쪽',
    'hanpan.pageSetup.marginRight': '오른쪽',
    'hanpan.pageSetup.marginHeader': '머리말',
    'hanpan.pageSetup.marginFooter': '꼬리말',
    'hanpan.pageSetup.marginGutter': '제본',
    'hanpan.editor.inputLabel': '문서 편집 입력',
    ...dialogStrings(0),
    ...uxStrings(0),
    ...CATALOG_CORRECTIONS.ko,
  },
  en: {
    'hanpan.pageSetup.portrait': 'Portrait',
    'hanpan.pageSetup.landscape': 'Landscape',
    'hanpan.pageSetup.bindingSingle': 'Single-sided',
    'hanpan.pageSetup.bindingFacing': 'Facing pages',
    'hanpan.pageSetup.bindingTop': 'Top-bound',
    'hanpan.pageSetup.marginTop': 'Top',
    'hanpan.pageSetup.marginBottom': 'Bottom',
    'hanpan.pageSetup.marginLeft': 'Left',
    'hanpan.pageSetup.marginRight': 'Right',
    'hanpan.pageSetup.marginHeader': 'Header',
    'hanpan.pageSetup.marginFooter': 'Footer',
    'hanpan.pageSetup.marginGutter': 'Gutter',
    'hanpan.editor.inputLabel': 'Document editing input',
    ...dialogStrings(1),
    ...uxStrings(1),
    ...CATALOG_CORRECTIONS.en,
  },
  vi: {
    'hanpan.pageSetup.portrait': 'Dọc',
    'hanpan.pageSetup.landscape': 'Ngang',
    'hanpan.pageSetup.bindingSingle': 'Một mặt',
    'hanpan.pageSetup.bindingFacing': 'Hai mặt',
    'hanpan.pageSetup.bindingTop': 'Gáy trên',
    'hanpan.pageSetup.marginTop': 'Trên',
    'hanpan.pageSetup.marginBottom': 'Dưới',
    'hanpan.pageSetup.marginLeft': 'Trái',
    'hanpan.pageSetup.marginRight': 'Phải',
    'hanpan.pageSetup.marginHeader': 'Đầu trang',
    'hanpan.pageSetup.marginFooter': 'Chân trang',
    'hanpan.pageSetup.marginGutter': 'Gáy sách',
    'hanpan.editor.inputLabel': 'Ô nhập chỉnh sửa tài liệu',
    ...dialogStrings(2),
    ...uxStrings(2),
    ...CATALOG_CORRECTIONS.vi,
  },
}

/**
 * A compare or history item title in the UI language. The diff engine writes its titles in
 * Korean and the views match on them ("텍스트 변경"), so the stored title stays as it is and
 * only what the list shows is translated. A title of a shape this does not know stays Korean.
 */
const DIFF_SUBJECTS = {
  표: ['Table', 'bảng'],
  테이블: ['Table', 'bảng'],
  도형: ['Shape', 'hình vẽ'],
  이미지: ['Image', 'hình ảnh'],
  그래프: ['Chart', 'biểu đồ'],
  텍스트: ['Text', 'văn bản'],
  메타: ['Metadata', 'siêu dữ liệu'],
  그림: ['Picture', 'hình'],
  문단: ['Paragraph', 'đoạn văn'],
}
const DIFF_CHANGES = {
  추가: ['added', 'Đã thêm'],
  삭제: ['deleted', 'Đã xóa'],
  '행/열 변경': ['rows/columns changed', 'Thay đổi hàng/cột'],
  '크기 변경': ['size changed', 'Thay đổi kích thước'],
  '텍스트 변경': ['text changed', 'Thay đổi văn bản'],
  '자르기 변경': ['crop changed', 'Thay đổi vùng cắt'],
  '효과 변경': ['effect changed', 'Thay đổi hiệu ứng'],
  '회전/대칭 변경': ['rotation/flip changed', 'Thay đổi xoay/lật'],
  '배치 변경': ['layout changed', 'Thay đổi bố trí'],
  '속성 변경': ['properties changed', 'Thay đổi thuộc tính'],
  '순서 이동': ['order moved', 'Đổi thứ tự'],
  '개체 수 변경': ['object count changed', 'Thay đổi số đối tượng'],
  '이동 감지': ['move detected', 'Phát hiện di chuyển'],
}
const DIFF_TITLE =
  /^(?:(\S+) )?(추가|삭제|행\/열 변경|크기 변경|텍스트 변경|자르기 변경|효과 변경|회전\/대칭 변경|배치 변경|속성 변경|순서 이동|개체 수 변경|이동 감지)(?:\((구조변경 동반)?(?:, )?(?:(\d+)셀)?\))?(?: \(구역 (\d+), 문단 (\d+)\))?$/

export function diffTitleText(title, locale) {
  const text = String(title ?? '')
  if (locale === 'ko') return text
  const m = DIFF_TITLE.exec(text)
  if (!m) return text
  const [, subjectKo, changeKo, structure, cells, section, paragraph] = m
  if (subjectKo && !Object.hasOwn(DIFF_SUBJECTS, subjectKo)) return text
  const vi = locale === 'vi'
  const index = vi ? 1 : 0
  const subject = subjectKo ? DIFF_SUBJECTS[subjectKo][index] : ''
  const change = DIFF_CHANGES[changeKo][index]
  let out = vi
    ? subject
      ? `${change} ${subject}`
      : change
    : subject
      ? `${subject} ${change}`
      : change.charAt(0).toUpperCase() + change.slice(1)
  const extra = []
  if (structure) extra.push(vi ? 'kèm thay đổi cấu trúc' : 'with structure change')
  if (cells) extra.push(vi ? `${cells} ô` : `${cells} cells`)
  if (extra.length) out += ` (${extra.join(', ')})`
  if (section !== undefined)
    out += vi
      ? ` (phần ${section}, đoạn ${paragraph})`
      : ` (section ${section}, paragraph ${paragraph})`
  return out
}
