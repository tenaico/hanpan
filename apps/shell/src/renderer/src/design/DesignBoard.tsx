/**
 * Hanpan design board: posters, card news, notices and thumbnails on a page.
 * Elements (text, shapes, lines, pictures, QR codes) are picked one by one or
 * several at once (Shift, or a drag box), moved with guides that click to the
 * page and to each other, resized from eight handles, turned by the rotation
 * handle, and text is typed in place with a double click. Elements group
 * (Ctrl+G), pictures crop in place, the pen draws, a right click opens the
 * usual commands, and rulers and Space-drag help on a large page. The right
 * side styles the selection (Inspector.tsx) or holds the AI helper
 * (DesignAiPanel.tsx), with a quick AI rewrite over a picked text box; the
 * left panel holds the templates, elements, text styles and the layers. A design is saved as one
 * `.hpdesign` file (pictures inside), exported as PNG, JPG or PDF, or copied
 * as a picture to paste into a HWP, Word or PowerPoint tab.
 */
import { DesignFileMenu } from './DesignFileMenu'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { gonguCreditOf, licenseTerms } from '@genoffice/hanpan-core/renderer'
import { gonguUiText, type GonguStringKey } from '../i18n/strings-gongu'
import { pageJpeg, pagePng } from './draw'
import {
  allowedChange,
  creditIssues,
  creditLineElement,
  creditedPicture,
  creditsOf,
  exportWarnings,
  modifyLocked,
  withCreditList,
  type CreditIssue,
  type GonguApi,
  type GonguPictureAnswer,
} from './credits'
import { GonguPanel } from './GonguPanel'
import { REWRITE_MODES } from './ai'
import type { DesignAiApi } from './ai-run'
import { DesignAiPanel } from './DesignAiPanel'
import { useDesignAi, type DesignAiSettingsApi } from './use-design-ai'
import {
  HANDLE_SIDES,
  alignMoves,
  bounds,
  overlaps,
  resizeBox,
  rotationAt,
  snapMove,
  spreadMoves,
  union,
  type AlignMode,
  type Box,
  type Guides,
  type Handle,
} from './geometry'
import { Inspector, type Arrange } from './Inspector'
import {
  FORMATS,
  SHAPES,
  blankDoc,
  cardNewsFromOutline,
  iconElement,
  inkElement,
  newId,
  parseDesign,
  pathElement,
  printShortcut,
  saveShortcut,
  qrElement,
  resizeDoc,
  shapeElement,
  textElement,
  withGroups,
  type DesignDoc,
  type DesignElement,
  type DesignPage,
  type ShapeName,
} from './model'
import { loadPcFonts, readPcFontsOnFirstGesture, type FontChoice, type PcFontInfo } from './fonts'
import { ICONS } from './icons'
import { templatesFor } from './templates'
import { coverRect, inkPath, shapePath, textPadding } from './style'
import { PagePreview, elementBox, elementLook, pageBackground } from './view'
import { LANG_NATIVE_NAMES, iconLabel, wordsFor } from './words'
import { DesignPrintDialog, type DesignPrintResult, type PrintRange } from './PrintDialog'
import type { PrintSheet } from '@genoffice/ui'

export interface DesignApi extends Partial<DesignAiApi & DesignAiSettingsApi & GonguApi> {
  savePng(bytes: Uint8Array, name: string, format?: 'png' | 'jpg'): Promise<string | null>
  savePdf(
    pages: Uint8Array[],
    size: { width: number; height: number },
    name: string,
  ): Promise<string | null>
  copyImage(bytes: Uint8Array): Promise<boolean>
  /** prints pages drawn as the PNG export draws them, on the paper the preview showed */
  print?(pages: Uint8Array[], sheet: PrintSheet): Promise<DesignPrintResult>
  /** 'save' writes over the design's own file and asks only when there is none; 'saveAs' always asks */
  saveDesign(text: string, name: string, mode?: 'save' | 'saveAs'): Promise<string | null>
  /** a new design: its first save asks where */
  newDesign?(): Promise<void>
  /** Korean names and Hangul coverage of installed fonts, read from the font files */
  fontFamilyInfo?(families: string[]): Promise<ReadonlyArray<[string, PcFontInfo]>>
  openDesign(): Promise<{ name: string; text: string } | null>
  /** whether the design has changes not yet saved; the main process asks before closing */
  setDirty?(dirty: boolean): void
  /** 저장 / 저장 안 함 / 취소, before unsaved work is replaced */
  askUnsaved?(): Promise<'save' | 'discard' | 'cancel'>
  /** the window is closing and the person chose 저장: save, then closeAfterSave */
  onSaveThenClose?(handler: () => void): () => void
  closeAfterSave?(): void
  /** opens Settings → Integrations in the main window (the Gongu key) */
  openGonguSettings?(): void
  pickImage(): Promise<{ dataUrl: string; width: number; height: number } | null>
}

type Tab = 'templates' | 'elements' | 'text' | 'layers'

type Drag =
  | {
      mode: 'move'
      start: Pt
      origs: DesignElement[]
      others: Box[]
      moved: boolean
      clicked: string
      collapse: boolean
    }
  | { mode: 'resize'; start: Pt; handle: Handle; orig: DesignElement; moved: boolean }
  | { mode: 'rotate'; orig: DesignElement; moved: boolean }
  | { mode: 'marquee'; start: Pt; base: string[] }
  | {
      mode: 'crop'
      start: Pt
      orig: DesignElement
      natural: { w: number; h: number }
      moved: boolean
    }
  | { mode: 'pen'; points: number[] }
  | { mode: 'pan'; x: number; y: number; left: number; top: number }

interface Pt {
  x: number
  y: number
}

/** A deep copy that shares the (immutable) strings: a picture's data URL is not copied on every change. */
function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = clone(v)
    return out as T
  }
  return value
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const MAX_FONT_BYTES = 10 * 1024 * 1024
const HISTORY = 80
const PEN_COLORS = [
  '#0F172A',
  '#FFFFFF',
  '#E11D48',
  '#FF8A3D',
  '#FACC15',
  '#16A34A',
  '#2563EB',
  '#7C3AED',
]
const RULERS_KEY = 'hanpan.design.rulers'

/** Copies of elements as new elements: new ids, shifted, groups kept among the copies only. */
function copiesOf(list: DesignElement[], shift: number): DesignElement[] {
  const groups = new Map<string, string>()
  return list.map((e) => {
    const group = e.group
      ? (groups.get(e.group) ?? groups.set(e.group, newId('g')).get(e.group))
      : undefined
    return { ...clone(e), id: newId(), x: e.x + shift, y: e.y + shift, locked: undefined, group }
  })
}

/** Ruler steps in page pixels: the smallest that leaves room for a label on screen. */
function rulerStep(scale: number): number {
  for (const step of [10, 20, 50, 100, 200, 500, 1000]) if (step * scale >= 56) return step
  return 2000
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

/** Fonts already handed to the page, by family. */
const registeredFonts = new Set<string>()
async function registerFont(family: string, src: string): Promise<boolean> {
  // only fonts carried inside the design itself, never a web address
  if (!src.startsWith('data:')) return false
  if (registeredFonts.has(family)) return true
  try {
    const face = await new FontFace(family, `url(${src})`).load()
    document.fonts.add(face)
    registeredFonts.add(family)
    return true
  } catch {
    return false
  }
}

/** Text colour that reads on this page's background. */
function inkFor(background: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(background)?.[1]
  if (!hex) return '#0F172A'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r! + 0.587 * g! + 0.114 * b! < 140 ? '#FFFFFF' : '#0F172A'
}

/** Every colour the design uses, most used first, for the colour pickers. */
function colorsOf(doc: DesignDoc): string[] {
  const count = new Map<string, number>()
  const add = (c: string | undefined) => {
    if (c && /^#[0-9a-f]{6}$/i.test(c))
      count.set(c.toUpperCase(), (count.get(c.toUpperCase()) ?? 0) + 1)
  }
  for (const pg of doc.pages) {
    add(pg.background)
    add(pg.background2)
    for (const e of pg.elements)
      for (const c of [e.fill, e.fill2, e.color, e.stroke, e.highlight, e.outlineColor]) add(c)
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c)
    .slice(0, 14)
}

function readImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const img = new Image()
      img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('image'))
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  return Boolean(el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable))
}

export function DesignBoard(p: { lang: string; api: DesignApi; outline?: string | undefined }) {
  const w = wordsFor(p.lang)
  // Gongu pictures and credits speak every UI language; the board's own words are Korean,
  // English or Vietnamese (words.ts), and follow a language change without reopening
  const g = (key: GonguStringKey, params?: Record<string, string | number>) =>
    gonguUiText(p.lang as never, key, params)
  const [doc, setDoc] = useState<DesignDoc>(() =>
    p.outline ? cardNewsFromOutline(p.outline) : templatesFor(p.lang)[0]!.make(),
  )
  /** the design as last saved, opened or started; anything else is unsaved work */
  const [savedDoc, setSavedDoc] = useState<DesignDoc | null>(() => (p.outline ? null : doc))
  const savedRef = useRef(savedDoc)
  savedRef.current = savedDoc
  const dirty = doc !== savedDoc
  const [pageIndex, setPageIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [past, setPast] = useState<DesignDoc[]>([])
  const [future, setFuture] = useState<DesignDoc[]>([])
  const [fit, setFit] = useState(0.4)
  const [zoom, setZoom] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  // a map's card news opens on its layers
  const [tab, setTab] = useState<Tab>(() => (p.outline ? 'layers' : 'templates'))
  const [outlineOpen, setOutlineOpen] = useState(false)
  // the right side: the selection's properties, or the AI helper (first, when there is an AI)
  const [side, setSide] = useState<'props' | 'ai'>(() =>
    !p.outline && p.api.aiStream ? 'ai' : 'props',
  )
  /** the side switched to the properties for a selection: it goes back when nothing is picked */
  const returnToAi = useRef(false)
  /** the page is a template just picked: the templates panel offers to fill it with AI */
  const [fromTemplate, setFromTemplate] = useState(false)
  const [outlineText, setOutlineText] = useState(
    '공문서 작성 규칙\n  날짜 표기\n    2026. 10. 30. 처럼 씁니다\n  항목 번호\n    1. 가. 1) 가) 순서\n  끝 표시\n    본문 끝에 두 칸 띄우고 끝.',
  )
  const [guides, setGuides] = useState<Guides>({ v: [], h: [] })
  const [marquee, setMarquee] = useState<Box | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [qrInput, setQrInput] = useState('')
  const [iconQuery, setIconQuery] = useState('')
  const [cropping, setCropping] = useState<string | null>(null)
  const [cropNatural, setCropNatural] = useState<{ w: number; h: number } | null>(null)
  const [pen, setPen] = useState(false)
  const [penColor, setPenColor] = useState(PEN_COLORS[0]!)
  const [penWidth, setPenWidth] = useState(8)
  const [highlighter, setHighlighter] = useState(false)
  const [inkLive, setInkLive] = useState<number[] | null>(null)
  const [rulers, setRulers] = useState(() => {
    try {
      return localStorage.getItem(RULERS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  /** export draws a list of the Gongu credits at the foot of the page (not kept) */
  const [creditList, setCreditList] = useState(true)
  const [checkOpen, setCheckOpen] = useState(false)
  /** the print preview is open: the board behind it takes no keys */
  const [printOpen, setPrintOpen] = useState(false)
  const [panning, setPanning] = useState(false)
  const spaceDown = useRef(false)
  const clip = useRef<DesignElement[]>([])
  const fontInput = useRef<HTMLInputElement>(null)
  const [pcFonts, setPcFonts] = useState<readonly FontChoice[]>([])
  const stageWrap = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  // the latest doc, for changes that land after an await (an AI answer, a picture read)
  const docRef = useRef(doc)
  docRef.current = doc
  const lastMerge = useRef<{ key: string; at: number } | null>(null)
  const saveRef = useRef<(mode?: 'save' | 'saveAs') => Promise<boolean>>(async () => false)

  const pi = Math.min(pageIndex, doc.pages.length - 1)
  const page: DesignPage = doc.pages[pi]!
  const selection = page.elements.filter((e) => selected.includes(e.id))
  const single = selection.length === 1 ? selection[0]! : null
  const scale = fit * zoom
  const docColors = useMemo(() => colorsOf(doc), [doc])
  const credited = useMemo(() => creditsOf(doc.pages).length > 0, [doc.pages])
  const issues = useMemo(() => creditIssues(doc, creditList), [doc, creditList])
  const templatePreviews = useMemo(
    () => templatesFor(p.lang).map((t) => ({ t, doc: t.make() })),
    [p.lang],
  )
  // where a translation goes: a language the person picked, or null for the default
  // (the UI language, or English for a text already in it)
  const [translateTo, setTranslateTo] = useState<string | null>(null)

  // the page fits the space it has; zoom multiplies that
  useLayoutEffect(() => {
    const measure = () => {
      const box = stageWrap.current?.getBoundingClientRect()
      if (!box) return
      setFit(Math.max(0.05, Math.min((box.width - 64) / doc.width, (box.height - 64) / doc.height)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [doc.width, doc.height])

  // the PC's fonts are read at the first press or key anywhere, so the font box already
  // lists them when it first opens (점검 v2 hwp-design #17)
  useEffect(
    () =>
      readPcFontsOnFirstGesture(window, () => {
        void loadPcFonts(p.api.fontFamilyInfo?.bind(p.api)).then((list) => {
          if (list.length) setPcFonts(list)
        })
      }),
    [p.api],
  )

  // fonts kept in the design are handed to the page (screen and export) as it opens
  useEffect(() => {
    for (const f of doc.fonts ?? []) void registerFont(f.family, f.src)
  }, [doc.fonts])

  // ---- history ----

  /** A change that can be undone; quick repeats with the same `merge` key are one step. */
  const commit = useCallback((change: (draft: DesignDoc) => void, merge?: string) => {
    const current = docRef.current
    const now = Date.now()
    const joined =
      merge !== undefined && lastMerge.current?.key === merge && now - lastMerge.current.at < 1200
    if (!joined) {
      setPast((list) => [...list.slice(-(HISTORY - 1)), current])
      setFuture([])
    }
    lastMerge.current = merge === undefined ? null : { key: merge, at: now }
    const next = clone(current)
    change(next)
    docRef.current = next
    setDoc(next)
  }, [])
  /** The step a drag will become, taken when it first moves. */
  const snapshot = () => {
    const before = docRef.current
    setPast((list) => [...list.slice(-(HISTORY - 1)), before])
    setFuture([])
    lastMerge.current = null
  }
  /** A change while dragging: no history step of its own. */
  const live = (change: (draft: DesignDoc) => void) => {
    const next = clone(docRef.current)
    change(next)
    docRef.current = next
    setDoc(next)
  }
  const changePage = (change: (pg: DesignPage) => void, merge?: string) =>
    commit((d) => change(d.pages[pi]!), merge)
  const changeElement = (id: string, patch: Partial<DesignElement>, merge?: string) =>
    changePage((pg) => {
      const e = pg.elements.find((x) => x.id === id)
      if (e) Object.assign(e, allowedChange(e, patch))
      // a QR code stays square
      if (e?.kind === 'qr' && ('w' in patch || 'h' in patch)) e.h = e.w = Math.max(e.w, e.h)
    }, merge)
  const moveElements = (moves: Map<string, { dx: number; dy: number }>) =>
    changePage((pg) => {
      for (const e of pg.elements) {
        const m = moves.get(e.id)
        if (!m || e.locked) continue
        e.x += m.dx
        e.y += m.dy
      }
    })

  const replaceDoc = (next: DesignDoc, keepPage = false) => {
    const before = docRef.current
    setPast((list) => [...list.slice(-(HISTORY - 1)), before])
    setFuture([])
    lastMerge.current = null
    docRef.current = next
    setDoc(next)
    if (!keepPage) setPageIndex(0)
    setSelected([])
    setEditing(null)
    setFromTemplate(false)
  }
  const undo = () => {
    const prev = past[past.length - 1]
    if (!prev) return
    setPast(past.slice(0, -1))
    setFuture([doc, ...future])
    lastMerge.current = null
    setDoc(prev)
    setEditing(null)
  }
  const redo = () => {
    const next = future[0]
    if (!next) return
    setFuture(future.slice(1))
    setPast([...past, doc])
    lastMerge.current = null
    setDoc(next)
  }

  // ---- adding ----

  const center = (wd: number, ht: number) => ({
    x: Math.round((doc.width - wd) / 2),
    y: Math.round((doc.height - ht) / 2),
    w: Math.round(wd),
    h: Math.round(ht),
  })
  const add = (...elements: DesignElement[]) => {
    changePage((pg) => pg.elements.push(...elements))
    setSelected(elements.map((e) => e.id))
  }
  const unit = Math.min(doc.width, doc.height)
  const ink = inkFor(page.background)
  const addTextPreset = (
    kind: 'title' | 'subtitle' | 'body' | 'badge' | 'outlined' | 'shadowed' | 'quote',
  ) => {
    const base = unit / 1080
    const s = (n: number) => Math.round(n * base)
    switch (kind) {
      case 'title':
        return add(
          textElement({
            ...center(doc.width * 0.8, s(140)),
            text: w.title,
            fontSize: s(96),
            fontWeight: 900,
            color: ink,
          }),
        )
      case 'subtitle':
        return add(
          textElement({
            ...center(doc.width * 0.75, s(90)),
            text: w.subtitle,
            fontSize: s(60),
            fontWeight: 700,
            color: ink,
          }),
        )
      case 'body':
        return add(
          textElement({
            ...center(doc.width * 0.7, s(200)),
            text: w.newText,
            fontSize: s(44),
            color: ink,
          }),
        )
      case 'badge':
        return add(
          textElement({
            ...center(s(380), s(96)),
            text: w.presets.badge,
            fontSize: s(52),
            fontWeight: 700,
            color: '#FFFFFF',
            highlight: '#FF8A3D',
            radius: s(48),
            align: 'center',
          }),
        )
      case 'outlined':
        return add(
          textElement({
            ...center(doc.width * 0.8, s(160)),
            text: w.presets.outlined,
            fontSize: s(110),
            fontWeight: 900,
            color: '#FFFFFF',
            outline: s(10),
            outlineColor: '#0F172A',
            shadow: 'hard',
          }),
        )
      case 'shadowed':
        return add(
          textElement({
            ...center(doc.width * 0.8, s(150)),
            text: w.presets.shadowed,
            fontSize: s(100),
            fontWeight: 900,
            color: ink,
            shadow: 'soft',
          }),
        )
      case 'quote':
        return add(
          textElement({
            ...center(doc.width * 0.75, s(200)),
            text: '“함께 만드는 내일”',
            fontSize: s(70),
            fontWeight: 700,
            italic: true,
            align: 'center',
            color: ink,
          }),
        )
    }
  }
  const addShape = (kind: 'rect' | 'ellipse' | 'line' | ShapeName) => {
    const s = Math.round(unit * 0.3)
    if (kind === 'rect') return add(shapeElement('rect', center(s * 1.4, s)))
    if (kind === 'ellipse') return add(shapeElement('ellipse', center(s, s)))
    if (kind === 'line') return add(shapeElement('line', { ...center(s * 1.6, 0), h: 0 }))
    return add(pathElement(kind, center(kind === 'arrow' ? s * 1.4 : s, s)))
  }
  const addIcon = (name: string) => {
    const s = Math.round(unit * 0.14)
    add(iconElement(name, { ...center(s, s), stroke: ink }))
  }
  const placeImage = (picked: { dataUrl: string; width: number; height: number }, at?: Pt) => {
    const k = Math.min(1, (doc.width * 0.6) / picked.width, (doc.height * 0.6) / picked.height)
    const wd = Math.round(picked.width * k)
    const ht = Math.round(picked.height * k)
    const box = at
      ? { x: Math.round(at.x - wd / 2), y: Math.round(at.y - ht / 2), w: wd, h: ht }
      : center(wd, ht)
    add({
      id: newId(),
      kind: 'image',
      src: picked.dataUrl,
      naturalW: picked.width,
      naturalH: picked.height,
      ...box,
    })
  }
  const addImage = async () => {
    const picked = await p.api.pickImage()
    if (picked) placeImage(picked)
  }
  /** A Gongu picture with its credit line under it, the two grouped (4.4). */
  const placeGonguPicture = (picked: Extract<GonguPictureAnswer, { ok: true }>): boolean => {
    const credit = gonguCreditOf(picked.work)
    const terms = licenseTerms(credit.license)
    const warnings = [
      ...(terms.nonCommercial ? [g('gpWarnNc')] : []),
      ...(!terms.mayModify ? [g('gpWarnNd')] : []),
      ...(terms.shareAlike ? [g('gpWarnSa')] : []),
    ]
    if (warnings.length && !window.confirm(g('gpConfirm', { conditions: warnings.join('\n') })))
      return false
    const k = Math.min(1, (doc.width * 0.6) / picked.width, (doc.height * 0.5) / picked.height)
    const image: DesignElement = {
      id: newId(),
      kind: 'image',
      src: picked.dataUrl,
      naturalW: picked.width,
      naturalH: picked.height,
      ...center(picked.width * k, picked.height * k),
    }
    add(...creditedPicture(image, credit, p.lang, doc, page.background))
    return true
  }
  const addImageFile = async (file: File, at?: Pt) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > MAX_IMAGE_BYTES) return say(w.imageTooBig)
    placeImage(await readImageFile(file), at)
  }
  const addQr = () => {
    const text = qrInput.trim() || 'https://'
    const s = Math.round(unit * 0.3)
    add(qrElement({ ...center(s, s), qrText: text }))
  }

  // ---- acting on the selection ----

  const duplicate = () => {
    if (!selection.length) return
    add(...copiesOf(selection, 30))
  }
  const remove = () => {
    const ids = new Set(selected)
    changePage((pg) => (pg.elements = pg.elements.filter((x) => !ids.has(x.id))))
    setSelected([])
  }
  const toggleLock = () => {
    const lock = !selection.every((e) => e.locked)
    changePage((pg) =>
      pg.elements.forEach((e) => selected.includes(e.id) && (e.locked = lock || undefined)),
    )
  }
  const group = () => {
    if (selection.length < 2) return
    const id = newId('g')
    changePage((pg) => pg.elements.forEach((e) => selected.includes(e.id) && (e.group = id)))
  }
  const ungroup = () =>
    changePage((pg) => pg.elements.forEach((e) => selected.includes(e.id) && delete e.group))
  const pasteElements = (list: DesignElement[]) => {
    if (list.length) add(...copiesOf(list, 30))
  }
  const copySelection = (cut: boolean) => {
    if (!selection.length) return
    clip.current = selection.map(clone)
    if (cut) remove()
  }
  const arrange = (where: Arrange) =>
    changePage((pg) => {
      const ids = new Set(selected)
      const picked = pg.elements.filter((e) => ids.has(e.id))
      const rest = pg.elements.filter((e) => !ids.has(e.id))
      if (where === 'toFront') pg.elements = [...rest, ...picked]
      else if (where === 'toBack') pg.elements = [...picked, ...rest]
      else {
        const list = pg.elements
        const order = where === 'front' ? [...list.keys()].reverse() : [...list.keys()]
        for (const i of order) {
          const j = where === 'front' ? i + 1 : i - 1
          if (!ids.has(list[i]!.id) || j < 0 || j >= list.length || ids.has(list[j]!.id)) continue
          ;[list[i], list[j]] = [list[j]!, list[i]!]
        }
      }
    })
  const align = (mode: AlignMode) => moveElements(alignMoves(selection, mode, doc))
  const spread = (axis: 'x' | 'y') => moveElements(spreadMoves(selection, axis))
  const fillPage = (id: string) =>
    changePage((pg) => {
      const i = pg.elements.findIndex((x) => x.id === id)
      const e = pg.elements[i]
      // filling the page crops the picture, which a no-derivatives licence forbids
      if (!e || modifyLocked(e)) return
      const k = Math.max(doc.width / e.w, doc.height / e.h)
      e.w = Math.round(e.w * k)
      e.h = Math.round(e.h * k)
      e.x = Math.round((doc.width - e.w) / 2)
      e.y = Math.round((doc.height - e.h) / 2)
      e.rotation = 0
      // a picture filling the page is the backdrop
      pg.elements.splice(i, 1)
      pg.elements.unshift(e)
    })
  const replaceImage = async (id: string) => {
    const picked = await p.api.pickImage()
    if (!picked) return
    changePage((pg) => {
      // another picture in its place no longer carries this credit
      const e = pg.elements.find((x) => x.id === id)
      if (e) delete e.credit
    })
    changeElement(id, {
      src: picked.dataUrl,
      naturalW: picked.width,
      naturalH: picked.height,
      cropZoom: undefined,
      cropX: undefined,
      cropY: undefined,
      h: Math.round(
        (docRef.current.pages[pi]!.elements.find((e) => e.id === id)?.w ?? picked.width) *
          (picked.height / picked.width),
      ),
    })
  }
  const changeFormat = (id: string) => {
    const f = FORMATS.find((x) => x.id === id)
    if (!f || (f.width === doc.width && f.height === doc.height)) return
    replaceDoc({ ...resizeDoc(docRef.current, f) })
    setPageIndex(pi)
  }

  // ---- the pointer on the page ----

  const toPage = (clientX: number, clientY: number): Pt => {
    const r = pageRef.current!.getBoundingClientRect()
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale }
  }
  const capture = (event: ReactPointerEvent) =>
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId)

  const startMove = (event: ReactPointerEvent, e: DesignElement) => {
    // the pen and panning belong to the page behind
    if (event.button !== 0 || editing === e.id || pen || spaceDown.current) return
    event.stopPropagation()
    event.preventDefault()
    setMenu(null)
    if (editing) stopEditing()
    if (cropping === e.id) return startCropDrag(event, e)
    if (cropping) setCropping(null)
    const additive = event.shiftKey || event.ctrlKey || event.metaKey
    // a click picks the element's whole group
    const hit = withGroups(page.elements, [e.id])
    let next = selected
    if (additive)
      next = selected.includes(e.id)
        ? selected.filter((x) => !hit.includes(x))
        : [...new Set([...selected, ...hit])]
    else if (!selected.includes(e.id)) next = hit
    setSelected(next)
    const moving = page.elements.filter((x) => next.includes(x.id) && !x.locked)
    if (!moving.length || (additive && !next.includes(e.id))) return
    const ids = new Set(moving.map((x) => x.id))
    drag.current = {
      mode: 'move',
      start: toPage(event.clientX, event.clientY),
      origs: moving.map(clone),
      others: page.elements.filter((x) => !ids.has(x.id)).map(bounds),
      moved: false,
      clicked: e.id,
      // a second plain click on a picked group or set narrows it to the one element
      collapse: !additive && next.length > 1 && selected.includes(e.id),
    }
    capture(event)
  }
  const startResize = (event: ReactPointerEvent, e: DesignElement, handle: Handle) => {
    event.stopPropagation()
    event.preventDefault()
    drag.current = {
      mode: 'resize',
      start: toPage(event.clientX, event.clientY),
      handle,
      orig: clone(e),
      moved: false,
    }
    capture(event)
  }
  const startRotate = (event: ReactPointerEvent, e: DesignElement) => {
    event.stopPropagation()
    event.preventDefault()
    if (modifyLocked(e)) return
    drag.current = { mode: 'rotate', orig: clone(e), moved: false }
    capture(event)
  }
  /** Size of the picture file, for crop maths. */
  const naturalOf = (e: DesignElement) => {
    const img = pageRef.current?.querySelector<HTMLImageElement>(`[data-id="${e.id}"] img`)
    return {
      w: e.naturalW ?? (img?.naturalWidth || e.w),
      h: e.naturalH ?? (img?.naturalHeight || e.h),
    }
  }
  const startCropDrag = (event: ReactPointerEvent, e: DesignElement) => {
    drag.current = {
      mode: 'crop',
      start: toPage(event.clientX, event.clientY),
      orig: clone(e),
      natural: naturalOf(e),
      moved: false,
    }
    capture(event)
  }
  /** Crop mode: dragging the picture picks what shows in its box. */
  const startCrop = (id: string) => {
    const e = page.elements.find((x) => x.id === id)
    if (e?.kind !== 'image' || e.locked || modifyLocked(e)) return
    setCropNatural(naturalOf(e))
    setSelected([id])
    setCropping(id)
  }
  const startPan = (event: ReactPointerEvent) => {
    const wrap = stageWrap.current
    if (!wrap) return
    event.preventDefault()
    drag.current = {
      mode: 'pan',
      x: event.clientX,
      y: event.clientY,
      left: wrap.scrollLeft,
      top: wrap.scrollTop,
    }
    setPanning(true)
    capture(event)
  }
  const openMenu = (event: ReactMouseEvent, e?: DesignElement) => {
    event.preventDefault()
    event.stopPropagation()
    if (editing) stopEditing()
    if (!e) setSelected([])
    else if (!selected.includes(e.id)) setSelected(withGroups(page.elements, [e.id]))
    setMenu({ x: event.clientX, y: event.clientY })
  }
  const startMarquee = (event: ReactPointerEvent) => {
    setMenu(null)
    if (event.button === 1 || (event.button === 0 && spaceDown.current)) return startPan(event)
    if (event.button !== 0) return
    if (editing) stopEditing()
    if (cropping) setCropping(null)
    if (pen) {
      event.preventDefault()
      const at = toPage(event.clientX, event.clientY)
      drag.current = { mode: 'pen', points: [at.x, at.y] }
      setInkLive([at.x, at.y])
      capture(event)
      return
    }
    const additive = event.shiftKey || event.ctrlKey || event.metaKey
    if (!additive) setSelected([])
    drag.current = {
      mode: 'marquee',
      start: toPage(event.clientX, event.clientY),
      base: additive ? selected : [],
    }
    capture(event)
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    const at = toPage(event.clientX, event.clientY)
    if (d.mode === 'marquee') {
      const box = {
        left: Math.min(d.start.x, at.x),
        top: Math.min(d.start.y, at.y),
        right: Math.max(d.start.x, at.x),
        bottom: Math.max(d.start.y, at.y),
      }
      setMarquee(box)
      const hit = page.elements
        .filter((e) => !e.locked && overlaps(bounds(e), box))
        .map((e) => e.id)
      setSelected([...new Set([...d.base, ...withGroups(page.elements, hit)])])
      return
    }
    if (d.mode === 'pan') {
      const wrap = stageWrap.current
      if (!wrap) return
      wrap.scrollLeft = d.left - (event.clientX - d.x)
      wrap.scrollTop = d.top - (event.clientY - d.y)
      return
    }
    if (d.mode === 'pen') {
      const lx = d.points[d.points.length - 2]!
      const ly = d.points[d.points.length - 1]!
      // a point every couple of screen pixels is enough for a smooth stroke
      if (Math.hypot(at.x - lx, at.y - ly) * scale < 2) return
      d.points.push(Math.round(at.x * 10) / 10, Math.round(at.y * 10) / 10)
      setInkLive([...d.points])
      return
    }
    if (!d.moved) {
      if (d.mode !== 'rotate' && Math.hypot(at.x - d.start.x, at.y - d.start.y) * scale < 3) return
      d.moved = true
      snapshot()
    }
    if (d.mode === 'crop') {
      const o = d.orig
      const a = ((o.rotation ?? 0) * Math.PI) / 180
      // the pointer's move in the picture's own frame
      const mx = at.x - d.start.x
      const my = at.y - d.start.y
      const lx = (o.flipX ? -1 : 1) * (mx * Math.cos(a) + my * Math.sin(a))
      const ly = -mx * Math.sin(a) + my * Math.cos(a)
      const r = coverRect(o, d.natural.w, d.natural.h)
      // the picture's spare room on each axis is negative; 0 means nothing to move
      const along = (offset: number, room: number) =>
        room < -0.5 ? Math.round(Math.min(1, Math.max(0, offset / room)) * 1000) / 1000 : 0.5
      live((draft) => {
        const e = draft.pages[pi]!.elements.find((x) => x.id === o.id)
        if (!e) return
        e.cropX = along(r.x + lx, o.w - r.w)
        e.cropY = along(r.y + ly, o.h - r.h)
      })
      return
    }
    if (d.mode === 'move') {
      let dx = at.x - d.start.x
      let dy = at.y - d.start.y
      if (event.shiftKey && Math.abs(dx) > Math.abs(dy)) dy = 0
      else if (event.shiftKey) dx = 0
      const moved = union(d.origs.map((o) => bounds({ ...o, x: o.x + dx, y: o.y + dy })))
      if (!event.altKey) {
        const snap = snapMove(moved, d.others, doc, 8 / scale)
        dx += snap.dx
        dy += snap.dy
        setGuides(snap.guides)
      } else setGuides({ v: [], h: [] })
      live((draft) => {
        for (const o of d.origs) {
          const e = draft.pages[pi]!.elements.find((x) => x.id === o.id)
          if (!e) continue
          e.x = Math.round(o.x + dx)
          e.y = Math.round(o.y + dy)
        }
      })
    } else if (d.mode === 'resize') {
      const o = d.orig
      const dx = at.x - d.start.x
      const dy = at.y - d.start.y
      live((draft) => {
        const e = draft.pages[pi]!.elements.find((x) => x.id === o.id)
        if (!e) return
        if (o.kind === 'line') {
          // a line's handles are its two ends
          if (d.handle === 'nw')
            Object.assign(e, {
              x: Math.round(o.x + dx),
              y: Math.round(o.y + dy),
              w: Math.round(o.w - dx),
              h: Math.round(o.h - dy),
            })
          else Object.assign(e, { w: Math.round(o.w + dx), h: Math.round(o.h + dy) })
          return
        }
        const [sx, sy] = HANDLE_SIDES[d.handle]
        const corner = sx !== 0 && sy !== 0
        // a no-derivatives picture is only scaled, never stretched
        if (!corner && modifyLocked(o)) return
        // pictures, QR codes and text keep their shape from a corner; Shift does it for the rest
        const keep =
          corner && (o.kind === 'image' || o.kind === 'qr' || o.kind === 'text' || event.shiftKey)
        Object.assign(e, resizeBox(o, d.handle, dx, dy, keep))
        if (o.kind === 'text' && corner) {
          const k = e.w / o.w
          e.fontSize = Math.max(6, Math.round((o.fontSize ?? 48) * k))
          if (o.letterSpacing) e.letterSpacing = Math.round(o.letterSpacing * k * 10) / 10
          if (o.outline) e.outline = Math.round(o.outline * k * 10) / 10
          if (o.radius) e.radius = Math.round(o.radius * k)
        }
      })
    } else if (d.mode === 'rotate') {
      const o = d.orig
      const rotation = rotationAt({ x: o.x + o.w / 2, y: o.y + o.h / 2 }, at, event.shiftKey)
      live((draft) => {
        const e = draft.pages[pi]!.elements.find((x) => x.id === o.id)
        if (e) e.rotation = rotation || undefined
      })
    }
  }
  const endDrag = () => {
    const d = drag.current
    drag.current = null
    setGuides({ v: [], h: [] })
    setMarquee(null)
    setPanning(false)
    if (d?.mode === 'pen') {
      setInkLive(null)
      const stroke = inkElement(d.points, {
        stroke: penColor,
        strokeWidth: penWidth,
        ...(highlighter ? { opacity: 0.45 } : {}),
      })
      if (stroke) changePage((pg) => pg.elements.push(stroke))
      return
    }
    // a plain click on one of several picked elements picks just that one
    if (d?.mode === 'move' && !d.moved && d.collapse) setSelected([d.clicked])
  }

  // ---- typing in place ----

  const startEdit = (e: DesignElement) => {
    if (e.kind === 'image') return startCrop(e.id)
    if (e.kind !== 'text' || e.locked) return
    setSelected([e.id])
    setEditing(e.id)
  }
  /** Leaves the text being typed, keeping it (the blur saves it). */
  const stopEditing = () => {
    const active = document.activeElement as HTMLElement | null
    if (active?.dataset.hanpan === 'design-inline') active.blur()
    else setEditing(null)
  }
  const finishEdit = (id: string, text: string, height: number) => {
    setEditing(null)
    const e = docRef.current.pages[pi]!.elements.find((x) => x.id === id)
    if (!e || (e.text === text && height <= e.h)) return
    changeElement(id, { text, h: Math.max(e.h, Math.ceil(height)) })
  }

  // ---- keyboard, clipboard, wheel ----

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // the print preview has the keys (it closes on Esc itself)
      if (printOpen) return
      if (printShortcut(event)) {
        event.preventDefault()
        if (isTyping(event.target)) (event.target as HTMLElement).blur()
        if (p.api.print) setPrintOpen(true)
        return
      }
      // Esc closes the credit check first
      if (event.key === 'Escape' && checkOpen) {
        setCheckOpen(false)
        return
      }
      // Esc leaves the menu, crop mode or the pen even from a slider or field
      if (event.key === 'Escape' && (menu || cropping || pen)) {
        setMenu(null)
        if (cropping) setCropping(null)
        else if (pen) setPen(false)
        return
      }
      const saving = saveShortcut(event)
      if (saving) {
        // also from a text being typed: leaving it keeps the text, then the design is saved
        event.preventDefault()
        if (isTyping(event.target)) (event.target as HTMLElement).blur()
        setTimeout(() => void saveRef.current(saving), 0)
        return
      }
      if (isTyping(event.target)) return
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (mod && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (mod && key === 'y') {
        event.preventDefault()
        redo()
      } else if (mod && key === 'a') {
        event.preventDefault()
        setSelected(page.elements.filter((e) => !e.locked).map((e) => e.id))
      } else if (mod && key === 'd') {
        event.preventDefault()
        duplicate()
      } else if (mod && key === 'g') {
        event.preventDefault()
        if (event.shiftKey) ungroup()
        else group()
      } else if (event.key === ' ' && !mod) {
        // Space held: dragging moves the view
        event.preventDefault()
        spaceDown.current = true
        stageWrap.current?.classList.add('dz-can-pan')
      } else if (mod && (event.key === ']' || event.key === '[')) {
        event.preventDefault()
        if (selection.length)
          arrange(
            event.key === ']'
              ? event.shiftKey
                ? 'toFront'
                : 'front'
              : event.shiftKey
                ? 'toBack'
                : 'back',
          )
      } else if (mod && (key === '=' || key === '+' || key === '-' || key === '0')) {
        event.preventDefault()
        setZoom((z) =>
          key === '0' ? 1 : Math.min(4, Math.max(0.25, key === '-' ? z / 1.2 : z * 1.2)),
        )
      } else if (event.key === 'Escape') {
        setSelected([])
      } else if (selection.length && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        remove()
      } else if (selection.length && event.key === 'Enter' && single?.kind === 'text') {
        event.preventDefault()
        startEdit(single)
      } else if (selection.length && event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        changePage(
          (pg) =>
            pg.elements.forEach(
              (e) => selected.includes(e.id) && !e.locked && ((e.x += dx), (e.y += dy)),
            ),
          'nudge',
        )
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== ' ') return
      spaceDown.current = false
      stageWrap.current?.classList.remove('dz-can-pan')
    }
    const onCopy = (event: ClipboardEvent, cut: boolean) => {
      if (printOpen || isTyping(event.target) || !selection.length || !event.clipboardData) return
      event.preventDefault()
      clip.current = selection.map(clone)
      event.clipboardData.setData('application/x-hanpan-design', JSON.stringify(selection))
      event.clipboardData.setData(
        'text/plain',
        selection
          .map((e) => e.text ?? e.qrText ?? '')
          .filter(Boolean)
          .join('\n'),
      )
      if (cut) remove()
    }
    const copy = (event: ClipboardEvent) => onCopy(event, false)
    const cut = (event: ClipboardEvent) => onCopy(event, true)
    const paste = (event: ClipboardEvent) => {
      if (printOpen || isTyping(event.target) || !event.clipboardData) return
      const ours = event.clipboardData.getData('application/x-hanpan-design')
      if (ours) {
        event.preventDefault()
        try {
          const list = (JSON.parse(ours) as DesignElement[]).filter(
            (e) => e && typeof e.kind === 'string',
          )
          pasteElements(list)
        } catch {
          /* not ours after all */
        }
        return
      }
      const file = [...event.clipboardData.files].find((f) => f.type.startsWith('image/'))
      if (file) {
        event.preventDefault()
        void addImageFile(file)
        return
      }
      const text = event.clipboardData.getData('text/plain').trim()
      if (text) {
        event.preventDefault()
        add(
          textElement({
            ...center(doc.width * 0.7, Math.round(unit * 0.12)),
            text: text.slice(0, 2000),
            fontSize: Math.round(unit * 0.045),
            color: ink,
          }),
        )
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('copy', copy)
    window.addEventListener('cut', cut)
    window.addEventListener('paste', paste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('copy', copy)
      window.removeEventListener('cut', cut)
      window.removeEventListener('paste', paste)
    }
  })

  // the menu closes on any press outside it, or when the window changes
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
    }
  }, [menu])

  useEffect(() => {
    const wrap = stageWrap.current
    if (!wrap) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      setZoom((z) => Math.min(4, Math.max(0.25, event.deltaY > 0 ? z / 1.1 : z * 1.1)))
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
  }, [])

  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }
  const onDrop = (event: DragEvent) => {
    const files = [...event.dataTransfer.files].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    event.preventDefault()
    const at = toPage(event.clientX, event.clientY)
    files.forEach((f, i) => void addImageFile(f, { x: at.x + i * 30, y: at.y + i * 30 }))
  }

  // ---- AI ----

  const ai = useDesignAi({
    lang: p.lang,
    w,
    api: p.api,
    docRef,
    replaceDoc,
    restoreDoc: (next) => replaceDoc(next, true),
    setPages: (pages) =>
      commit((d) => {
        d.pages = pages
      }),
    showPanel: () => openAi(),
  })
  const hasAi = ai.available
  const picked = selected.length > 0
  useEffect(() => {
    if (
      picked &&
      side === 'ai' &&
      ai.busy === null &&
      !ai.gate.connectChoice &&
      !ai.gate.noticeDue
    ) {
      returnToAi.current = true
      setSide('props')
    } else if (!picked && returnToAi.current) {
      returnToAi.current = false
      setSide('ai')
    }
    // only a change of "anything picked" moves the side (the rest is read as it is then)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked])
  /** focus the composer: bumped when the panel opens for a request */
  const [aiFocus, setAiFocus] = useState(0)
  const openAi = (mode?: 'make' | 'fill') => {
    if (!hasAi) return
    if (mode) ai.setMode(mode)
    returnToAi.current = false
    setSide('ai')
    if (mode) setAiFocus((n) => n + 1)
  }

  // ---- export ----

  const addFontFile = async (file: File) => {
    if (file.size > MAX_FONT_BYTES) return say(w.fontTooBig)
    const family =
      file.name
        .replace(/\.[^.]+$/, '')
        .trim()
        .slice(0, 60) || 'Font'
    let src: string
    try {
      src = await readFile(file)
    } catch {
      return say(w.fontBad)
    }
    if (!(await registerFont(family, src))) return say(w.fontBad)
    const target = single?.kind === 'text' ? single.id : null
    commit((d) => {
      d.fonts = [...(d.fonts ?? []).filter((f) => f.family !== family), { family, src }]
      const e = target ? d.pages[pi]!.elements.find((x) => x.id === target) : undefined
      if (e) e.fontFamily = family
    })
    say(w.fontAdded(family))
  }
  const say = (text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice((n) => (n === text ? null : n)), 4000)
  }
  /** A page as it is exported: with the credit list of `pages` at its foot when that is on. */
  const exportPage = (pg: DesignPage, pages: DesignPage[]) =>
    creditList ? withCreditList(pg, creditsOf(pages), p.lang, doc) : pg
  /** After an export, a word when pictures need a credit check (it does not stop the export). */
  const saidAfterExport = (done: string) =>
    say(
      exportWarnings(creditIssues(doc, creditList)).length ? `${done} ${g('gpExportWarn')}` : done,
    )
  const exportPicture = async (format: 'png' | 'jpg') => {
    const shown = exportPage(page, [page])
    const bytes =
      format === 'jpg'
        ? await pageJpeg(shown, doc.width, doc.height)
        : await pagePng(shown, doc.width, doc.height)
    const path = await p.api.savePng(bytes, `${doc.name}-${pi + 1}`, format)
    if (path) saidAfterExport(`${w.saved}: ${path}`)
  }
  const exportPdf = async () => {
    const pages = []
    const last = doc.pages.length - 1
    for (const [i, pg] of doc.pages.entries())
      pages.push(await pagePng(i === last ? exportPage(pg, doc.pages) : pg, doc.width, doc.height))
    const path = await p.api.savePdf(pages, { width: doc.width, height: doc.height }, doc.name)
    if (path) saidAfterExport(`${w.saved}: ${path}`)
  }
  /** What prints: the pages exactly as the PNG and PDF exports draw them. */
  const printPages = (range: PrintRange): DesignPage[] => {
    if (range === 'current') return [exportPage(page, [page])]
    const last = doc.pages.length - 1
    return doc.pages.map((pg, i) => (i === last ? exportPage(pg, doc.pages) : pg))
  }
  const copyImage = async () => {
    const png = await pagePng(exportPage(page, [page]), doc.width, doc.height)
    if (await p.api.copyImage(png)) saidAfterExport(w.copied)
  }
  // ---- credit check (4.8) ----
  const goToIssue = (issue: CreditIssue) => {
    setPageIndex(issue.page)
    setSelected([issue.id])
    setSide('props')
  }
  /** Puts the picture's credit line back under it, on its page. */
  const readdCreditLine = (issue: CreditIssue) => {
    const target = doc.pages[issue.page]?.elements.find((e) => e.id === issue.id)
    if (!target?.credit) return
    const background = doc.pages[issue.page]!.background
    const line = creditLineElement(target, target.credit, p.lang, doc, background)
    commit((d) => {
      const pg = d.pages[issue.page]!
      const e = pg.elements.find((x) => x.id === issue.id)
      if (!e) return
      const group = e.group ?? newId('g')
      e.group = group
      pg.elements.push({ ...line, group })
    })
  }
  const issueText = (issue: CreditIssue) => {
    if (issue.kind === 'no-credit') return g('gpIssueNoCredit')
    if (issue.kind === 'locked-changed') return g('gpIssueChanged')
    if (issue.kind === 'no-line') return g('gpIssueNoLine')
    const names = { nc: g('gpCondNc'), nd: g('gpCondNd'), sa: g('gpCondSa') }
    return g('gpIssueConditions', {
      conditions: (issue.conditions ?? []).map((c) => names[c]).join(', '),
    })
  }
  const save = async (mode: 'save' | 'saveAs' = 'save'): Promise<boolean> => {
    const current = docRef.current
    const path = await p.api.saveDesign(JSON.stringify(current), current.name, mode)
    if (!path) return false
    setSavedDoc(current)
    say(`${w.saved}: ${path}`)
    return true
  }
  saveRef.current = save
  /** Unsaved work about to be replaced: asks once (저장 / 저장 안 함 / 취소); false keeps it. */
  const confirmReplace = async (): Promise<boolean> => {
    if (docRef.current === savedRef.current || !p.api.askUnsaved) return true
    const answer = await p.api.askUnsaved()
    if (answer === 'cancel') return false
    return answer === 'save' ? saveRef.current() : true
  }
  /** a design that starts over (template, blank, outline): its first save asks where */
  const startNew = async (make: () => DesignDoc): Promise<boolean> => {
    if (!(await confirmReplace())) return false
    void p.api.newDesign?.()
    const next = make()
    replaceDoc(next)
    setSavedDoc(next)
    return true
  }
  const open = async () => {
    if (!(await confirmReplace())) return
    const file = await p.api.openDesign()
    const parsed = file ? parseDesign(file.text) : null
    if (!parsed) return
    const next = { ...parsed, name: file!.name }
    replaceDoc(next)
    setSavedDoc(next)
  }
  // the main process asks before the window closes on unsaved work
  useEffect(() => {
    p.api.setDirty?.(dirty)
  }, [dirty, p.api])
  useEffect(
    () =>
      p.api.onSaveThenClose?.(() => {
        void saveRef.current().then((saved) => {
          if (saved) p.api.closeAfterSave?.()
        })
      }),
    [p.api],
  )

  /** A layer row's name: a text's first line, else the kind of element. */
  const layerName = (e: DesignElement): string => {
    if (e.kind === 'text') return (e.text ?? '').split('\n')[0] || w.text
    if (e.kind === 'shape') return w.shapes[e.shape ?? 'star']
    if (e.kind === 'qr') return w.qr
    if (e.kind === 'image') return w.image
    if (e.kind === 'draw') return w.drawing
    if (e.kind === 'icon') {
      const icon = ICONS.find((i) => i.name === e.icon)
      return icon ? iconLabel(icon, p.lang) : w.icon
    }
    return w[e.kind]
  }

  // ---- drawing the page ----

  const handlesFor = (e: DesignElement): Handle[] => {
    if (e.kind === 'line') return ['nw', 'se']
    if (e.kind === 'qr') return ['nw', 'ne', 'se', 'sw']
    if (e.kind === 'text') return ['nw', 'ne', 'se', 'sw', 'e', 'w']
    return ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  }

  /**
   * The picked element's handles, above the page so the page edge never clips
   * them. They keep their screen size at any zoom; a line's two sit on its ends.
   */
  const renderHandles = () => {
    const e = single
    if (
      !e ||
      e.locked ||
      editing === e.id ||
      cropping === e.id ||
      (drag.current && 'moved' in drag.current && drag.current.moved)
    )
      return null
    const box = elementBox(e)
    const counter = `translate(-50%, -50%) scale(${1 / scale})`
    const handleAt = (h: Handle) => {
      if (e.kind === 'line') {
        const end = h === 'se'
        return {
          left: (end ? e.x + e.w : e.x) - box.left,
          top: (end ? e.y + e.h : e.y) - box.top,
          transform: counter,
        }
      }
      const [sx, sy] = HANDLE_SIDES[h]
      return {
        left: ((sx + 1) / 2) * box.width,
        top: ((sy + 1) / 2) * box.height,
        transform: counter,
      }
    }
    return (
      <div
        className={`dz-frame dz-frame-${e.kind}`}
        style={{
          ...box,
          transform: e.rotation && e.kind !== 'line' ? `rotate(${e.rotation}deg)` : undefined,
        }}
      >
        {handlesFor(e).map((h) => (
          <span
            key={h}
            className={`dz-handle dz-h-${h}`}
            style={handleAt(h)}
            onPointerDown={(event) => startResize(event, e, h)}
            data-handle={h}
          />
        ))}
        {e.kind !== 'line' && (
          <span
            className="dz-rotate"
            style={{ left: box.width / 2, top: -30 / scale, transform: counter }}
            onPointerDown={(event) => startRotate(event, e)}
            data-handle="rotate"
          />
        )}
      </div>
    )
  }

  /**
   * The quick AI rewrite over a picked text box, clear of the rotation handle
   * (under the box when the page's top leaves no room): one click polishes,
   * shortens, sharpens or translates it, through the same send gate as the AI helper.
   */
  const renderQuickAi = (e: DesignElement) => {
    const b = bounds(e)
    const width = 320
    const above = b.top * scale - 84
    const top = above >= -24 ? above : b.bottom * scale + 12
    const left = Math.min(Math.max(0, b.left * scale), Math.max(0, doc.width * scale - width))
    return (
      <div
        className="dz-ai-quick"
        style={{ left, top }}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        role="toolbar"
        aria-label={w.aiRewrite}
        data-hanpan="design-ai-quick"
      >
        <span className="dz-ai-quick-mark" aria-hidden>
          ✦
        </span>
        {ai.busy === 'rewrite' ? (
          <>
            <span className="dz-ai-quick-busy" role="status">
              {w.aiRewriting}
            </span>
            <button type="button" onClick={ai.stop}>
              {w.aiStop}
            </button>
          </>
        ) : (
          REWRITE_MODES.map((m) => (
            <button
              key={m}
              type="button"
              disabled={ai.busy !== null}
              onClick={() =>
                ai.send({ mode: 'rewrite', id: e.id, rewrite: m, target: translateTo })
              }
              data-ai-quick={m}
              title={
                m === 'translate' && translateTo
                  ? `${w.translateTo}: ${LANG_NATIVE_NAMES[translateTo] ?? translateTo}`
                  : undefined
              }
            >
              {w.rewrites[m]}
            </button>
          ))
        )}
      </div>
    )
  }

  /** Rulers along the top and left of the page, in page units, with the selection marked. */
  const renderRulers = () => {
    const step = rulerStep(scale)
    const sel = selection.length ? union(selection.map(bounds)) : null
    const ruler = (length: number, along: 'x' | 'y') => {
      const ticks: ReactNode[] = []
      for (let v = 0; v <= length; v += step / 5) {
        const at = Math.round(v * scale) + 0.5
        const major = Math.round(v) % step === 0
        const tick = major ? 18 : 5
        ticks.push(
          along === 'x' ? (
            <line key={v} x1={at} x2={at} y1={18 - tick} y2={18} />
          ) : (
            <line key={v} y1={at} y2={at} x1={18 - tick} x2={18} />
          ),
        )
        if (major)
          ticks.push(
            along === 'x' ? (
              <text key={`t${v}`} x={at + 3} y={9}>
                {Math.round(v)}
              </text>
            ) : (
              <text key={`t${v}`} x={9} y={at + 3} transform={`rotate(-90 9 ${at + 3})`}>
                {Math.round(v)}
              </text>
            ),
          )
      }
      const band = sel && (along === 'x' ? [sel.left, sel.right] : [sel.top, sel.bottom])
      const size = length * scale
      return (
        <svg
          className={`dz-ruler dz-ruler-${along === 'x' ? 'top' : 'left'}`}
          width={along === 'x' ? size : 18}
          height={along === 'x' ? 18 : size}
          aria-hidden="true"
        >
          {band && (
            <rect
              className="dz-ruler-band"
              x={along === 'x' ? band[0]! * scale : 0}
              y={along === 'x' ? 0 : band[0]! * scale}
              width={along === 'x' ? (band[1]! - band[0]!) * scale : 18}
              height={along === 'x' ? 18 : (band[1]! - band[0]!) * scale}
            />
          )}
          {ticks}
        </svg>
      )
    }
    return (
      <>
        {ruler(doc.width, 'x')}
        {ruler(doc.height, 'y')}
      </>
    )
  }

  /** What sits over the page while working: the group frame, the crop ghost, the stroke being drawn. */
  const renderOverlay = () => {
    const frame = selection.length > 1 ? union(selection.map(bounds)) : null
    const crop = cropping ? page.elements.find((x) => x.id === cropping) : undefined
    const at = crop && cropNatural ? coverRect(crop, cropNatural.w, cropNatural.h) : null
    return (
      <>
        {frame && (
          <span
            className="dz-group-frame"
            style={{
              left: frame.left,
              top: frame.top,
              width: frame.right - frame.left,
              height: frame.bottom - frame.top,
              borderWidth: 1 / scale,
            }}
          />
        )}
        {crop && at && (
          <div
            className="dz-crop-box"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.w,
              height: crop.h,
              transform:
                [crop.rotation ? `rotate(${crop.rotation}deg)` : '', crop.flipX ? 'scaleX(-1)' : '']
                  .join(' ')
                  .trim() || undefined,
              borderWidth: 2 / scale,
            }}
          >
            <img
              className="dz-crop-ghost"
              src={crop.src}
              alt=""
              style={{ left: at.x, top: at.y, width: at.w, height: at.h }}
            />
          </div>
        )}
        {inkLive && (
          <svg className="dz-ink-live" width={doc.width} height={doc.height} aria-hidden="true">
            <path
              d={inkPath(inkLive.length >= 4 ? inkLive : [...inkLive, ...inkLive], 1, 1)}
              fill="none"
              stroke={penColor}
              strokeWidth={penWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={highlighter ? 0.45 : 1}
            />
          </svg>
        )}
      </>
    )
  }

  const menuItem = (key: string, label: string, run: () => void, disabled = false) => (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      data-menu={key}
      onClick={() => {
        setMenu(null)
        run()
      }}
    >
      {label}
    </button>
  )
  /** The right-click menu: what can be done with the picked elements, or with the page. */
  const renderMenu = () => {
    if (!menu) return null
    const first = selection[0]
    const oneGroup = !!first?.group && selection.every((e) => e.group === first.group)
    const pasteNow = () => pasteElements(clip.current)
    return (
      <div
        className="dz-menu"
        role="menu"
        style={{
          left: Math.min(menu.x, window.innerWidth - 220),
          top: Math.max(8, Math.min(menu.y, window.innerHeight - (selection.length ? 430 : 100))),
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        data-hanpan="design-menu"
      >
        {selection.length ? (
          <>
            {menuItem('cut', w.cut, () => copySelection(true))}
            {menuItem('copy', w.copyEl, () => copySelection(false))}
            {menuItem('paste', w.paste, pasteNow, !clip.current.length)}
            {menuItem('duplicate', w.duplicate, duplicate)}
            {menuItem('remove', w.remove, remove)}
            <hr />
            {oneGroup
              ? menuItem('ungroup', w.ungroup, ungroup)
              : selection.length > 1 && menuItem('group', w.group, group)}
            {single?.kind === 'image' && menuItem('crop', w.crop, () => startCrop(single.id))}
            {menuItem('lock', selection.every((e) => e.locked) ? w.unlock : w.lock, toggleLock)}
            <hr />
            {menuItem('toFront', w.toFront, () => arrange('toFront'))}
            {menuItem('front', w.front, () => arrange('front'))}
            {menuItem('back', w.back, () => arrange('back'))}
            {menuItem('toBack', w.toBack, () => arrange('toBack'))}
          </>
        ) : (
          <>
            {menuItem('paste', w.paste, pasteNow, !clip.current.length)}
            {menuItem('selectAll', w.selectAll, () =>
              setSelected(page.elements.filter((e) => !e.locked).map((e) => e.id)),
            )}
          </>
        )}
      </div>
    )
  }

  const renderElement = (e: DesignElement) => {
    const { style, inner } = elementLook(e, `g-${e.id}`)
    const isSelected = selected.includes(e.id)
    const isEditing = editing === e.id
    return (
      <div
        key={e.id}
        className={`dz-el dz-${e.kind}${isSelected ? ' selected' : ''}${e.locked ? ' locked' : ''}${isEditing ? ' editing' : ''}${cropping === e.id ? ' cropping' : ''}`}
        style={style}
        data-element={e.kind}
        data-id={e.id}
        title={e.kind === 'text' && !isEditing ? w.editHint : undefined}
        onPointerDown={(event) => startMove(event, e)}
        onDoubleClick={() => startEdit(e)}
        onContextMenu={(event) => openMenu(event, e)}
      >
        {isEditing ? (
          <textarea
            className="dz-inline"
            defaultValue={e.text ?? ''}
            autoFocus
            onFocus={(ev) => ev.currentTarget.select()}
            onPointerDown={(ev) => ev.stopPropagation()}
            onKeyDown={(ev) => {
              if (ev.key === 'Escape') ev.currentTarget.blur()
            }}
            onBlur={(ev) =>
              finishEdit(
                e.id,
                ev.currentTarget.value,
                ev.currentTarget.scrollHeight + 2 * textPadding(e).y,
              )
            }
            data-hanpan="design-inline"
          />
        ) : (
          inner
        )}
      </div>
    )
  }

  const iconWords = iconQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shownIcons = ICONS.filter((icon) =>
    iconWords.every(
      (q) => icon.label.includes(q) || icon.name.includes(q) || iconLabel(icon, p.lang).includes(q),
    ),
  )

  const tabs: Tab[] = ['templates', 'elements', 'text', 'layers']
  const quickText =
    hasAi &&
    single?.kind === 'text' &&
    !single.locked &&
    editing !== single.id &&
    !cropping &&
    !marquee &&
    !(drag.current && 'moved' in drag.current && drag.current.moved)
      ? single
      : null
  const formatId = FORMATS.find((f) => f.width === doc.width && f.height === doc.height)?.id ?? ''

  return (
    <div
      className="dz"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <header className="dz-top">
        {/* 저장·열기는 다른 편집기처럼 파일 메뉴에 모은다 */}
        <DesignFileMenu
          lang={p.lang}
          canPrint={!!p.api.print}
          actions={{
            newDesign: () => {
              const f = FORMATS.find((x) => x.id === formatId) ?? FORMATS[0]!
              void startNew(() => blankDoc(f))
            },
            open: () => void open(),
            save: () => void save(),
            saveAs: () => void save('saveAs'),
            exportPng: () => void exportPicture('png'),
            exportJpg: () => void exportPicture('jpg'),
            exportPdf: () => void exportPdf(),
            print: () => setPrintOpen(true),
          }}
        />
        <div className="dz-name">
          <input
            value={doc.name}
            onChange={(e) => setDoc({ ...doc, name: e.target.value })}
            aria-label="name"
          />
        </div>
        <label className="dz-field" title={w.resizeHint}>
          <span>{w.resize}</span>
          <select
            value={formatId}
            onChange={(e) => changeFormat(e.target.value)}
            data-hanpan="design-format"
          >
            {!formatId && <option value="">{`${doc.width}×${doc.height}`}</option>}
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {w.formats[f.id] ?? f.name} {f.width}×{f.height}
              </option>
            ))}
          </select>
        </label>
        <div className="dz-group">
          <button type="button" onClick={undo} disabled={!past.length} title="Ctrl+Z">
            {w.undo}
          </button>
          <button type="button" onClick={redo} disabled={!future.length} title="Ctrl+Y">
            {w.redo}
          </button>
        </div>
        <div className="dz-group dz-zoom">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.25, z / 1.2))}
            aria-label={w.zoomOut}
            title={w.zoomOut}
          >
            −
          </button>
          <button type="button" onClick={() => setZoom(1)} title={w.zoomFit} data-action="zoom-fit">
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4, z * 1.2))}
            aria-label={w.zoomIn}
            title={w.zoomIn}
          >
            +
          </button>
          <button
            type="button"
            className={rulers ? 'on' : undefined}
            onClick={() => {
              const next = !rulers
              setRulers(next)
              try {
                localStorage.setItem(RULERS_KEY, next ? '1' : '0')
              } catch {
                /* the choice just isn't kept */
              }
            }}
            aria-pressed={rulers}
            title={w.panHint}
            data-action="rulers"
          >
            {w.rulers}
          </button>
        </div>
        {hasAi && (
          <button
            type="button"
            className={`dz-ai-open${side === 'ai' ? ' on' : ''}`}
            onClick={() => openAi()}
            title={w.aiOpen}
            aria-pressed={side === 'ai'}
            data-action="design-ai-open"
          >
            {w.side.ai}
          </button>
        )}
        <div className="dz-group dz-export">
          <button
            type="button"
            className="primary"
            data-action="design-copy"
            onClick={() => void copyImage()}
          >
            {w.copy}
          </button>
          {/* 파일 메뉴와 같은 이름: 툴바는 "내보내기" 아래 형식만 보인다 (점검 v2 hwp-design #33) */}
          <span className="dz-export-label">{w.exportLabel}</span>
          <button
            type="button"
            data-action="design-png"
            title={w.fileMenu.exportPng}
            aria-label={w.fileMenu.exportPng}
            onClick={() => void exportPicture('png')}
          >
            PNG
          </button>
          <button
            type="button"
            data-action="design-jpg"
            title={w.fileMenu.exportJpg}
            aria-label={w.fileMenu.exportJpg}
            onClick={() => void exportPicture('jpg')}
          >
            JPG
          </button>
          <button
            type="button"
            data-action="design-pdf"
            title={w.fileMenu.exportPdf}
            aria-label={w.fileMenu.exportPdf}
            onClick={() => void exportPdf()}
          >
            PDF
          </button>
          {p.api.print && (
            <button
              type="button"
              data-action="design-print"
              title="Ctrl+P"
              onClick={() => setPrintOpen(true)}
            >
              {w.print}
            </button>
          )}
          {credited && (
            <label className="dz-export-check">
              <input
                type="checkbox"
                checked={creditList}
                onChange={(e) => setCreditList(e.target.checked)}
                data-hanpan="credit-list"
              />
              {g('gpCreditList')}
            </label>
          )}
          <span className="dz-credit-wrap">
            <button
              type="button"
              aria-expanded={checkOpen}
              onClick={() => setCheckOpen((open) => !open)}
              data-action="credit-check"
            >
              {g('gpCheck')}
            </button>
            {checkOpen && (
              <div className="dz-credit-check" role="dialog" data-hanpan="credit-check">
                <h3>{g('gpCheckTitle')}</h3>
                {issues.length === 0 ? (
                  <p className="dz-muted">{g('gpCheckClean')}</p>
                ) : (
                  <ul>
                    {issues.map((issue) => (
                      <li key={`${issue.kind}:${issue.id}`} data-credit-issue={issue.kind}>
                        <strong>
                          {g('gpPage', { page: issue.page + 1 })} ·{' '}
                          {issue.credit?.title ?? g('gpPicture')}
                        </strong>
                        <span className="dz-muted">{issueText(issue)}</span>
                        <span className="dz-row">
                          <button type="button" onClick={() => goToIssue(issue)}>
                            {g('gpGoTo')}
                          </button>
                          {issue.kind === 'no-line' && (
                            <button
                              type="button"
                              onClick={() => readdCreditLine(issue)}
                              data-action="credit-readd"
                            >
                              {g('gpReAdd')}
                            </button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => setCheckOpen(false)}>
                  {g('gpClose')}
                </button>
              </div>
            )}
          </span>
        </div>
      </header>
      <div className="dz-main">
        <nav className="dz-tabs" aria-label="panels">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? 'on' : ''}
              onClick={() => setTab(t)}
              data-tab={t}
            >
              {w.tabs[t]}
            </button>
          ))}
        </nav>
        <aside className="dz-left">
          {tab === 'templates' && (
            <>
              <h3>{w.templates}</h3>
              {hasAi && fromTemplate && (
                <button
                  type="button"
                  className="dz-ai-nudge"
                  onClick={() => openAi('fill')}
                  data-action="design-ai-fill-template"
                >
                  {w.aiTemplateNudge}
                </button>
              )}
              <div className="dz-template-grid">
                {templatePreviews.map(({ t, doc: preview }) => (
                  <button
                    key={t.id}
                    type="button"
                    className="dz-template"
                    data-template={t.id}
                    onClick={() =>
                      void startNew(t.make).then((started) => started && setFromTemplate(true))
                    }
                    title={t.name}
                  >
                    <PagePreview
                      page={preview.pages[0]!}
                      width={preview.width}
                      height={preview.height}
                      size={92}
                    />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
              <h3>{w.blank}</h3>
              <div className="dz-templates">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="ghost"
                    onClick={() => void startNew(() => blankDoc(f))}
                  >
                    + {w.formats[f.id] ?? f.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="dz-outline-btn"
                data-action="design-outline"
                onClick={() => setOutlineOpen((o) => !o)}
              >
                {w.outline}
              </button>
              {outlineOpen && (
                <div className="dz-outline">
                  <p>{w.outlineHint}</p>
                  <textarea
                    rows={8}
                    value={outlineText}
                    onChange={(e) => setOutlineText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="primary"
                    data-action="design-outline-make"
                    onClick={() => {
                      void startNew(() => cardNewsFromOutline(outlineText))
                      setOutlineOpen(false)
                    }}
                  >
                    {w.make}
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'elements' && (
            <>
              <h3>{w.shapesTitle}</h3>
              <div className="dz-shape-grid">
                {(['rect', 'ellipse', 'line'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    data-add={k}
                    onClick={() => addShape(k)}
                    title={w[k]}
                  >
                    <svg viewBox="0 0 40 40" aria-hidden="true">
                      {k === 'rect' && <rect x="4" y="8" width="32" height="24" rx="5" />}
                      {k === 'ellipse' && <circle cx="20" cy="20" r="15" />}
                      {k === 'line' && (
                        <line
                          x1="5"
                          y1="20"
                          x2="35"
                          y2="20"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    <span>{w[k]}</span>
                  </button>
                ))}
                {SHAPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-add={s}
                    onClick={() => addShape(s)}
                    title={w.shapes[s]}
                  >
                    <svg viewBox="0 0 40 40" aria-hidden="true">
                      <path d={shapePath(s, 32, 32)} transform="translate(4 4)" />
                    </svg>
                    <span>{w.shapes[s]}</span>
                  </button>
                ))}
              </div>
              <h3>{w.pen}</h3>
              <div className="dz-pen-panel">
                <button
                  type="button"
                  className={`dz-wide${pen ? ' on' : ''}`}
                  aria-pressed={pen}
                  onClick={() => {
                    setPen(!pen)
                    setCropping(null)
                    if (!pen) setSelected([])
                  }}
                  data-action="pen"
                >
                  {w.pen}
                </button>
                <div className="dz-swatches">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`dz-swatch${penColor === c ? ' on' : ''}`}
                      style={{ background: c }}
                      onClick={() => setPenColor(c)}
                      aria-label={c}
                      title={c}
                      data-pen-color={c}
                    />
                  ))}
                </div>
                <label className="dz-field">
                  <span>{w.penWidth}</span>
                  <input
                    type="range"
                    min={2}
                    max={60}
                    value={penWidth}
                    onChange={(e) => setPenWidth(Number(e.target.value))}
                    data-hanpan="pen-width"
                  />
                </label>
                <label className="dz-check">
                  <input
                    type="checkbox"
                    checked={highlighter}
                    onChange={(e) => setHighlighter(e.target.checked)}
                  />
                  {w.highlighter}
                </label>
                {pen && <p className="dz-muted">{w.penOn}</p>}
              </div>
              <h3>{w.image}</h3>
              <button
                type="button"
                className="dz-wide"
                data-add="image"
                onClick={() => void addImage()}
              >
                {w.image}
              </button>
              <p className="dz-muted">{w.imageHint}</p>
              {p.api.gonguSearch && p.api.gonguPicture && (
                <>
                  <h3>{g('gpFind')}</h3>
                  <GonguPanel
                    lang={p.lang}
                    api={{ gonguSearch: p.api.gonguSearch, gonguPicture: p.api.gonguPicture }}
                    insert={placeGonguPicture}
                    {...(p.api.openGonguSettings
                      ? {
                          openSettings: () => p.api.openGonguSettings!(),
                          openSettingsLabel: w.gonguOpenSettings,
                        }
                      : {})}
                  />
                </>
              )}
              <h3>{w.icons}</h3>
              <input
                type="search"
                className="dz-icon-search"
                value={iconQuery}
                placeholder={w.iconSearch}
                onChange={(e) => setIconQuery(e.target.value)}
                data-hanpan="icon-search"
              />
              <div className="dz-icon-grid">
                {shownIcons.map((icon) => (
                  <button
                    key={icon.name}
                    type="button"
                    title={iconLabel(icon, p.lang)}
                    aria-label={iconLabel(icon, p.lang)}
                    onClick={() => addIcon(icon.name)}
                    data-add-icon={icon.name}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {icon.paths.map((d, i) => (
                        <path key={i} d={d} />
                      ))}
                    </svg>
                  </button>
                ))}
              </div>
              {!shownIcons.length && <p className="dz-muted">{w.iconNone}</p>}
              <h3>{w.qr}</h3>
              <div className="dz-col">
                <input
                  value={qrInput}
                  placeholder={w.qrPlaceholder}
                  onChange={(e) => setQrInput(e.target.value)}
                  data-hanpan="qr-input"
                />
                <button type="button" onClick={addQr} data-add="qr">
                  {w.qrAdd}
                </button>
              </div>
            </>
          )}

          {tab === 'text' && (
            <>
              <div className="dz-text-adds">
                <button
                  type="button"
                  className="dz-add-title"
                  data-add="title"
                  onClick={() => addTextPreset('title')}
                >
                  {w.addTitle}
                </button>
                <button
                  type="button"
                  className="dz-add-subtitle"
                  data-add="subtitle"
                  onClick={() => addTextPreset('subtitle')}
                >
                  {w.addSubtitle}
                </button>
                <button
                  type="button"
                  className="dz-add-body"
                  data-add="body"
                  onClick={() => addTextPreset('body')}
                >
                  {w.addBody}
                </button>
              </div>
              <h3>{w.textStyles}</h3>
              <div className="dz-presets">
                <button type="button" data-add="badge" onClick={() => addTextPreset('badge')}>
                  <span className="dz-pv-badge">{w.presets.badge}</span>
                </button>
                <button type="button" data-add="outlined" onClick={() => addTextPreset('outlined')}>
                  <span className="dz-pv-outlined">{w.presets.outlined}</span>
                </button>
                <button type="button" data-add="shadowed" onClick={() => addTextPreset('shadowed')}>
                  <span className="dz-pv-shadowed">{w.presets.shadowed}</span>
                </button>
                <button type="button" data-add="quote" onClick={() => addTextPreset('quote')}>
                  <span className="dz-pv-quote">“{w.presets.quote}”</span>
                </button>
              </div>
            </>
          )}

          {tab === 'layers' && (
            <>
              <p className="dz-muted">{w.layersHint}</p>
              <ol className="dz-layers" data-hanpan="design-layers">
                {[...page.elements].reverse().map((e) => (
                  <li key={e.id} className={selected.includes(e.id) ? 'on' : ''}>
                    <button
                      type="button"
                      className={`dz-layer-lock${e.locked ? ' on' : ''}`}
                      aria-label={e.locked ? w.unlock : w.lock}
                      title={e.locked ? w.unlock : w.lock}
                      onClick={() => changeElement(e.id, { locked: e.locked ? undefined : true })}
                    >
                      {e.locked ? '🔒' : '🔓'}
                    </button>
                    <button
                      type="button"
                      className="dz-layer"
                      data-layer={e.id}
                      title={layerName(e)}
                      onClick={(ev) =>
                        setSelected(
                          ev.shiftKey
                            ? selected.includes(e.id)
                              ? selected.filter((x) => x !== e.id)
                              : [...selected, e.id]
                            : [e.id],
                        )
                      }
                    >
                      <span className="dz-layer-kind">
                        {e.kind === 'text'
                          ? 'T'
                          : e.kind === 'image'
                            ? '▣'
                            : e.kind === 'qr'
                              ? '▦'
                              : e.kind === 'line'
                                ? '╱'
                                : e.kind === 'draw'
                                  ? '✎'
                                  : e.kind === 'icon'
                                    ? '✦'
                                    : '◆'}
                      </span>
                      {e.group && (
                        <span
                          className="dz-layer-group"
                          title={w.layerGrouped}
                          aria-label={w.layerGrouped}
                        >
                          ⧉
                        </span>
                      )}
                      <span className="dz-layer-name">{layerName(e)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </aside>
        <section className="dz-center">
          <div
            className={`dz-stage-wrap${pen ? ' pen-on' : ''}${panning ? ' panning' : ''}`}
            ref={stageWrap}
            onPointerDown={startMarquee}
            onContextMenu={(event) => openMenu(event)}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <div
              className="dz-stage"
              style={{ width: doc.width * scale, height: doc.height * scale }}
            >
              {rulers && renderRulers()}
              <div
                className="dz-page"
                ref={pageRef}
                style={{
                  width: doc.width,
                  height: doc.height,
                  background: pageBackground(page),
                  transform: `scale(${scale})`,
                  ['--dz-scale' as string]: scale,
                }}
              >
                {page.elements.map(renderElement)}
                {page.elements.length === 0 && (
                  <p
                    className="dz-empty-hint"
                    data-hanpan="design-empty"
                    style={{ fontSize: 15 / scale }}
                  >
                    {w.emptyHint}
                  </p>
                )}
                {guides.v.map((x) => (
                  <span
                    key={`v${x}`}
                    className="dz-guide dz-guide-v"
                    style={{ left: x, width: 1 / scale }}
                  />
                ))}
                {guides.h.map((y) => (
                  <span
                    key={`h${y}`}
                    className="dz-guide dz-guide-h"
                    style={{ top: y, height: 1 / scale }}
                  />
                ))}
                {marquee && (
                  <span
                    className="dz-marquee"
                    style={{
                      left: marquee.left,
                      top: marquee.top,
                      width: marquee.right - marquee.left,
                      height: marquee.bottom - marquee.top,
                      borderWidth: 1 / scale,
                    }}
                  />
                )}
              </div>
              <div
                className="dz-overlay"
                style={{ width: doc.width, height: doc.height, transform: `scale(${scale})` }}
              >
                {renderOverlay()}
                {renderHandles()}
              </div>
              {quickText && renderQuickAi(quickText)}
            </div>
          </div>
          <nav className="dz-pages">
            {doc.pages.map((pg, i) => (
              <button
                key={pg.id}
                type="button"
                className={i === pi ? 'on' : ''}
                onClick={() => (setPageIndex(i), setSelected([]), setEditing(null))}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => (
                commit((d) =>
                  d.pages.splice(pi + 1, 0, {
                    id: newId('p'),
                    background: '#FFFFFF',
                    elements: [],
                  }),
                ),
                setPageIndex(pi + 1),
                setSelected([])
              )}
            >
              {w.addPage}
            </button>
            <button
              type="button"
              onClick={() => (
                commit((d) =>
                  d.pages.splice(pi + 1, 0, {
                    ...clone(page),
                    id: newId('p'),
                    elements: page.elements.map((e) => ({ ...clone(e), id: newId() })),
                  }),
                ),
                setPageIndex(pi + 1),
                setSelected([])
              )}
            >
              {w.dupPage}
            </button>
            <button
              type="button"
              disabled={doc.pages.length < 2}
              onClick={() => (
                commit((d) => d.pages.splice(pi, 1)),
                setPageIndex(Math.max(0, pi - 1)),
                setSelected([])
              )}
            >
              {w.delPage}
            </button>
          </nav>
        </section>
        <aside className={`dz-right${hasAi && side === 'ai' ? ' dz-right-ai' : ''}`}>
          {hasAi && (
            <div className="dz-side-tabs" role="tablist">
              {(['props', 'ai'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={side === s}
                  className={side === s ? 'on' : ''}
                  onClick={() => ((returnToAi.current = false), setSide(s))}
                  data-side={s}
                >
                  {w.side[s]}
                </button>
              ))}
            </div>
          )}
          {hasAi && side === 'ai' ? (
            <DesignAiPanel lang={p.lang} w={w} ai={ai} doc={doc} focusKey={aiFocus} />
          ) : (
            <Inspector
              w={w}
              lang={p.lang}
              page={page}
              selection={selection}
              docColors={docColors}
              change={changeElement}
              changePage={changePage}
              align={align}
              spread={spread}
              arrange={arrange}
              duplicate={duplicate}
              remove={remove}
              toggleLock={toggleLock}
              fillPage={fillPage}
              replaceImage={(id) => void replaceImage(id)}
              fonts={(doc.fonts ?? []).map((f) => f.family)}
              pcFonts={pcFonts}
              loadPcFonts={() => {
                if (!pcFonts.length)
                  void loadPcFonts(p.api.fontFamilyInfo?.bind(p.api)).then(setPcFonts)
              }}
              addFont={() => fontInput.current?.click()}
              group={group}
              ungroup={ungroup}
              startCrop={startCrop}
              lockNote={single && modifyLocked(single) ? g('gpLocked') : null}
              ai={
                hasAi
                  ? {
                      busy: ai.busy !== null,
                      error:
                        ai.busy === null && ai.thread.at(-1)?.mode === 'rewrite' ? ai.error : null,
                      rewrite: (id, rewrite) =>
                        ai.send({ mode: 'rewrite', id, rewrite, target: translateTo }),
                      translateTo,
                      setTranslateTo,
                      stop: ai.stop,
                    }
                  : null
              }
            />
          )}
        </aside>
      </div>
      {renderMenu()}
      <input
        ref={fontInput}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void addFontFile(file)
        }}
        data-hanpan="font-file"
      />
      {cropping && !notice && (
        <div className="dz-notice" role="status">
          {w.cropping}
        </div>
      )}
      {printOpen && p.api.print && (
        <DesignPrintDialog
          width={doc.width}
          height={doc.height}
          pages={printPages}
          words={w}
          print={p.api.print}
          onClose={(failed) => {
            setPrintOpen(false)
            if (failed) say(w.printFailed)
          }}
        />
      )}
      {notice && (
        <div className="dz-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label={w.close}>
            ×
          </button>
        </div>
      )}
    </div>
  )
}
