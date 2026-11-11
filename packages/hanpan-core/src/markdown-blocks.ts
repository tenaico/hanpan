/**
 * Markdown (as the 글집 templates and AI answers write it) → document blocks, so
 * a template opens as a HWP or Word document with the same look as a report
 * made from a map. Headings become the title and chapters, `###`/`####` items,
 * lists items with the report symbols, tables real tables, `>` notes ※ lines.
 * Inline marks (**bold**, `code`, links) are reduced to their text: the look
 * comes from the theme. A line that is only `![caption](picture:<id>)` is a
 * picture the caller supplies; the picture's credit goes on a note line under it.
 */
import type { DocBlock } from './blocks'
import { reportMarker } from './numbering'
import type { PanImage } from './outline'

export interface MarkdownPicture {
  image: PanImage
  /** the line under the picture saying whose it is and on what terms */
  credit: string
}

export interface MarkdownBlocksOptions {
  /** the picture for a `picture:<id>` line; without it, or for an unknown id, the line is its caption */
  picture?: ((id: string) => MarkdownPicture | undefined) | undefined
}

const PICTURE_LINE = /^!\[([^\]]*)\]\(picture:([a-z0-9-]+)\)$/

export function plainInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .trim()
}

const TABLE_RULE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/

/**
 * A Markdown table starting at `lines[i]` (a `|` row followed by a `| --- |`
 * rule): its rows as plain text and the index after it, or null when there is none.
 */
export function markdownTableAt(
  lines: readonly string[],
  i: number,
): { rows: string[][]; next: number } | null {
  const line = lines[i]?.trim() ?? ''
  if (!line.startsWith('|') || i + 1 >= lines.length || !TABLE_RULE.test(lines[i + 1]!.trim()))
    return null
  const rows: string[][] = [cells(line)]
  let next = i + 2
  while (next < lines.length && lines[next]!.trim().startsWith('|'))
    rows.push(cells(lines[next++]!))
  return { rows, next }
}

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => plainInline(c))
}

export function markdownToBlocks(
  markdown: string,
  options: MarkdownBlocksOptions = {},
): DocBlock[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: DocBlock[] = []
  let sawTitle = false
  /** depth of prose under the last heading */
  let depth = 0
  let i = 0
  if (lines[0]?.trim() === '---') {
    // a front-matter block: not document content
    i = lines.findIndex((l, j) => j > 0 && l.trim() === '---') + 1
  }
  while (i < lines.length) {
    const raw = lines[i]!
    const line = raw.trim()
    if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      i++
      continue
    }
    if (line.startsWith('```')) {
      // a fenced block (box drawings, examples): its lines as they are
      i++
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) {
        const text = lines[i]!.replace(/\s+$/, '')
        if (text.trim()) blocks.push({ kind: 'para', depth, text, role: 'body' })
        i++
      }
      i++
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1]!.length
      const text = plainInline(heading[2]!)
      if (level === 1 && !sawTitle) {
        blocks.push({ kind: 'title', text })
        sawTitle = true
      } else if (level <= 2) {
        const m = /^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]\.|\d+\.)\s*(.*)$/.exec(text)
        blocks.push({ kind: 'chapter', label: m ? m[1]! : '', text: m ? m[2]! : text })
        depth = 0
      } else {
        const itemDepth = Math.min(level - 3, 2)
        blocks.push({ kind: 'item', depth: itemDepth, marker: '', text })
        depth = itemDepth
      }
      i++
      continue
    }
    const table = markdownTableAt(lines, i)
    if (table) {
      blocks.push({ kind: 'table', rows: table.rows, header: true })
      i = table.next
      continue
    }
    const picture = PICTURE_LINE.exec(line)
    const supplied = picture ? options.picture?.(picture[2]!) : undefined
    if (picture && supplied) {
      blocks.push({ kind: 'image', depth, image: supplied.image })
      const caption = plainInline(picture[1]!)
      blocks.push({
        kind: 'para',
        depth,
        text: caption ? `${caption} — ${supplied.credit}` : supplied.credit,
        role: 'note',
      })
      i++
      continue
    }
    if (line.startsWith('>')) {
      const text = plainInline(line.replace(/^>\s?/, ''))
      if (text.startsWith('※'))
        blocks.push({ kind: 'reference', depth, text: text.replace(/^※\s*/, '') })
      else if (text) blocks.push({ kind: 'para', depth, text, role: 'note' })
      i++
      continue
    }
    const list = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(raw)
    if (list) {
      const level = Math.floor(list[1]!.replace(/\t/g, '  ').length / 2)
      const itemDepth = depth + 1 + level
      const ordered = /\d/.test(list[2]!)
      blocks.push({
        kind: 'item',
        depth: itemDepth,
        marker: ordered ? list[2]! : reportMarker(itemDepth),
        text: plainInline(list[3]!),
      })
      i++
      continue
    }
    // a paragraph; Korean documents indent sub-points (가. 나.) with spaces
    const indent = Math.floor((raw.length - raw.trimStart().length) / 2)
    blocks.push({
      kind: 'para',
      depth: depth + Math.max(0, indent - 1),
      text: plainInline(line),
      role: 'body',
    })
    i++
  }
  if (!sawTitle) blocks.unshift({ kind: 'title', text: '' })
  return blocks
}
