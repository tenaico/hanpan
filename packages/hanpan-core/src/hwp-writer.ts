/**
 * Document blocks → a HWPX (or HWP) document, written by the rhwp engine itself,
 * so the result is exactly what the app's HWP editor opens and saves.
 *
 * Every block that carries a link key and starts an item (title, chapter, item)
 * gets a bookmark `hp-<key>` at its start. Bookmarks survive saving as .hwp and
 * .hwpx (checked by tests) and are what the sync reads back.
 */
import type { DocBlock } from './blocks'
import { itemLook, type DocTheme, type ParaLook, type TextLook } from './doc-theme'
import { expectOk, type HwpEngine, type HwpEngineDocument } from './hwp-engine'

/** Prefix of the bookmarks that link a paragraph to a map topic. */
export const LINK_BOOKMARK_PREFIX = 'hp-'

export function linkBookmarkName(key: string): string {
  return `${LINK_BOOKMARK_PREFIX}${key}`
}

export function keyOfBookmark(name: string): string | null {
  return name.startsWith(LINK_BOOKMARK_PREFIX) ? name.slice(LINK_BOOKMARK_PREFIX.length) : null
}

/** The engine takes paragraph lengths at twice their HWPUNIT, 100 to a point (apps/hwp agent-plugin). */
const PARA_UNITS_PER_PT = 200
/** Font lists in a character shape: Hangul, Latin, Hanja, Japanese, other, symbol, user. */
const FONT_LANGUAGES = 7
/** Widest picture placed, points (A4 text width with 20mm margins is about 482pt). */
const MAX_PICTURE_PT = 400
/** Picture and table sizes are plain HWPUNIT: 100 to a point (unlike paragraph lengths above). */
const HWPUNIT_PER_PT = 100

interface PlannedPara extends ParaLayout {
  text: string
  bookmark?: string | undefined
  object?:
    | { kind: 'image'; block: Extract<DocBlock, { kind: 'image' }> }
    | { kind: 'table'; block: Extract<DocBlock, { kind: 'table' }> }
}

export interface ParaLayout {
  look: TextLook & ParaLook
  /** points of left margin */
  margin: number
  /** first-line indent, points (negative = hanging) */
  indent: number
}

/** How an item paragraph at `depth` with `marker` is laid out: a hanging indent lines wrapped lines up after the marker. */
export function itemLayout(theme: DocTheme, depth: number, marker: string): ParaLayout {
  const look = itemLook(theme, depth)
  const hang = marker ? look.size * (marker.length > 1 ? 1.2 : 1) : 0
  return { look, margin: depth * theme.indentStep + hang, indent: -hang }
}

/** How prose under an item at `depth` is laid out. */
export function bodyLayout(theme: DocTheme, depth: number): ParaLayout {
  return {
    look: { ...theme.body, size: itemLook(theme, depth + 1).size },
    margin: (depth + 1) * theme.indentStep,
    indent: 0,
  }
}

function planParagraphs(blocks: readonly DocBlock[], theme: DocTheme): PlannedPara[] {
  const step = theme.indentStep
  const out: PlannedPara[] = []
  for (const b of blocks) {
    switch (b.kind) {
      case 'title':
        out.push({ text: b.text, look: theme.title, margin: 0, indent: 0, bookmark: b.key })
        break
      case 'meta':
        out.push({ text: b.text, look: theme.meta, margin: 0, indent: 0 })
        break
      case 'chapter':
        out.push({
          text: [b.label, b.text].filter(Boolean).join(' '),
          look: theme.chapter,
          margin: 0,
          indent: 0,
          bookmark: b.key,
        })
        break
      case 'item':
        out.push({
          text: `${b.marker ? `${b.marker} ` : ''}${b.text}`,
          ...itemLayout(theme, b.depth, b.marker),
          bookmark: b.key,
        })
        break
      case 'para': {
        const layout =
          b.role === 'lead'
            ? { look: theme.body, margin: 0, indent: 0 }
            : bodyLayout(theme, b.depth)
        out.push({
          text: b.text,
          ...layout,
          look: b.bold ? { ...layout.look, bold: true } : layout.look,
        })
        break
      }
      case 'reference':
        out.push({
          text: `※ ${b.text}`,
          look: theme.reference,
          margin: (b.depth + 1) * step + theme.reference.size,
          indent: -theme.reference.size,
        })
        break
      case 'image':
        out.push({
          text: '',
          look: theme.body,
          margin: (b.depth + 1) * step,
          indent: 0,
          object: { kind: 'image', block: b },
        })
        break
      case 'table':
        out.push({
          text: '',
          look: theme.body,
          margin: 0,
          indent: 0,
          object: { kind: 'table', block: b },
        })
        break
      case 'closing':
        out.push({ text: b.text, look: theme.body, margin: 0, indent: 0 })
        break
      case 'pageBreak':
        // a page break is carried by the next paragraph (see writeBlocks)
        out.push({ text: '\f', look: theme.body, margin: 0, indent: 0 })
        break
    }
  }
  return out
}

/** Formats paragraph `i` (section 0) with a layout; fonts are looked up once per formatter. */
export function paragraphFormatter(
  doc: HwpEngineDocument,
): (i: number, layout: ParaLayout) => void {
  const fontCache = new Map<string, number[]>()
  const idsOf = (font: string) => {
    let ids = fontCache.get(font)
    if (!ids) fontCache.set(font, (ids = fontIds(doc, font)))
    return ids
  }
  return (i, p) => {
    const para: Record<string, unknown> = {
      alignment: p.look.align ?? 'left',
      marginLeft: Math.round(p.margin * PARA_UNITS_PER_PT),
      indent: Math.round(p.indent * PARA_UNITS_PER_PT),
      spacingBefore: Math.round((p.look.spacingBefore ?? 0) * PARA_UNITS_PER_PT),
      spacingAfter: Math.round((p.look.spacingAfter ?? 0) * PARA_UNITS_PER_PT),
    }
    if (p.look.lineSpacing) {
      para.lineSpacing = p.look.lineSpacing
      para.lineSpacingType = 'Percent'
    }
    expectOk(doc.applyParaFormat(0, i, JSON.stringify(para)), 'format a paragraph')
    const length = doc.getParagraphLength(0, i)
    if (length > 0) {
      const chars: Record<string, unknown> = {
        fontSize: Math.round(p.look.size * 100),
        bold: !!p.look.bold,
        fontIds: idsOf(p.look.font),
      }
      if (p.look.color) chars.textColor = p.look.color.toLowerCase()
      expectOk(doc.applyCharFormat(0, i, 0, length, JSON.stringify(chars)), 'format text')
    }
  }
}

function fontIds(doc: HwpEngineDocument, font: string): number[] {
  const ids: number[] = []
  for (let lang = 0; lang < FONT_LANGUAGES; lang++) {
    const id = doc.findOrCreateFontIdForLang(lang, font)
    if (!Number.isInteger(id) || id < 0) throw new Error(`rhwp: font ${font} could not be set`)
    ids.push(id)
  }
  return ids
}

/** Rough width of a cell's text in ems: Hangul full, Latin and digits about half. */
function textEms(text: string): number {
  let w = 0
  for (const ch of text) w += (ch.codePointAt(0) ?? 0) >= 0x1100 ? 1 : ch === ' ' ? 0.3 : 0.55
  return w
}

/**
 * Column widths that share `total` by how much each column holds: a long column
 * gets more room, none drops below a seventh, and a very long cell counts only
 * as much as a few lines of wrapping would need.
 */
export function tableColumnWidths(rows: readonly (readonly string[])[], total: number): number[] {
  const cols = Math.max(0, ...rows.map((r) => r.length))
  if (!cols) return []
  const need = Array.from(
    { length: cols },
    (_, c) => Math.max(...rows.map((r) => Math.min(textEms(r[c] ?? ''), 24))) + 2,
  )
  const sum = need.reduce((x, y) => x + y, 0)
  const raw = need.map((n) => Math.max(total / 7, (n / sum) * total))
  const scale = total / raw.reduce((x, y) => x + y, 0)
  const widths = raw.map((w) => Math.round(w * scale))
  widths[cols - 1]! += total - widths.reduce((x, y) => x + y, 0)
  return widths
}

/**
 * A bordered table made the way the HWP editor makes one: an empty table, then
 * the text typed into each cell, so every cell gets real line breaks and Hangul
 * wraps a long cell onto more lines. (A table pasted as HTML keeps each cell on
 * one line, which Hangul squeezes until the letters overlap.) A header row is
 * bold and centred; columns share the width by how much they hold.
 */
function insertTable(
  doc: HwpEngineDocument,
  para: number,
  rows: readonly (readonly string[])[],
  header: boolean,
  font: number[],
  size: number,
): void {
  const cols = Math.max(1, ...rows.map((r) => r.length))
  const made = expectOk(
    doc.createTableEx(
      JSON.stringify({
        sectionIdx: 0,
        paraIdx: para,
        charOffset: 0,
        rowCount: rows.length,
        colCount: cols,
        treatAsChar: false,
      }),
    ),
    'insert a table',
  )
  const at = Number(made.paraIdx ?? para)
  const control = Number(made.controlIdx ?? 0)
  rows.forEach((row, r) => {
    const head = header && r === 0
    for (let c = 0; c < cols; c++) {
      const cell = r * cols + c
      const text = row[c] ?? ''
      if (text) {
        expectOk(doc.insertTextInCell(0, at, control, cell, 0, 0, text), 'fill a table cell')
        expectOk(
          doc.applyCharFormatInCell(
            0,
            at,
            control,
            cell,
            0,
            0,
            text.length,
            JSON.stringify({ fontSize: Math.round(size * 100), bold: head, fontIds: font }),
          ),
          'format a table cell',
        )
      }
      expectOk(
        doc.applyParaFormatInCell(
          0,
          at,
          control,
          cell,
          0,
          JSON.stringify({
            alignment: head ? 'center' : 'left',
            lineSpacing: 130,
            lineSpacingType: 'Percent',
          }),
        ),
        'format a table cell',
      )
    }
  })
  const current = Array.from({ length: cols }, (_, c) =>
    Number(expectOk(doc.getCellOwnProperties(0, at, control, c), 'read a table cell').width ?? 0),
  )
  const wanted = tableColumnWidths(
    rows,
    current.reduce((x, y) => x + y, 0),
  )
  const deltas = rows
    .flatMap((_, r) =>
      wanted.map((w, c) => ({ cellIdx: r * cols + c, widthDelta: w - current[c]! })),
    )
    .filter((d) => d.widthDelta !== 0)
  if (deltas.length)
    expectOk(doc.resizeTableCells(0, at, control, JSON.stringify(deltas)), 'size the table columns')
}

function extensionOf(mime: string): string | null {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
  if (mime === 'image/gif') return 'gif'
  return null
}

/** Writes the blocks into a fresh engine document. The caller exports and frees it. */
export function writeBlocks(
  engine: HwpEngine,
  blocks: readonly DocBlock[],
  theme: DocTheme,
): HwpEngineDocument {
  const doc = engine.HwpDocument.createEmpty()
  try {
    doc.createBlankDocument()
    const plan = planParagraphs(blocks, theme)
    // paragraphs first: an object in a paragraph that is later split moves with the split
    const breaksBefore = new Set<number>()
    const paras: PlannedPara[] = []
    for (const p of plan) {
      if (p.text === '\f') breaksBefore.add(paras.length)
      else paras.push(p)
    }
    paras.forEach((p, i) => {
      if (i > 0)
        expectOk(
          doc.splitParagraph(0, i - 1, doc.getParagraphLength(0, i - 1)),
          'split a paragraph',
        )
      if (p.text) expectOk(doc.insertText(0, i, 0, p.text), 'insert text')
    })
    const format = paragraphFormatter(doc)
    paras.forEach((p, i) => format(i, p))
    // objects from the last paragraph back, so a paste that adds paragraphs moves nothing still to come
    for (let i = paras.length - 1; i >= 0; i--) {
      const object = paras[i]!.object
      if (!object) continue
      if (object.kind === 'table') {
        insertTable(
          doc,
          i,
          object.block.rows,
          object.block.header,
          fontIds(doc, theme.body.font),
          theme.body.size - 1,
        )
      } else {
        const { image } = object.block
        const extension = extensionOf(image.mime)
        if (!extension) continue
        const naturalW = Math.max(1, Math.round(image.width ?? 640))
        const naturalH = Math.max(1, Math.round(image.height ?? 480))
        const widthPt = Math.min(MAX_PICTURE_PT, naturalW * 0.75)
        const width = Math.round(widthPt * HWPUNIT_PER_PT)
        const height = Math.max(HWPUNIT_PER_PT, Math.round((width * naturalH) / naturalW))
        const placed = expectOk(
          doc.insertPictureEx(
            JSON.stringify({
              sectionIdx: 0,
              paraIdx: i,
              charOffset: 0,
              width,
              height,
              naturalWidthPx: naturalW,
              naturalHeightPx: naturalH,
              extension,
            }),
            image.bytes,
          ),
          'insert a picture',
        )
        // in the line like a character: a floating picture lands over the text around it in Hangul
        expectOk(
          doc.setPictureProperties(
            0,
            Number(placed.paraIdx ?? i),
            Number(placed.controlIdx ?? 0),
            JSON.stringify({ treatAsChar: true, width, height }),
          ),
          'place a picture in the line',
        )
      }
    }
    // page breaks and bookmarks last: neither moves a paragraph index before it
    for (let i = paras.length - 1; i >= 0; i--) {
      const bookmark = paras[i]!.bookmark
      if (bookmark) expectOk(doc.addBookmark(0, i, 0, linkBookmarkName(bookmark)), 'add a bookmark')
    }
    for (const at of [...breaksBefore].sort((a, b) => b - a)) {
      if (at > 0 && at < paras.length && doc.insertPageBreak) {
        // a page break at the end of the paragraph before starts `at` on a new page
        expectOk(
          doc.insertPageBreak(0, at - 1, doc.getParagraphLength(0, at - 1)),
          'insert a page break',
        )
      }
    }
    return doc
  } catch (error) {
    doc.free()
    throw error
  }
}

export interface WrittenDocument {
  bytes: Uint8Array
  format: 'hwpx' | 'hwp'
}

export function blocksToHwp(
  engine: HwpEngine,
  blocks: readonly DocBlock[],
  theme: DocTheme,
  format: 'hwpx' | 'hwp' = 'hwpx',
): WrittenDocument {
  const doc = writeBlocks(engine, blocks, theme)
  try {
    return { bytes: format === 'hwpx' ? doc.exportHwpx() : doc.exportHwp(), format }
  } finally {
    doc.free()
  }
}
