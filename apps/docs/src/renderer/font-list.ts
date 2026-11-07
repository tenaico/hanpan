import { CJK_FAMILY_ALIASES, type Lang } from '@genoffice/i18n'
import type { FontFamilyInfoMap } from '@genoffice/ui'

/**
 * The suite-wide candidate lists live in @genoffice/ui so every app offers the
 * same fonts; this module re-exports them and keeps the docx-specific helpers.
 */
import { fontFamiliesFor as suiteFontFamiliesFor } from '@genoffice/ui'

export {
  BUILTIN_FONT_FAMILIES,
  familyForTypedName,
  findFontMatch,
  fontFamilyLabel,
  partitionFontFamilies,
  splitHangulFamilies,
  systemFamiliesBesidesCandidates,
} from '@genoffice/ui'

/** faces only macOS ships: off the Mac they are never installed by default */
const MAC_ONLY_FONT_RE =
  /^(apple ?sd gothic|applemyungjo|applegothic|pingfang|songti|heiti|kaiti (sc|tc)|hiragino|osaka)/i

const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

/**
 * The candidate fonts the pickers list first. Off the Mac the macOS-only faces
 * drop out (a Korean list on Windows must not open with Apple SD Gothic Neo);
 * one installed anyway still shows in the system section.
 */
export function candidateFontFamilies(lang: Lang, mac = IS_MAC): readonly string[] {
  const all = suiteFontFamiliesFor(lang)
  return mac ? all : all.filter((name) => !MAC_ONLY_FONT_RE.test(name))
}

/** the pickers' candidate list for the UI language on this platform */
export function fontFamiliesFor(lang: Lang): readonly string[] {
  return candidateFontFamilies(lang)
}

const EAST_ASIAN_FONT_RE =
  /[\u2E80-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u31F0-\u31FF\uAC00-\uD7AF]|sim(sun|hei)|nsimsun|kaiti|fangsong|dengxian|yahei|songti|heiti|xingkai|lisu|youyuan|st(zhongsong|song|kai|fangsong|xihei|hupo|liti|caiyun)|pingfang|hiragino|meiryo|osaka|kozuka|yu (gothic|mincho)|yugoth|ms (ui )?p?(gothic|mincho)|biz ud|malgun|batang|gulim|dotum|gungsuh|m(ye|yu)ngjo|nanum|apple (sd )?gothic|applemyungjo|jhenghei|p?mingliu|biaukai|dfkai|kaiu|source han|noto (sans|serif) (cjk|sc|tc|hk|jp|kr)|wenquanyi/i

/**
 * Which rFonts slot a font-box pick should target: East Asian names go to
 * w:eastAsia, everything else to w:ascii/w:hAnsi — mirroring Word, where
 * picking a Latin font never clobbers the Chinese font and vice versa.
 */
export function isEastAsianFontName(name: string): boolean {
  return EAST_ASIAN_FONT_RE.test(name.normalize('NFKC'))
}

/**
 * docDefaults w:eastAsia font for new blank documents, matching what Word
 * ships per market (zh → SimSun, ja → Yu Mincho, ko → Malgun Gothic,
 * zh-TW → PMingLiU). English and every other language return undefined —
 * like en-US Word, whose theme leaves the East Asian slot empty and lets
 * per-script substitution kick in only when CJK text actually appears.
 * The Latin default is Calibri except under Korean (see blankDocxFontsFor).
 */
export function defaultEastAsiaFontFor(lang: Lang): string | undefined {
  switch (lang) {
    case 'zh':
      return '宋体'
    case 'ja':
      return 'Yu Mincho'
    case 'ko':
      return 'Malgun Gothic'
    case 'zh-TW':
      return 'PMingLiU'
    default:
      return undefined
  }
}

/**
 * docDefaults fonts of a new blank document. Hanpan: a Korean UI starts every
 * script slot in Malgun Gothic (맑은 고딕), like Korean Word, instead of Calibri.
 * Where the face is not installed the Korean sans fallback chain draws it.
 */
export function blankDocxFontsFor(lang: Lang): { eastAsiaFont?: string; latinFont?: string } {
  const eastAsiaFont = defaultEastAsiaFontFor(lang)
  return lang === 'ko' ? { eastAsiaFont, latinFont: 'Malgun Gothic' } : { eastAsiaFont }
}

const HANGUL_RE = /[가-힯]/
/** 'Malgun Gothic' → '맑은 고딕' 같은 영문 패밀리 이름의 한국어 이름(글꼴 표에 없을 때 쓰는 대체값) */
const KOREAN_NAME_OF: ReadonlyMap<string, string> = new Map(
  Object.entries(CJK_FAMILY_ALIASES)
    .filter(([name]) => HANGUL_RE.test(name))
    .flatMap(([name, aliases]) => aliases.map((alias) => [alias, name] as const)),
)

/**
 * 글꼴 칸에 보일 이름. 한국어 화면에서는 엑셀·한글처럼 한국어 패밀리 이름(맑은 고딕)을
 * 보인다. 문서에 쓰이는 이름은 그대로 두고 표시만 바꾼다.
 */
export function fontBoxDisplayName(family: string, lang: Lang, info?: FontFamilyInfoMap): string {
  if (lang !== 'ko' || !family) return family
  return info?.get(family)?.ko ?? KOREAN_NAME_OF.get(family) ?? family
}
