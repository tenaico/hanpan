/**
 * Hanpan design board: the document model, the page formats, the starting
 * templates, and turning an outline (a mind map pasted as indented text) into
 * card news. Pure data and functions; the board (DesignBoard.tsx) edits a
 * `DesignDoc`, and `draw.ts` paints a page for export.
 */
import { outlineFromIndentedText, type ImageCredit } from '@genoffice/hanpan-core/renderer'
import { BUNDLED_FONTS, GONGU_FONTS, SYSTEM_FONTS } from './fonts'
import { iconPaths } from './icons'

export type ElementKind =
  'text' | 'rect' | 'ellipse' | 'line' | 'image' | 'shape' | 'qr' | 'draw' | 'icon'

/** Shapes drawn from a path that stretches with the box (style.ts draws them). */
export type ShapeName =
  'triangle' | 'diamond' | 'star' | 'hexagon' | 'arrow' | 'bubble' | 'heart' | 'badge'
export const SHAPES: readonly ShapeName[] = [
  'triangle',
  'diamond',
  'star',
  'hexagon',
  'arrow',
  'bubble',
  'heart',
  'badge',
]

export type ShadowKind = 'soft' | 'hard' | 'glow'
export type ImageFilter = 'gray' | 'warm' | 'cool' | 'bright' | 'vivid' | 'fade'
export const IMAGE_FILTERS: readonly ImageFilter[] = [
  'gray',
  'warm',
  'cool',
  'bright',
  'vivid',
  'fade',
]

export interface DesignElement {
  id: string
  kind: ElementKind
  x: number
  y: number
  w: number
  h: number
  /** degrees clockwise about the box centre (not for lines, which have a direction) */
  rotation?: number
  /** a locked element is not moved, resized or picked by a drag box */
  locked?: boolean
  /** elements sharing a group id are picked and moved together */
  group?: string
  /** text */
  text?: string
  fontSize?: number
  fontWeight?: 400 | 700 | 900
  fontFamily?: string
  color?: string
  align?: 'left' | 'center' | 'right'
  lineHeight?: number
  italic?: boolean
  underline?: boolean
  letterSpacing?: number
  /** outline drawn behind the letters, in px */
  outline?: number
  outlineColor?: string
  /** a rounded colour box behind the text (its corners: `radius`) */
  highlight?: string
  /** shapes */
  fill?: string
  /** second gradient colour: the fill runs from `fill` to `fill2` */
  fill2?: string
  gradientAngle?: number
  stroke?: string
  strokeWidth?: number
  radius?: number
  opacity?: number
  shadow?: ShadowKind
  shape?: ShapeName
  /** image: a data URL, kept in the file so a design travels whole */
  src?: string
  filter?: ImageFilter
  flipX?: boolean
  /** the picture's own size, for cropping (it fills the box like CSS `object-fit: cover`) */
  naturalW?: number
  naturalH?: number
  /** crop: how far the picture is zoomed in the box (1 = just covers it) */
  cropZoom?: number
  /** crop: which part shows, 0 (left / top) … 1 (right / bottom); 0.5 is the middle */
  cropX?: number
  cropY?: number
  /** image: where a picture from Gongu came from (docs/plans/gongu-images.md); absent for
   *  a picture from a file, the clipboard or a design made before credits */
  credit?: ImageCredit
  /** pen drawing: points as x, y pairs on a 0…1 box, so it stretches with the box */
  points?: number[]
  /** icon: its name in the set, and its strokes as SVG paths on a 24 x 24 grid (kept in
   *  the file, so a design opens the same whatever the set holds later) */
  icon?: string
  paths?: string[]
  /** QR code: what it opens (dark modules in `color`, the rest in `fill`) */
  qrText?: string
}

export interface DesignPage {
  id: string
  background: string
  /** second gradient colour of the page */
  background2?: string
  gradientAngle?: number
  elements: DesignElement[]
}

export interface DesignDoc {
  version: 1
  name: string
  width: number
  height: number
  pages: DesignPage[]
  /** font files added by the person, kept in the file so the design opens the same elsewhere */
  fonts?: DesignFont[]
}

export interface DesignFont {
  family: string
  /** a data URL of the font file (TTF, OTF, WOFF, WOFF2) */
  src: string
}

export interface PageFormat {
  id: string
  name: string
  width: number
  height: number
}

/** Page sizes in pixels (A4 at 150 dpi). */
export const FORMATS: readonly PageFormat[] = [
  { id: 'card', name: '카드뉴스 (1:1)', width: 1080, height: 1080 },
  { id: 'a4', name: 'A4 포스터·안내문', width: 1240, height: 1754 },
  { id: 'thumb', name: '유튜브 썸네일', width: 1280, height: 720 },
  { id: 'slide', name: '발표 화면 (16:9)', width: 1920, height: 1080 },
  { id: 'story', name: '세로 스토리 (9:16)', width: 1080, height: 1920 },
]

/** The font list: the fonts Hanpan ships first, then the ones on the PC. */
export const FONTS: readonly string[] = [...BUNDLED_FONTS, ...GONGU_FONTS, ...SYSTEM_FONTS].map(
  (f) => f.family,
)

export const PALETTE: readonly string[] = [
  '#1E3A5F',
  '#FF8A3D',
  '#2E7D6B',
  '#C2410C',
  '#7C3AED',
  '#0F172A',
  '#64748B',
  '#F8FAFC',
  '#FFFFFF',
  '#FEF3C7',
  '#DBEAFE',
  '#FCE7F3',
]

let counter = 0
export function newId(prefix = 'e'): string {
  counter += 1
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`
}

export function textElement(
  partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h' | 'text'>,
): DesignElement {
  return {
    id: newId(),
    kind: 'text',
    fontSize: 48,
    fontWeight: 400,
    fontFamily: 'Pretendard',
    color: '#0F172A',
    align: 'left',
    lineHeight: 1.35,
    ...partial,
  }
}

export function pathElement(
  shape: ShapeName,
  partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h'>,
): DesignElement {
  return { id: newId(), kind: 'shape', shape, fill: '#FF8A3D', strokeWidth: 0, ...partial }
}

/** An icon from the set (icons.ts), drawn in `stroke` with round line ends. */
export function iconElement(
  name: string,
  partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h'>,
): DesignElement {
  return {
    id: newId(),
    kind: 'icon',
    icon: name,
    paths: iconPaths(name),
    stroke: '#0F172A',
    strokeWidth: 2,
    ...partial,
  }
}

export function qrElement(
  partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h' | 'qrText'>,
): DesignElement {
  return { id: newId(), kind: 'qr', color: '#0F172A', fill: '#FFFFFF', ...partial }
}

/**
 * A pen stroke from the points the pointer passed (page pixels, x, y pairs):
 * its box is the stroke's extent, and the points are kept on a 0…1 box.
 */
export function inkElement(
  pagePoints: number[],
  partial: Partial<DesignElement> = {},
): DesignElement | null {
  if (pagePoints.length < 4) return null
  const xs = pagePoints.filter((_, i) => i % 2 === 0)
  const ys = pagePoints.filter((_, i) => i % 2 === 1)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  // a straight stroke still has a box to hold
  const w = Math.max(1, Math.max(...xs) - x)
  const h = Math.max(1, Math.max(...ys) - y)
  const points = pagePoints.map(
    (v, i) => Math.round(((i % 2 === 0 ? v - x : v - y) / (i % 2 === 0 ? w : h)) * 10000) / 10000,
  )
  return {
    id: newId(),
    kind: 'draw',
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    points,
    stroke: '#0F172A',
    strokeWidth: 8,
    ...partial,
  }
}

/** The ids together with every element grouped with one of them. */
export function withGroups(elements: readonly DesignElement[], ids: readonly string[]): string[] {
  const groups = new Set(elements.filter((e) => ids.includes(e.id) && e.group).map((e) => e.group!))
  if (!groups.size) return [...ids]
  const out = new Set(ids)
  for (const e of elements) if (e.group && groups.has(e.group)) out.add(e.id)
  return [...out]
}

export function shapeElement(
  kind: 'rect' | 'ellipse' | 'line',
  partial: Partial<DesignElement> & Pick<DesignElement, 'x' | 'y' | 'w' | 'h'>,
): DesignElement {
  return {
    id: newId(),
    kind,
    fill: kind === 'line' ? undefined : '#DBEAFE',
    stroke: kind === 'line' ? '#1E3A5F' : undefined,
    strokeWidth: kind === 'line' ? 6 : 0,
    radius: kind === 'rect' ? 24 : 0,
    ...partial,
  }
}

export function blankDoc(format: PageFormat, name = '새 디자인'): DesignDoc {
  return {
    version: 1,
    name,
    width: format.width,
    height: format.height,
    pages: [{ id: newId('p'), background: '#FFFFFF', elements: [] }],
  }
}

/**
 * The design on another page size, every page re-laid: an element as wide (or
 * tall) as the page stretches with it, anything else keeps its place relative
 * to the page and scales by the smaller of the two ratios, so a poster turns
 * into a thumbnail or card without anything leaving the page.
 */
export function resizeDoc(doc: DesignDoc, format: Pick<PageFormat, 'width' | 'height'>): DesignDoc {
  const sx = format.width / doc.width
  const sy = format.height / doc.height
  const k = Math.min(sx, sy)
  const scaled = (v: number | undefined) =>
    v === undefined ? undefined : Math.round(v * k * 10) / 10
  const pages = doc.pages.map((page) => ({
    ...page,
    elements: page.elements.map((e) => {
      const next: DesignElement = { ...e }
      const wide = Math.abs(e.w) >= doc.width * 0.9
      const tall = Math.abs(e.h) >= doc.height * 0.9
      const w = wide ? e.w * sx : e.w * k
      const h = tall ? e.h * sy : e.h * k
      const cx = (e.x + e.w / 2) * sx
      const cy = (e.y + e.h / 2) * sy
      next.x = Math.round(cx - w / 2)
      next.y = Math.round(cy - h / 2)
      next.w = Math.round(w)
      next.h = Math.round(h)
      for (const key of [
        'fontSize',
        'strokeWidth',
        'radius',
        'outline',
        'letterSpacing',
      ] as const) {
        const v = scaled(e[key])
        if (v !== undefined)
          (next as unknown as Record<string, number>)[key] =
            key === 'fontSize' ? Math.max(8, Math.round(v)) : v
      }
      // a text box never hangs off the side of the new page
      if (next.kind === 'text' && next.w > format.width) {
        next.x = 0
        next.w = format.width
      }
      return next
    }),
  }))
  return { ...doc, width: format.width, height: format.height, pages }
}

// ---- outline → card news ----

/**
 * One card per main branch of an outline (a map pasted as indented text, or
 * Markdown bullets): the first card carries the title, each next card a branch
 * title and its points.
 */
export function cardNewsFromOutline(text: string): DesignDoc {
  const outline = outlineFromIndentedText(text)
  const f = FORMATS.find((x) => x.id === 'card')!
  const page = (elements: DesignElement[], background = '#FFFFFF'): DesignPage => ({
    id: newId('p'),
    background,
    elements,
  })
  const pages: DesignPage[] = [
    page(
      [
        shapeElement('rect', { x: 60, y: 60, w: 960, h: 960, fill: '#FFFFFF', radius: 48 }),
        textElement({
          x: 130,
          y: 300,
          w: 820,
          h: 480,
          text: outline.title || '제목',
          fontSize: 96,
          fontWeight: 900,
          color: '#1E3A5F',
          lineHeight: 1.2,
        }),
        textElement({
          x: 130,
          y: 880,
          w: 820,
          h: 60,
          text: `${outline.nodes.length}가지 이야기 →`,
          fontSize: 38,
          color: '#64748B',
        }),
      ],
      '#1E3A5F',
    ),
  ]
  outline.nodes.forEach((branch, i) => {
    const points = branch.children.map((c) => `• ${c.title}`).join('\n')
    pages.push(
      page([
        textElement({
          x: 90,
          y: 90,
          w: 200,
          h: 120,
          text: String(i + 1).padStart(2, '0'),
          fontSize: 140,
          fontFamily: 'Bebas Neue',
          lineHeight: 1,
          color: '#FF8A3D',
        }),
        textElement({
          x: 90,
          y: 240,
          w: 900,
          h: 220,
          text: branch.title,
          fontSize: 72,
          fontWeight: 900,
          color: '#1E3A5F',
          lineHeight: 1.2,
        }),
        shapeElement('line', { x: 90, y: 490, w: 160, h: 0, stroke: '#FF8A3D', strokeWidth: 10 }),
        textElement({
          x: 90,
          y: 540,
          w: 900,
          h: 460,
          text: points || branch.note || '',
          fontSize: 44,
          lineHeight: 1.6,
          color: '#334155',
        }),
      ]),
    )
  })
  return { version: 1, name: outline.title || '카드뉴스', width: f.width, height: f.height, pages }
}

/** Reads a saved design, refusing anything that is not one. */
export function parseDesign(text: string): DesignDoc | null {
  try {
    const value = JSON.parse(text) as DesignDoc
    if (
      value?.version !== 1 ||
      !Array.isArray(value.pages) ||
      !(value.width > 0) ||
      !(value.height > 0)
    )
      return null
    return value
  } catch {
    return null
  }
}

/** Ctrl+S saves over the design's file (asking only the first time), Ctrl+Shift+S saves as. */
export function saveShortcut(event: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}): 'save' | 'saveAs' | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null
  if (event.key.toLowerCase() !== 's') return null
  return event.shiftKey ? 'saveAs' : 'save'
}

/** Ctrl+P (Cmd+P): the print preview, as in Hanpan's other editors. */
export function printShortcut(event: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return false
  return event.key.toLowerCase() === 'p'
}
