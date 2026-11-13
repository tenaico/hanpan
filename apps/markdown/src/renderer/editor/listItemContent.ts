import type { JSONContent } from '@tiptap/core'

/**
 * A list item's content must read "paragraph block*". The stock markdown
 * parser breaks that for two valid CommonMark shapes:
 *
 * - text that follows a block in a tight item (`- a` / fenced code / `more`)
 *   comes back as bare inline nodes beside the blocks, and
 * - an item that starts with a block (`- ```` `) has no first paragraph.
 *
 * The editor then refuses the whole document. Bare inline runs are wrapped in
 * a paragraph, and an item that starts with another block gets an empty first
 * paragraph. An unchanged file is still saved from its original source.
 */
const INLINE = new Set(['text', 'hardBreak'])

export function normalizeListItemContent(content: JSONContent[]): JSONContent[] {
  const out: JSONContent[] = []
  let run: JSONContent[] = []
  const flush = () => {
    if (run.length > 0) out.push({ type: 'paragraph', content: run })
    run = []
  }
  for (const node of content) {
    if (node.type && INLINE.has(node.type)) {
      run.push(node)
      continue
    }
    flush()
    out.push(node)
  }
  flush()
  if (out.length === 0 || out[0]!.type !== 'paragraph') {
    out.unshift({ type: 'paragraph', content: [] })
  }
  return out
}

/** Apply to whatever a list item's parseMarkdown returned */
export function normalizeParsedListItem<T>(parsed: T): T {
  const fix = (item: unknown) => {
    const node = item as JSONContent | null
    if (node && typeof node === 'object' && Array.isArray(node.content)) {
      node.content = normalizeListItemContent(node.content)
    }
    return item
  }
  return (Array.isArray(parsed) ? parsed.map(fix) : fix(parsed)) as T
}
