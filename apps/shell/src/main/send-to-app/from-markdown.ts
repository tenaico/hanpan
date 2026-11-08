/**
 * 다른 앱으로 보내기, 뒤 절반: Markdown → 대상 편집기의 새 문서 바이트.
 *
 * 이미 있는 작성기를 그대로 쓴다.
 * - 워드·한글·웹 문서: 마크다운 변환기와 같은 `markdownToBlocks` → `blocksToDocx`/`blocksToHwp`/`blocksToHtml`
 * - 파워포인트: H1·H2마다 슬라이드 → 생성 창의 지도 → PPT와 같은 `outlineToOps` + `buildDeck`
 * - 마인드맵: 마인드맵 엔진의 개요 읽기(`createXmindDocumentFromOutline`)
 * - AI 마크다운: 다듬은 Markdown 그대로
 *
 * Electron이 없다. 시험은 `tests/send-to-app/convert.test.ts`.
 */
import {
  DOC_THEMES,
  blocksToDocx,
  blocksToHtml,
  blocksToHwp,
  markdownToBlocks,
  plainInline,
  REPORT_SYMBOLS,
  type DocBlock,
  type HwpEngine,
} from '@genoffice/hanpan-core'
import { createXmindDocumentFromOutline } from '@genoffice/xmind-engine'
import { buildDeck } from '../generate/convert'
import { safeFileName } from '../hanpan/markdown-convert'
import {
  MAX_OUTLINE_SLIDES,
  outlineToOps,
  type OutlineParagraph,
  type OutlineSlide,
} from '../mcp/pptx-outline'
import { TARGET_EXTENSION, type SendTarget } from './targets'

const FENCE = /^\s*(```|~~~)/
const HEADING_LINE = /^(#{1,6})(\s+.*)$/

/** 줄마다 코드 울타리 안인지와 함께 */
function linesWithFences(markdown: string): { line: string; fenced: boolean }[] {
  let inFence = false
  return markdown.split('\n').map((line) => {
    if (FENCE.test(line)) {
      inFence = !inFence
      return { line, fenced: true }
    }
    return { line, fenced: inFence }
  })
}

/** 코드 울타리 밖 머리글의 수준을 `by`만큼 내린다(6에서 멈춘다) */
function demoteHeadings(markdown: string, by = 1): string {
  return linesWithFences(markdown)
    .map(({ line, fenced }) => {
      const heading = fenced ? null : HEADING_LINE.exec(line)
      return heading ? `${'#'.repeat(Math.min(6, heading[1]!.length + by))}${heading[2]}` : line
    })
    .join('\n')
}

/**
 * 보낼 Markdown의 모양을 맞춘다. 문서 제목(`#`)이 하나 맨 위에 있게 한다.
 * - `#`이 없으면 탭 제목을 올린다.
 * - 글이 `#`으로 시작하고 `#`이 더 있으면(워드의 "제목" 스타일과 "제목 1"이 모두 `#`로 읽힌다)
 *   첫 줄을 문서 제목으로 두고 그 뒤의 머리글을 한 수준씩 내린다.
 * - 글이 `#`으로 시작하지 않는데 `#`이 여럿이면 탭 제목 아래로 모든 머리글을 내린다.
 * 빈 줄은 둘 이상 잇지 않고, 끝에 줄바꿈 하나를 둔다.
 */
export function normalizeMarkdown(markdown: string, title: string): string {
  let text = markdown
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim()
  const h1 = linesWithFences(text).filter(({ line, fenced }) => !fenced && /^#\s+\S/.test(line))
  if (h1.length === 0) text = `# ${title}\n\n${text}`
  else if (h1.length > 1) {
    const firstLine = text.split('\n', 1)[0]!
    text = /^#\s+\S/.test(firstLine)
      ? `${firstLine}\n${demoteHeadings(text.slice(firstLine.length))}`
      : `# ${title}\n\n${demoteHeadings(text)}`
  }
  return `${text.replace(/\n{3,}/g, '\n\n').trim()}\n`
}

/** 한 슬라이드에 넣는 문단 수. 넘치면 "제목 (2)" 슬라이드로 이어 간다 */
export const MAX_PARAGRAPHS_PER_SLIDE = 8

const TABLE_RULE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/
const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => plainInline(c.replace(/\\\|/g, '|')))
}

/**
 * Markdown → 슬라이드 계획. `#`과 `##`가 새 슬라이드를 열고 그 글이 제목이다. `###` 이하는
 * 굵은 줄, 목록은 수준대로 글머리표(번호 목록은 번호), 표는 행마다 칸을 ` · `로 이은 줄,
 * 나머지 줄은 문단이다. 머리글보다 앞선 글은 문서 제목을 단 슬라이드에 들어간다.
 * 문단이 많은 슬라이드는 "제목 (2)"로 이어진다. 굵게·링크 같은 글 안 표시는 글자만 남는다.
 */
export function markdownToSlides(markdown: string, title: string): OutlineSlide[] {
  const slides: OutlineSlide[] = []
  let current: OutlineSlide | null = null
  const add = (paragraph: OutlineParagraph) => {
    if (!paragraph.text) return
    current ??= (slides.push({ title, paragraphs: [] }), slides.at(-1)!)
    current.paragraphs.push(paragraph)
  }
  const lines = linesWithFences(markdown.replace(/\r\n?/g, '\n'))
  for (let i = 0; i < lines.length; i++) {
    const { line, fenced } = lines[i]!
    if (fenced) {
      if (!FENCE.test(line) && line.trim()) add({ text: line.trim() })
      continue
    }
    const text = line.trim()
    if (!text || /^(-{3,}|\*{3,}|_{3,})$/.test(text)) continue
    const heading = /^(#{1,6})\s+(.*)$/.exec(text)
    if (heading) {
      const headingText = plainInline(heading[2]!)
      if (heading[1]!.length <= 2) {
        current = { title: headingText, paragraphs: [] }
        slides.push(current)
      } else add({ text: headingText, bold: true })
      continue
    }
    if (
      text.startsWith('|') &&
      i + 1 < lines.length &&
      TABLE_RULE.test(lines[i + 1]!.line.trim())
    ) {
      add({ text: tableCells(text).join(' · ') })
      i += 2
      while (i < lines.length && lines[i]!.line.trim().startsWith('|')) {
        add({ text: tableCells(lines[i]!.line).join(' · ') })
        i++
      }
      i--
      continue
    }
    const list = LIST.exec(line)
    if (list) {
      const level = Math.floor(list[1]!.replace(/\t/g, '  ').length / 2)
      add({
        text: plainInline(list[3]!),
        bullet: /\d/.test(list[2]!) ? 'number' : 'char',
        ...(level > 0 ? { level: Math.min(level, 4) } : {}),
      })
      continue
    }
    add({ text: plainInline(text.replace(/^>\s?/, '')) })
  }
  // 넘치는 슬라이드는 같은 제목에 번호를 붙여 이어 간다
  return slides.flatMap((slide) => {
    if (slide.paragraphs.length <= MAX_PARAGRAPHS_PER_SLIDE) return [slide]
    const parts: OutlineSlide[] = []
    for (let start = 0; start < slide.paragraphs.length; start += MAX_PARAGRAPHS_PER_SLIDE) {
      const n = parts.length + 1
      parts.push({
        ...(slide.title ? { title: n === 1 ? slide.title : `${slide.title} (${n})` } : {}),
        paragraphs: slide.paragraphs.slice(start, start + MAX_PARAGRAPHS_PER_SLIDE),
      })
    }
    return parts
  })
}

/**
 * Markdown → 마인드맵 엔진이 읽는 개요 글. 문서 제목이 언제나 중심 주제가 되도록, 제목을
 * 시트 이름(`#`)과 유일한 바깥 주제(`##`)로 두고 나머지 머리글을 한 수준씩 내린다. 주제가
 * 될 줄(머리글·목록)은 굵게·링크 표시를 떼고, 문단·표는 그대로 메모가 된다.
 */
export function markdownToMapOutline(markdown: string, title: string): string {
  const normalized = normalizeMarkdown(markdown, title)
  const lines = linesWithFences(demoteHeadings(normalized)).map(({ line, fenced }) => {
    if (fenced) return line
    const heading = HEADING_LINE.exec(line)
    if (heading) return `${heading[1]} ${plainInline(heading[2]!)}`
    const list = LIST.exec(line)
    if (list) return `${list[1]}${list[2]} ${plainInline(list[3]!)}`
    return line
  })
  const central = /^##\s+(.*)$/.exec(lines[0] ?? '')?.[1] ?? title
  return `# ${central}\n\n${lines.join('\n')}`
}

const OUTLINE_MARKERS: Record<string, string> = {
  [REPORT_SYMBOLS[0]]: '•',
  [REPORT_SYMBOLS[1]]: '–',
  [REPORT_SYMBOLS[2]]: '–',
  [REPORT_SYMBOLS[3]]: '–',
}

/** 한국 문서 기능이 꺼졌을 때(결정 0091): □ ○ ― · 대신 •와 – */
function withoutReportSymbols(blocks: DocBlock[]): DocBlock[] {
  return blocks.map((b) =>
    b.kind === 'item' && OUTLINE_MARKERS[b.marker]
      ? { ...b, marker: OUTLINE_MARKERS[b.marker]! }
      : b,
  )
}

export interface BuildOptions {
  /** 새 문서의 제목과 파일 이름(확장자 없이): 원본 탭의 제목 */
  title: string
  /** 사용자 언어의 "제목 없음"(제목 없는 지도 시트) */
  untitled: string
  /** 한국 문서 기능(결정 0091): 켜지면 보고서 기호(□ ○), 꺼지면 •와 – */
  korean: boolean
  loadHwpEngine(): Promise<HwpEngine>
}

export type TargetEditor = 'docs' | 'slides' | 'hwp' | 'markdown' | 'mindmap' | 'html'

export interface BuiltDocument {
  editor: TargetEditor
  bytes: Uint8Array
  fileName: string
  title: string
}

/** 슬라이드가 `MAX_OUTLINE_SLIDES`(100장)를 넘는다 */
export class TooManySlidesError extends Error {
  constructor(readonly count: number) {
    super(`the text makes ${count} slides; the limit is ${MAX_OUTLINE_SLIDES}`)
  }
}

/** Markdown 한 벌로 대상 편집기의 새 문서를 만든다. 아무것도 열지 않는다 */
export async function buildTargetDocument(
  markdown: string,
  target: SendTarget,
  options: BuildOptions,
): Promise<BuiltDocument> {
  const name = safeFileName(options.title)
  const done = (bytes: Uint8Array): BuiltDocument => ({
    editor: target,
    bytes,
    fileName: `${name}.${TARGET_EXTENSION[target]}`,
    title: name,
  })
  const normalized = normalizeMarkdown(markdown, name)
  switch (target) {
    case 'markdown':
      return done(new TextEncoder().encode(normalized))
    case 'slides': {
      const slides = markdownToSlides(markdown, name)
      if (slides.length > MAX_OUTLINE_SLIDES) throw new TooManySlidesError(slides.length)
      return done(await buildDeck(outlineToOps(slides)))
    }
    case 'mindmap': {
      const doc = await createXmindDocumentFromOutline(markdownToMapOutline(markdown, name), {
        untitled: options.untitled,
      })
      return done(await doc.save())
    }
    default: {
      const raw = markdownToBlocks(normalized)
      const blocks = options.korean ? raw : withoutReportSymbols(raw)
      // 한글 문서는 보고서 모양(한컴 글꼴), 워드·웹 문서는 어느 PC에나 있는 글꼴(Arial, 한글은 맑은 고딕으로 보임)
      const theme = DOC_THEMES[target === 'hwp' && options.korean ? 'report' : 'basic']!
      if (target === 'docs') return done(await blocksToDocx(blocks, theme))
      if (target === 'html') return done(new TextEncoder().encode(blocksToHtml(blocks, theme)))
      return done(blocksToHwp(await options.loadHwpEngine(), blocks, theme, 'hwpx').bytes)
    }
  }
}
