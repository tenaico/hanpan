/**
 * The editor-neutral outline every Hanpan conversion goes through.
 *
 * A mind map, a HWPX report, a slide deck and a Word report made from the same
 * map are all read into (and written from) this one tree. A node's `key` is the
 * link between them: it is the map topic's id, and every document part made
 * from that topic carries it as a hidden marker, so either side can be read back
 * into an outline and compared with the other.
 */

export interface PanImage {
  bytes: Uint8Array
  /** `image/png`, `image/jpeg`, ... */
  mime: string
  /** natural size in pixels, when known */
  width?: number | undefined
  height?: number | undefined
}

export interface PanNode {
  /** link key: the map topic id */
  key: string
  /** the topic title; in a document, the item's heading text */
  title: string
  /** the topic's note: in a document, the explanation under the item */
  note?: string | undefined
  /**
   * Prose written for the item (by the AI's "flesh out", or by hand in the
   * document). Once a document exists, the document owns it: a map change never
   * overwrites it.
   */
  body?: string | undefined
  /** the topic's web link; a document links the item's text to it */
  href?: string | undefined
  image?: PanImage | undefined
  children: PanNode[]
}

export interface PanOutline {
  /** the central topic: the document title */
  title: string
  /** the central topic's key */
  rootKey: string
  /** the central topic's note: the document's lead text */
  note?: string | undefined
  nodes: PanNode[]
}

/** Every node of the outline in document order, with its depth (0 = main branch). */
export function* walkOutline(
  nodes: readonly PanNode[],
  depth = 0,
  parent: PanNode | null = null,
): Generator<{ node: PanNode; depth: number; parent: PanNode | null; index: number }> {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]!
    yield { node, depth, parent, index }
    yield* walkOutline(node.children, depth + 1, node)
  }
}

/** Number of nodes below the root. */
export function countNodes(outline: PanOutline): number {
  let n = 0
  for (const _ of walkOutline(outline.nodes)) n++
  return n
}

/** A deep copy that shares no arrays or objects with the original (image bytes are shared, never mutated). */
export function cloneOutline(outline: PanOutline): PanOutline {
  const cloneNode = (node: PanNode): PanNode => ({
    ...node,
    children: node.children.map(cloneNode),
  })
  return { ...outline, nodes: outline.nodes.map(cloneNode) }
}

/** Finds a node by key anywhere in the outline. */
export function findNode(outline: PanOutline, key: string): PanNode | undefined {
  for (const { node } of walkOutline(outline.nodes)) if (node.key === key) return node
  return undefined
}

/**
 * Builds an outline from indented plain text: one item per line, two spaces (or
 * one tab) per level, an optional leading bullet. The first line is the title.
 * Lines starting with `>` under an item become its note. Keys are generated.
 * Used by tests and by the "paste an outline" path.
 */
export function outlineFromIndentedText(
  text: string,
  makeKey: () => string = sequentialKeys(),
): PanOutline {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')
  const title = (lines.shift() ?? '').trim().replace(/^#\s*/, '')
  const root: PanNode = { key: makeKey(), title, children: [] }
  const stack: { node: PanNode; depth: number }[] = [{ node: root, depth: -1 }]
  for (const raw of lines) {
    const expanded = raw.replace(/\t/g, '  ')
    const depth = Math.floor((expanded.length - expanded.trimStart().length) / 2)
    let content = expanded.trim()
    if (content.startsWith('>')) {
      // a note belongs to the nearest item at its indentation or above
      let at = stack.length - 1
      while (at > 0 && stack[at]!.depth > depth) at--
      const owner = stack[at]!.node
      const line = content.slice(1).trim()
      owner.note = owner.note ? `${owner.note}\n${line}` : line
      continue
    }
    content = content.replace(/^([-*•□○―·]|\d{1,2}[.)])\s+/, '')
    while (stack.length > 1 && stack[stack.length - 1]!.depth >= depth) stack.pop()
    const node: PanNode = { key: makeKey(), title: content, children: [] }
    stack[stack.length - 1]!.node.children.push(node)
    stack.push({ node, depth })
  }
  return { title: root.title, rootKey: root.key, note: root.note, nodes: root.children }
}

export function sequentialKeys(prefix = 'k'): () => string {
  let i = 0
  return () => `${prefix}${++i}`
}
