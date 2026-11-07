/**
 * 다른 앱으로 보내기, 앞 절반: 각 편집기의 내용을 Markdown으로.
 *
 * 글자를 읽는 일은 이미 있는 읽기가 한다. 여기서는 그 결과를 Markdown 모양으로 다듬기만 한다.
 * - 워드·PDF·한글·EPUB·엑셀 파일: `@genoffice/file-parse`의 글(가리기가 적용된 다른 파일 읽기)
 * - 파워포인트: 슬라이드 엔진의 덱 모델(가린 글은 `{{이름}}`)
 * - 마인드맵: 편집기의 개요 글을 엔진의 읽기로 다시 나무로
 * - 웹 문서: HTML 원본(가리기가 적용된 뒤)을 parse5로
 *
 * Electron이 없다. 시험은 `tests/send-to-app/convert.test.ts`.
 */
import { parse } from 'parse5'
import { placeholderSource } from '@genoffice/agent-core/redact-core'
import type { Paragraph, SlideDeck, SlideElement, TableElement } from '@genoffice/pptx-engine'
import {
  noteText,
  OUTLINE_KIND_MARKS,
  outlineToSheets,
  type XmindTopic,
} from '@genoffice/xmind-engine'

/** 블록 사이에 빈 줄 하나, 끝에 줄바꿈 하나 */
function assemble(blocks: readonly string[]): string {
  const kept = blocks.map((b) => b.replace(/\s+$/, '')).filter((b) => b.trim())
  return kept.length ? `${kept.join('\n\n')}\n` : ''
}

/** 표 칸 안의 `|`는 칸 구분으로 읽히지 않게 막는다(이미 막힌 것은 그대로) */
function cellText(text: string): string {
  return text
    .replace(/\s*\n\s*/g, ' ')
    .replace(/(^|[^\\])\|/g, '$1\\|')
    .trim()
}

/** GFM 표: 첫 줄이 머리글, 짧은 줄은 빈 칸으로 채운다 */
export function markdownTable(rows: readonly (readonly string[])[]): string {
  const width = Math.max(1, ...rows.map((r) => r.length))
  const line = (cells: readonly string[]) =>
    `| ${Array.from({ length: width }, (_, i) => cellText(cells[i] ?? '')).join(' | ')} |`
  return [
    line(rows[0] ?? []),
    `| ${Array(width).fill('---').join(' | ')} |`,
    ...rows.slice(1).map(line),
  ].join('\n')
}

const HEADING = /^#{1,6}\s+\S/
const LIST_ITEM = /^\s*([-*+]|\d+[.)])\s+\S/
/** file-parse가 표의 한 행을 쓰는 모양: 칸을 ` | `로 잇는다 */
const ROW_SEPARATOR = ' | '

/**
 * 워드 문서의 글(file-parse: 제목 `#`, 목록 `- `, 표의 행은 `a | b`, 블록 사이 빈 줄 없음)을
 * Markdown으로. 두 줄 이상 이어지는 행은 머리글 줄이 있는 표가 된다.
 */
export function docxTextToMarkdown(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: string[] = []
  let list: string[] = []
  const flushList = () => {
    if (list.length) blocks.push(list.join('\n'))
    list = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.replace(/\s+$/, '')
    if (!line.trim()) {
      flushList()
      continue
    }
    if (LIST_ITEM.test(line)) {
      list.push(line)
      continue
    }
    flushList()
    if (!HEADING.test(line) && line.includes(ROW_SEPARATOR)) {
      const rows: string[] = []
      let j = i
      while (j < lines.length && lines[j]!.includes(ROW_SEPARATOR) && !HEADING.test(lines[j]!)) {
        rows.push(lines[j]!)
        j++
      }
      if (rows.length >= 2) {
        blocks.push(markdownTable(rows.map((r) => r.split(ROW_SEPARATOR))))
        i = j - 1
        continue
      }
    }
    blocks.push(line)
  }
  flushList()
  return assemble(blocks)
}

/**
 * 숫자 문자 참조(`&#51648;`, `&#x41;`)를 글자로. openpyxl 같은 작성기가 inline 문자열에 남기는데
 * file-parse의 XML 읽기는 이것을 풀지 않는다.
 */
function decodeCharRefs(text: string): string {
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi, (whole, code: string) => {
    const n = code[0] === 'x' || code[0] === 'X' ? parseInt(code.slice(1), 16) : Number(code)
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole
  })
}

/** `(12 empty)`: file-parse가 길게 이어진 빈 칸을 줄여 쓴 표시 */
const EMPTY_RUN = /^\((\d+) empty\)$/

/**
 * 엑셀 파일의 글(file-parse: 시트마다 `# 이름`, 행마다 칸을 ` | `로 이음)에서 한 시트를 골라
 * Markdown 표로. 시트 이름을 모르거나 그 시트가 없으면 첫 시트다. 첫 행이 머리글이 된다.
 */
export function sheetTextToMarkdown(text: string, sheetName: string | null): string {
  const sections: { name: string; rows: string[] }[] = []
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = /^# (.*)$/.exec(line)
    if (heading) sections.push({ name: heading[1]!.trim(), rows: [] })
    else if (sections.length) sections.at(-1)!.rows.push(line)
  }
  const section = sections.find((s) => s.name === sheetName) ?? sections[0]
  if (!section) return ''
  const rows = section.rows
    .filter((row) => row.trim() && !/^\[(image-only|No extractable)/.test(row))
    .map((row) =>
      row.split(ROW_SEPARATOR).flatMap((cell) => {
        const run = EMPTY_RUN.exec(cell.trim())
        return run ? Array<string>(Number(run[1])).fill('') : [decodeCharRefs(cell.trim())]
      }),
    )
    .filter((cells) => cells.some((c) => c !== ''))
  if (!rows.length) return assemble([`# ${section.name}`])
  // 오른쪽 끝의 빈 열은 표에 넣지 않는다
  const filledWidth = (cells: string[]): number => {
    for (let i = cells.length - 1; i >= 0; i--) if (cells[i] !== '') return i + 1
    return 0
  }
  const width = Math.max(...rows.map(filledWidth))
  return assemble([`# ${section.name}`, markdownTable(rows.map((cells) => cells.slice(0, width)))])
}

// ---- 파워포인트 ----

interface DeckReadOptions {
  /** 가린 글(실행·요소)을 `{{이름}}`으로 읽는다(다른 파일로 읽힐 때의 규칙) */
  withhold?: boolean
}

function paragraphText(p: Paragraph, options: DeckReadOptions): string {
  return p.runs
    .map((r) => (options.withhold && r.redact ? placeholderSource(r.redact) : r.text))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

type TextLike = Extract<SlideElement, { type: 'text' | 'shape' }>

function textOf(el: TextLike, options: DeckReadOptions): string[] {
  if (options.withhold && el.redact) return [placeholderSource(el.redact)]
  return (el.text?.paragraphs ?? []).map((p) => paragraphText(p, options)).filter(Boolean)
}

function flatten(elements: readonly SlideElement[]): SlideElement[] {
  return elements.flatMap((el) => (el.type === 'group' ? flatten(el.children) : [el]))
}

const TITLE_PLACEHOLDERS = new Set(['title', 'ctrTitle'])
/** 머리글 자리가 아닌 본문 자리: 글머리표가 마스터에서 오므로 문단을 목록으로 읽는다 */
const BODY_PLACEHOLDERS = new Set(['body', 'obj'])

function tableMarkdown(el: TableElement, options: DeckReadOptions): string {
  if (options.withhold && el.redact) return placeholderSource(el.redact)
  const rows = el.rows.map((row) =>
    row
      .filter((cell) => !cell.merged)
      .map((cell) => (cell.text?.paragraphs ?? []).map((p) => paragraphText(p, options)).join(' ')),
  )
  return rows.length ? markdownTable(rows) : ''
}

function slideBody(el: TextLike, options: DeckReadOptions): string[] {
  if (options.withhold && el.redact) return [placeholderSource(el.redact)]
  const asList = BODY_PLACEHOLDERS.has(el.placeholder ?? '')
  const blocks: string[] = []
  let list: string[] = []
  const counters: number[] = []
  const flush = () => {
    if (list.length) blocks.push(list.join('\n'))
    list = []
    counters.length = 0
  }
  for (const p of el.text?.paragraphs ?? []) {
    const text = paragraphText(p, options)
    if (!text) continue
    const type = p.bullet?.type
    const bulleted = type ? type !== 'none' : asList || (p.level ?? 0) > 0
    if (!bulleted) {
      flush()
      blocks.push(text)
      continue
    }
    const level = Math.max(0, Math.min(p.level ?? 0, 5))
    counters.length = level + 1
    counters[level] = (counters[level] ?? 0) + 1
    const marker = type === 'number' ? `${counters[level]}.` : '-'
    list.push(`${'  '.repeat(level)}${marker} ${text}`)
  }
  flush()
  return blocks
}

/**
 * 덱 → Markdown. 슬라이드마다 제목이 머리글(첫 슬라이드는 `#`, 나머지는 `##`)이고, 글머리표
 * 문단은 수준대로 들여 쓴 목록, 나머지 문단은 문단, 표는 표다. 그림·차트·발표자 노트는 뺀다.
 * 제목 자리가 없는 슬라이드(글상자로만 만든 덱)는 맨 위의 한 줄짜리 글상자를 제목으로 본다.
 */
export function deckToMarkdown(deck: SlideDeck, options: DeckReadOptions = {}): string {
  const blocks: string[] = []
  deck.slides.forEach((slide, index) => {
    const elements = flatten(slide.elements)
      .filter(
        (el): el is TextLike | TableElement =>
          el.type === 'text' || el.type === 'shape' || el.type === 'table',
      )
      .sort(
        (a, b) =>
          (a.transform?.offset.y ?? 0) - (b.transform?.offset.y ?? 0) ||
          (a.transform?.offset.x ?? 0) - (b.transform?.offset.x ?? 0),
      )
    const texts = elements.filter((el): el is TextLike => el.type !== 'table')
    let title =
      texts.find((el) => TITLE_PLACEHOLDERS.has(el.placeholder ?? '')) ??
      texts.find((el) => textOf(el, options).length > 0)
    if (title && !TITLE_PLACEHOLDERS.has(title.placeholder ?? '')) {
      const lines = textOf(title, options)
      if (lines.length !== 1 || lines[0]!.length > 150) title = undefined
    }
    const titleText = title ? textOf(title, options).join(' ') : ''
    blocks.push(`${index === 0 ? '#' : '##'} ${titleText || String(index + 1)}`)
    for (const el of elements) {
      if (el === title) continue
      if (el.type === 'table') blocks.push(tableMarkdown(el, options))
      else blocks.push(...slideBody(el, options))
    }
  })
  return assemble(blocks)
}

// ---- 마인드맵 ----

/** 주제가 아닌 개요 항목: 경계 제목과 관계선 글(생성 창의 지도 → PPT와 같은 규칙) */
const NOT_TOPIC_MARKS = [OUTLINE_KIND_MARKS.boundary, OUTLINE_KIND_MARKS.relationship]

function topicTitle(topic: XmindTopic): string {
  return typeof topic.title === 'string' ? topic.title.replace(/\s+/g, ' ').trim() : ''
}

function attached(topic: XmindTopic): XmindTopic[] {
  const list = topic.children?.attached
  return Array.isArray(list) ? list : []
}

function noteLines(topic: XmindTopic): string[] {
  const note = noteText(topic.notes)
  return note
    ? note
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    : []
}

/**
 * 지도의 개요 글(편집기가 내주는 것) → Markdown. 시트마다 중심 주제가 `#`, 큰 가지가 `##`,
 * 그 아래는 들여 쓴 목록이다. 메모는 그 주제 아래 문단(목록이면 들여 쓴 줄)이 된다.
 * 라벨·링크·그림·관계선·경계는 뺀다.
 */
export function mapOutlineToMarkdown(outline: string, untitled: string): string {
  const kept = outline.split('\n').filter((line) => {
    const item = /^[ ]*- (.*)$/.exec(line)
    return !item || !NOT_TOPIC_MARKS.some((mark) => item[1]!.startsWith(`${mark} `))
  })
  const blocks: string[] = []
  for (const sheet of outlineToSheets(kept.join('\n'), { untitled })) {
    const root = sheet.rootTopic
    blocks.push(`# ${topicTitle(root) || untitled}`, ...noteLines(root))
    for (const branch of attached(root)) {
      blocks.push(`## ${topicTitle(branch)}`, ...noteLines(branch))
      const lines: string[] = []
      // 깊이 우선, 되부름 없이(엔진이 깊이를 이미 묶는다)
      const pending = attached(branch)
        .map((topic) => ({ topic, level: 0 }))
        .reverse()
      for (let next = pending.pop(); next; next = pending.pop()) {
        const indent = '  '.repeat(next.level)
        lines.push(`${indent}- ${topicTitle(next.topic)}`)
        for (const line of noteLines(next.topic)) lines.push(`${indent}  ${line}`)
        const below = attached(next.topic)
        for (let i = below.length - 1; i >= 0; i--) {
          pending.push({ topic: below[i]!, level: next.level + 1 })
        }
      }
      if (lines.length) blocks.push(lines.join('\n'))
    }
  }
  return assemble(blocks)
}

// ---- 웹 문서 ----

interface HtmlNode {
  nodeName: string
  tagName?: string
  value?: string
  attrs?: { name: string; value: string }[]
  childNodes?: HtmlNode[]
  content?: HtmlNode
}

const SKIP = new Set([
  'head',
  'script',
  'style',
  'template',
  'noscript',
  'svg',
  'iframe',
  'object',
  'canvas',
  'button',
  'select',
  'input',
  'textarea',
])
const BLOCK = new Set([
  'p',
  'div',
  'section',
  'article',
  'main',
  'header',
  'footer',
  'aside',
  'nav',
  'figure',
  'figcaption',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'table',
  'blockquote',
  'pre',
  'hr',
  'dl',
  'dt',
  'dd',
  'address',
  'details',
  'summary',
  'body',
  'html',
])

const attr = (node: HtmlNode, name: string): string =>
  node.attrs?.find((a) => a.name === name)?.value ?? ''
const kids = (node: HtmlNode): HtmlNode[] => node.childNodes ?? []
const isBlock = (node: HtmlNode): boolean => BLOCK.has(node.nodeName)

function inline(node: HtmlNode): string {
  if (node.nodeName === '#text') return (node.value ?? '').replace(/\s+/g, ' ')
  if (SKIP.has(node.nodeName) || node.nodeName.startsWith('#')) return ''
  const inner = () => kids(node).map(inline).join('')
  switch (node.nodeName) {
    case 'br':
      return ' '
    case 'img':
      return attr(node, 'alt')
    case 'strong':
    case 'b': {
      const text = inner().trim()
      return text ? `**${text}**` : ''
    }
    case 'em':
    case 'i': {
      const text = inner().trim()
      return text ? `*${text}*` : ''
    }
    case 'code': {
      const text = inner().trim()
      return text ? `\`${text}\`` : ''
    }
    case 'a': {
      const text = inner().trim()
      const href = attr(node, 'href')
      return text && /^(https?:|mailto:)/i.test(href) ? `[${text}](${href})` : text
    }
    default:
      return inner()
  }
}

function textContent(node: HtmlNode): string {
  if (node.nodeName === '#text') return node.value ?? ''
  if (SKIP.has(node.nodeName)) return ''
  return kids(node).map(textContent).join('')
}

function listLines(list: HtmlNode, level: number): string[] {
  const ordered = list.nodeName === 'ol'
  const lines: string[] = []
  let n = 0
  for (const li of kids(list)) {
    if (li.nodeName !== 'li') continue
    n++
    const own: string[] = []
    const nested: string[] = []
    for (const child of kids(li)) {
      if (child.nodeName === 'ul' || child.nodeName === 'ol')
        nested.push(...listLines(child, level + 1))
      else if (isBlock(child)) own.push(...htmlBlocks(child).map((b) => b.replace(/\n+/g, ' ')))
      else own.push(inline(child))
    }
    const text = own.join(' ').replace(/\s+/g, ' ').trim()
    lines.push(`${'  '.repeat(level)}${ordered ? `${n}.` : '-'} ${text}`, ...nested)
  }
  return lines
}

function tableRows(table: HtmlNode): string[][] {
  const rows: string[][] = []
  const walk = (node: HtmlNode) => {
    for (const child of kids(node)) {
      if (child.nodeName === 'tr') {
        rows.push(
          kids(child)
            .filter((c) => c.nodeName === 'td' || c.nodeName === 'th')
            .map((c) => kids(c).map(inline).join('').replace(/\s+/g, ' ').trim()),
        )
      } else if (['thead', 'tbody', 'tfoot'].includes(child.nodeName)) walk(child)
    }
  }
  walk(table)
  return rows
}

function htmlBlocks(node: HtmlNode): string[] {
  const blocks: string[] = []
  let line = ''
  const flush = () => {
    const text = line.replace(/\s+/g, ' ').trim()
    if (text) blocks.push(text)
    line = ''
  }
  for (const child of kids(node.content ?? node)) {
    if (SKIP.has(child.nodeName)) continue
    if (!isBlock(child)) {
      line += inline(child)
      continue
    }
    flush()
    const heading = /^h([1-6])$/.exec(child.nodeName)
    if (heading) {
      const text = kids(child).map(inline).join('').replace(/\s+/g, ' ').trim()
      if (text) blocks.push(`${'#'.repeat(Number(heading[1]))} ${text}`)
    } else if (child.nodeName === 'ul' || child.nodeName === 'ol') {
      const lines = listLines(child, 0)
      if (lines.length) blocks.push(lines.join('\n'))
    } else if (child.nodeName === 'table') {
      const rows = tableRows(child)
      if (rows.length) blocks.push(markdownTable(rows))
    } else if (child.nodeName === 'pre') {
      blocks.push(`\`\`\`\n${textContent(child).replace(/\n+$/, '')}\n\`\`\``)
    } else if (child.nodeName === 'blockquote') {
      const inner = htmlBlocks(child)
      if (inner.length) blocks.push(inner.map((b) => b.replace(/^/gm, '> ')).join('\n>\n'))
    } else if (child.nodeName !== 'hr') {
      blocks.push(...htmlBlocks(child))
    }
  }
  flush()
  return blocks
}

/**
 * HTML → Markdown. 제목·문단·목록(겹침 포함)·표·인용·코드 블록과 굵게·기울임·코드·링크를
 * 옮긴다. 스크립트·스타일·양식 요소와 머리(head)는 뺀다. 꾸밈(색, 배치)은 옮기지 않는다.
 */
export function htmlToMarkdown(html: string): string {
  const doc = parse(html) as unknown as HtmlNode
  return assemble(htmlBlocks(doc))
}

// ---- 한글·PDF·EPUB의 글 ----

const ROMAN_HEADING = /^\s*([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]\.)\s*(.+)$/
/** 보고서 항목 기호 → 목록 수준(□ ○ ― ·, 결정 0091의 한국식 기호) */
const REPORT_MARKS: [RegExp, number][] = [
  [/^\s*[□■◇◆]\s*(.+)$/, 0],
  [/^\s*[○◦●]\s*(.+)$/, 1],
  [/^\s*[―–-]\s+(.+)$/, 2],
  [/^\s*[·∙•]\s*(.+)$/, 3],
]

/**
 * 줄 단위 글(한글 문서, PDF, 전자책)을 Markdown으로. 줄마다 문단이고, 로마 숫자 장(Ⅰ.)은
 * `##`, 보고서 기호(□ ○ ― ·)는 수준대로 들여 쓴 목록이 된다. `firstLineTitle`이면 첫 줄이
 * 짧을 때 문서 제목(`#`)으로 본다.
 */
export function plainTextToMarkdown(
  text: string,
  options: { firstLineTitle?: boolean } = {},
): string {
  const blocks: string[] = []
  let list: { level: number; text: string }[] = []
  const flush = () => {
    // 목록은 0수준에서 시작하고 한 번에 한 수준씩만 깊어진다(네 칸 들여 쓴 첫 줄은 코드 블록이 된다)
    let previous = -1
    const lines = list.map((item) => {
      previous = Math.min(item.level, previous + 1)
      return `${'  '.repeat(previous)}- ${item.text}`
    })
    if (lines.length) blocks.push(lines.join('\n'))
    list = []
  }
  let first = true
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) continue
    const roman = ROMAN_HEADING.exec(line)
    const mark = REPORT_MARKS.find(([pattern]) => pattern.test(line))
    if (first && options.firstLineTitle && !roman && !mark && line.trim().length <= 80) {
      blocks.push(`# ${line.trim()}`)
      first = false
      continue
    }
    first = false
    if (mark) {
      list.push({ level: mark[1], text: mark[0].exec(line)![1]!.trim() })
      continue
    }
    flush()
    blocks.push(roman ? `## ${roman[1]} ${roman[2]!.trim()}` : line.trim())
  }
  flush()
  return assemble(blocks)
}
