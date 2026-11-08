/**
 * Reading a linked HWP document back as an outline, and carrying skeleton
 * changes into it in place: renamed items keep their prose, new items are
 * formatted like the ones the writer made, removed and moved items take their
 * prose with them. Items are found by their bookmarks (`hp-<key>`); an item the
 * person typed (a marked paragraph without a bookmark) is read as a new topic.
 */
import type { DocTheme } from './doc-theme'
import { bookmarksOf, expectOk, type HwpEngineDocument } from './hwp-engine'
import {
  bodyLayout,
  itemLayout,
  keyOfBookmark,
  linkBookmarkName,
  paragraphFormatter,
} from './hwp-writer'
import { leadingMarker, markerFor, stripMarker, type MarkerStyle } from './numbering'
import type { PanNode, PanOutline } from './outline'
import type { SyncChange } from './sync'

/** Item depth by marker, per numbering system (chapters are depth 0 in a chapter report). */
const DEPTH_BY_MARKER: Record<MarkerStyle, (marker: string) => number | null> = {
  report: (m) =>
    ({ '□': 0, '■': 0, '○': 1, '●': 1, '◦': 1, '―': 2, '-': 2, '–': 2, '·': 3, '•': 3 })[m] ?? null,
  'chapter-report': (m) =>
    /^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]\.$/.test(m)
      ? 0
      : ((
          { '□': 1, '■': 1, '○': 2, '●': 2, '―': 3, '-': 3, '·': 4, '•': 4 } as Record<
            string,
            number
          >
        )[m] ?? null),
  outline: (m) =>
    /^\d+\.$/.test(m) ? 0 : (({ '•': 1, '–': 2 } as Record<string, number>)[m] ?? null),
  gongmun: (m) => {
    if (/^\d+\.$/.test(m)) return 0
    if (/^[가-힣]\.$/.test(m)) return 1
    if (/^\d+\)$/.test(m)) return 2
    if (/^[가-힣]\)$/.test(m)) return 3
    if (/^\(\d+\)$/.test(m)) return 4
    if (/^\([가-힣]\)$/.test(m)) return 5
    if (/^[①-⑳]$/.test(m)) return 6
    if (/^[㉮-㉻]$/.test(m)) return 7
    return null
  },
}

export interface DocItem {
  key: string
  para: number
  depth: number
  title: string
  /** the item has no bookmark yet: the person typed it */
  isNew: boolean
}

export interface ReadDocument {
  outline: PanOutline
  /** items in document order */
  items: DocItem[]
  /** the title paragraph, when its bookmark is there */
  titlePara: number | null
  paraCount: number
}

export interface ReadOptions {
  style: MarkerStyle
  rootKey: string
  /** depth of a known topic when its paragraph carries no marker (a lone 공문 item) */
  depthOf?(key: string): number | undefined
}

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u200b]/g

export function paragraphText(doc: HwpEngineDocument, para: number): string {
  return doc.getTextRange(0, para, 0, doc.getParagraphLength(0, para)).replace(CONTROL, '')
}

export function readHwpDocument(doc: HwpEngineDocument, options: ReadOptions): ReadDocument {
  const paraCount = doc.getParagraphCount(0)
  const keyAt = new Map<number, string>()
  for (const b of bookmarksOf(doc)) {
    const key = keyOfBookmark(b.name)
    if (key && b.sec === 0 && !keyAt.has(b.para)) keyAt.set(b.para, key)
  }
  let titlePara: number | null = null
  let title = ''
  const items: DocItem[] = []
  let newCount = 0
  for (let p = 0; p < paraCount; p++) {
    const raw = paragraphText(doc, p)
    const key = keyAt.get(p)
    if (key === options.rootKey) {
      titlePara = p
      title = raw.trim()
      continue
    }
    const marker = leadingMarker(raw)
    const byMarker = marker ? DEPTH_BY_MARKER[options.style](marker) : null
    if (key) {
      const depth = byMarker ?? options.depthOf?.(key) ?? 0
      items.push({ key, para: p, depth, title: stripMarker(raw).trim(), isNew: false })
    } else if (byMarker !== null && marker !== '※' && stripMarker(raw).trim()) {
      items.push({
        key: `new:${++newCount}`,
        para: p,
        depth: byMarker,
        title: stripMarker(raw).trim(),
        isNew: true,
      })
    }
  }
  // depths as a tree: a child is at most one deeper than the item before it
  const root: PanNode = { key: options.rootKey, title, children: [] }
  const stack: { node: PanNode; depth: number }[] = [{ node: root, depth: -1 }]
  for (const item of items) {
    while (stack.length > 1 && stack[stack.length - 1]!.depth >= item.depth) stack.pop()
    const node: PanNode = { key: item.key, title: item.title, children: [] }
    stack[stack.length - 1]!.node.children.push(node)
    stack.push({ node, depth: Math.min(item.depth, stack[stack.length - 1]!.depth + 1) })
  }
  return {
    outline: { title, rootKey: options.rootKey, nodes: root.children },
    items,
    titlePara,
    paraCount,
  }
}

export interface ApplyOptions extends ReadOptions {
  theme: DocTheme
}

export interface ApplyOutcome {
  applied: number
  skipped: { change: SyncChange; reason: string }[]
}

/** The paragraphs an item's subtree spans: its own, its prose, its descendants. [start, end) */
function subtreeRange(read: ReadDocument, index: number): [number, number] {
  const item = read.items[index]!
  let end = read.paraCount
  for (let j = index + 1; j < read.items.length; j++) {
    if (read.items[j]!.depth <= item.depth) {
      end = read.items[j]!.para
      break
    }
  }
  return [item.para, end]
}

/** The tree position of each item: its parent's key (null for main branches). */
function parentsOf(read: ReadDocument): Map<string, string | null> {
  const parents = new Map<string, string | null>()
  const visit = (nodes: PanNode[], parent: string | null) => {
    for (const n of nodes) {
      parents.set(n.key, parent)
      visit(n.children, n.key)
    }
  }
  visit(read.outline.nodes, null)
  return parents
}

/** Removes paragraphs [start, end) by deleting from the end of the paragraph before them. */
function removeParagraphs(doc: HwpEngineDocument, start: number, end: number): void {
  if (end <= start) return
  if (start === 0) throw new Error('the first paragraph is not removed')
  // the engine would carry the range's bookmarks onto the paragraph that stays: drop them first
  const inRange = bookmarksOf(doc)
    .filter((b) => b.sec === 0 && b.para >= start && b.para < end)
    .sort((a, b) => b.para - a.para || b.ctrlIdx - a.ctrlIdx)
  for (const b of inRange) expectOk(doc.deleteBookmark(0, b.para, b.ctrlIdx), 'remove a bookmark')
  const before = start - 1
  const last = end - 1
  expectOk(
    doc.deleteRange(
      0,
      before,
      doc.getParagraphLength(0, before),
      last,
      doc.getParagraphLength(0, last),
    ),
    'remove paragraphs',
  )
}

/** Inserts a paragraph after `after`, holding `text`; returns its index. */
function insertParagraphAfter(doc: HwpEngineDocument, after: number, text: string): number {
  expectOk(doc.splitParagraph(0, after, doc.getParagraphLength(0, after)), 'split a paragraph')
  if (text) expectOk(doc.insertText(0, after + 1, 0, text), 'insert text')
  return after + 1
}

function replaceTitle(doc: HwpEngineDocument, para: number, title: string): void {
  const raw = doc.getTextRange(0, para, 0, doc.getParagraphLength(0, para))
  const visible = raw.replace(CONTROL, '')
  const keep = visible.length - stripMarker(visible).length
  // the bookmark sits before the text as a control the engine does not count in offsets
  const start = raw.length - visible.length + keep
  const count = doc.getParagraphLength(0, para) - start
  if (count > 0) expectOk(doc.deleteText(0, para, start, count), 'replace a title')
  expectOk(doc.insertText(0, para, start, title), 'replace a title')
}

/** Where a new child of `parent` at `index` goes: the paragraph to insert after. */
function insertionPoint(read: ReadDocument, parent: string | null, index: number): number {
  const parents = parentsOf(read)
  const siblings = read.items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => parents.get(it.key) === parent)
  if (index > 0 && siblings.length) {
    const prev = siblings[Math.min(index, siblings.length) - 1]!
    return subtreeRange(read, prev.i)[1] - 1
  }
  if (parent === null) {
    // before the first item: after the title, date line and lead text
    const first = read.items[0]
    return first ? first.para - 1 : read.paraCount - 1
  }
  const parentIndex = read.items.findIndex((it) => it.key === parent)
  if (parentIndex < 0) return read.paraCount - 1
  // after the parent's own prose, before its first child
  const firstChild = read.items.findIndex(
    (it, j) => j > parentIndex && parents.get(it.key) === parent,
  )
  return firstChild >= 0 ? read.items[firstChild]!.para - 1 : subtreeRange(read, parentIndex)[1] - 1
}

/**
 * Carries skeleton changes into the document. `keyFor` maps a change's key to
 * the document's key (a topic added on the map side is new here; the caller
 * passes its id). Each change re-reads the document, so indices never go stale.
 */
export function applyToHwp(
  doc: HwpEngineDocument,
  changes: readonly SyncChange[],
  options: ApplyOptions,
): ApplyOutcome {
  const format = paragraphFormatter(doc)
  const outcome: ApplyOutcome = { applied: 0, skipped: [] }
  const read = () => readHwpDocument(doc, options)
  const depthOfParent = (r: ReadDocument, parent: string | null) =>
    parent === null ? -1 : (r.items.find((it) => it.key === parent)?.depth ?? -1)

  for (const change of changes) {
    const r = read()
    const skip = (reason: string) => outcome.skipped.push({ change, reason })
    switch (change.kind) {
      case 'retitle-root': {
        if (r.titlePara === null) {
          skip('no title paragraph')
          break
        }
        replaceTitle(doc, r.titlePara, change.title)
        outcome.applied++
        break
      }
      case 'rename': {
        const item = r.items.find((it) => it.key === change.key)
        if (!item) {
          skip('not in the document')
          break
        }
        replaceTitle(doc, item.para, change.title)
        outcome.applied++
        break
      }
      case 'remove': {
        const index = r.items.findIndex((it) => it.key === change.key)
        if (index < 0) {
          skip('not in the document')
          break
        }
        const [start, end] = subtreeRange(r, index)
        removeParagraphs(doc, start, end)
        outcome.applied++
        break
      }
      case 'add': {
        if (change.parent !== null && !r.items.some((it) => it.key === change.parent)) {
          skip('its parent is not in the document')
          break
        }
        const depth = depthOfParent(r, change.parent) + 1
        // the marker for its depth now; renumbering settles an official letter's numbers after
        const marker = markerFor(options.style, depth, change.index + 1, 2)
        const at = insertParagraphAfter(
          doc,
          insertionPoint(r, change.parent, change.index),
          `${marker} ${change.title}`,
        )
        format(at, itemLayout(options.theme, depth, marker))
        expectOk(doc.addBookmark(0, at, 0, linkBookmarkName(change.key)), 'add a bookmark')
        outcome.applied++
        break
      }
      case 'move': {
        const index = r.items.findIndex((it) => it.key === change.key)
        if (index < 0) {
          skip('not in the document')
          break
        }
        const [start, end] = subtreeRange(r, index)
        const moved = r.items.filter((it) => it.para >= start && it.para < end)
        const lines: { text: string; item?: DocItem }[] = []
        for (let p = start; p < end; p++) {
          lines.push({ text: paragraphText(doc, p), item: moved.find((it) => it.para === p) })
        }
        removeParagraphs(doc, start, end)
        const after = read()
        if (change.parent !== null && !after.items.some((it) => it.key === change.parent)) {
          skip('its new parent is not in the document')
          break
        }
        const baseDepth = depthOfParent(after, change.parent) + 1
        const shift = baseDepth - r.items[index]!.depth
        let at = insertionPoint(after, change.parent, change.index)
        let ownDepth = baseDepth
        for (const line of lines) {
          if (line.item) {
            ownDepth = line.item.depth + shift
            const marker = markerFor(options.style, ownDepth, 1, 2)
            at = insertParagraphAfter(doc, at, `${marker} ${stripMarker(line.text)}`)
            format(at, itemLayout(options.theme, ownDepth, marker))
            expectOk(doc.addBookmark(0, at, 0, linkBookmarkName(line.item.key)), 'add a bookmark')
          } else {
            at = insertParagraphAfter(doc, at, line.text)
            format(at, bodyLayout(options.theme, ownDepth))
          }
        }
        outcome.applied++
        break
      }
    }
  }
  renumber(doc, options)
  return outcome
}

/**
 * Puts the right marker in front of every item for its place in the tree (a
 * moved item's depth changes its symbol; an official letter renumbers its
 * siblings), and gives items the person typed their bookmark-less look.
 */
export function renumber(doc: HwpEngineDocument, options: ReadOptions & { theme: DocTheme }): void {
  const r = readHwpDocument(doc, options)
  const parents = parentsOf(r)
  const siblingsOf = new Map<string | null, DocItem[]>()
  for (const item of r.items) {
    const parent = parents.get(item.key) ?? null
    siblingsOf.set(parent, [...(siblingsOf.get(parent) ?? []), item])
  }
  const depthOf = new Map<string, number>()
  const walk = (nodes: PanNode[], depth: number) => {
    for (const n of nodes) {
      depthOf.set(n.key, depth)
      walk(n.children, depth + 1)
    }
  }
  walk(r.outline.nodes, 0)
  for (const [, siblings] of siblingsOf) {
    siblings.forEach((item, i) => {
      const depth = depthOf.get(item.key) ?? item.depth
      const marker = markerFor(options.style, depth, i + 1, siblings.length)
      const raw = paragraphText(doc, item.para)
      const current = leadingMarker(raw)
      if (current === marker) return
      const want = `${marker ? `${marker} ` : ''}${stripMarker(raw)}`
      const full = doc.getTextRange(0, item.para, 0, doc.getParagraphLength(0, item.para))
      const start = full.length - raw.length
      expectOk(
        doc.deleteText(0, item.para, start, doc.getParagraphLength(0, item.para) - start),
        'renumber',
      )
      expectOk(doc.insertText(0, item.para, start, want), 'renumber')
    })
  }
}

/**
 * Bookmarks the items the person typed in the document once the map has made
 * topics for them: `ids` maps the reader's provisional keys (`new:1`) to the
 * new topic ids, so the next sync knows them.
 */
export function bookmarkNewItems(
  doc: HwpEngineDocument,
  ids: ReadonlyMap<string, string>,
  options: ReadOptions,
): number {
  const r = readHwpDocument(doc, options)
  let added = 0
  for (const item of [...r.items].reverse()) {
    const id = item.isNew ? ids.get(item.key) : undefined
    if (!id) continue
    expectOk(doc.addBookmark(0, item.para, 0, linkBookmarkName(id)), 'add a bookmark')
    added++
  }
  return added
}
