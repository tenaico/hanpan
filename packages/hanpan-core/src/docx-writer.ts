/**
 * Document blocks → a Word document (.docx), with the same look as the HWP
 * report and the same link: every item starts with a bookmark named after its
 * topic (`hp_<key>`; Word bookmark names allow letters, digits and `_` only, so
 * the key's hyphens become underscores).
 */
import {
  AlignmentType,
  Bookmark,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IRunOptions,
} from 'docx'
import type { DocBlock } from './blocks'
import { tableColumnWidths } from './hwp-writer'
import { itemLook, type DocTheme, type ParaLook, type TextLook } from './doc-theme'

export const DOCX_BOOKMARK_PREFIX = 'hp_'

export function docxBookmarkName(key: string): string {
  // Word keeps at most 40 characters of a bookmark name
  return `${DOCX_BOOKMARK_PREFIX}${key.replace(/[^A-Za-z0-9_]/g, '_')}`.slice(0, 40)
}

const TWIPS_PER_PT = 20

function alignmentOf(align: ParaLook['align']) {
  switch (align) {
    case 'center':
      return AlignmentType.CENTER
    case 'right':
      return AlignmentType.RIGHT
    case 'justify':
      return AlignmentType.JUSTIFIED
    default:
      return AlignmentType.LEFT
  }
}

function run(text: string, look: TextLook): TextRun {
  const options: IRunOptions = {
    text,
    font: { name: look.font, eastAsia: look.font },
    size: Math.round(look.size * 2),
    bold: !!look.bold,
    ...(look.color ? { color: look.color.replace('#', '') } : {}),
  }
  return new TextRun(options)
}

function paragraph(
  text: string,
  look: TextLook & ParaLook,
  margin: number,
  indent: number,
  bookmark?: string,
): Paragraph {
  const content = run(text, look)
  return new Paragraph({
    alignment: alignmentOf(look.align),
    indent: {
      left: Math.round(margin * TWIPS_PER_PT),
      ...(indent < 0
        ? { hanging: Math.round(-indent * TWIPS_PER_PT) }
        : { firstLine: Math.round(indent * TWIPS_PER_PT) }),
    },
    spacing: {
      before: Math.round((look.spacingBefore ?? 0) * TWIPS_PER_PT),
      after: Math.round((look.spacingAfter ?? 0) * TWIPS_PER_PT),
      ...(look.lineSpacing ? { line: Math.round(look.lineSpacing * 2.4) } : {}),
    },
    children: bookmark
      ? [new Bookmark({ id: docxBookmarkName(bookmark), children: [content] })]
      : [content],
  })
}

function imageTypeOf(mime: string): 'png' | 'jpg' | 'gif' | null {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
  if (mime === 'image/gif') return 'gif'
  return null
}

/** the A4 page's text width between the 2 cm margins, in twips */
const TEXT_WIDTH_TWIPS = 11906 - 2 * 1134

function table(rows: readonly (readonly string[])[], header: boolean, look: TextLook): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
  const borders = { top: border, bottom: border, left: border, right: border }
  // columns share the width by how much they hold, as in the HWP and HTML writers
  const widths = tableColumnWidths(rows, TEXT_WIDTH_TWIPS)
  return new Table({
    width: { size: TEXT_WIDTH_TWIPS, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (r, i) =>
        new TableRow({
          tableHeader: header && i === 0,
          children: r.map(
            (cell, c) =>
              new TableCell({
                borders,
                width: { size: widths[c] ?? 0, type: WidthType.DXA },
                ...(header && i === 0
                  ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E8E8E8' } }
                  : {}),
                children: [
                  new Paragraph({
                    alignment: header && i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                    children: [run(cell, { ...look, bold: header && i === 0 })],
                  }),
                ],
              }),
          ),
        }),
    ),
  })
}

export function blocksToDocxDocument(blocks: readonly DocBlock[], theme: DocTheme): Document {
  const step = theme.indentStep
  const children: (Paragraph | Table)[] = []
  let pageBreakNext = false
  const push = (p: Paragraph | Table) => {
    if (pageBreakNext && p instanceof Paragraph) {
      children.push(new Paragraph({ pageBreakBefore: true, children: [] }))
    }
    pageBreakNext = false
    children.push(p)
  }
  for (const b of blocks) {
    switch (b.kind) {
      case 'title':
        push(paragraph(b.text, theme.title, 0, 0, b.key))
        break
      case 'meta':
        push(paragraph(b.text, theme.meta, 0, 0))
        break
      case 'chapter':
        push(paragraph([b.label, b.text].filter(Boolean).join(' '), theme.chapter, 0, 0, b.key))
        break
      case 'item': {
        const look = itemLook(theme, b.depth)
        const marker = b.marker ? `${b.marker} ` : ''
        const hang = marker ? look.size * (b.marker.length > 1 ? 1.2 : 1) : 0
        push(paragraph(`${marker}${b.text}`, look, b.depth * step + hang, -hang, b.key))
        break
      }
      case 'para': {
        const bold = b.bold ? { bold: true } : {}
        push(
          b.role === 'lead'
            ? paragraph(b.text, { ...theme.body, ...bold }, 0, 0)
            : paragraph(
                b.text,
                { ...theme.body, size: itemLook(theme, b.depth + 1).size, ...bold },
                (b.depth + 1) * step,
                0,
              ),
        )
        break
      }
      case 'reference':
        push(
          paragraph(
            `※ ${b.text}`,
            theme.reference,
            (b.depth + 1) * step + theme.reference.size,
            -theme.reference.size,
          ),
        )
        break
      case 'image': {
        const type = imageTypeOf(b.image.mime)
        if (!type) break
        const w = Math.max(1, b.image.width ?? 640)
        const h = Math.max(1, b.image.height ?? 480)
        const width = Math.min(500, w)
        push(
          new Paragraph({
            indent: { left: Math.round((b.depth + 1) * step * TWIPS_PER_PT) },
            children: [
              new ImageRun({
                type,
                data: b.image.bytes,
                transformation: { width, height: Math.round((width * h) / w) },
              }),
            ],
          }),
        )
        break
      }
      case 'table':
        push(table(b.rows, b.header, { ...theme.body, size: theme.body.size - 1 }))
        break
      case 'closing':
        push(paragraph(b.text, theme.body, 0, 0))
        break
      case 'pageBreak':
        pageBreakNext = true
        break
    }
  }
  return new Document({
    creator: '한판',
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children,
      },
    ],
  })
}

export async function blocksToDocx(
  blocks: readonly DocBlock[],
  theme: DocTheme,
): Promise<Uint8Array> {
  const buffer = await Packer.toArrayBuffer(blocksToDocxDocument(blocks, theme))
  return new Uint8Array(buffer)
}
