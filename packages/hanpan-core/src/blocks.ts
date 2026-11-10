/**
 * Outline → document blocks: the format-neutral page content that the HWPX,
 * DOCX and slide writers each render. The writers decide fonts and spacing; the
 * blocks decide what goes on the page, in which order, with which marker and
 * which link key.
 */
import { markerFor, type MarkerStyle } from './numbering'
import type { PanImage, PanNode, PanOutline } from './outline'

export type DocBlock =
  /** the document title */
  | { kind: 'title'; text: string; key?: string | undefined }
  /** a right-aligned line under the title: date, department */
  | { kind: 'meta'; text: string }
  /** a chapter heading (Ⅰ. 추진 배경) */
  | { kind: 'chapter'; label: string; text: string; key?: string | undefined }
  /** a marked item; `depth` 0 is the top item level under the title or chapter */
  | {
      kind: 'item'
      depth: number
      marker: string
      text: string
      /** an https link on the item's text; the writers that cannot link print it after the text */
      href?: string | undefined
      key?: string | undefined
    }
  /**
   * Prose under an item: `note` from the map note, `body` from the AI's flesh-out
   * or the user's typing. `depth` is the owning item's depth.
   */
  | {
      kind: 'para'
      depth: number
      text: string
      role: 'note' | 'body' | 'lead'
      /** the whole paragraph in bold (a headline) */
      bold?: boolean | undefined
      key?: string | undefined
    }
  /** a reference line (※ ...) */
  | { kind: 'reference'; depth: number; text: string; key?: string | undefined }
  | { kind: 'image'; depth: number; image: PanImage; key?: string | undefined }
  | { kind: 'table'; rows: string[][]; header: boolean }
  | { kind: 'pageBreak' }
  /** a closing line: 붙임 list or 끝. */
  | { kind: 'closing'; text: string }

export interface BlockOptions {
  style: MarkerStyle
  /** date line under the title; omitted when undefined */
  date?: string | undefined
  /** department / author line; omitted when undefined */
  department?: string | undefined
  /** put the note text under its item (default true) */
  includeNotes?: boolean | undefined
  /** put AI/hand-written prose under its item (default true) */
  includeBodies?: boolean | undefined
}

/** the link of an item, only when it is an https address */
export function httpsHref(href: string | undefined): string | undefined {
  return href?.startsWith('https://') ? href : undefined
}

/** A note line starting with ※ is a reference line, anything else is prose. */
function noteBlocks(node: PanNode, depth: number): DocBlock[] {
  if (!node.note) return []
  const out: DocBlock[] = []
  for (const line of node.note
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)) {
    if (line.startsWith('※'))
      out.push({ kind: 'reference', depth, text: line.replace(/^※\s*/, ''), key: node.key })
    else out.push({ kind: 'para', depth, text: line, role: 'note', key: node.key })
  }
  return out
}

export function outlineToBlocks(outline: PanOutline, options: BlockOptions): DocBlock[] {
  const includeNotes = options.includeNotes ?? true
  const includeBodies = options.includeBodies ?? true
  const blocks: DocBlock[] = [{ kind: 'title', text: outline.title, key: outline.rootKey }]
  const metaParts = [options.date, options.department].filter(
    (s): s is string => !!s && s.trim() !== '',
  )
  if (metaParts.length) blocks.push({ kind: 'meta', text: metaParts.join('  ') })
  if (includeNotes && outline.note) {
    for (const line of outline.note
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)) {
      blocks.push({ kind: 'para', depth: 0, text: line, role: 'lead', key: outline.rootKey })
    }
  }

  // the first level becomes chapters, and the item ladder starts one level down
  const chapters = options.style === 'chapter-report' || options.style === 'outline'
  const visit = (nodes: readonly PanNode[], depth: number): void => {
    nodes.forEach((node, i) => {
      const marker = markerFor(options.style, depth, i + 1, nodes.length)
      if (chapters && depth === 0) {
        blocks.push({ kind: 'chapter', label: marker, text: node.title, key: node.key })
      } else {
        // in a chapter report the symbol ladder starts one level down
        const itemDepth = chapters ? depth - 1 : depth
        blocks.push({ kind: 'item', depth: itemDepth, marker, text: node.title, key: node.key })
      }
      const ownDepth = chapters ? Math.max(0, depth - 1) : depth
      if (includeBodies && node.body) {
        for (const line of node.body
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)) {
          blocks.push({ kind: 'para', depth: ownDepth, text: line, role: 'body', key: node.key })
        }
      }
      if (includeNotes) blocks.push(...noteBlocks(node, ownDepth))
      if (node.image)
        blocks.push({ kind: 'image', depth: ownDepth, image: node.image, key: node.key })
      visit(node.children, depth + 1)
    })
  }
  visit(outline.nodes, 0)
  return blocks
}

/** Korean official date: 2026. 10. 29. (no leading zeros), optionally with the weekday. */
export function koreanDate(date: Date, withWeekday = false): string {
  const base = `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
  if (!withWeekday) return base
  return `${base}(${'일월화수목금토'[date.getDay()]})`
}

/** Plain text of the blocks, one line per block, markers included: the preview and test view. */
export function blocksToText(blocks: readonly DocBlock[]): string {
  const pad = (depth: number) => '  '.repeat(Math.max(0, depth))
  return blocks
    .map((b) => {
      switch (b.kind) {
        case 'title':
          return b.text
        case 'meta':
          return b.text
        case 'chapter':
          return `${b.label} ${b.text}`
        case 'item':
          return `${pad(b.depth)}${b.marker ? `${b.marker} ` : ''}${b.text}`
        case 'para':
          return `${pad(b.depth + 1)}${b.text}`
        case 'reference':
          return `${pad(b.depth + 1)}※ ${b.text}`
        case 'image':
          return `${pad(b.depth + 1)}[그림]`
        case 'table':
          return b.rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
        case 'pageBreak':
          return '---'
        case 'closing':
          return b.text
      }
    })
    .join('\n')
}
