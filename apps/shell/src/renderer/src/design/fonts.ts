/**
 * Fonts on the design board: the template font set the installer already ships
 * (resources/template-fonts, @genoffice/ui/template-fonts, SIL OFL 1.1 or KOGL type 1) and
 * the fonts installed on this PC (read when the list is first opened; until then the
 * ones most Windows PCs have). Each bundled face is registered at start as a
 * FontFace pointing at its URL, so a file is read only when text first uses it.
 */
import { TEMPLATE_FONT_FACE_REGISTRATIONS, templateFontUrl } from '@genoffice/ui/template-fonts'

export interface FontChoice {
  family: string
  /** the name shown in the font list */
  label: string
  /** a single-weight display face: bold would only be smeared on */
  display?: boolean
}

/** Bundled with Hanpan, so a design looks the same on every PC. */
export const BUNDLED_FONTS: readonly FontChoice[] = [
  { family: 'Pretendard', label: '프리텐다드' },
  { family: 'Noto Serif KR', label: '본명조 (Noto Serif KR)' },
  { family: 'Gowun Batang', label: '고운바탕' },
  { family: 'Gowun Dodum', label: '고운돋움', display: true },
  { family: 'Black Han Sans', label: '검은고딕', display: true },
  { family: 'Do Hyeon', label: '도현', display: true },
  { family: 'Bebas Neue', label: 'Bebas Neue', display: true },
  { family: 'Archivo Black', label: 'Archivo Black', display: true },
  { family: 'Space Grotesk', label: 'Space Grotesk' },
  { family: 'Playfair Display', label: 'Playfair Display' },
]

/**
 * Free fonts from Gongu (공유마당), bundled the same way (OFL or KOGL type 1; the
 * attribution is in NOTICE and the help). A family whose name ends in its weight is
 * one weight of its own, as Office lists it.
 */
export const GONGU_FONTS: readonly FontChoice[] = [
  { family: 'Noto Sans KR', label: '본고딕 (Noto Sans KR)' },
  { family: 'SeoulNamsan M', label: '서울남산체', display: true },
  { family: 'SeoulNamsan B', label: '서울남산체 굵게', display: true },
  { family: 'MunhwajaeDolbom Regular', label: '문화재돌봄체', display: true },
  { family: 'MunhwajaeDolbom Bold', label: '문화재돌봄체 굵게', display: true },
  { family: 'GyeonggiTitle Bold', label: '경기천년제목', display: true },
  { family: 'Hakgyoansim Poster B', label: '학교안심 포스터', display: true },
  { family: 'Hakgyoansim Chilpanjiugae TTF B', label: '학교안심 칠판지우개', display: true },
  { family: 'Hakgyoansim Siganpyo R', label: '학교안심 시간표', display: true },
]

/** On the PC already (Windows with Hancom or Office). */
export const SYSTEM_FONTS: readonly FontChoice[] = [
  { family: '맑은 고딕', label: '맑은 고딕' },
  { family: '함초롬돋움', label: '함초롬돋움' },
  { family: '함초롬바탕', label: '함초롬바탕' },
  { family: 'HY헤드라인M', label: 'HY헤드라인M' },
  { family: '나눔고딕', label: '나눔고딕' },
  { family: 'Arial', label: 'Arial' },
  { family: 'Georgia', label: 'Georgia' },
]

const DISPLAY = new Set(
  [...BUNDLED_FONTS, ...GONGU_FONTS].filter((f) => f.display).map((f) => f.family),
)

/** A face that has one weight only, where bold is better left off. */
export const isDisplayFont = (family: string | undefined): boolean =>
  !!family && DISPLAY.has(family)

let registered = false
/** Hands every bundled face to the page without fetching a byte. */
export function registerBundledFonts(): void {
  if (registered || typeof FontFace === 'undefined') return
  registered = true
  for (const { family, file, weight } of TEMPLATE_FONT_FACE_REGISTRATIONS)
    document.fonts.add(new FontFace(family, `url("${templateFontUrl(file)}")`, { weight }))
}

/** What the main process reads from a font file (app:font-family-info, @genoffice/font-metrics) */
export interface PcFontInfo {
  /** the Korean family name, when the font carries one */
  ko?: string
  hangul: boolean
}

const SHIPPED = new Set([...BUNDLED_FONTS, ...GONGU_FONTS].map((f) => f.family))
const FIXED_PC = new Set(SYSTEM_FONTS.map((f) => f.family))
const MAX_PC_FONTS = 2000

/**
 * The fonts installed on this PC as picker choices: one per family, the
 * bundled families and Windows' vertical-writing twins (`@…`) left out,
 * Hangul fonts first, each under its Korean name when it has one. A family the
 * fixed list stored by its Korean name ("맑은 고딕") keeps that name, so older
 * designs still show their font as chosen.
 */
export function pcFontChoices(
  families: readonly string[],
  info: ReadonlyMap<string, PcFontInfo>,
): FontChoice[] {
  const seen = new Set<string>()
  const out: Array<FontChoice & { hangul: boolean }> = []
  for (const family of families) {
    if (!family || family.startsWith('@') || SHIPPED.has(family) || seen.has(family)) continue
    seen.add(family)
    const facts = info.get(family)
    const label = facts?.ko || family
    out.push({
      family: facts?.ko && FIXED_PC.has(facts.ko) ? facts.ko : family,
      label,
      hangul: facts?.hangul === true,
    })
  }
  out.sort((a, b) =>
    a.hangul !== b.hangul ? (a.hangul ? -1 : 1) : a.label.localeCompare(b.label, 'ko'),
  )
  return out.slice(0, MAX_PC_FONTS).map(({ family, label }) => ({ family, label }))
}

type LocalFontQuery = () => Promise<ReadonlyArray<{ readonly family: string }>>

let pcFonts: Promise<FontChoice[]> | null = null

/**
 * Reads the installed fonts once per window (the Local Font Access API, as the
 * Word, Excel and PowerPoint pickers do) and their Korean names from the main
 * process. Call it from a click or a focus: the API wants a user gesture. An
 * empty list (no API, refused, failed) leaves the fixed list in place.
 */
export function loadPcFonts(
  familyInfo?: (families: string[]) => Promise<ReadonlyArray<[string, PcFontInfo]>>,
): Promise<FontChoice[]> {
  pcFonts ??= (async () => {
    const query = (globalThis as { queryLocalFonts?: LocalFontQuery }).queryLocalFonts
    if (!query) return []
    try {
      const families = [...new Set((await query.call(globalThis)).map((f) => f.family))]
      const info = familyInfo
        ? new Map(await familyInfo(families).catch(() => []))
        : new Map<string, PcFontInfo>()
      return pcFontChoices(families, info)
    } catch {
      return []
    }
  })()
  const loading = pcFonts
  // a refused or failed read may be tried again by the next gesture
  void loading.then((list) => {
    if (!list.length && pcFonts === loading) pcFonts = null
  })
  return loading
}

/**
 * Reads the installed fonts at the first press or key anywhere on the board (점검 v2
 * hwp-design #17): read only from the font box itself, the box that opened still showed
 * the fixed list. The Local Font Access API wants a user gesture, so it waits for one.
 * Returns a function that stops listening.
 */
export function readPcFontsOnFirstGesture(target: EventTarget, read: () => void): () => void {
  const once = () => {
    stop()
    read()
  }
  const stop = () => {
    target.removeEventListener('pointerdown', once, { capture: true })
    target.removeEventListener('keydown', once, { capture: true })
  }
  target.addEventListener('pointerdown', once, { capture: true })
  target.addEventListener('keydown', once, { capture: true })
  return stop
}
