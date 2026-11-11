/**
 * "Send this map to a document": the request the mind map tab makes and the
 * shell carries out. Shared by both sides so the contract has one definition.
 */
import { httpsHref } from './blocks'
import type { MarkerStyle } from './numbering'
import type { PanOutline } from './outline'
import { isSlideStyleId, type SlideStyleId } from './slide-styles'
import { SLIDE_LINE_MAX, type SlideWriting } from './slide-writer'

export type SendTarget = 'hwp' | 'slides' | 'docx'

export interface SendRequest {
  target: SendTarget
  /** the map, as an outline; bodies are filled when the AI fleshed it out */
  outline: PanOutline
  style: MarkerStyle
  /** doc theme id (`report`, `gongmun`, `plain`); the style's own theme when absent */
  theme?: string | undefined
  date?: string | undefined
  department?: string | undefined
  includeNotes: boolean
  /** slides only: one of the ten slide styles; the plain deck when absent */
  slideStyle?: SlideStyleId | undefined
  /** slides only: what the AI wrote for the slides, keyed by topic */
  slideWriting?: SlideWriting | undefined
  /** the map file, when it has one: recorded in the link so the two can find each other */
  mapPath: string | null
  /** the sheet the outline came from */
  sheetId: string
}

export type SendResult = { ok: true; title: string } | { ok: false; error: string }

/** Limits on what a renderer may hand over: a map is far smaller than these. */
const MAX_NODES = 5000
const MAX_TEXT = 20_000
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const STYLES: readonly MarkerStyle[] = ['report', 'chapter-report', 'gongmun', 'outline']
const TARGETS: readonly SendTarget[] = ['hwp', 'slides', 'docx']

function text(value: unknown, what: string, optional = false): string | undefined {
  if (value === undefined || value === null) {
    if (optional) return undefined
    throw new Error(`${what} is missing`)
  }
  if (typeof value !== 'string' || value.length > MAX_TEXT) throw new Error(`${what} is not text`)
  return value
}

const MAX_WRITTEN = 5000
const MAX_DETAILS = 4
/** Longest topic link carried into a document. */
const MAX_HREF = 2048

/** Longest speaker notes taken for one slide (the parser keeps far less). */
const MAX_NOTES = 2000

/** One slide line: text, not blank, on one line, no longer than `max`. */
const isLine = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim() !== '' && v.length <= max && !/[\r\n]/.test(v)

/** A map of topic key → text; what is not text of the right size is left out. */
function textMap(
  value: unknown,
  what: string,
  ok: (v: unknown) => v is string,
): Record<string, string> {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`bad ${what}`)
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > MAX_WRITTEN) throw new Error(`bad ${what}`)
  return Object.fromEntries(entries.filter((e): e is [string, string] => ok(e[1])))
}

/** The AI's slide text as the shell may use it: unknown fields dropped, over-long text left out. */
function checkSlideWriting(value: unknown): SlideWriting | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('bad slide writing')
  const w = value as Record<string, unknown>
  const details: Record<string, string[]> = {}
  if (w.details !== undefined && w.details !== null) {
    if (typeof w.details !== 'object' || Array.isArray(w.details)) throw new Error('bad details')
    const entries = Object.entries(w.details as Record<string, unknown>)
    if (entries.length > MAX_WRITTEN) throw new Error('bad details')
    for (const [key, list] of entries) {
      if (!Array.isArray(list)) continue
      const lines = list
        .slice(0, MAX_DETAILS * 4)
        .filter((l) => isLine(l, SLIDE_LINE_MAX))
        .slice(0, MAX_DETAILS)
      if (lines.length)
        Object.defineProperty(details, key, {
          value: lines,
          enumerable: true,
          writable: true,
          configurable: true,
        })
    }
  }
  const line = (v: unknown): v is string => isLine(v, SLIDE_LINE_MAX)
  const notes = (v: unknown): v is string =>
    typeof v === 'string' && v.trim() !== '' && v.length <= MAX_NOTES
  return {
    titles: textMap(w.titles, 'titles', line),
    lines: textMap(w.lines, 'lines', line),
    details,
    takeaways: textMap(w.takeaways, 'takeaways', line),
    notes: textMap(w.notes, 'notes', notes),
    ...(line(w.closing) ? { closing: w.closing } : {}),
  }
}

/**
 * The request as the shell may trust it: every field checked, nothing extra
 * kept. Throws a short reason on anything else.
 */
export function checkSendRequest(value: unknown): SendRequest {
  if (!value || typeof value !== 'object') throw new Error('bad request')
  const r = value as Record<string, unknown>
  if (!TARGETS.includes(r.target as SendTarget)) throw new Error('bad target')
  if (!STYLES.includes(r.style as MarkerStyle)) throw new Error('bad style')
  const o = r.outline as Record<string, unknown> | undefined
  if (!o || typeof o !== 'object' || !Array.isArray(o.nodes)) throw new Error('bad outline')
  let count = 0
  const node = (v: unknown): PanOutline['nodes'][number] => {
    if (++count > MAX_NODES) throw new Error('the map is too large')
    if (!v || typeof v !== 'object') throw new Error('bad topic')
    const n = v as Record<string, unknown>
    if (!Array.isArray(n.children)) throw new Error('bad topic')
    let image: PanOutline['nodes'][number]['image']
    const img = n.image as Record<string, unknown> | undefined
    if (
      img &&
      img.bytes instanceof Uint8Array &&
      img.bytes.length <= MAX_IMAGE_BYTES &&
      typeof img.mime === 'string'
    ) {
      image = {
        bytes: img.bytes,
        mime: img.mime,
        width: typeof img.width === 'number' && img.width > 0 ? img.width : undefined,
        height: typeof img.height === 'number' && img.height > 0 ? img.height : undefined,
      }
    }
    return {
      key: text(n.key, 'topic key')!,
      title: text(n.title, 'topic title')!,
      note: text(n.note, 'note', true),
      body: text(n.body, 'body', true),
      href: typeof n.href === 'string' && n.href.length <= MAX_HREF ? httpsHref(n.href) : undefined,
      image,
      children: n.children.map(node),
    }
  }
  return {
    target: r.target as SendTarget,
    style: r.style as MarkerStyle,
    theme: text(r.theme, 'theme', true),
    date: text(r.date, 'date', true),
    department: text(r.department, 'department', true),
    includeNotes: r.includeNotes !== false,
    slideStyle: isSlideStyleId(r.slideStyle) ? r.slideStyle : undefined,
    slideWriting: r.target === 'slides' ? checkSlideWriting(r.slideWriting) : undefined,
    mapPath: text(r.mapPath, 'map path', true) ?? null,
    sheetId: text(r.sheetId, 'sheet', true) ?? '',
    outline: {
      title: text(o.title, 'title')!,
      rootKey: text(o.rootKey, 'root key')!,
      note: text(o.note, 'note', true),
      nodes: o.nodes.map(node),
    },
  }
}

/** A file name for the new document from its title: no characters Windows refuses, at most 60 long. */
export function documentFileName(title: string, extension: string): string {
  const base =
    title
      // eslint-disable-next-line no-control-regex -- Windows file names must exclude ASCII controls.
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60)
      .replace(/[. ]+$/, '') || '한판 문서'
  return `${base}.${extension}`
}

/** Extension of the document a target makes. */
export function extensionOf(target: SendTarget): string {
  return target === 'hwp' ? 'hwpx' : target === 'slides' ? 'pptx' : 'docx'
}
