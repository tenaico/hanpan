/**
 * Ten slide styles for "send this map to PowerPoint". They are named by what
 * they look like (one big line, answer-first report, plain-word cards, …) and
 * never after a real person or company: the app is free and used commercially.
 * The ids are older and stay as they are, since saved choices use them. Each style lays out the whole deck itself — a
 * cover, a contents slide where the style uses one, one slide per branch and a
 * closing slide — as slide-engine ops, so the deck opens already designed and
 * stays fully editable.
 *
 * A content slide's layout follows what the branch holds: how many topics sit
 * under it, whether they have sub-topics, and whether one carries a figure
 * with a unit (30%, 2배, 120명), which the number-led styles set large.
 *
 * Type uses the families the app ships for its design templates (Pretendard,
 * Noto Serif KR, Gowun Batang, Space Grotesk), so the slides tab shows them as
 * designed; PowerPoint without them installed falls back to its own faces.
 *
 * Ops are plain objects in the `@genoffice/pptx-ops` vocabulary (addBlankSlide,
 * setBackground, addElement, setNotes); this package does not import the engine.
 */
import type { SlidePlan } from './slides'

export type SlideStyleId =
  | 'jobs'
  | 'mckinsey'
  | 'toss'
  | 'bcg'
  | 'ted'
  | 'material'
  | 'notion'
  | 'airbnb'
  | 'canva'
  | 'pitch'

export interface SlideStyleInfo {
  id: SlideStyleId
  name: { ko: string; en: string }
  /** 특징 · 사용법, one line */
  description: { ko: string; en: string }
}

export const SLIDE_STYLES: readonly SlideStyleInfo[] = [
  {
    id: 'jobs',
    name: { ko: '큰 글자 한 줄 메시지', en: 'One big line' },
    description: {
      ko: '대형 한 문장 · 넓은 여백 · 강한 키비주얼. 비전과 핵심 제안을 강하게',
      en: 'One big line, wide space. For a vision or a key proposal',
    },
  },
  {
    id: 'mckinsey',
    name: { ko: '결론 먼저 보고서', en: 'Answer-first report' },
    description: {
      ko: '결론 우선 · 논리 구조 · 표·차트 중심. 시장분석·문제정의·실행계획',
      en: 'Answer first, logical structure. For analysis and plans',
    },
  },
  {
    id: 'toss',
    name: { ko: '쉬운 말 카드형', en: 'Plain-word cards' },
    description: {
      ko: '쉬운 말 · 친근한 톤 · 카드형 구성. 고객 관점 소개·서비스 설명',
      en: 'Plain words, friendly cards. For explaining a service',
    },
  },
  {
    id: 'bcg',
    name: { ko: '컨설팅 프레임워크형', en: 'Consulting frameworks' },
    description: {
      ko: '프레임워크 · 도식화 · 인사이트. 사업모델·경쟁전략·포지셔닝',
      en: 'Frameworks and matrices. For strategy and positioning',
    },
  },
  {
    id: 'ted',
    name: { ko: '이야기 중심 발표', en: 'Story-led talk' },
    description: {
      ko: '스토리텔링 · 감정 연결 · 단순한 비주얼. 자기 브랜딩·영감형 발표',
      en: 'Storytelling, simple visuals. For inspiring talks',
    },
  },
  {
    id: 'material',
    name: { ko: '색 포인트 정보형', en: 'Colour-accent explainer' },
    description: {
      ko: '컬러 포인트 · 아이콘 · 명확한 정보 구조. 학습 자료·프로세스 설명',
      en: 'Colour points, clear structure. For lessons and processes',
    },
  },
  {
    id: 'notion',
    name: { ko: '블록형 미니멀', en: 'Minimal blocks' },
    description: {
      ko: '모듈형 블록 · 절제된 미니멀 · 정리감. 강의 노트·워크숍·로드맵',
      en: 'Modular blocks, minimal. For notes, workshops, roadmaps',
    },
  },
  {
    id: 'airbnb',
    name: { ko: '따뜻한 경험 이야기', en: 'Warm journey story' },
    description: {
      ko: '따뜻한 톤 · 공감형 메시지 · 경험 중심. 브랜드 스토리·고객 여정',
      en: 'Warm, empathetic, experience-led. For brand stories',
    },
  },
  {
    id: 'canva',
    name: { ko: '균형 잡힌 템플릿형', en: 'Balanced template' },
    description: {
      ko: '템플릿 친화 · 빠른 제작 · 균형 레이아웃. 팀 과제·행사 안내·홍보',
      en: 'Template-friendly, balanced. For team work and events',
    },
  },
  {
    id: 'pitch',
    name: { ko: '투자 제안 피치덱', en: 'Investor pitch deck' },
    description: {
      ko: '문제-해결-성과 · 숫자 강조 · 투자자 시선. 제안서·사업계획·데모데이',
      en: 'Problem, solution, traction. For pitches and plans',
    },
  },
]

export function isSlideStyleId(value: unknown): value is SlideStyleId {
  return SLIDE_STYLES.some((s) => s.id === value)
}

// ---- page geometry: inches on the 16:9 page of the blank deck ----

const IN = 914_400
const PW = 12_192_000 / IN
const PH = 6_858_000 / IN

const SANS = 'Pretendard'
const SERIF = 'Noto Serif KR'
const WARM = 'Gowun Batang'
const NUM = 'Space Grotesk'

type Op = Record<string, unknown>

interface Run {
  text: string
  fontSize: number
  color: string
  fontFamily: string
  bold?: boolean
  letterSpacing?: number
}

interface Para {
  runs: Run[]
  align?: 'left' | 'center' | 'right'
  /** line spacing, % of single */
  lineHeight?: number
  /** pt */
  spaceBefore?: number
  spaceAfter?: number
}

interface RunOpts {
  bold?: boolean
  font?: string
  spacing?: number
}

function run(text: string, size: number, color: string, o: RunOpts = {}): Run {
  return {
    text,
    fontSize: size,
    color,
    fontFamily: o.font ?? SANS,
    ...(o.bold ? { bold: true } : {}),
    ...(o.spacing ? { letterSpacing: o.spacing } : {}),
  }
}

function para(runs: Run | Run[], o: Omit<Para, 'runs'> = {}): Para {
  return { runs: Array.isArray(runs) ? runs : [runs], ...o }
}

const emu = (v: number): number => Math.round(v * IN)
const rect = (x: number, y: number, w: number, h: number) => ({
  x: emu(x),
  y: emu(y),
  cx: emu(Math.max(0, w)),
  cy: emu(Math.max(0, h)),
})

function paragraphsOf(paras: Para[]): Op[] {
  return paras.map((p) => ({
    runs: p.runs,
    align: p.align ?? 'left',
    bullet: { type: 'none' },
    ...(p.lineHeight ? { lineHeight: p.lineHeight } : {}),
    ...(p.spaceBefore ? { spaceBefore: p.spaceBefore } : {}),
    ...(p.spaceAfter ? { spaceAfter: p.spaceAfter } : {}),
  }))
}

/** A frameless text box with no inner margin, so its text lines up with the shapes around it. */
function tb(
  slide: number,
  x: number,
  y: number,
  w: number,
  h: number,
  paras: Para[],
  anchor: 't' | 'ctr' | 'b' = 't',
): Op {
  return {
    op: 'addElement',
    target: { slide },
    kind: 'textbox',
    offset: rect(x, y, w, h),
    paragraphs: paragraphsOf(paras),
    bodyPr: { wrap: 'square', anchor, autoFit: 'shrink', insetsEmu: { l: 0, t: 0, r: 0, b: 0 } },
  }
}

interface ShapeOpts {
  /** corner radius in inches, for roundRect */
  radius?: number
  stroke?: { color: string; pt: number }
  paras?: Para[]
  anchor?: 't' | 'ctr' | 'b'
  /** inner margin in inches */
  inset?: number
}

function sh(
  slide: number,
  kind: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | undefined,
  o: ShapeOpts = {},
): Op {
  const ins = emu(o.inset ?? 0)
  return {
    op: 'addElement',
    target: { slide },
    kind,
    offset: rect(x, y, w, h),
    ...(fill ? { fill } : {}),
    ...(o.stroke
      ? { stroke: { color: o.stroke.color, widthEmu: Math.round(o.stroke.pt * 12_700) } }
      : {}),
    ...(o.radius !== undefined && kind === 'roundRect'
      ? {
          adjustments: { adj: Math.min(50_000, Math.round((o.radius / Math.min(w, h)) * 100_000)) },
        }
      : {}),
    ...(o.paras ? { paragraphs: paragraphsOf(o.paras) } : {}),
    bodyPr: {
      wrap: 'square',
      anchor: o.anchor ?? 'ctr',
      insetsEmu: { l: ins, t: ins, r: ins, b: ins },
    },
  }
}

const box = (
  s: number,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  radius?: number,
): Op => sh(s, radius ? 'roundRect' : 'rect', x, y, w, h, fill, radius ? { radius } : {})
const dot = (
  s: number,
  x: number,
  y: number,
  d: number,
  fill: string | undefined,
  o: ShapeOpts = {},
): Op => sh(s, 'ellipse', x, y, d, d, fill, o)

function background(slide: number, color: string, to?: string, angleDeg = 90): Op {
  return to
    ? { op: 'setBackground', target: { slide }, kind: 'gradient', from: color, to, angleDeg }
    : { op: 'setBackground', target: { slide }, kind: 'solid', color }
}

/** Width of a line of text in ems: Hangul and other CJK full, Latin by rough class. */
function ems(t: string): number {
  let w = 0
  for (const ch of t) {
    const c = ch.codePointAt(0) ?? 0
    w +=
      c >= 0x1100
        ? 0.95
        : /[A-Z0-9%#@&]/.test(ch)
          ? 0.64
          : /[a-z]/.test(ch)
            ? 0.52
            : ch === ' '
              ? 0.27
              : 0.36
  }
  return w
}

/** The largest size from `max` down to `min` at which the text fits `lines` lines of `width` inches. */
function fit(t: string, max: number, min: number, width: number, lines = 1): number {
  for (let pt = max; pt > min; pt--) if ((ems(t) * pt) / 72 <= width * lines * 0.92) return pt
  return min
}

/** Height in inches of text set at `size` in a box `width` wide, wrapped. */
function textH(t: string, size: number, width: number, lineHeight = 1.25): number {
  const lines = Math.max(1, Math.ceil((ems(t) * size) / 72 / (width * 0.92)))
  return (lines * size * lineHeight) / 72
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

// ---- what a slide holds ----

interface Group {
  text: string
  /** the sub-topics under it, depth 1 = right under */
  children: { text: string; depth: number }[]
}

/** The slide's topics with their sub-topics; a continuation slide's leading sub-topics stand on their own. */
function groupsOf(plan: SlidePlan): Group[] {
  const out: Group[] = []
  for (const p of plan.paragraphs) {
    const text = p.text.trim()
    if (!text) continue
    const level = p.level ?? 0
    if (level === 0 || !out.length) out.push({ text, children: [] })
    else out[out.length - 1]!.children.push({ text, depth: level })
  }
  return out
}

const childLines = (g: Group, max = 3): string[] =>
  g.children
    .filter((c) => c.depth === 1)
    .slice(0, max)
    .map((c) => c.text)

/**
 * A figure with a unit — 30%, 2배, 4.5점, 120명 — never a date such as 3월 or
 * 2026년. A particle may follow it as in a written sentence (30%가, 4.5점을, 2배로).
 */
const FIGURE =
  /(?<![\d.])(\d[\d,]*(?:\.\d+)?)\s?(%|배|(?:억|만|천)(?:\s?(?:명|원|건|개|달러|대|곳|회|가구|톤))?|명|건|개|원|점|회|곳|시간|x|X)(?=(?:으로|로|가|이|을|를|의|은|는|에|도|와|과|만)?(?![가-힣A-Za-z]))/
/** The particle right after a figure, left out of the figure's label. */
const LEADING_PARTICLE = /^(?:으로|로|가|이|을|를|의|은|는|에|도|와|과|만)(?![가-힣A-Za-z])/

interface Figure {
  value: string
  label: string
}

export function figureIn(text: string): Figure | undefined {
  // in a paragraph, the figure's own sentence is its label
  const sentences = text.split(/(?<=[.!?。])\s+/)
  const sentence = sentences.find((t) => FIGURE.test(t))
  if (!sentence) return undefined
  const m = FIGURE.exec(sentence)!
  const after = sentence.slice(m.index + m[0].length).replace(LEADING_PARTICLE, '')
  const label = (sentence.slice(0, m.index) + ' ' + after)
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim()
  // 12억 명: a counter after a large unit stays with the number, one space apart
  const value = m[1]! + m[2]!.replace(/\s+/g, ' ')
  return { value, label: label || sentence }
}

/** A group's figure: in its own words, else in its first sub-topic that has one. */
function figureOf(g: Group): Figure | undefined {
  const own = figureIn(g.text)
  if (own) return own
  for (const c of g.children) {
    const f = figureIn(c.text)
    if (f) return { value: f.value, label: g.text }
  }
  return undefined
}

/** The topic whose own words carry a figure: the one the number-led layouts set huge. */
const heroOf = (groups: Group[]): Group | undefined => groups.find((g) => figureIn(g.text))

/** Height of a card's sub-topic lines. */
function childrenH(lines: string[], size: number, width: number): number {
  return lines.reduce((h, t) => h + textH(t, size, width, 1.4) + 0.06, 0)
}

/** Runs for a line with its figure set in the accent colour. */
function accented(
  text: string,
  size: number,
  color: string,
  accent: string,
  o: RunOpts = {},
): Run[] {
  const m = FIGURE.exec(text)
  if (!m) return [run(text, size, color, o)]
  const before = text.slice(0, m.index)
  const after = text.slice(m.index + m[0].length)
  return [
    ...(before ? [run(before, size, color, o)] : []),
    run(m[0], size, accent, { ...o, bold: true }),
    ...(after ? [run(after, size, color, o)] : []),
  ]
}

// ---- the deck ----

interface Ctx {
  /** index of this slide in the deck */
  slide: number
  total: number
  /** the deck title (the central topic) */
  title: string
  /** the branch titles, each once */
  sections: string[]
  /** this content slide's section, 1-based */
  section: number
  notes: string
  /** the closing slide's message (the AI's), shown in place of its usual line */
  closing?: string | undefined
  /** the AI's takeaway; '' when the AI wrote the slide without one, so no takeaway box shows */
  takeaway?: string | undefined
}

/** What the shared layouts (section divider, single statement, long list) need of a style. */
interface Look {
  /** the page with no title: background and the style's quiet marks */
  page: (s: number) => Op[]
  /** the page with the slide title in the style's header */
  frame: (c: Ctx, title: string) => Op[]
  /** where the body starts under that header */
  top: number
  ink: string
  muted: string
  accent: string
  /** the face for the divider's title and the statement */
  display: string
  /** the most topics the style's own content layouts show; more go to the list */
  capacity: number
}

interface Style {
  look: Look
  /** whether the deck carries a contents slide after the cover (three or more sections) */
  agenda: boolean
  cover: (c: Ctx) => Op[]
  agendaSlide: (c: Ctx) => Op[]
  content: (c: Ctx, plan: SlidePlan) => Op[]
  closing: (c: Ctx) => Op[]
}

/** The slide's takeaway: the AI's when it wrote the slide (none when it gave none), else the notes' first line. */
const firstNote = (c: Ctx): string =>
  c.takeaway ??
  c.notes
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean) ??
  ''
const pageNo = (c: Ctx): string => String(c.slide + 1)

/** Columns across a band: each column's x and width. */
function columns(n: number, x0: number, width: number, gap: number): { x: number; w: number }[] {
  const w = (width - gap * (n - 1)) / n
  return Array.from({ length: n }, (_, k) => ({ x: x0 + k * (w + gap), w }))
}

// ---- layouts every style shares, drawn in its look ----

/** A branch with nothing under it: a section divider with its number. */
function dividerSlide(c: Ctx, plan: SlidePlan, look: Look): Op[] {
  const s = c.slide
  return [
    ...look.page(s),
    tb(
      s,
      1.2,
      1.7,
      PW - 2.4,
      1.5,
      [para(run(String(c.section).padStart(2, '0'), 72, look.accent, { bold: true, font: NUM }))],
      'b',
    ),
    box(s, 1.2, 3.45, 1.0, 0.07, look.accent),
    tb(s, 1.2, 3.75, PW - 2.4, 2.0, [
      para(
        run(plan.title, fit(plan.title, 54, 30, PW - 2.4, 2), look.ink, {
          bold: true,
          font: look.display,
          spacing: -1,
        }),
        { lineHeight: 112 },
      ),
    ]),
  ]
}

/** A branch holding one line: the line itself, large. */
function statementSlide(c: Ctx, plan: SlidePlan, line: string, look: Look): Op[] {
  const s = c.slide
  const h = 6.75 - look.top
  return [
    ...look.frame(c, plan.title),
    box(s, 1.2, look.top + h * 0.22, 0.9, 0.07, look.accent),
    tb(s, 1.2, look.top + h * 0.22 + 0.35, PW - 2.4, h * 0.6, [
      para(
        accented(line, fit(line, 40, 24, PW - 2.4, 3), look.ink, look.accent, {
          bold: true,
          font: look.display,
          spacing: -0.5,
        }),
        { lineHeight: 135 },
      ),
    ]),
  ]
}

/** More topics than the style's layouts hold: a numbered list, two columns when long. */
function listSlide(c: Ctx, plan: SlidePlan, groups: Group[], look: Look): Op[] {
  const s = c.slide
  const ops = look.frame(c, plan.title)
  const twoCols = groups.length > 5
  const perCol = twoCols ? Math.ceil(groups.length / 2) : groups.length
  const rowH = Math.min(1.0, (6.8 - look.top - 0.15) / perCol)
  const cols = columns(twoCols ? 2 : 1, 0.9, PW - 1.8, 0.6)
  groups.forEach((g, k) => {
    const col = cols[Math.floor(k / perCol)]!
    const y = look.top + 0.15 + (k % perCol) * rowH
    const sub = childLines(g, 2).join('  ·  ')
    ops.push(
      tb(
        s,
        col.x,
        y,
        0.7,
        rowH - 0.1,
        [para(run(String(k + 1).padStart(2, '0'), 18, look.accent, { bold: true, font: NUM }))],
        sub ? 't' : 'ctr',
      ),
    )
    ops.push(
      tb(
        s,
        col.x + 0.75,
        y,
        col.w - 0.75,
        rowH - 0.1,
        [
          para(
            accented(
              g.text,
              fit(g.text, twoCols ? 19 : 22, 14, col.w - 0.75),
              look.ink,
              look.accent,
              { bold: true },
            ),
          ),
          ...(sub && rowH > 0.6
            ? [para(run(sub, twoCols ? 14 : 16, look.muted), { spaceBefore: 2 })]
            : []),
        ],
        sub ? 't' : 'ctr',
      ),
    )
  })
  return ops
}

// ---- 1. One big line: black stage, one big line, one huge number ----

const JOBS = { bg: '#000000', ink: '#F5F5F7', gray: '#86868B', dim: '#424245' }

const jobs: Style = {
  look: {
    page: (s) => [background(s, JOBS.bg)],
    frame: (c, title) => [
      background(c.slide, JOBS.bg),
      tb(
        c.slide,
        1,
        0.55,
        PW - 2,
        1.2,
        [
          para(run(title, fit(title, 40, 26, PW - 2, 2), JOBS.ink, { bold: true, spacing: -1 }), {
            align: 'center',
            lineHeight: 110,
          }),
        ],
        'b',
      ),
    ],
    top: 2.0,
    ink: JOBS.ink,
    muted: JOBS.gray,
    accent: JOBS.ink,
    display: SANS,
    capacity: 6,
  },
  agenda: false,
  agendaSlide: () => [],
  cover: (c) => {
    const s = c.slide
    return [
      background(s, JOBS.bg),
      tb(
        s,
        1.2,
        1.6,
        PW - 2.4,
        2.75,
        [
          para(
            run(c.title, fit(c.title, 68, 36, PW - 2.4, 2), JOBS.ink, {
              bold: true,
              spacing: -1.5,
            }),
            { align: 'center', lineHeight: 105 },
          ),
        ],
        'b',
      ),
      tb(s, 1.2, 4.75, PW - 2.4, 0.6, [
        para(run(c.sections.slice(0, 4).join('   ·   '), 18, JOBS.gray), { align: 'center' }),
      ]),
    ]
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan)
    const ops: Op[] = [background(s, JOBS.bg)]
    const hero = heroOf(groups)
    if (hero) {
      const f = figureIn(hero.text)!
      ops.push(
        tb(s, 1, 0.75, PW - 2, 0.5, [para(run(plan.title, 18, JOBS.gray), { align: 'center' })]),
      )
      ops.push(
        tb(
          s,
          0.8,
          1.35,
          PW - 1.6,
          2.9,
          [
            para(
              run(f.value, fit(f.value, 170, 90, PW - 1.6), JOBS.ink, {
                bold: true,
                font: NUM,
                spacing: -4,
              }),
              { align: 'center' },
            ),
          ],
          'b',
        ),
      )
      ops.push(
        tb(s, 1.5, 4.35, PW - 3, 0.8, [
          para(run(f.label, fit(f.label, 30, 20, PW - 3), JOBS.ink, { bold: true }), {
            align: 'center',
          }),
        ]),
      )
      const rest = groups.filter((g) => g !== hero).slice(0, 3)
      columns(Math.max(1, rest.length), 1.5, PW - 3, 0.4).forEach((col, k) => {
        const g = rest[k]
        if (g)
          ops.push(
            tb(s, col.x, 5.65, col.w, 0.9, [
              para(run(g.text, 17, JOBS.gray), { align: 'center', lineHeight: 130 }),
            ]),
          )
      })
      return ops
    }
    if (!groups.length || (groups.length === 1 && !groups[0]!.children.length)) {
      const line = groups[0]?.text
      ops.push(
        tb(
          s,
          1.2,
          1.5,
          PW - 2.4,
          2.6,
          [
            para(
              run(plan.title, fit(plan.title, 64, 36, PW - 2.4, 2), JOBS.ink, {
                bold: true,
                spacing: -1.5,
              }),
              { align: 'center', lineHeight: 105 },
            ),
          ],
          'b',
        ),
      )
      if (line)
        ops.push(
          tb(s, 1.6, 4.4, PW - 3.2, 1.6, [
            para(run(line, fit(line, 26, 18, PW - 3.2, 3), JOBS.gray), {
              align: 'center',
              lineHeight: 140,
            }),
          ]),
        )
      return ops
    }
    ops.push(
      tb(
        s,
        1,
        0.9,
        PW - 2,
        2.0,
        [
          para(
            run(plan.title, fit(plan.title, 54, 32, PW - 2, 2), JOBS.ink, {
              bold: true,
              spacing: -1.2,
            }),
            { align: 'center', lineHeight: 105 },
          ),
        ],
        'b',
      ),
    )
    const shown = groups.slice(0, 6)
    const perRow = shown.length === 4 ? 2 : Math.min(3, shown.length)
    const rows = Math.ceil(shown.length / perRow)
    const cols = columns(perRow, perRow === 2 ? 2.2 : 1.1, perRow === 2 ? PW - 4.4 : PW - 2.2, 0.5)
    const rowH = rows === 1 ? 2.6 : 1.55
    shown.forEach((g, k) => {
      const col = cols[k % perRow]!
      const y = 3.55 + Math.floor(k / perRow) * rowH
      const lines = rows === 1 ? childLines(g) : childLines(g, 1)
      ops.push(
        tb(s, col.x, y, col.w, rowH - 0.2, [
          para(run(g.text, fit(g.text, 26, 18, col.w, 2), JOBS.ink, { bold: true }), {
            align: 'center',
            lineHeight: 115,
            spaceAfter: 8,
          }),
          ...lines.map((t) => para(run(t, 16, JOBS.gray), { align: 'center', lineHeight: 135 })),
        ]),
      )
      if (k % perRow > 0) ops.push(box(s, col.x - 0.255, y + 0.1, 0.01, rowH - 0.5, JOBS.dim))
    })
    return ops
  },
  closing: (c) => [
    background(c.slide, JOBS.bg),
    tb(
      c.slide,
      1,
      2.35,
      PW - 2,
      1.5,
      [para(run('감사합니다.', 72, JOBS.ink, { bold: true, spacing: -2 }), { align: 'center' })],
      'b',
    ),
    tb(c.slide, 1, 4.1, PW - 2, 0.6, [
      para(
        run(c.closing ?? c.title, c.closing ? fit(c.closing, 18, 12, PW - 2, 2) : 18, JOBS.gray),
        { align: 'center' },
      ),
    ]),
  ],
}

// ---- 2. Answer-first report: action titles, numbered argument rows, one key figure ----

const MCK = {
  navy: '#051C2C',
  navy2: '#0B2A40',
  blue: '#2251FF',
  cyan: '#00A9F4',
  text: '#2A3640',
  gray: '#5E6B76',
  rule: '#D3D8DD',
  tint: '#F0F3F7',
}

function mckFrame(c: Ctx, title: string): Op[] {
  const s = c.slide
  return [
    background(s, '#FFFFFF'),
    tb(
      s,
      0.6,
      0.38,
      PW - 1.2,
      1.1,
      [
        para(run(title, fit(title, 30, 20, PW - 1.2, 2), MCK.navy, { bold: true, font: SERIF }), {
          lineHeight: 110,
        }),
      ],
      'b',
    ),
    box(s, 0.6, 1.62, PW - 1.2, 0.014, MCK.navy),
    box(s, 0.6, 6.95, PW - 1.2, 0.01, MCK.rule),
    tb(s, 0.6, 7.04, 8, 0.3, [para(run(c.title, 10, MCK.gray))]),
    tb(s, PW - 1.6, 7.04, 1.0, 0.3, [para(run(pageNo(c), 10, MCK.gray), { align: 'right' })]),
  ]
}

const mckinsey: Style = {
  look: {
    page: (s) => [background(s, '#FFFFFF'), box(s, 0, 0, 0.12, PH, MCK.navy)],
    frame: mckFrame,
    top: 1.75,
    ink: MCK.navy,
    muted: MCK.gray,
    accent: MCK.blue,
    display: SERIF,
    capacity: 7,
  },
  agenda: true,
  cover: (c) => {
    const s = c.slide
    const ops: Op[] = [background(s, MCK.navy), box(s, 8.9, 0, PW - 8.9, PH, MCK.navy2)]
    for (let k = 0; k < 7; k++) ops.push(box(s, 8.9, 0.9 + k * 0.85, PW - 8.9, 0.01, '#16405F'))
    ops.push(box(s, 8.9, 0, 0.04, PH, MCK.cyan))
    ops.push(box(s, 0.9, 2.15, 0.9, 0.06, MCK.blue))
    ops.push(
      tb(s, 0.9, 2.4, 7.4, 2.1, [
        para(run(c.title, fit(c.title, 46, 28, 7.4, 2), '#FFFFFF', { bold: true, font: SERIF }), {
          lineHeight: 112,
        }),
      ]),
    )
    ops.push(
      tb(s, 0.9, 4.75, 7.4, 0.9, [
        para(run(c.sections.join('  |  '), 15, '#A9B8C6'), { lineHeight: 140 }),
      ]),
    )
    return ops
  },
  agendaSlide: (c) => {
    const s = c.slide
    const ops = mckFrame(c, '목차')
    const n = c.sections.length
    const rowH = Math.min(0.95, 4.9 / n)
    c.sections.forEach((t, k) => {
      const y = 1.95 + k * rowH
      ops.push(
        tb(
          s,
          0.6,
          y,
          0.9,
          rowH - 0.1,
          [para(run(String(k + 1).padStart(2, '0'), 26, MCK.blue, { bold: true, font: NUM }))],
          'ctr',
        ),
      )
      ops.push(
        tb(
          s,
          1.6,
          y,
          10,
          rowH - 0.1,
          [para(run(t, fit(t, 22, 16, 10), MCK.navy, { bold: true }))],
          'ctr',
        ),
      )
      ops.push(box(s, 0.6, y + rowH - 0.05, PW - 1.2, 0.01, MCK.rule))
    })
    return ops
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan)
    const ops = mckFrame(c, plan.title)
    const hero = heroOf(groups)
    const note = firstNote(c)
    const side = !!hero || !!note
    const tableW = side ? 8.45 : PW - 1.2
    if (!groups.length) return ops
    const nested = groups.some((g) => g.children.length)
    const itemW = nested ? Math.min(3.4, tableW * 0.4) : tableW - 0.75
    // rows as tall as the fullest one needs, never past the page
    const needed =
      Math.max(
        ...groups.map((g) =>
          Math.max(textH(g.text, 19, itemW - 0.1), g.children.slice(0, 4).length * 0.3),
        ),
      ) + 0.45
    const rowH = Math.min(4.85 / groups.length, clamp(needed, 0.85, 1.5))
    groups.forEach((g, k) => {
      const y = 1.9 + k * rowH
      ops.push(
        tb(s, 0.6, y + 0.14, 0.6, 0.5, [
          para(run(String(k + 1), 24, MCK.blue, { bold: true, font: NUM })),
        ]),
      )
      ops.push(
        tb(s, 1.3, y + 0.16, itemW - 0.1, rowH - 0.3, [
          para(
            accented(g.text, fit(g.text, 19, 14, itemW - 0.1, 2), MCK.navy, MCK.blue, {
              bold: true,
            }),
            { lineHeight: 120 },
          ),
        ]),
      )
      if (nested) {
        const lines = g.children.slice(0, 4)
        ops.push(
          tb(
            s,
            1.3 + itemW + 0.2,
            y + 0.18,
            tableW - itemW - 0.9,
            rowH - 0.3,
            lines.map((ch) =>
              para(accented(`${ch.depth > 1 ? '    ' : ''}–  ${ch.text}`, 15, MCK.text, MCK.blue), {
                lineHeight: 125,
                spaceAfter: 2,
              }),
            ),
          ),
        )
      }
      ops.push(box(s, 0.6, y + rowH - 0.02, tableW, 0.01, MCK.rule))
    })
    if (side) {
      const x = 9.35
      const w = PW - 0.6 - x
      ops.push(box(s, x, 1.9, w, 4.85, MCK.tint))
      ops.push(box(s, x, 1.9, w, 0.06, MCK.blue))
      ops.push(
        tb(s, x + 0.3, 2.2, w - 0.6, 0.4, [para(run('핵심 시사점', 13, MCK.blue, { bold: true }))]),
      )
      if (hero) {
        const f = figureIn(hero.text)!
        ops.push(
          tb(
            s,
            x + 0.3,
            2.65,
            w - 0.6,
            1.3,
            [
              para(
                run(f.value, fit(f.value, 60, 36, w - 0.6), MCK.navy, {
                  bold: true,
                  font: NUM,
                  spacing: -1,
                }),
              ),
            ],
            'b',
          ),
        )
        ops.push(
          tb(s, x + 0.3, 4.05, w - 0.6, 0.9, [
            para(run(f.label, 16, MCK.text, { bold: true }), { lineHeight: 125 }),
          ]),
        )
      }
      if (note)
        ops.push(
          tb(s, x + 0.3, hero ? 5.1 : 2.75, w - 0.6, hero ? 1.45 : 3.7, [
            para(run(note, 13, MCK.gray), { lineHeight: 140 }),
          ]),
        )
    }
    return ops
  },
  closing: (c) => {
    const s = c.slide
    return [
      background(s, MCK.navy),
      box(s, 0.9, 2.75, 0.9, 0.06, MCK.blue),
      tb(s, 0.9, 3.0, PW - 1.8, 1.1, [
        para(run('감사합니다', 46, '#FFFFFF', { bold: true, font: SERIF })),
      ]),
      tb(s, 0.9, 4.2, PW - 1.8, 0.5, [
        para(
          run(
            c.closing ?? c.title,
            c.closing ? fit(c.closing, 16, 12, PW - 1.8, 2) : 16,
            '#A9B8C6',
          ),
        ),
      ]),
    ]
  },
}

// ---- 3. Plain-word cards: plain words, roomy grey cards, one blue ----

const TOSS = {
  blue: '#3182F6',
  blue50: '#E8F3FF',
  grey100: '#F2F4F6',
  grey600: '#6B7684',
  ink: '#191F28',
}

function tossTitle(s: number, title: string): Op {
  return tb(
    s,
    0.9,
    0.6,
    PW - 1.8,
    1.2,
    [
      para(run(title, fit(title, 40, 26, PW - 1.8, 2), TOSS.ink, { bold: true, spacing: -1 }), {
        lineHeight: 115,
      }),
    ],
    'b',
  )
}

const toss: Style = {
  look: {
    page: (s) => [background(s, '#FFFFFF')],
    frame: (c, title) => [background(c.slide, '#FFFFFF'), tossTitle(c.slide, title)],
    top: 2.0,
    ink: TOSS.ink,
    muted: TOSS.grey600,
    accent: TOSS.blue,
    display: SANS,
    capacity: 6,
  },
  agenda: true,
  cover: (c) => {
    const s = c.slide
    return [
      background(s, '#FFFFFF'),
      tb(
        s,
        0.9,
        1.6,
        7.3,
        2.6,
        [
          para(
            run(c.title, fit(c.title, 58, 34, 7.3, 2), TOSS.ink, { bold: true, spacing: -1.5 }),
            { lineHeight: 112 },
          ),
        ],
        'b',
      ),
      tb(s, 0.9, 4.45, 7.3, 0.6, [
        para(run(`${c.sections.length}가지 이야기를 준비했어요`, 22, TOSS.grey600)),
      ]),
      box(s, 8.85, 1.55, 3.6, 3.6, TOSS.blue50, 0.85),
      box(s, 9.65, 2.35, 2.0, 2.0, TOSS.blue, 0.5),
      dot(s, 10.2, 2.9, 0.9, '#FFFFFF', {
        paras: [para(run('✓', 30, TOSS.blue, { bold: true }), { align: 'center' })],
      }),
    ]
  },
  agendaSlide: (c) => {
    const s = c.slide
    const ops: Op[] = [background(s, '#FFFFFF'), tossTitle(s, '이런 순서로 이야기해요')]
    const n = c.sections.length
    const rowH = Math.min(0.95, 4.7 / n)
    c.sections.forEach((t, k) => {
      const y = 2.05 + k * rowH
      ops.push(box(s, 0.9, y, PW - 1.8, rowH - 0.15, TOSS.grey100, (rowH - 0.15) / 2))
      ops.push(
        dot(s, 1.15, y + (rowH - 0.15 - 0.5) / 2, 0.5, TOSS.blue, {
          paras: [para(run(String(k + 1), 16, '#FFFFFF', { bold: true }), { align: 'center' })],
        }),
      )
      ops.push(
        tb(
          s,
          1.95,
          y,
          PW - 3.2,
          rowH - 0.15,
          [para(run(t, fit(t, 22, 16, PW - 3.2), TOSS.ink, { bold: true }))],
          'ctr',
        ),
      )
    })
    return ops
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan)
    const ops: Op[] = [background(s, '#FFFFFF'), tossTitle(s, plan.title)]
    if (!groups.length) return ops
    if (groups.length <= 3) {
      const cols = columns(groups.length, 0.9, PW - 1.8, 0.3)
      const inner = cols[0]!.w - 0.9
      const parts = groups.map((g) => {
        const f = figureOf(g)
        const head = f ? f.label : g.text
        const size = fit(head, 26, 18, inner, 2)
        const lines = childLines(g).filter((t) => !f || !figureIn(t))
        return { g, f, head, size, lines, headH: textH(head, size, inner, 1.2) }
      })
      const cardH = clamp(
        Math.max(...parts.map((p) => 1.5 + p.headH + 0.25 + childrenH(p.lines, 17, inner) + 0.5)),
        2.8,
        4.5,
      )
      const y = 2.2 + (4.5 - cardH) * 0.3
      parts.forEach((p, k) => {
        const col = cols[k]!
        ops.push(box(s, col.x, y, col.w, cardH, TOSS.grey100, 0.3))
        if (p.f)
          ops.push(
            tb(
              s,
              col.x + 0.45,
              y + 0.35,
              col.w - 0.9,
              0.95,
              [
                para(
                  run(p.f.value, fit(p.f.value, 48, 28, col.w - 0.9), TOSS.blue, {
                    bold: true,
                    spacing: -1,
                  }),
                ),
              ],
              'b',
            ),
          )
        else
          ops.push(
            dot(s, col.x + 0.45, y + 0.5, 0.7, TOSS.blue50, {
              paras: [para(run(String(k + 1), 20, TOSS.blue, { bold: true }), { align: 'center' })],
            }),
          )
        ops.push(
          tb(s, col.x + 0.45, y + 1.5, inner, p.headH + 0.1, [
            para(run(p.head, p.size, TOSS.ink, { bold: true, spacing: -0.5 }), { lineHeight: 120 }),
          ]),
        )
        ops.push(
          tb(
            s,
            col.x + 0.45,
            y + 1.5 + p.headH + 0.25,
            inner,
            cardH - p.headH - 2.1,
            p.lines.map((t) => para(run(t, 17, TOSS.grey600), { lineHeight: 140, spaceAfter: 4 })),
          ),
        )
      })
      return ops
    }
    const shown = groups.slice(0, 6)
    const perRow = 2
    const rows = Math.ceil(shown.length / perRow)
    const cols = columns(perRow, 0.9, PW - 1.8, 0.3)
    const inner = cols[0]!.w - 1.5
    const kids = rows > 2 ? 1 : 2
    const cardH = clamp(
      Math.max(...shown.map((g) => 0.95 + childrenH(childLines(g, kids), 16, inner) + 0.3)),
      1.15,
      (4.6 - (rows - 1) * 0.25) / rows,
    )
    const y0 = 2.2 + (4.6 - rows * cardH - (rows - 1) * 0.25) * 0.3
    shown.forEach((g, k) => {
      const col = cols[k % perRow]!
      const y = y0 + Math.floor(k / perRow) * (cardH + 0.25)
      ops.push(box(s, col.x, y, col.w, cardH, TOSS.grey100, 0.26))
      ops.push(
        dot(s, col.x + 0.35, y + 0.32, 0.58, TOSS.blue50, {
          paras: [para(run(String(k + 1), 17, TOSS.blue, { bold: true }), { align: 'center' })],
        }),
      )
      ops.push(
        tb(
          s,
          col.x + 1.15,
          y + 0.3,
          inner,
          0.62,
          [para(accented(g.text, fit(g.text, 23, 16, inner), TOSS.ink, TOSS.blue, { bold: true }))],
          'ctr',
        ),
      )
      ops.push(
        tb(
          s,
          col.x + 1.15,
          y + 0.95,
          inner,
          cardH - 1.05,
          childLines(g, kids).map((t) =>
            para(accented(t, 16, TOSS.grey600, TOSS.blue), { lineHeight: 135 }),
          ),
        ),
      )
    })
    return ops
  },
  closing: (c) => {
    const s = c.slide
    return [
      background(s, '#FFFFFF'),
      dot(s, PW / 2 - 0.45, 1.9, 0.9, TOSS.blue, {
        paras: [para(run('✓', 30, '#FFFFFF', { bold: true }), { align: 'center' })],
      }),
      tb(
        s,
        1,
        3.05,
        PW - 2,
        1.1,
        [para(run('감사합니다', 56, TOSS.ink, { bold: true, spacing: -1.5 }), { align: 'center' })],
        'ctr',
      ),
      tb(s, 1, 4.3, PW - 2, 0.6, [
        para(
          run(
            c.closing ?? '궁금한 점은 언제든 편하게 물어봐 주세요',
            c.closing ? fit(c.closing, 22, 12, PW - 2, 2) : 22,
            TOSS.grey600,
          ),
          { align: 'center' },
        ),
      ]),
    ]
  },
}

// ---- 4. Consulting frameworks: frameworks — value chain, 2×2 matrix, comparison ----

const BCG = {
  dark: '#197A56',
  mid: '#21945F',
  green: '#29BA74',
  light: '#D4EFDF',
  pale: '#EEF7F1',
  ink: '#1F2A24',
  gray: '#6E6F73',
  rule: '#C9CDD1',
}
const BCG_CHAIN = [BCG.dark, '#1C8659', BCG.mid, '#25A768', BCG.green]

function bcgFrame(c: Ctx, title: string): Op[] {
  const s = c.slide
  return [
    background(s, '#FFFFFF'),
    box(s, 0, 0, PW, 0.09, BCG.dark),
    tb(
      s,
      0.7,
      0.4,
      PW - 1.4,
      1.05,
      [
        para(run(title, fit(title, 30, 20, PW - 1.4, 2), BCG.ink, { bold: true, spacing: -0.5 }), {
          lineHeight: 112,
        }),
      ],
      'b',
    ),
    box(s, 0.7, 1.58, 0.65, 0.06, BCG.green),
    box(s, 0.7, 6.98, PW - 1.4, 0.01, BCG.rule),
    tb(s, 0.7, 7.06, 8, 0.3, [para(run(c.title, 10, BCG.gray))]),
    tb(s, PW - 1.7, 7.06, 1.0, 0.3, [para(run(pageNo(c), 10, BCG.gray), { align: 'right' })]),
  ]
}

function bcgMotif(s: number, x: number, y: number, cell: number): Op[] {
  const alphas = ['#FFFFFF33', '#FFFFFF66', '#FFFFFF99', BCG.green]
  return alphas.map((fill, k) =>
    box(s, x + (k % 2) * (cell + 0.12), y + Math.floor(k / 2) * (cell + 0.12), cell, cell, fill),
  )
}

const bcg: Style = {
  look: {
    page: (s) => [background(s, '#FFFFFF'), box(s, 0, 0, PW, 0.09, BCG.dark)],
    frame: bcgFrame,
    top: 1.8,
    ink: BCG.ink,
    muted: BCG.gray,
    accent: BCG.dark,
    display: SANS,
    capacity: 5,
  },
  agenda: true,
  cover: (c) => {
    const s = c.slide
    return [
      background(s, '#FFFFFF'),
      box(s, 0, 0, 4.7, PH, BCG.dark),
      ...bcgMotif(s, 1.2, 2.45, 1.1),
      tb(
        s,
        5.4,
        1.8,
        PW - 6.1,
        2.6,
        [
          para(
            run(c.title, fit(c.title, 44, 28, PW - 6.1, 2), BCG.ink, { bold: true, spacing: -0.8 }),
            { lineHeight: 112 },
          ),
        ],
        'b',
      ),
      box(s, 5.4, 4.6, 0.8, 0.07, BCG.green),
      tb(s, 5.4, 4.85, PW - 6.1, 0.9, [
        para(run(c.sections.join('  ·  '), 16, BCG.gray), { lineHeight: 140 }),
      ]),
    ]
  },
  agendaSlide: (c) => {
    const s = c.slide
    const ops = bcgFrame(c, '목차')
    const n = c.sections.length
    const rowH = Math.min(0.95, 4.9 / n)
    c.sections.forEach((t, k) => {
      const y = 1.95 + k * rowH
      ops.push(
        sh(s, 'rect', 0.7, y + (rowH - 0.6) / 2, 0.6, 0.6, BCG.dark, {
          paras: [
            para(run(String(k + 1), 18, '#FFFFFF', { bold: true, font: NUM }), { align: 'center' }),
          ],
        }),
      )
      ops.push(
        tb(s, 1.6, y, 10, rowH, [para(run(t, fit(t, 22, 16, 10), BCG.ink, { bold: true }))], 'ctr'),
      )
      ops.push(box(s, 1.6, y + rowH - 0.02, PW - 2.3, 0.01, BCG.rule))
    })
    return ops
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan)
    const ops = bcgFrame(c, plan.title)
    const n = groups.length
    const note = firstNote(c)
    if (!n) return ops
    const nested = groups.some((g) => g.children.length)
    if (!nested && n !== 4 && n <= 5) {
      // topics without details: one tile each, the chain's greens left to right
      const tileH = note ? 2.75 : 3.4
      columns(n, 0.7, PW - 1.4, 0.12).forEach((col, k) => {
        const g = groups[k]!
        ops.push(
          sh(s, 'rect', col.x, 2.05, col.w, tileH, BCG_CHAIN[Math.min(k, 4)]!, {
            inset: 0.35,
            paras: [
              para(
                run(String(k + 1).padStart(2, '0'), 16, '#FFFFFFB3', { bold: true, font: NUM }),
                { spaceAfter: 10 },
              ),
              para(
                accented(g.text, fit(g.text, 26, 16, col.w - 0.7, 3), '#FFFFFF', BCG.light, {
                  bold: true,
                }),
                { lineHeight: 120 },
              ),
            ],
          }),
        )
      })
    } else if (n === 4) {
      // a 2×2 matrix, quadrant names large, details in the legend beside it
      const x0 = nested ? 1.05 : 1.6
      const y0 = 1.95
      const cw = nested ? 3.75 : 5.0
      const ch = 2.2
      const fills = [BCG.dark, BCG.green, BCG.light, BCG.pale]
      groups.forEach((g, k) => {
        const x = x0 + (k % 2) * (cw + 0.1)
        const y = y0 + Math.floor(k / 2) * (ch + 0.1)
        const onDark = k < 2
        ops.push(
          sh(s, 'rect', x, y, cw, ch, fills[k]!, {
            inset: 0.25,
            anchor: 'ctr',
            paras: [
              para(
                run(String(k + 1), 14, onDark ? '#FFFFFFB3' : BCG.dark, { bold: true, font: NUM }),
                { align: 'center', spaceAfter: 4 },
              ),
              para(
                run(g.text, fit(g.text, 22, 15, cw - 0.5, 2), onDark ? '#FFFFFF' : BCG.ink, {
                  bold: true,
                }),
                { align: 'center', lineHeight: 115 },
              ),
            ],
          }),
        )
      })
      // the two axes; a line op cannot point up, so the vertical one is an arrow shape
      ops.push({
        ...sh(s, 'upArrow', x0 - 0.33, y0 - 0.05, 0.16, 2 * ch + 0.3, BCG.gray),
        adjustments: { adj1: 18_000, adj2: 70_000 },
      })
      ops.push({
        op: 'addElement',
        target: { slide: s },
        kind: 'lineArrow',
        offset: rect(x0 - 0.25, y0 + 2 * ch + 0.25, 2 * cw + 0.35, 0),
        stroke: { color: BCG.gray, widthEmu: 15_875 },
      })
      if (nested || note) {
        const lx = 9.15
        const lw = PW - 0.7 - lx
        ops.push(box(s, lx, y0, lw, 2 * ch + 0.1, BCG.pale))
        ops.push(box(s, lx, y0, 0.07, 2 * ch + 0.1, BCG.dark))
        ops.push(
          tb(s, lx + 0.3, y0 + 0.25, lw - 0.5, 4.2, [
            para(run(note ? '시사점' : '구성', 15, BCG.dark, { bold: true }), { spaceAfter: 10 }),
            ...(note
              ? [para(run(note, 15, BCG.ink), { lineHeight: 145 })]
              : groups.flatMap((g, k) => [
                  para(run(`${k + 1}  ${g.text}`, 15, BCG.ink, { bold: true }), {
                    spaceBefore: k ? 10 : 0,
                  }),
                  ...childLines(g, 2).map((t) =>
                    para(run(`    ${t}`, 13, BCG.gray), { lineHeight: 135 }),
                  ),
                ])),
          ]),
        )
      }
      return ops
    } else if (n === 2) {
      const cols = columns(2, 0.7, PW - 1.4, 0.7)
      cols.forEach((col, k) => {
        const g = groups[k]!
        ops.push(
          sh(s, 'rect', col.x, 1.95, col.w, 0.95, k ? BCG.green : BCG.dark, {
            inset: 0.3,
            anchor: 'ctr',
            paras: [para(run(g.text, fit(g.text, 22, 15, col.w - 0.6), '#FFFFFF', { bold: true }))],
          }),
        )
        ops.push(box(s, col.x, 2.9, col.w, note ? 2.65 : 3.75, BCG.pale))
        ops.push(
          tb(
            s,
            col.x + 0.3,
            3.15,
            col.w - 0.6,
            note ? 2.2 : 3.3,
            childLines(g, 4).map((t) =>
              para(accented(`■  ${t}`, 16, BCG.ink, BCG.dark), { lineHeight: 135, spaceAfter: 6 }),
            ),
          ),
        )
      })
      ops.push(
        dot(s, PW / 2 - 0.35, 2.07, 0.7, '#FFFFFF', {
          stroke: { color: BCG.dark, pt: 1.5 },
          paras: [para(run('vs', 14, BCG.dark, { bold: true, font: NUM }), { align: 'center' })],
        }),
      )
    } else if (n === 1) {
      const g = groups[0]!
      ops.push(
        tb(s, 0.7, 2.1, PW - 1.4, 1.6, [
          para(
            accented(g.text, fit(g.text, 34, 20, PW - 1.4, 2), BCG.dark, BCG.green, { bold: true }),
            { lineHeight: 120 },
          ),
        ]),
      )
      ops.push(
        tb(
          s,
          0.7,
          3.9,
          PW - 1.4,
          2.5,
          childLines(g, 5).map((t) =>
            para(run(`■  ${t}`, 17, BCG.ink), { lineHeight: 135, spaceAfter: 6 }),
          ),
        ),
      )
    } else {
      // a value chain: one chevron per topic, its details in the panel below
      const shown = groups.slice(0, 5)
      const cols = columns(shown.length, 0.7, PW - 1.4, 0.06)
      const panelH = clamp(
        Math.max(...shown.map((g) => childrenH(childLines(g, 4), 15, cols[0]!.w - 0.5))) + 0.55,
        1.5,
        note ? 2.45 : 3.6,
      )
      shown.forEach((g, k) => {
        const col = cols[k]!
        ops.push(
          sh(
            s,
            k ? 'chevron' : 'homePlate',
            col.x,
            1.95,
            col.w + 0.2,
            1.0,
            BCG_CHAIN[Math.min(k, 4)]!,
            {
              inset: 0.08,
              anchor: 'ctr',
              paras: [
                para(run(g.text, fit(g.text, 18, 12, col.w - 0.5, 2), '#FFFFFF', { bold: true }), {
                  align: 'center',
                  lineHeight: 110,
                }),
              ],
            },
          ),
        )
        ops.push(box(s, col.x, 3.15, col.w - 0.06, panelH, BCG.pale))
        ops.push(
          tb(
            s,
            col.x + 0.22,
            3.38,
            col.w - 0.5,
            panelH - 0.35,
            childLines(g, 4).map((t) =>
              para(accented(t, 15, BCG.ink, BCG.dark), { lineHeight: 135, spaceAfter: 6 }),
            ),
          ),
        )
      })
    }
    if (note) {
      ops.push(box(s, 0.7, 5.8, PW - 1.4, 0.9, BCG.dark))
      ops.push(
        tb(
          s,
          1.0,
          5.8,
          PW - 2.0,
          0.9,
          [
            para([
              run('So what  ', 14, BCG.light, { bold: true, font: NUM }),
              run(note, 15, '#FFFFFF'),
            ]),
          ],
          'ctr',
        ),
      )
    }
    return ops
  },
  closing: (c) => {
    const s = c.slide
    return [
      background(s, '#FFFFFF'),
      box(s, 0, 0, 4.7, PH, BCG.dark),
      ...bcgMotif(s, 1.2, 2.45, 1.1),
      tb(
        s,
        5.4,
        2.6,
        PW - 6.1,
        1.2,
        [para(run('감사합니다', 48, BCG.ink, { bold: true, spacing: -1 }))],
        'b',
      ),
      box(s, 5.4, 4.0, 0.8, 0.07, BCG.green),
      tb(s, 5.4, 4.25, PW - 6.1, 0.6, [
        para(
          run(c.closing ?? c.title, c.closing ? fit(c.closing, 16, 12, PW - 6.1, 2) : 16, BCG.gray),
        ),
      ]),
    ]
  },
}

// ---- 5. Story-led talk: dark stage, red accent, a story told in a few lines ----

const TED = {
  red: '#E62B1E',
  ink: '#FFFFFF',
  gray: '#A6A6A6',
  rule: '#2E2E2E',
  from: '#050505',
  to: '#1C1C1C',
}

const ted: Style = {
  look: {
    page: (s) => [background(s, TED.from, TED.to, 90)],
    frame: (c, title) => [
      background(c.slide, TED.from, TED.to, 90),
      tb(
        c.slide,
        0.9,
        0.7,
        PW - 1.8,
        1.65,
        [
          para(run(title, fit(title, 44, 26, PW - 1.8, 2), TED.ink, { bold: true, spacing: -1 }), {
            lineHeight: 110,
          }),
        ],
        'b',
      ),
      box(c.slide, 0.9, 2.55, 1.0, 0.07, TED.red),
    ],
    top: 2.8,
    ink: TED.ink,
    muted: TED.gray,
    accent: TED.red,
    display: SANS,
    capacity: 4,
  },
  agenda: false,
  agendaSlide: () => [],
  cover: (c) => {
    const s = c.slide
    return [
      background(s, TED.from, TED.to, 90),
      box(s, 0.95, 2.05, 0.14, 2.3, TED.red),
      tb(
        s,
        1.4,
        1.75,
        PW - 2.6,
        2.9,
        [
          para(
            run(c.title, fit(c.title, 60, 34, PW - 2.6, 2), TED.ink, { bold: true, spacing: -1.5 }),
            { lineHeight: 110 },
          ),
        ],
        'ctr',
      ),
      tb(s, 1.4, 4.85, PW - 2.6, 0.6, [para(run('하나의 이야기에서 시작합니다', 20, TED.gray))]),
    ]
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan)
    const ops: Op[] = [background(s, TED.from, TED.to, 90)]
    const hero = heroOf(groups)
    if (hero) {
      const f = figureIn(hero.text)!
      ops.push(
        tb(
          s,
          0.9,
          0.9,
          6.4,
          2.0,
          [
            para(
              run(plan.title, fit(plan.title, 44, 26, 6.4, 2), TED.ink, {
                bold: true,
                spacing: -1,
              }),
              { lineHeight: 110 },
            ),
          ],
          'b',
        ),
      )
      ops.push(box(s, 0.9, 3.1, 1.0, 0.07, TED.red))
      ops.push(
        tb(
          s,
          0.9,
          3.45,
          6.2,
          3.2,
          groups
            .filter((g) => g !== hero)
            .slice(0, 4)
            .map((g) => para(run(g.text, 20, TED.gray), { lineHeight: 140, spaceAfter: 8 })),
        ),
      )
      ops.push(
        tb(
          s,
          7.3,
          1.4,
          PW - 8.0,
          3.0,
          [
            para(
              run(f.value, fit(f.value, 150, 80, PW - 8.0), TED.red, {
                bold: true,
                font: NUM,
                spacing: -4,
              }),
              { align: 'center' },
            ),
          ],
          'b',
        ),
      )
      ops.push(
        tb(s, 7.3, 4.55, PW - 8.0, 1.2, [
          para(run(f.label, fit(f.label, 24, 16, PW - 8.0, 2), TED.ink, { bold: true }), {
            align: 'center',
            lineHeight: 125,
          }),
        ]),
      )
      return ops
    }
    ops.push(
      tb(
        s,
        0.9,
        0.7,
        PW - 1.8,
        1.65,
        [
          para(
            run(plan.title, fit(plan.title, 46, 28, PW - 1.8, 2), TED.ink, {
              bold: true,
              spacing: -1,
            }),
            { lineHeight: 110 },
          ),
        ],
        'b',
      ),
    )
    ops.push(box(s, 0.9, 2.55, 1.0, 0.07, TED.red))
    const shown = groups.slice(0, 4)
    const rowH = shown.length ? Math.min(1.1, 3.9 / shown.length) : 0
    shown.forEach((g, k) => {
      const y = 2.95 + k * rowH
      const sub = childLines(g, 2).join('  ·  ')
      ops.push(
        tb(
          s,
          0.9,
          y,
          0.9,
          rowH - 0.1,
          [para(run(String(k + 1).padStart(2, '0'), 22, TED.red, { bold: true, font: NUM }))],
          'ctr',
        ),
      )
      ops.push(
        tb(
          s,
          1.9,
          y,
          PW - 2.8,
          rowH - 0.1,
          [
            para(run(g.text, fit(g.text, 26, 18, PW - 2.8), TED.ink, { bold: true })),
            ...(sub ? [para(run(sub, 15, TED.gray), { spaceBefore: 3 })] : []),
          ],
          'ctr',
        ),
      )
      if (k < shown.length - 1) ops.push(box(s, 0.9, y + rowH - 0.03, PW - 1.8, 0.01, TED.rule))
    })
    return ops
  },
  closing: (c) => {
    const s = c.slide
    return [
      background(s, TED.from, TED.to, 90),
      tb(
        s,
        1,
        2.3,
        PW - 2,
        1.5,
        [para(run('감사합니다', 64, TED.ink, { bold: true, spacing: -1.5 }), { align: 'center' })],
        'b',
      ),
      box(s, PW / 2 - 0.5, 4.05, 1.0, 0.07, TED.red),
      tb(s, 1, 4.35, PW - 2, 0.6, [
        para(
          run(c.closing ?? c.title, c.closing ? fit(c.closing, 18, 12, PW - 2, 2) : 18, TED.gray),
          { align: 'center' },
        ),
      ]),
    ]
  },
}

// ---- 6. Colour-accent explainer: four colours, tonal cards, clear steps ----

const MAT = {
  colors: ['#1A73E8', '#EA4335', '#F9AB00', '#1E8E3E'],
  tints: ['#E8F0FE', '#FCE8E6', '#FEF7E0', '#E6F4EA'],
  ink: '#202124',
  sub: '#5F6368',
  outline: '#DADCE0',
}

function matTitle(s: number, title: string): Op[] {
  return [
    tb(
      s,
      0.8,
      0.55,
      PW - 1.6,
      1.15,
      [
        para(run(title, fit(title, 36, 24, PW - 1.6, 2), MAT.ink, { bold: true, spacing: -0.5 }), {
          lineHeight: 112,
        }),
      ],
      'b',
    ),
    ...MAT.colors.map((c, k) => box(s, 0.8 + k * 0.32, 1.86, 0.3, 0.06, c)),
  ]
}

const material: Style = {
  look: {
    page: (s) => [
      background(s, '#FFFFFF'),
      ...MAT.colors.map((col, k) => dot(s, 1.2 + k * 0.34, 1.2, 0.22, col)),
    ],
    frame: (c, title) => [background(c.slide, '#FFFFFF'), ...matTitle(c.slide, title)],
    top: 2.1,
    ink: MAT.ink,
    muted: MAT.sub,
    accent: MAT.colors[0]!,
    display: SANS,
    capacity: 8,
  },
  agenda: true,
  cover: (c) => {
    const s = c.slide
    return [
      background(s, '#FFFFFF'),
      dot(s, 8.55, 1.25, 3.3, '#1A73E8E6'),
      dot(s, 10.95, 3.75, 1.9, '#EA4335E6'),
      box(s, 8.15, 4.35, 1.55, 1.55, '#F9AB00E6', 0.3),
      dot(s, 11.85, 0.85, 0.95, '#1E8E3EE6'),
      ...MAT.colors.map((col, k) => dot(s, 0.8 + k * 0.34, 1.75, 0.22, col)),
      tb(
        s,
        0.8,
        2.15,
        7.1,
        2.3,
        [
          para(run(c.title, fit(c.title, 52, 30, 7.1, 2), MAT.ink, { bold: true, spacing: -1 }), {
            lineHeight: 112,
          }),
        ],
        'b',
      ),
      tb(s, 0.8, 4.65, 7.1, 0.9, [
        para(run(c.sections.join('  ·  '), 18, MAT.sub), { lineHeight: 140 }),
      ]),
    ]
  },
  agendaSlide: (c) => {
    const s = c.slide
    const ops: Op[] = [background(s, '#FFFFFF'), ...matTitle(s, '목차')]
    const shown = c.sections.slice(0, 6)
    const cols = columns(shown.length, 0.8, PW - 1.6, 0.2)
    ops.push(
      box(
        s,
        cols[0]!.x + cols[0]!.w / 2,
        3.44,
        cols[cols.length - 1]!.x - cols[0]!.x,
        0.03,
        MAT.outline,
      ),
    )
    shown.forEach((t, k) => {
      const col = cols[k]!
      ops.push(
        dot(s, col.x + col.w / 2 - 0.45, 3.0, 0.9, MAT.colors[k % 4]!, {
          paras: [
            para(run(String(k + 1), 22, '#FFFFFF', { bold: true, font: NUM }), { align: 'center' }),
          ],
        }),
      )
      ops.push(
        tb(s, col.x, 4.15, col.w, 1.2, [
          para(run(t, fit(t, 22, 15, col.w, 2), MAT.ink, { bold: true }), {
            align: 'center',
            lineHeight: 120,
          }),
        ]),
      )
    })
    return ops
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan)
    const ops: Op[] = [background(s, '#FFFFFF'), ...matTitle(s, plan.title)]
    if (!groups.length) return ops
    const shown = groups.slice(0, 8)
    const perRow = shown.length <= 4 ? shown.length : Math.ceil(shown.length / 2)
    const rows = Math.ceil(shown.length / perRow)
    const cols = columns(perRow, 0.8, PW - 1.6, 0.25)
    const inner = cols[0]!.w - 0.7
    const cardH =
      rows === 1
        ? clamp(
            Math.max(
              ...shown.map(
                (g) =>
                  1.4 +
                  textH(g.text, 22, inner, 1.18) +
                  0.2 +
                  childrenH(childLines(g), 15, inner) +
                  0.45,
              ),
            ),
            2.7,
            4.35,
          )
        : 2.1
    const y0 = rows === 1 ? 2.3 + (4.35 - cardH) * 0.3 : 2.25
    shown.forEach((g, k) => {
      const col = cols[k % perRow]!
      const y = y0 + Math.floor(k / perRow) * (cardH + 0.2)
      const ci = k % 4
      const f = figureOf(g)
      ops.push(box(s, col.x, y, col.w, cardH, MAT.tints[ci]!, 0.22))
      if (rows === 1) {
        if (f)
          ops.push(
            tb(
              s,
              col.x + 0.35,
              y + 0.3,
              col.w - 0.7,
              0.9,
              [
                para(
                  run(f.value, fit(f.value, 44, 26, col.w - 0.7), MAT.colors[ci]!, {
                    bold: true,
                    font: NUM,
                  }),
                ),
              ],
              'b',
            ),
          )
        else
          ops.push(
            dot(s, col.x + 0.35, y + 0.4, 0.72, MAT.colors[ci]!, {
              paras: [
                para(run(String(k + 1), 20, '#FFFFFF', { bold: true, font: NUM }), {
                  align: 'center',
                }),
              ],
            }),
          )
        const head = f ? f.label : g.text
        const headH = textH(head, 22, inner, 1.18)
        ops.push(
          tb(s, col.x + 0.35, y + 1.4, inner, headH + 0.1, [
            para(run(head, fit(head, 22, 15, inner, 2), MAT.ink, { bold: true }), {
              lineHeight: 118,
            }),
          ]),
        )
        ops.push(
          tb(
            s,
            col.x + 0.35,
            y + 1.6 + headH,
            inner,
            cardH - headH - 1.8,
            childLines(g)
              .filter((t) => !f || !figureIn(t))
              .map((t) => para(run(t, 15, MAT.sub), { lineHeight: 140, spaceAfter: 4 })),
          ),
        )
      } else {
        ops.push(
          dot(s, col.x + 0.3, y + 0.3, 0.55, MAT.colors[ci]!, {
            paras: [
              para(run(String(k + 1), 16, '#FFFFFF', { bold: true, font: NUM }), {
                align: 'center',
              }),
            ],
          }),
        )
        ops.push(
          tb(s, col.x + 0.3, y + 0.98, col.w - 0.6, 0.6, [
            para(run(g.text, fit(g.text, 18, 13, col.w - 0.6, 2), MAT.ink, { bold: true }), {
              lineHeight: 115,
            }),
          ]),
        )
        ops.push(
          tb(
            s,
            col.x + 0.3,
            y + 1.55,
            col.w - 0.6,
            0.45,
            childLines(g, 1).map((t) => para(run(t, 13, MAT.sub))),
          ),
        )
      }
    })
    return ops
  },
  closing: (c) => {
    const s = c.slide
    return [
      background(s, '#FFFFFF'),
      ...MAT.colors.map((col, k) => dot(s, PW / 2 - 0.69 + k * 0.38, 2.25, 0.24, col)),
      tb(
        s,
        1,
        2.75,
        PW - 2,
        1.2,
        [para(run('감사합니다', 56, MAT.ink, { bold: true, spacing: -1 }), { align: 'center' })],
        'ctr',
      ),
      tb(s, 1, 4.1, PW - 2, 0.6, [
        para(
          run(c.closing ?? c.title, c.closing ? fit(c.closing, 18, 12, PW - 2, 2) : 18, MAT.sub),
          { align: 'center' },
        ),
      ]),
    ]
  },
}

// ---- 7. Minimal blocks: a quiet page — icon, title, toggles, callout ----

const NOTION = {
  ink: '#37352F',
  gray: '#787774',
  light: '#9B9A97',
  divider: '#E9E9E7',
  callout: '#F1F1EF',
  cover: '#E8E2D6',
  tags: [
    { bg: '#E7F3F8', fg: '#337EA9' },
    { bg: '#EDF3EC', fg: '#448361' },
    { bg: '#FBF3DB', fg: '#C29243' },
    { bg: '#FDEBEC', fg: '#D44C47' },
    { bg: '#F4F0F7', fg: '#9065B0' },
  ],
  icons: ['📌', '🎯', '✅', '📊', '🗂️', '🚀', '📝', '💬'],
}

function notionHeader(s: number, icon: string, title: string): Op[] {
  return [
    background(s, '#FFFFFF'),
    tb(s, 1.0, 0.55, 0.9, 0.9, [para(run(icon, 32, NOTION.ink))], 'ctr'),
    tb(
      s,
      1.85,
      0.55,
      PW - 2.85,
      0.9,
      [para(run(title, fit(title, 34, 22, PW - 2.85), NOTION.ink, { bold: true, spacing: -0.5 }))],
      'ctr',
    ),
    box(s, 1.0, 1.65, PW - 2.0, 0.012, NOTION.divider),
  ]
}

/** One column of toggle blocks: the topic bold behind ▾, its sub-topics as quiet bullets. */
function notionBlocks(groups: Group[], small: boolean): Para[] {
  return groups.flatMap((g, k) => {
    const kids = g.children.slice(0, small ? 2 : 4)
    return [
      para(
        [
          run(kids.length ? '▾  ' : '☐  ', small ? 16 : 19, NOTION.gray),
          run(g.text, small ? 18 : 22, NOTION.ink, { bold: true }),
        ],
        { spaceBefore: k ? (small ? 12 : 18) : 0, lineHeight: 125 },
      ),
      ...kids.map((ch) =>
        para(run(`${'    '.repeat(ch.depth)}•  ${ch.text}`, small ? 15 : 17, NOTION.gray), {
          lineHeight: 140,
          spaceBefore: 3,
        }),
      ),
    ]
  })
}

const notion: Style = {
  look: {
    page: (s) => [background(s, '#FFFFFF')],
    frame: (c, title) =>
      notionHeader(c.slide, NOTION.icons[(c.section - 1) % NOTION.icons.length]!, title),
    top: 1.85,
    ink: NOTION.ink,
    muted: NOTION.gray,
    accent: '#2383E2',
    display: SANS,
    capacity: 9,
  },
  agenda: true,
  cover: (c) => {
    const s = c.slide
    const ops: Op[] = [
      background(s, '#FFFFFF'),
      box(s, 0, 0, PW, 2.3, NOTION.cover),
      tb(s, 1.15, 1.6, 1.4, 1.3, [para(run('📒', 66, NOTION.ink))], 'ctr'),
      tb(
        s,
        1.2,
        3.0,
        PW - 2.4,
        1.2,
        [
          para(
            run(c.title, fit(c.title, 44, 28, PW - 2.4), NOTION.ink, { bold: true, spacing: -1 }),
          ),
        ],
        'ctr',
      ),
      tb(s, 1.2, 4.5, 1.6, 0.42, [para(run('≡  구성', 15, NOTION.light))], 'ctr'),
      tb(s, 1.2, 5.1, 1.6, 0.42, [para(run('▦  분량', 15, NOTION.light))], 'ctr'),
      tb(s, 3.0, 5.1, 6, 0.42, [para(run(`본문 ${c.total - 2}장`, 15, NOTION.ink))], 'ctr'),
      box(s, 1.2, 5.85, PW - 2.4, 0.012, NOTION.divider),
    ]
    let x = 3.0
    let y = 4.5
    c.sections.forEach((t, k) => {
      const w = (ems(t) * 14) / 72 + 0.36
      if (x + w > PW - 1.2) {
        x = 3.0
        y += 0.5
      }
      const tag = NOTION.tags[k % NOTION.tags.length]!
      ops.push(
        sh(s, 'roundRect', x, y, w, 0.42, tag.bg, {
          radius: 0.06,
          paras: [para(run(t, 14, tag.fg), { align: 'center' })],
        }),
      )
      x += w + 0.12
    })
    return ops
  },
  agendaSlide: (c) => {
    const s = c.slide
    const ops = notionHeader(s, '🧭', '목차')
    const rowH = Math.min(0.75, 4.9 / c.sections.length)
    c.sections.forEach((t, k) => {
      const y = 2.0 + k * rowH
      ops.push(
        tb(
          s,
          1.05,
          y,
          PW - 2.1,
          rowH - 0.1,
          [para([run('📄  ', 18, NOTION.ink), run(t, 20, NOTION.ink)])],
          'ctr',
        ),
      )
      ops.push(box(s, 1.05, y + rowH - 0.05, PW - 2.1, 0.01, NOTION.divider))
    })
    return ops
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan)
    const ops = notionHeader(s, NOTION.icons[(c.section - 1) % NOTION.icons.length]!, plan.title)
    const note = firstNote(c)
    const mainW = note ? 7.3 : PW - 2.0
    const twoCols = !note && groups.length >= 3
    const lines = groups.reduce((sum, g) => sum + 1 + Math.min(4, g.children.length), 0)
    const small = lines > (twoCols ? 12 : 8)
    if (twoCols) {
      const half = Math.ceil(groups.length / 2)
      columns(2, 1.0, mainW, 0.6).forEach((col, k) => {
        ops.push(
          tb(
            s,
            col.x,
            2.0,
            col.w,
            4.9,
            notionBlocks(groups.slice(k * half, (k + 1) * half), small),
          ),
        )
      })
    } else ops.push(tb(s, 1.0, 2.0, mainW, 4.9, notionBlocks(groups, small)))
    if (note) {
      const x = 1.0 + mainW + 0.5
      const w = PW - 1.0 - x
      const noteH = Math.min(4.4, textH(note, 15, w - 1.0, 1.45))
      ops.push(box(s, x, 2.0, w, noteH + 0.5, NOTION.callout, 0.08))
      ops.push(tb(s, x + 0.25, 2.22, 0.5, 0.5, [para(run('💡', 20, NOTION.ink))]))
      ops.push(
        tb(s, x + 0.75, 2.25, w - 1.0, noteH + 0.1, [
          para(run(note, 15, NOTION.ink), { lineHeight: 145 }),
        ]),
      )
    }
    return ops
  },
  closing: (c) => {
    const s = c.slide
    return [
      background(s, '#FFFFFF'),
      tb(s, 1.2, 2.05, 1.2, 1.0, [para(run('🙌', 48, NOTION.ink))], 'ctr'),
      tb(
        s,
        1.2,
        3.15,
        PW - 2.4,
        1.0,
        [para(run('감사합니다', 44, NOTION.ink, { bold: true, spacing: -1 }))],
        'ctr',
      ),
      box(s, 1.2, 4.4, 0.05, 0.55, NOTION.ink),
      tb(
        s,
        1.45,
        4.4,
        PW - 2.6,
        0.55,
        [
          para(
            run(
              c.closing ?? c.title,
              c.closing ? fit(c.closing, 18, 12, PW - 2.6, 2) : 18,
              NOTION.gray,
            ),
          ),
        ],
        'ctr',
      ),
    ]
  },
}

// ---- 8. Warm journey story: warm, a journey told step by step ----

const AIR = {
  rausch: '#FF385C',
  ink: '#222222',
  gray: '#6A6A6A',
  warm: '#FFEEE9',
  blush: '#FFE3DC',
  peach: '#FFD2C4',
  sand: '#F7EDE6',
  line: '#FFC2B4',
  page: '#FFFCFA',
}

const airbnb: Style = {
  look: {
    page: (s) => [background(s, AIR.page)],
    frame: (c, title) => [
      background(c.slide, AIR.page),
      tb(
        c.slide,
        0.9,
        0.55,
        PW - 1.8,
        1.15,
        [
          para(run(title, fit(title, 36, 24, PW - 1.8, 2), AIR.ink, { bold: true, font: WARM }), {
            lineHeight: 115,
          }),
        ],
        'b',
      ),
      box(c.slide, 0.9, 1.85, 0.7, 0.06, AIR.rausch),
    ],
    top: 2.1,
    ink: AIR.ink,
    muted: AIR.gray,
    accent: AIR.rausch,
    display: WARM,
    capacity: 5,
  },
  agenda: true,
  cover: (c) => {
    const s = c.slide
    return [
      background(s, AIR.page),
      box(s, 7.55, 0.95, 2.45, 3.0, AIR.blush, 0.28),
      box(s, 10.2, 0.95, 2.45, 2.05, AIR.rausch, 0.28),
      dot(s, 11.05, 1.5, 0.75, '#FFFFFF59'),
      box(s, 10.2, 3.2, 2.45, 3.35, AIR.peach, 0.28),
      box(s, 7.55, 4.15, 2.45, 2.4, AIR.sand, 0.28),
      tb(
        s,
        0.9,
        1.5,
        6.3,
        2.85,
        [
          para(run(c.title, fit(c.title, 48, 30, 6.3, 3), AIR.ink, { bold: true, font: WARM }), {
            lineHeight: 118,
          }),
        ],
        'b',
      ),
      box(s, 0.9, 4.6, 0.8, 0.07, AIR.rausch),
      tb(s, 0.9, 4.85, 6.3, 0.6, [para(run('사람, 경험, 그리고 성장의 여정', 18, AIR.gray))]),
    ]
  },
  agendaSlide: (c) => {
    const s = c.slide
    const ops: Op[] = [
      background(s, AIR.page),
      tb(
        s,
        0.9,
        0.7,
        PW - 1.8,
        1.0,
        [para(run('오늘의 여정', 36, AIR.ink, { bold: true, font: WARM }))],
        'b',
      ),
    ]
    const shown = c.sections.slice(0, 6)
    const cols = columns(shown.length, 0.9, PW - 1.8, 0.2)
    ops.push(
      box(
        s,
        cols[0]!.x + cols[0]!.w / 2,
        3.38,
        cols[cols.length - 1]!.x - cols[0]!.x,
        0.03,
        AIR.line,
      ),
    )
    shown.forEach((t, k) => {
      const col = cols[k]!
      const last = k === shown.length - 1
      ops.push(
        dot(s, col.x + col.w / 2 - 0.2, 3.2, 0.4, last ? AIR.rausch : '#FFFFFF', {
          stroke: { color: AIR.rausch, pt: 2.25 },
        }),
      )
      ops.push(
        tb(s, col.x, 3.85, col.w, 0.4, [
          para(run(`${k + 1}`, 14, AIR.rausch, { bold: true }), { align: 'center' }),
        ]),
      )
      ops.push(
        tb(s, col.x, 4.25, col.w, 1.2, [
          para(run(t, fit(t, 22, 15, col.w, 2), AIR.ink, { bold: true }), {
            align: 'center',
            lineHeight: 120,
          }),
        ]),
      )
    })
    return ops
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan).slice(0, 5)
    const ops: Op[] = [
      background(s, AIR.page),
      box(s, 0.6, 0.6, 4.3, PH - 1.2, AIR.warm, 0.3),
      tb(s, 0.95, 0.75, 1.5, 1.2, [para(run('“', 96, AIR.rausch, { font: WARM }))]),
      tb(s, 1.0, 2.05, 3.55, 2.9, [
        para(
          run(plan.title, fit(plan.title, 34, 22, 3.55, 3), AIR.ink, { bold: true, font: WARM }),
          { lineHeight: 122 },
        ),
      ]),
      box(s, 1.0, 5.75, 0.7, 0.06, AIR.rausch),
      tb(s, 1.0, 5.95, 3.4, 0.4, [para(run(`여정 ${c.section}`, 14, AIR.gray, { bold: true }))]),
    ]
    if (!groups.length) return ops
    const step = Math.min(1.45, 5.4 / groups.length)
    const y0 = 0.95 + (5.6 - step * groups.length) / 2
    if (groups.length > 1)
      ops.push(box(s, 5.84, y0 + 0.2, 0.03, step * (groups.length - 1), AIR.line))
    groups.forEach((g, k) => {
      const y = y0 + k * step
      ops.push(
        dot(s, 5.69, y + 0.04, 0.33, k === 0 ? AIR.rausch : '#FFFFFF', {
          stroke: { color: AIR.rausch, pt: 2.25 },
        }),
      )
      const lines = childLines(g, step > 1.2 ? 2 : 1)
      ops.push(
        tb(s, 6.35, y - 0.05, PW - 7.05, step - 0.1, [
          para(
            accented(g.text, fit(g.text, 22, 16, PW - 7.05), AIR.ink, AIR.rausch, { bold: true }),
            { lineHeight: 120 },
          ),
          ...lines.map((t) =>
            para(accented(t, 15, AIR.gray, AIR.rausch), { lineHeight: 140, spaceBefore: 3 }),
          ),
        ]),
      )
    })
    return ops
  },
  closing: (c) => {
    const s = c.slide
    return [
      background(s, AIR.warm),
      dot(s, PW / 2 - 0.18, 2.1, 0.36, AIR.rausch),
      tb(
        s,
        1,
        2.65,
        PW - 2,
        1.3,
        [para(run('감사합니다', 56, AIR.ink, { bold: true, font: WARM }), { align: 'center' })],
        'ctr',
      ),
      tb(s, 1, 4.15, PW - 2, 0.6, [
        para(
          run(c.closing ?? c.title, c.closing ? fit(c.closing, 18, 12, PW - 2, 2) : 18, AIR.gray),
          { align: 'center' },
        ),
      ]),
    ]
  },
}

// ---- 9. Balanced template: pastel cards, round shapes, a balanced grid ----

const CANVA = {
  ink: '#1F1B2E',
  muted: '#6B6880',
  page: '#FFFDF8',
  solid: ['#7B61FF', '#00B8C2', '#FF5FA2', '#FFB000'],
  pastel: ['#EEEAFF', '#DDF6F6', '#FFE5F0', '#FFF3D1'],
}

function canvaTitle(s: number, title: string): Op[] {
  return [
    tb(
      s,
      0.9,
      0.55,
      PW - 1.8,
      1.15,
      [
        para(run(title, fit(title, 38, 24, PW - 1.8, 2), CANVA.ink, { bold: true, spacing: -1 }), {
          lineHeight: 112,
        }),
      ],
      'b',
    ),
    box(s, 0.9, 1.85, 0.8, 0.12, CANVA.solid[0]!, 0.06),
  ]
}

const canva: Style = {
  look: {
    page: (s) => [
      background(s, CANVA.page),
      dot(s, 10.4, 4.6, 2.4, CANVA.pastel[0]!),
      dot(s, 12.0, 4.2, 0.6, CANVA.pastel[2]!),
    ],
    frame: (c, title) => [background(c.slide, CANVA.page), ...canvaTitle(c.slide, title)],
    top: 2.15,
    ink: CANVA.ink,
    muted: CANVA.muted,
    accent: CANVA.solid[0]!,
    display: SANS,
    capacity: 6,
  },
  agenda: true,
  cover: (c) => {
    const s = c.slide
    return [
      background(s, CANVA.page),
      dot(s, 8.3, 0.8, 4.3, CANVA.pastel[0]!),
      dot(s, 10.75, 3.95, 2.6, CANVA.pastel[1]!),
      dot(s, 7.7, 4.75, 1.6, CANVA.pastel[2]!),
      dot(s, 11.95, 0.55, 0.9, CANVA.pastel[3]!),
      dot(s, 9.55, 2.1, 0.5, CANVA.solid[0]!),
      dot(s, 11.4, 4.6, 0.32, CANVA.solid[2]!),
      tb(
        s,
        0.9,
        1.6,
        7.2,
        2.75,
        [
          para(
            run(c.title, fit(c.title, 56, 32, 7.2, 2), CANVA.ink, { bold: true, spacing: -1.5 }),
            { lineHeight: 110 },
          ),
        ],
        'b',
      ),
      box(s, 0.9, 4.6, 1.6, 0.14, CANVA.solid[0]!, 0.07),
      tb(s, 0.9, 5.0, 7.2, 0.6, [para(run('함께 만드는 더 나은 내일', 20, CANVA.muted))]),
    ]
  },
  agendaSlide: (c) => {
    const s = c.slide
    const ops: Op[] = [background(s, CANVA.page), ...canvaTitle(s, '목차')]
    const shown = c.sections.slice(0, 8)
    const perRow = shown.length > 4 ? 2 : 1
    const rows = Math.ceil(shown.length / perRow)
    const rowH = Math.min(1.05, 4.7 / rows)
    const cols = columns(perRow, 0.9, PW - 1.8, 0.3)
    shown.forEach((t, k) => {
      const col = cols[k % perRow]!
      const y = 2.3 + Math.floor(k / perRow) * rowH
      const ci = k % 4
      ops.push(box(s, col.x, y, col.w, rowH - 0.18, CANVA.pastel[ci]!, (rowH - 0.18) / 2))
      ops.push(
        dot(s, col.x + 0.15, y + (rowH - 0.18 - 0.55) / 2, 0.55, CANVA.solid[ci]!, {
          paras: [para(run(String(k + 1), 16, '#FFFFFF', { bold: true }), { align: 'center' })],
        }),
      )
      ops.push(
        tb(
          s,
          col.x + 0.95,
          y,
          col.w - 1.2,
          rowH - 0.18,
          [para(run(t, fit(t, 22, 15, col.w - 1.2), CANVA.ink, { bold: true }))],
          'ctr',
        ),
      )
    })
    return ops
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan).slice(0, 6)
    const ops: Op[] = [background(s, CANVA.page), ...canvaTitle(s, plan.title)]
    if (!groups.length) return ops
    const n = groups.length
    const perRow = n <= 3 ? n : n === 4 ? 2 : 3
    const rows = Math.ceil(n / perRow)
    const cols = columns(perRow, 0.9, PW - 1.8, 0.28)
    const inner = rows === 1 ? cols[0]!.w - 0.8 : cols[0]!.w - 1.5
    const fullH = (4.55 - (rows - 1) * 0.25) / rows
    const cardH =
      rows === 1
        ? clamp(
            Math.max(
              ...groups.map(
                (g) =>
                  1.5 +
                  textH(g.text, 24, inner, 1.18) +
                  0.2 +
                  childrenH(childLines(g), 16, inner) +
                  0.45,
              ),
            ),
            2.8,
            fullH,
          )
        : clamp(
            Math.max(
              ...groups.map(
                (g) => 1.05 + childrenH(childLines(g, rows > 2 ? 1 : 2), 15, inner) + 0.3,
              ),
            ),
            1.2,
            fullH,
          )
    const y0 = 2.3 + (4.55 - rows * cardH - (rows - 1) * 0.25) * 0.3
    groups.forEach((g, k) => {
      const col = cols[k % perRow]!
      const y = y0 + Math.floor(k / perRow) * (cardH + 0.25)
      const ci = k % 4
      ops.push(box(s, col.x, y, col.w, cardH, CANVA.pastel[ci]!, 0.3))
      if (rows === 1) {
        ops.push(
          dot(s, col.x + 0.4, y + 0.4, 0.8, CANVA.solid[ci]!, {
            paras: [para(run(String(k + 1), 22, '#FFFFFF', { bold: true }), { align: 'center' })],
          }),
        )
        const headH = textH(g.text, 24, inner, 1.18)
        ops.push(
          tb(s, col.x + 0.4, y + 1.5, inner, headH + 0.1, [
            para(
              accented(g.text, fit(g.text, 24, 16, inner, 2), CANVA.ink, CANVA.solid[ci]!, {
                bold: true,
              }),
              { lineHeight: 118 },
            ),
          ]),
        )
        ops.push(
          tb(
            s,
            col.x + 0.4,
            y + 1.7 + headH,
            inner,
            cardH - headH - 1.9,
            childLines(g).map((t) =>
              para(run(t, 16, CANVA.muted), { lineHeight: 140, spaceAfter: 4 }),
            ),
          ),
        )
      } else {
        ops.push(
          dot(s, col.x + 0.35, y + 0.35, 0.62, CANVA.solid[ci]!, {
            paras: [para(run(String(k + 1), 18, '#FFFFFF', { bold: true }), { align: 'center' })],
          }),
        )
        ops.push(
          tb(
            s,
            col.x + 1.2,
            y + 0.3,
            col.w - 1.5,
            0.72,
            [
              para(
                accented(g.text, fit(g.text, 22, 15, col.w - 1.5), CANVA.ink, CANVA.solid[ci]!, {
                  bold: true,
                }),
              ),
            ],
            'ctr',
          ),
        )
        ops.push(
          tb(
            s,
            col.x + 1.2,
            y + 1.05,
            col.w - 1.5,
            cardH - 1.2,
            childLines(g, rows > 2 ? 1 : 2).map((t) =>
              para(run(t, 15, CANVA.muted), { lineHeight: 135 }),
            ),
          ),
        )
      }
    })
    return ops
  },
  closing: (c) => {
    const s = c.slide
    return [
      background(s, CANVA.solid[0]!, CANVA.solid[1]!, 45),
      dot(s, 9.6, 0.5, 3.4, '#FFFFFF1F'),
      dot(s, 0.6, 4.5, 2.2, '#FFFFFF1A'),
      dot(s, 2.4, 1.0, 0.6, '#FFFFFF33'),
      tb(
        s,
        1,
        2.5,
        PW - 2,
        1.4,
        [
          para(run('감사합니다', 60, '#FFFFFF', { bold: true, spacing: -1.5 }), {
            align: 'center',
          }),
        ],
        'ctr',
      ),
      tb(s, 1, 4.1, PW - 2, 0.6, [
        para(
          run(c.closing ?? c.title, c.closing ? fit(c.closing, 20, 12, PW - 2, 2) : 20, '#F1EEFF'),
          { align: 'center' },
        ),
      ]),
    ]
  },
}

// ---- 10. Investor pitch deck: headline, big numbers, one rising chart ----

const PITCH = {
  navy: '#0B1B3F',
  blue: '#2563EB',
  blue2: '#1E40AF',
  light: '#DBEAFE',
  orange: '#F97316',
  gray: '#64748B',
  panel: '#F5F8FC',
  rule: '#E2E8F0',
}

function pitchFrame(c: Ctx, title: string): Op[] {
  const s = c.slide
  return [
    background(s, '#FFFFFF'),
    tb(
      s,
      0.8,
      0.5,
      PW - 1.6,
      1.2,
      [
        para(run(title, fit(title, 38, 24, PW - 1.6, 2), PITCH.navy, { bold: true, spacing: -1 }), {
          lineHeight: 112,
        }),
      ],
      'b',
    ),
    box(s, 0, PH - 0.1, PW, 0.1, PITCH.rule),
    box(s, 0, PH - 0.1, (PW * (c.slide + 1)) / c.total, 0.1, PITCH.blue),
    tb(s, PW - 1.8, PH - 0.55, 1.0, 0.3, [
      para(run(`${pageNo(c)} / ${c.total}`, 10, PITCH.gray, { font: NUM }), { align: 'right' }),
    ]),
  ]
}

function pitchChart(s: number, x: number, base: number, scale: number): Op[] {
  const heights = [1.0, 1.5, 2.2, 3.1]
  const fills = [PITCH.blue2, '#1D4ED8', PITCH.blue, PITCH.orange]
  const ops = heights.map((h, k) =>
    box(s, x + k * 1.0 * scale, base - h * scale, 0.72 * scale, h * scale, fills[k]!, 0.08 * scale),
  )
  ops.push(box(s, x - 0.2, base + 0.02, 4.2 * scale, 0.02, '#334155'))
  ops.push({
    ...sh(
      s,
      'upArrow',
      x + 3.06 * scale,
      base - 4.35 * scale,
      0.6 * scale,
      1.0 * scale,
      PITCH.orange,
    ),
    adjustments: { adj1: 40_000, adj2: 60_000 },
  })
  return ops
}

const pitch: Style = {
  look: {
    page: (s) => [background(s, '#FFFFFF'), box(s, 0, PH - 0.1, PW, 0.1, PITCH.blue)],
    frame: pitchFrame,
    top: 1.9,
    ink: PITCH.navy,
    muted: PITCH.gray,
    accent: PITCH.blue,
    display: SANS,
    capacity: 4,
  },
  agenda: true,
  cover: (c) => {
    const s = c.slide
    return [
      background(s, PITCH.navy),
      ...pitchChart(s, 8.4, 5.65, 1),
      tb(
        s,
        0.8,
        1.6,
        7.0,
        2.75,
        [
          para(
            run(c.title, fit(c.title, 54, 30, 7.0, 2), '#FFFFFF', { bold: true, spacing: -1.5 }),
            { lineHeight: 110 },
          ),
        ],
        'b',
      ),
      tb(s, 0.8, 4.6, 7.0, 0.6, [
        para(run('문제 → 해결 → 성과', 20, PITCH.orange, { bold: true })),
      ]),
    ]
  },
  agendaSlide: (c) => {
    const s = c.slide
    const ops = pitchFrame(c, '목차')
    const rowH = Math.min(0.9, 4.9 / c.sections.length)
    c.sections.forEach((t, k) => {
      const y = 2.0 + k * rowH
      ops.push(
        sh(
          s,
          'roundRect',
          0.8,
          y + (rowH - 0.55) / 2,
          0.75,
          0.55,
          k === c.sections.length - 1 ? PITCH.orange : PITCH.blue,
          {
            radius: 0.12,
            paras: [
              para(run(String(k + 1).padStart(2, '0'), 16, '#FFFFFF', { bold: true, font: NUM }), {
                align: 'center',
              }),
            ],
          },
        ),
      )
      ops.push(
        tb(
          s,
          1.85,
          y,
          PW - 2.65,
          rowH,
          [para(run(t, fit(t, 24, 16, PW - 2.65), PITCH.navy, { bold: true }))],
          'ctr',
        ),
      )
    })
    return ops
  },
  content: (c, plan) => {
    const s = c.slide
    const groups = groupsOf(plan)
    const ops = pitchFrame(c, plan.title)
    if (!groups.length) return ops
    const figures = groups.map(figureOf)
    const counted = figures.filter(Boolean).length
    if (counted && counted * 2 >= groups.length && groups.length <= 4) {
      // the numbers, large, one card each; the last number in the accent
      const cols = columns(groups.length, 0.8, PW - 1.6, 0.3)
      const inner = cols[0]!.w - 0.8
      const lastFig = figures.map((x) => !!x).lastIndexOf(true)
      const parts = groups.map((g, k) => {
        const f = figures[k]
        const lines = childLines(g, 2).filter((t) => !f || !figureIn(t))
        return { g, f, lines, labelH: f ? textH(f.label, 20, inner, 1.2) : 0 }
      })
      const cardH = clamp(
        Math.max(...parts.map((p) => 1.85 + p.labelH + 0.2 + childrenH(p.lines, 14, inner) + 0.4)),
        3.0,
        4.5,
      )
      const y = 2.15 + (4.5 - cardH) * 0.3
      parts.forEach((p, k) => {
        const col = cols[k]!
        const accent = k === lastFig ? PITCH.orange : PITCH.blue
        ops.push(box(s, col.x, y, col.w, cardH, PITCH.panel, 0.16))
        ops.push(box(s, col.x, y, col.w, 0.08, p.f ? accent : PITCH.light))
        if (p.f) {
          ops.push(
            tb(
              s,
              col.x + 0.4,
              y + 0.3,
              inner,
              1.35,
              [
                para(
                  run(p.f.value, fit(p.f.value, 66, 34, inner), accent, {
                    bold: true,
                    font: NUM,
                    spacing: -2,
                  }),
                ),
              ],
              'b',
            ),
          )
          ops.push(
            tb(s, col.x + 0.4, y + 1.85, inner, p.labelH + 0.1, [
              para(run(p.f.label, 20, PITCH.navy, { bold: true }), { lineHeight: 120 }),
            ]),
          )
        } else {
          ops.push(
            tb(
              s,
              col.x + 0.4,
              y + 0.3,
              inner,
              1.45,
              [
                para(
                  run(p.g.text, fit(p.g.text, 28, 18, inner, 2), PITCH.navy, {
                    bold: true,
                    spacing: -0.5,
                  }),
                  { lineHeight: 115 },
                ),
              ],
              'b',
            ),
          )
        }
        ops.push(
          tb(
            s,
            col.x + 0.4,
            y + 2.05 + p.labelH,
            inner,
            cardH - p.labelH - 2.2,
            p.lines.map((t) => para(run(t, 14, PITCH.gray), { lineHeight: 140 })),
          ),
        )
      })
      return ops
    }
    const shown = groups.slice(0, 5)
    const cols = columns(shown.length, 0.8, PW - 1.6, 0.05)
    const panelH = clamp(
      Math.max(...shown.map((g) => childrenH(childLines(g, 4), 16, cols[0]!.w - 0.55))) + 0.6,
      1.4,
      3.4,
    )
    const anyKids = shown.some((g) => g.children.length)
    // the flow and its panels sit a little above the middle of the body
    const y = 2.05 + (4.7 - (anyKids ? 1.35 + panelH : 1.15)) * 0.3
    shown.forEach((g, k) => {
      const col = cols[k]!
      const last = k === shown.length - 1 && shown.length > 1
      ops.push(
        sh(
          s,
          k ? 'chevron' : 'homePlate',
          col.x,
          y,
          col.w + 0.18,
          1.15,
          last ? PITCH.orange : [PITCH.navy, PITCH.blue2, PITCH.blue, '#3B82F6'][Math.min(k, 3)]!,
          {
            inset: 0.06,
            paras: [
              para(run(g.text, fit(g.text, 20, 13, col.w - 0.5, 2), '#FFFFFF', { bold: true }), {
                align: 'center',
                lineHeight: 110,
              }),
            ],
          },
        ),
      )
      if (g.children.length) {
        ops.push(box(s, col.x, y + 1.35, col.w - 0.05, panelH, PITCH.panel, 0.12))
        ops.push(
          tb(
            s,
            col.x + 0.25,
            y + 1.62,
            col.w - 0.55,
            panelH - 0.4,
            childLines(g, 4).map((t) =>
              para(accented(t, 16, PITCH.navy, PITCH.orange), { lineHeight: 135, spaceAfter: 6 }),
            ),
          ),
        )
      }
    })
    return ops
  },
  closing: (c) => {
    const s = c.slide
    return [
      background(s, PITCH.navy),
      tb(
        s,
        0.8,
        2.3,
        PW - 1.6,
        1.3,
        [para(run('감사합니다', 60, '#FFFFFF', { bold: true, spacing: -1.5 }))],
        'b',
      ),
      box(s, 0.8, 3.85, 1.0, 0.08, PITCH.orange),
      tb(s, 0.8, 4.15, PW - 1.6, 0.6, [
        para(
          run(
            c.closing ?? `${c.title}  ·  Q&A`,
            c.closing ? fit(c.closing, 18, 12, PW - 1.6, 2) : 18,
            '#94A3B8',
          ),
        ),
      ]),
    ]
  },
}

const STYLE: Record<SlideStyleId, Style> = {
  jobs,
  mckinsey,
  toss,
  bcg,
  ted,
  material,
  notion,
  airbnb,
  canva,
  pitch,
}

/**
 * The whole deck in a style: the cover, a contents slide where the style uses
 * one and there are three or more sections, one slide per plan entry and a
 * closing slide. Speaker notes go with their slides.
 */
export interface StyledDeckOptions {
  /** the closing slide's line under its thanks; the deck title when absent */
  closing?: string | undefined
}

/** The branch a slide belongs to, as the contents slide names it. */
const sectionOf = (plan: SlidePlan): string => plan.section ?? plan.title.replace(/ \(계속\)$/, '')

export function styledDeckOps(
  slides: readonly SlidePlan[],
  style: SlideStyleId,
  options: StyledDeckOptions = {},
): Op[] {
  const draw = STYLE[style]
  const [cover, ...body] = slides
  if (!cover) return []
  const sections = [...new Set(body.map(sectionOf))]
  type Page = { kind: 'cover' | 'agenda' | 'content' | 'closing'; plan?: SlidePlan }
  const pages: Page[] = [
    { kind: 'cover', plan: cover },
    ...(draw.agenda && sections.length >= 3 ? [{ kind: 'agenda' as const }] : []),
    ...body.map((plan) => ({ kind: 'content' as const, plan })),
    { kind: 'closing' },
  ]
  const ops: Op[] = []
  for (let k = 1; k < pages.length; k++) ops.push({ op: 'addBlankSlide', target: { slide: k - 1 } })
  pages.forEach((page, slide) => {
    const plan = page.plan
    const c: Ctx = {
      slide,
      total: pages.length,
      title: cover.title,
      ...(page.kind === 'closing' && options.closing?.trim()
        ? { closing: options.closing.trim() }
        : {}),
      sections,
      section: plan ? Math.max(1, sections.indexOf(sectionOf(plan)) + 1) : 0,
      notes: plan?.notes ?? '',
      ...(plan?.takeaway !== undefined ? { takeaway: plan.takeaway } : {}),
    }
    if (page.kind === 'cover') ops.push(...draw.cover(c))
    else if (page.kind === 'agenda') ops.push(...draw.agendaSlide(c))
    else if (page.kind === 'closing') ops.push(...draw.closing(c))
    else {
      const groups = groupsOf(plan!)
      const only = groups.length === 1 && !groups[0]!.children.length ? groups[0]!.text : undefined
      if (!groups.length) ops.push(...dividerSlide(c, plan!, draw.look))
      else if (only && !figureIn(only)) ops.push(...statementSlide(c, plan!, only, draw.look))
      else if (groups.length > draw.look.capacity)
        ops.push(...listSlide(c, plan!, groups, draw.look))
      else ops.push(...draw.content(c, plan!))
    }
  })
  pages.forEach((page, slide) => {
    if (page.plan?.notes) ops.push({ op: 'setNotes', target: { slide }, text: page.plan.notes })
  })
  return ops
}
