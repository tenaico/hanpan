/**
 * Hanpan design board: the AI part. The AI writes only the words, in a short
 * line format (a small local model keeps to `KEY: value` lines far better than
 * to JSON); the layout, colours and sizes stay this file's, so every answer
 * becomes a page that looks designed and can still be edited element by
 * element. The same goes for rewriting one text box: plain text in, plain
 * text out. Pure functions; DesignBoard.tsx sends and applies.
 */
import { aiLanguageName } from '@genoffice/hanpan-core/renderer'
import { EN } from './words/en'
import {
  FORMATS,
  newId,
  shapeElement,
  textElement,
  type DesignDoc,
  type DesignElement,
  type DesignPage,
  type PageFormat,
} from './model'

export type DesignMood = 'formal' | 'calm' | 'vivid' | 'warm'
export const DESIGN_MOODS: readonly DesignMood[] = ['formal', 'calm', 'vivid', 'warm']

export interface DesignBrief {
  /** small line above the title: who is speaking, the series */
  kicker: string
  title: string
  subtitle: string
  body: string
  /** "when | 20 Nov" lines; the label may be empty */
  items: { label: string; text: string }[]
  footer: string
  mood: DesignMood
  /** card news: one card per entry after the cover */
  cards: { title: string; points: string[] }[]
}

/** Longest answer taken for one design (a full card news fits in a fraction). */
export const MAX_BRIEF_CHARS = 8_000

// ---- asking ----

export function briefRequest(
  request: string,
  format: PageFormat,
  lang: string,
  today: string,
): { system: string; user: string } {
  const cards = format.id === 'card'
  if (lang === 'ko') {
    const lines = [
      '당신은 포스터·안내문·카드뉴스의 문구를 쓰는 카피라이터입니다. 디자인은 프로그램이 하고, 당신은 글만 씁니다.',
      `판형: ${format.name}. 오늘: ${today}.`,
      '아래 형식의 줄로만 답하세요. 설명, 머리말, 코드 블록, 마크다운 강조는 쓰지 않습니다.',
      'KICKER: 제목 위의 짧은 한 줄 (주최 기관, 시리즈 이름. 없으면 이 줄을 빼세요)',
      'TITLE: 제목 (짧고 힘 있게, 20자 안팎)',
      'SUBTITLE: 부제 한 줄',
    ]
    if (cards) {
      lines.push(
        'CARD: 카드 제목 (카드 3~6장, 카드마다 이 줄로 시작)',
        '- 그 카드의 요점 (카드마다 2~4줄, 줄마다 한 문장)',
      )
    } else {
      lines.push(
        'BODY: 본문 1~3문장 (필요할 때만)',
        'ITEM: 항목 이름 | 내용 (일시, 장소, 대상, 문의 같은 정보. 0~6줄)',
      )
    }
    lines.push(
      'FOOTER: 맨 아래 한 줄 (기관명, 서명, 행동 유도. 없으면 빼세요)',
      'MOOD: formal, calm, vivid, warm 중 하나 (공공·공식이면 formal, 학교·안내면 calm, 행사·홍보면 vivid, 생활·친근하면 warm)',
      '요청에 없는 사실(날짜, 장소, 전화번호, 이름)은 지어내지 말고 ○○처럼 비워 두세요.',
    )
    return { system: lines.join('\n'), user: request.trim() }
  }
  const lines = [
    'You write the words for posters, notices and card news. A program does the design; you write only the text.',
    `Write every line in ${aiLanguageName(lang)} unless the request asks for another language. The keys below stay in English.`,
    `Format: ${EN.formats[format.id] ?? format.name}. Today: ${today}.`,
    'Answer only in lines of the form below. No explanations, preamble, code blocks or Markdown emphasis.',
    'KICKER: a short line above the title (organiser, series; leave the line out if none)',
    'TITLE: the title (short and strong, about 6 words)',
    'SUBTITLE: one subtitle line',
  ]
  if (cards) {
    lines.push(
      'CARD: a card title (3 to 6 cards, each starting with this line)',
      '- a point on that card (2 to 4 lines per card, one sentence each)',
    )
  } else {
    lines.push(
      'BODY: 1 to 3 sentences of body text (only when needed)',
      'ITEM: label | value (date, place, audience, contact; 0 to 6 lines)',
    )
  }
  lines.push(
    'FOOTER: one closing line (organisation, signature, call to action; leave out if none)',
    'MOOD: one of formal, calm, vivid, warm',
    'Never invent facts the request does not give (dates, places, phone numbers, names): write a placeholder like ___ instead.',
  )
  return { system: lines.join('\n'), user: request.trim() }
}

// ---- reading the answer ----

const KEYS: Record<string, string> = {
  KICKER: 'KICKER',
  TITLE: 'TITLE',
  SUBTITLE: 'SUBTITLE',
  BODY: 'BODY',
  ITEM: 'ITEM',
  FOOTER: 'FOOTER',
  MOOD: 'MOOD',
  CARD: 'CARD',
  머리: 'KICKER',
  윗줄: 'KICKER',
  제목: 'TITLE',
  부제: 'SUBTITLE',
  본문: 'BODY',
  항목: 'ITEM',
  마무리: 'FOOTER',
  하단: 'FOOTER',
  분위기: 'MOOD',
  카드: 'CARD',
}

/** Markdown emphasis, quotes and stray brackets a model wraps around a value. */
const tidy = (value: string): string =>
  value
    .replace(/\*\*|__|`/g, '')
    .replace(/^["'“‘「『]+|["'”’」』]+$/g, '')
    .trim()

function moodOf(value: string): DesignMood | null {
  const v = value.toLowerCase()
  if (/formal|공식|공공|격식/.test(v)) return 'formal'
  if (/calm|차분|안내|단정/.test(v)) return 'calm'
  if (/vivid|강렬|활기|화려|bold/.test(v)) return 'vivid'
  if (/warm|따뜻|친근|부드/.test(v)) return 'warm'
  return null
}

/**
 * The brief in an answer, or null when there is no title in it. Unknown lines
 * are dropped; bullets belong to the last CARD, or become items without one.
 */
export function parseBrief(raw: string, fallbackMood: DesignMood = 'formal'): DesignBrief | null {
  const brief: DesignBrief = {
    kicker: '',
    title: '',
    subtitle: '',
    body: '',
    items: [],
    footer: '',
    mood: fallbackMood,
    cards: [],
  }
  let moodSeen = false
  const body: string[] = []
  for (const rawLine of raw.replace(/```[a-z]*/gi, '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const keyed = /^(?:[-*•]\s*)?\**\s*([A-Za-z]+|[가-힣]+)\s*\**\s*[:：]\s*(.*)$/.exec(line)
    const key = keyed ? (KEYS[keyed[1]!.toUpperCase()] ?? KEYS[keyed[1]!]) : undefined
    if (key) {
      const value = tidy(keyed![2]!)
      if (!value && key !== 'CARD') continue
      switch (key) {
        case 'KICKER':
          brief.kicker ||= value.slice(0, 60)
          break
        case 'TITLE':
          brief.title ||= value.slice(0, 80)
          break
        case 'SUBTITLE':
          brief.subtitle ||= value.slice(0, 120)
          break
        case 'BODY':
          body.push(value)
          break
        case 'ITEM': {
          const [label, ...rest] = value.split(/\s*[|｜]\s*/)
          const item = rest.length
            ? { label: tidy(label!), text: tidy(rest.join(' ')) }
            : { label: '', text: value }
          if (brief.items.length < 8 && item.text) brief.items.push(item)
          break
        }
        case 'FOOTER':
          brief.footer ||= value.slice(0, 80)
          break
        case 'MOOD': {
          const mood = moodOf(value)
          if (mood && !moodSeen) {
            brief.mood = mood
            moodSeen = true
          }
          break
        }
        case 'CARD':
          if (value && brief.cards.length < 8)
            brief.cards.push({ title: value.slice(0, 80), points: [] })
          break
      }
      continue
    }
    const bullet = /^(?:[-*•·]|\d+[.)])\s+(.*)$/.exec(line)
    if (bullet) {
      const text = tidy(bullet[1]!)
      const card = brief.cards[brief.cards.length - 1]
      if (!text) continue
      if (card) {
        if (card.points.length < 5) card.points.push(text)
      } else if (brief.items.length < 8) {
        brief.items.push({ label: '', text })
      }
    }
  }
  brief.body = body.join('\n').slice(0, 400)
  return brief.title ? brief : null
}

// ---- laying out ----

interface Palette {
  bg: string
  ink: string
  muted: string
  primary: string
  accent: string
  panel: string
  onPrimary: string
  deco: string
}

const PALETTES: Record<DesignMood, Palette> = {
  formal: {
    bg: '#FFFFFF',
    ink: '#0F172A',
    muted: '#64748B',
    primary: '#1E3A5F',
    accent: '#FF8A3D',
    panel: '#F1F5F9',
    onPrimary: '#FFFFFF',
    deco: '#DBEAFE',
  },
  calm: {
    bg: '#FFFDF7',
    ink: '#1F2937',
    muted: '#6B7280',
    primary: '#2E7D6B',
    accent: '#2E7D6B',
    panel: '#ECFDF5',
    onPrimary: '#FFFFFF',
    deco: '#D1FAE5',
  },
  vivid: {
    bg: '#0F172A',
    ink: '#FFFFFF',
    muted: '#CBD5E1',
    primary: '#FF8A3D',
    accent: '#FF8A3D',
    panel: '#1E293B',
    onPrimary: '#0F172A',
    deco: '#7C3AED',
  },
  warm: {
    bg: '#FEF3C7',
    ink: '#0F172A',
    muted: '#78716C',
    primary: '#C2410C',
    accent: '#C2410C',
    panel: '#FFFFFF',
    onPrimary: '#FFFFFF',
    deco: '#FDBA74',
  },
}

/** Rough width of one character in ems: Hangul and CJK are square, Latin narrower. */
function charEm(ch: string): number {
  const c = ch.codePointAt(0) ?? 0
  if (
    c >= 0x1100 &&
    (c <= 0x11ff ||
      (c >= 0x2e80 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0xff00 && c <= 0xffef))
  )
    return 1
  // geometric marks (□ ○ ●) are full width in Korean fonts
  if (c >= 0x25a0 && c <= 0x27bf) return 1
  if (ch === ' ') return 0.3
  if (/[.,:;'"]/.test(ch)) return 0.3
  if (/[()[\]]/.test(ch)) return 0.36
  if (/[0-9]/.test(ch)) return 0.56
  if (/[A-Z]/.test(ch)) return 0.64
  if (/[a-z]/.test(ch)) return 0.54
  return 0.5
}

/** Lines the text takes in a box `width` wide at `size` (an estimate, a little generous). */
export function estimateLines(text: string, size: number, width: number, weight = 400): number {
  const factor = weight >= 700 ? 1.06 : 1
  let lines = 0
  for (const paragraph of text.split('\n')) {
    let em = 0
    for (const ch of paragraph) em += charEm(ch)
    lines += Math.max(1, Math.ceil((em * size * factor) / (width * 0.96)))
  }
  return lines
}

/** The largest size from `max` down to `min` at which the text keeps to `maxLines`. */
export function fitSize(
  text: string,
  width: number,
  max: number,
  min: number,
  maxLines: number,
  weight = 400,
): number {
  let size = max
  while (size > min && estimateLines(text, size, width, weight) > maxLines)
    size = Math.max(min, Math.floor(size * 0.94))
  return size
}

/** A text element whose box is as tall as its lines. */
function textBox(
  text: string,
  x: number,
  y: number,
  w: number,
  size: number,
  extra: Partial<DesignElement> = {},
): DesignElement {
  const lineHeight = extra.lineHeight ?? 1.3
  const h = Math.ceil(estimateLines(text, size, w, extra.fontWeight ?? 400) * size * lineHeight)
  return textElement({
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h,
    text,
    fontSize: Math.round(size),
    lineHeight,
    ...extra,
  })
}

const itemLines = (items: DesignBrief['items'], mark: string): string =>
  items.map((i) => (i.label ? `${mark} ${i.label}: ${i.text}` : `${mark} ${i.text}`)).join('\n')

const page = (background: string, elements: DesignElement[]): DesignPage => ({
  id: newId('p'),
  background,
  elements,
})

/** One portrait page (A4, story): a coloured band for formal and calm, a bold poster for vivid and warm. */
function portraitPage(
  brief: DesignBrief,
  W: number,
  H: number,
  pal: Palette,
  k: number,
): { page: DesignPage; bottom: number; footerTop: number } {
  const m = Math.round(W * 0.075)
  const inner = W - 2 * m
  const els: DesignElement[] = []
  const footerSize = W * 0.036 * k
  const footer = brief.footer
    ? textBox(brief.footer, m, 0, inner, footerSize, {
        fontWeight: 700,
        align: 'center',
        color: pal.primary,
      })
    : null
  if (footer) footer.y = H - m - footer.h
  const footerTop = footer ? footer.y - m * 0.6 : H - m
  let y: number
  const band = brief.mood === 'formal' || brief.mood === 'calm'
  if (band) {
    els.push(shapeElement('rect', { x: 0, y: 0, w: W, h: 0, fill: pal.primary, radius: 0 }))
    y = m
    if (brief.kicker) {
      const kicker = textBox(brief.kicker, m, y, inner, W * 0.032 * k, {
        fontWeight: 700,
        color: pal.onPrimary,
        opacity: 0.85,
      })
      els.push(kicker)
      y += kicker.h + W * 0.015
    }
    const title = textBox(
      brief.title,
      m,
      y,
      inner,
      fitSize(brief.title, inner, W * 0.075 * Math.min(k, 1), W * 0.042, 2, 900),
      { fontWeight: 900, color: pal.onPrimary, lineHeight: 1.2 },
    )
    els.push(title)
    y += title.h + m * 0.8
    els[0]!.h = Math.round(y)
    y += m * 0.7
  } else {
    els.push(
      shapeElement('ellipse', {
        x: Math.round(W * 0.5),
        y: Math.round(-W * 0.15),
        w: Math.round(W * 0.7),
        h: Math.round(W * 0.7),
        fill: pal.deco,
        opacity: 0.85,
      }),
    )
    els.push(
      shapeElement('ellipse', {
        x: Math.round(-W * 0.2),
        y: Math.round(H * 0.68),
        w: Math.round(W * 0.55),
        h: Math.round(W * 0.55),
        fill: pal.accent,
        opacity: 0.35,
      }),
    )
    y = Math.round(H * 0.24)
    if (brief.kicker) {
      const kicker = textBox(brief.kicker, m, y, inner, W * 0.034 * k, {
        fontWeight: 700,
        color: pal.accent,
      })
      els.push(kicker)
      y += kicker.h + W * 0.02
    }
    const title = textBox(
      brief.title,
      m,
      y,
      inner,
      fitSize(brief.title, inner, W * 0.1 * Math.min(k, 1), W * 0.05, 3, 900),
      { fontWeight: 900, color: pal.ink, lineHeight: 1.15 },
    )
    els.push(title)
    y += title.h + W * 0.04
    els.push(
      shapeElement('line', {
        x: m,
        y: Math.round(y),
        w: Math.round(W * 0.14),
        h: 0,
        stroke: pal.accent,
        strokeWidth: Math.round(W * 0.008),
      }),
    )
    y += W * 0.05
  }
  if (brief.subtitle) {
    const sub = textBox(brief.subtitle, m, y, inner, W * 0.042 * k, {
      fontWeight: 700,
      color: band ? pal.primary : pal.ink,
      lineHeight: 1.35,
    })
    els.push(sub)
    y += sub.h + W * 0.035
  }
  if (brief.body) {
    const body = textBox(brief.body, m, y, inner, W * 0.033 * k, {
      color: band ? pal.ink : pal.muted,
      lineHeight: 1.65,
    })
    els.push(body)
    y += body.h + W * 0.04
  }
  if (brief.items.length) {
    const size = W * 0.034 * k
    if (band) {
      const pad = W * 0.045
      const text = textBox(itemLines(brief.items, '□'), m + pad, y + pad, inner - 2 * pad, size, {
        color: pal.ink,
        lineHeight: 1.85,
      })
      els.push(
        shapeElement('rect', {
          x: m,
          y: Math.round(y),
          w: inner,
          h: Math.round(text.h + 2 * pad),
          fill: pal.panel,
          radius: Math.round(W * 0.022),
        }),
        text,
      )
      y += text.h + 2 * pad
    } else {
      const text = textBox(itemLines(brief.items, '·'), m, y, inner, size, {
        color: pal.ink,
        lineHeight: 1.8,
      })
      els.push(text)
      y += text.h
    }
  }
  if (footer)
    els.push(band ? footer : { ...footer, align: 'left', color: pal.muted, fontWeight: 400 })
  return { page: page(pal.bg, els), bottom: y, footerTop }
}

/** One landscape page (thumbnail, slide): the title carries it, the details sit in a strip. */
function landscapePage(
  brief: DesignBrief,
  W: number,
  H: number,
  pal: Palette,
  k: number,
): { page: DesignPage; bottom: number; footerTop: number } {
  const m = Math.round(H * 0.08)
  const inner = W - 2 * m
  const els: DesignElement[] = []
  const strip = brief.mood === 'formal' || brief.mood === 'calm'
  const stripH = Math.round(H * 0.26)
  if (strip)
    els.push(
      shapeElement('rect', { x: 0, y: H - stripH, w: W, h: stripH, fill: pal.primary, radius: 0 }),
    )
  else
    els.push(
      shapeElement('ellipse', {
        x: Math.round(W * 0.68),
        y: Math.round(-H * 0.25),
        w: Math.round(H * 0.95),
        h: Math.round(H * 0.95),
        fill: pal.deco,
        opacity: 0.8,
      }),
    )
  let y = m
  if (brief.kicker) {
    const kicker = textBox(brief.kicker, m, y, inner * 0.8, H * 0.045 * k, {
      fontWeight: 700,
      color: pal.accent,
    })
    els.push(kicker)
    y += kicker.h + H * 0.02
  }
  const titleWidth = strip ? inner : inner * 0.78
  const title = textBox(
    brief.title,
    m,
    y,
    titleWidth,
    fitSize(brief.title, titleWidth, H * 0.15 * Math.min(k, 1), H * 0.07, 2, 900),
    { fontWeight: 900, color: pal.ink, lineHeight: 1.15 },
  )
  els.push(title)
  y += title.h + H * 0.04
  const details = [brief.body, itemLines(brief.items, '·')].filter(Boolean).join('\n')
  if (details && W >= 1600) {
    const text = textBox(details, m, y, titleWidth, H * 0.036 * k, {
      color: strip ? pal.ink : pal.muted,
      lineHeight: 1.6,
    })
    els.push(text)
    y += text.h
  }
  const bottomLine = brief.subtitle || brief.footer
  if (bottomLine) {
    const size = fitSize(bottomLine, inner, H * 0.07 * k, H * 0.04, 1, 700)
    const line = textBox(bottomLine, m, 0, inner, size, {
      fontWeight: 700,
      color: strip ? pal.onPrimary : pal.accent,
    })
    line.y = strip ? Math.round(H - stripH / 2 - line.h / 2) : Math.round(H - m - line.h)
    els.push(line)
  }
  const footerTop = strip ? H - stripH - m * 0.5 : bottomLine ? H - m * 2 - H * 0.07 : H - m
  return { page: page(pal.bg, els), bottom: y, footerTop }
}

/** Card news: a cover, one card per CARD, and a closing card when there is a footer. */
function cardPages(brief: DesignBrief, W: number, pal: Palette): DesignPage[] {
  const m = Math.round(W * 0.085)
  const inner = W - 2 * m
  const dark = brief.mood === 'vivid'
  const cover: DesignElement[] = []
  const panel = !dark
  if (panel)
    cover.push(
      shapeElement('rect', {
        x: Math.round(W * 0.055),
        y: Math.round(W * 0.055),
        w: Math.round(W * 0.89),
        h: Math.round(W * 0.89),
        fill: '#FFFFFF',
        radius: Math.round(W * 0.045),
      }),
    )
  else
    cover.push(
      shapeElement('ellipse', {
        x: Math.round(W * 0.45),
        y: Math.round(-W * 0.2),
        w: Math.round(W * 0.8),
        h: Math.round(W * 0.8),
        fill: pal.deco,
        opacity: 0.7,
      }),
    )
  const ink = panel ? pal.primary : pal.ink
  let y = W * 0.14
  if (brief.kicker) {
    const kicker = textBox(brief.kicker, m + W * 0.035, y, inner - W * 0.07, W * 0.04, {
      fontWeight: 700,
      color: pal.accent,
    })
    cover.push(kicker)
    y += kicker.h + W * 0.03
  }
  const titleW = inner - W * 0.07
  const title = textBox(
    brief.title,
    m + W * 0.035,
    y,
    titleW,
    fitSize(brief.title, titleW, W * 0.1, W * 0.06, 4, 900),
    { fontWeight: 900, color: ink, lineHeight: 1.2 },
  )
  cover.push(title)
  y += title.h + W * 0.04
  if (brief.subtitle)
    cover.push(
      textBox(brief.subtitle, m + W * 0.035, y, titleW, W * 0.04, {
        color: panel ? pal.ink : pal.muted,
        lineHeight: 1.4,
      }),
    )
  if (brief.cards.length)
    cover.push(
      textBox(`${brief.cards.length} →`, m + W * 0.035, W * 0.82, titleW, W * 0.036, {
        color: pal.muted,
      }),
    )
  const pages = [page(panel ? pal.primary : pal.bg, cover)]

  brief.cards.forEach((card, i) => {
    const els: DesignElement[] = []
    els.push(
      textBox(String(i + 1).padStart(2, '0'), m, m, W * 0.3, W * 0.09, {
        fontWeight: 900,
        color: pal.accent,
        lineHeight: 1.1,
      }),
    )
    let cy = m + W * 0.13
    const t = textBox(
      card.title,
      m,
      cy,
      inner,
      fitSize(card.title, inner, W * 0.067, W * 0.045, 3, 900),
      { fontWeight: 900, color: dark ? pal.ink : pal.primary, lineHeight: 1.2 },
    )
    els.push(t)
    cy += t.h + W * 0.035
    els.push(
      shapeElement('line', {
        x: m,
        y: Math.round(cy),
        w: Math.round(W * 0.15),
        h: 0,
        stroke: pal.accent,
        strokeWidth: Math.round(W * 0.009),
      }),
    )
    cy += W * 0.05
    if (card.points.length) {
      const text = card.points.map((p) => `• ${p}`).join('\n')
      const room = W - m - cy
      let size = W * 0.041
      while (size > W * 0.028 && estimateLines(text, size, inner) * size * 1.6 > room) size *= 0.94
      els.push(
        textBox(text, m, cy, inner, size, { color: dark ? pal.muted : pal.ink, lineHeight: 1.6 }),
      )
    }
    pages.push(page(pal.bg, els))
  })

  if (brief.footer) {
    const els: DesignElement[] = []
    const text = textBox(
      brief.footer,
      m,
      0,
      inner,
      fitSize(brief.footer, inner, W * 0.07, W * 0.045, 3, 900),
      { fontWeight: 900, align: 'center', color: panel ? pal.onPrimary : pal.ink, lineHeight: 1.3 },
    )
    text.y = Math.round((W - text.h) / 2)
    els.push(text)
    pages.push(page(panel ? pal.primary : pal.bg, els))
  }
  return pages
}

/**
 * The title face for each mood, over Pretendard for everything else (all bundled,
 * fonts.ts). A single-weight display face takes weight 400 so nothing smears it bold.
 */
const TITLE_FONTS: Record<DesignMood, { family: string; weight: 400 | 700 | 900 }> = {
  formal: { family: 'Pretendard', weight: 900 },
  calm: { family: 'Noto Serif KR', weight: 700 },
  vivid: { family: 'Black Han Sans', weight: 400 },
  warm: { family: 'Do Hyeon', weight: 400 },
}

/** Titles (the heaviest text) in the mood's title face, the rest in Pretendard. */
function withFonts(pages: DesignPage[], mood: DesignMood): DesignPage[] {
  const title = TITLE_FONTS[mood]
  return pages.map((pg) => ({
    ...pg,
    elements: pg.elements.map((e) =>
      e.kind !== 'text'
        ? e
        : e.fontWeight === 900
          ? { ...e, fontFamily: title.family, fontWeight: title.weight }
          : { ...e, fontFamily: 'Pretendard' },
    ),
  }))
}

/** The brief laid out on a format: card news for the 1:1 card, one page otherwise. */
export function designFromBrief(brief: DesignBrief, formatId: string, name?: string): DesignDoc {
  const f = FORMATS.find((x) => x.id === formatId) ?? FORMATS[1]!
  const pal = PALETTES[brief.mood]
  const docName = (name ?? brief.title).slice(0, 60) || '디자인'
  if (f.id === 'card') {
    // a card answer without CARD lines still gets cards, from its items
    const cards = brief.cards.length
      ? brief.cards
      : brief.items.map((i) => ({ title: i.label || i.text, points: i.label ? [i.text] : [] }))
    return {
      version: 1,
      name: docName,
      width: f.width,
      height: f.height,
      pages: withFonts(cardPages({ ...brief, cards }, f.width, pal), brief.mood),
    }
  }
  const one = f.width > f.height * 1.2 ? landscapePage : portraitPage
  // shrink everything a step at a time until the content clears the footer;
  // a short brief grows instead, so the page is not half empty
  let made = one(brief, f.width, f.height, pal, 1)
  if (made.bottom <= made.footerTop) {
    for (let k = 1.08; k <= 1.45; k += 0.08) {
      const bigger = one(brief, f.width, f.height, pal, k)
      if (bigger.bottom > bigger.footerTop) break
      made = bigger
    }
  }
  for (let k = 0.92; made.bottom > made.footerTop && k > 0.55; k -= 0.08)
    made = one(brief, f.width, f.height, pal, k)
  return {
    version: 1,
    name: docName,
    width: f.width,
    height: f.height,
    pages: withFonts([made.page], brief.mood),
  }
}

// ---- rewriting one text box ----

export type RewriteMode = 'polish' | 'shorter' | 'catchy' | 'translate'
export const REWRITE_MODES: readonly RewriteMode[] = ['polish', 'shorter', 'catchy', 'translate']

/** Korean names of the UI languages, for the Korean prompt */
const KO_LANG_NAMES: Readonly<Record<string, string>> = {
  ko: '한국어',
  en: '영어',
  vi: '베트남어',
  zh: '중국어(간체)',
  'zh-TW': '중국어(번체)',
  ja: '일본어',
  th: '태국어',
  id: '인도네시아어',
  ms: '말레이어',
  fr: '프랑스어',
  de: '독일어',
  es: '스페인어',
  pt: '포르투갈어',
  it: '이탈리아어',
  nl: '네덜란드어',
  pl: '폴란드어',
  cs: '체코어',
  ru: '러시아어',
  ar: '아랍어',
  he: '히브리어',
  hi: '힌디어',
}

/** Letters only Vietnamese uses among the Latin-script languages */
const VIETNAMESE = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i

/** Whether the text is already written in the UI language, as far as its script tells. */
function inLanguage(text: string, lang: string): boolean {
  switch (lang) {
    case 'ko':
      return /[가-힣]/.test(text)
    case 'ja':
      return /[\u3040-\u30ff]/.test(text)
    case 'zh':
    case 'zh-TW':
      return /[\u4e00-\u9fff]/.test(text) && !/[가-힣\u3040-\u30ff]/.test(text)
    case 'vi':
      return VIETNAMESE.test(text)
    case 'th':
      return /[\u0e00-\u0e7f]/.test(text)
    case 'ru':
      return /[\u0400-\u04ff]/.test(text)
    case 'ar':
      return /[\u0600-\u06ff]/.test(text)
    case 'he':
      return /[\u0590-\u05ff]/.test(text)
    case 'hi':
      return /[\u0900-\u097f]/.test(text)
    case 'en':
      return (
        /[a-z]/i.test(text) &&
        !VIETNAMESE.test(text) &&
        !/[^\p{Script=Latin}\s\p{P}\p{S}\d]/u.test(text)
      )
    default:
      // other Latin-script languages cannot be told apart by their letters
      return false
  }
}

/**
 * Where a translation goes when the person has not picked a language: into the UI
 * language, or, for a text already in it, into English (into Korean from an English UI).
 */
export function translateTarget(lang: string, text: string): string {
  if (!inLanguage(text, lang)) return lang
  return lang === 'en' ? 'ko' : 'en'
}

/**
 * Edit one text box. Polishing, shortening and sharpening keep the text's own language;
 * a translation goes into `target`, or the default of translateTarget.
 */
export function rewriteRequest(
  text: string,
  mode: RewriteMode,
  lang: string,
  target: string = translateTarget(lang, text),
): { system: string; user: string } {
  const lines = text.split('\n').length
  const ko = lang === 'ko'
  const task: Record<RewriteMode, string> = ko
    ? {
        polish: '자연스럽고 매끄럽게 다듬으세요. 뜻과 사실은 그대로 두고, 글과 같은 언어로 씁니다.',
        shorter: '뜻은 그대로 두고 절반 정도 길이로 줄이세요. 글과 같은 언어로 씁니다.',
        catchy:
          '포스터에 어울리게 눈길을 끄는 문구로 바꾸세요. 사실은 바꾸지 않고, 글과 같은 언어로 씁니다.',
        translate: `자연스러운 ${KO_LANG_NAMES[target] ?? aiLanguageName(target)}로 옮기세요.`,
      }
    : {
        polish:
          'Polish it so it reads smoothly. Keep the meaning, the facts and the same language as the text.',
        shorter:
          'Cut it to about half the length, keeping the meaning and the same language as the text.',
        catchy:
          'Make it catchy, as a poster line. Do not change the facts; keep the same language as the text.',
        translate: `Translate it into natural ${aiLanguageName(target)}.`,
      }
  const system = ko
    ? `디자인에 들어갈 글 상자의 문구를 고칩니다. ${task[mode]}\n고친 글만 답하세요. 설명, 따옴표, 머리말은 쓰지 않습니다.${lines > 1 ? ` 지금 글은 ${lines}줄이니 줄 나눔을 비슷하게 유지하세요.` : ' 한 줄로 답하세요.'}`
    : `You edit the words of one text box in a design. ${task[mode]}\nAnswer with the edited text only: no explanation, quotes or preamble.${lines > 1 ? ` The text has ${lines} lines; keep a similar line layout.` : ' Answer in one line.'}`
  return { system, user: text }
}

/** The edited text in an answer, or null when nothing usable came back. */
export function cleanRewrite(raw: string, original: string): string | null {
  let text = raw.replace(/```[a-z]*/gi, '').trim()
  // a "Here is…:" or "다듬은 글:" lead-in on its own line
  text = text.replace(
    /^(?:here(?:'s| is)[^\n]*:|[^\n]{0,20}(?:다듬은|고친|바꾼|줄인|옮긴)[^\n]{0,10}:)\s*\n/i,
    '',
  )
  text = text
    .split('\n')
    .map((l) => tidy(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text) return null
  const limit = Math.max(original.split('\n').length * 2 + 2, 6)
  return text.split('\n').slice(0, limit).join('\n')
}

// ---- filling a design's own words ----

/** One text box the AI may rewrite: where it is and what it says now. */
export interface FillSlot {
  id: string
  page: number
  text: string
}

/** Longest answer taken for a fill (every box of a long card news fits in a fraction). */
export const MAX_FILL_CHARS = 12_000
/** Boxes offered at most; a design with more keeps the rest as they are. */
const MAX_FILL_SLOTS = 80

/** The design's text boxes, page by page, top to bottom: the slots a fill answers. */
export function fillSlots(doc: DesignDoc): FillSlot[] {
  const slots: FillSlot[] = []
  doc.pages.forEach((pg, page) => {
    const texts = pg.elements
      .filter((e) => e.kind === 'text' && !e.locked && e.text?.trim())
      .sort((a, b) => a.y - b.y || a.x - b.x)
    for (const e of texts) slots.push({ id: e.id, page, text: e.text! })
  })
  return slots.slice(0, MAX_FILL_SLOTS)
}

/**
 * Ask for new words for every slot, keyed `T1:` … in the order given. The
 * design stays: the AI sees each box's words and length, and answers only the
 * boxes it changes.
 */
export function fillRequest(
  slots: readonly FillSlot[],
  request: string,
  lang: string,
  today: string,
): { system: string; user: string } {
  const multi = slots.some((s) => s.page > 0)
  const listed = slots
    .map((s, i) => {
      const lines = s.text.split('\n')
      const where = multi ? `[${s.page + 1}] ` : ''
      return `T${i + 1}: ${where}${lines.join('\n')}`
    })
    .join('\n')
  const system =
    lang === 'ko'
      ? [
          '당신은 이미 디자인된 포스터·안내문·카드뉴스의 글을 바꿔 쓰는 카피라이터입니다. 배치와 색은 그대로 두고 글만 바꿉니다.',
          `오늘: ${today}.`,
          '아래 글 상자 목록은 지금 디자인에 들어 있는 글입니다. 요청에 맞게 각 상자의 글을 새로 쓰세요.',
          '- 상자마다 지금 글과 비슷한 길이와 줄 수로 씁니다. 제목은 짧게, 날짜·장소 같은 칸은 그 역할 그대로 씁니다.',
          '- 숫자 하나, 기호, 쪽 번호처럼 꾸밈으로 보이는 상자는 그대로 둡니다.',
          '- 요청에 없는 사실(날짜, 장소, 전화번호, 이름)은 지어내지 말고 "(날짜)"처럼 빈칸으로 남깁니다.',
          '- [2]처럼 대괄호의 숫자는 그 상자가 있는 쪽입니다. 답에는 쓰지 않습니다.',
          '답은 바꾼 상자만 "T번호: 새 글" 줄로 씁니다. 여러 줄 글은 다음 줄에 이어 씁니다. 설명, 머리말, 코드 블록, 마크다운 강조는 쓰지 않습니다.',
        ].join('\n')
      : [
          'You rewrite the words of a poster, notice or card news that is already designed. The layout and colours stay; only the words change.',
          `Write the new words in ${aiLanguageName(lang)} unless the request asks for another language.`,
          `Today: ${today}.`,
          'The list below is the text boxes in the design now. Write new words for each box to fit the request.',
          '- Keep each box close to its current length and number of lines. Titles stay short; a date or place box stays a date or place.',
          '- Leave boxes that look decorative (a lone number, a symbol, a page number) as they are.',
          '- Do not invent facts the request does not give (dates, places, phone numbers, names): leave a blank such as "(date)".',
          '- A number in brackets such as [2] is the page the box is on. Do not write it in the answer.',
          'Answer only the boxes you change, one "T<number>: new text" line each; a text of several lines continues on the next lines. No explanation, preamble, code block or markdown emphasis.',
        ].join('\n')
  const user =
    lang === 'ko'
      ? `요청:\n${request.trim()}\n\n글 상자:\n${listed}`
      : `Request:\n${request.trim()}\n\nText boxes:\n${listed}`
  return { system, user }
}

/**
 * The new words in an answer, by slot index (0-based). Lines before the first
 * key are dropped; a line with no key continues the box above it; a page mark
 * the model copied is taken off.
 */
export function parseFill(raw: string, count: number): Map<number, string> {
  const out = new Map<number, string[]>()
  let current: number | null = null
  for (const line of raw.replace(/```[a-z]*/gi, '').split('\n')) {
    const key = /^\s*(?:[-*]\s*)?\**\s*T\s*(\d+)\s*\**\s*[:：.)]\s*(.*)$/i.exec(line)
    if (key) {
      const index = Number(key[1]) - 1
      current = index >= 0 && index < count ? index : null
      if (current !== null) out.set(current, [tidy(key[2]!.replace(/^\[\d+\]\s*/, ''))])
      continue
    }
    if (current === null) continue
    const text = tidy(line)
    if (text) out.get(current)!.push(text)
    else current = null
  }
  const result = new Map<number, string>()
  for (const [index, lines] of out) {
    const text = lines.join('\n').trim()
    if (text) result.set(index, text)
  }
  return result
}

/**
 * The design with the new words in place. Each box keeps its width and look;
 * a longer text gets a smaller size (down to 60%) so it keeps to the lines the
 * box had, and the box grows only if it still does not fit. Returns how many
 * boxes changed.
 */
export function applyFill(
  doc: DesignDoc,
  slots: readonly FillSlot[],
  words: ReadonlyMap<number, string>,
): { doc: DesignDoc; changed: number } {
  const byId = new Map<string, string>()
  words.forEach((text, index) => {
    const slot = slots[index]
    if (slot && text !== slot.text) byId.set(slot.id, text)
  })
  const pages = doc.pages.map((pg) => ({
    ...pg,
    elements: pg.elements.map((e) => {
      const text = byId.get(e.id)
      if (text === undefined || !e.text) return e
      const size = e.fontSize ?? 48
      const weight = e.fontWeight ?? 400
      const lineHeight = e.lineHeight ?? 1.35
      const room = Math.max(
        estimateLines(e.text, size, e.w, weight),
        Math.floor(e.h / (size * lineHeight)),
        1,
      )
      const fontSize = fitSize(text, e.w, size, Math.max(10, Math.round(size * 0.6)), room, weight)
      const h = Math.max(
        e.h,
        Math.ceil(estimateLines(text, fontSize, e.w, weight) * fontSize * lineHeight),
      )
      return { ...e, text, fontSize, h }
    }),
  }))
  return { doc: { ...doc, pages }, changed: byId.size }
}
