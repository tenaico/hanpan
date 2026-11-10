/**
 * Document blocks → one self-contained HTML page laid out like the HWP the
 * same blocks make: the theme's fonts and sizes, the writer's indents and
 * hanging markers, A4 pages when printed. The Markdown converter saves it as
 * the HTML output and prints it to PDF, so the PDF needs no font metrics from
 * the Word editor (which spaces out Hancom-font headings it cannot measure).
 */
import type { DocBlock } from './blocks'
import type { DocTheme, ParaLook, TextLook } from './doc-theme'
import { bodyLayout, itemLayout, tableColumnWidths } from './hwp-writer'

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

/** The theme's font first; a PC without the Hancom fonts falls back to Windows' and then the generic family. */
export function fontStack(font: string): string {
  const serif = /명조|바탕|Batang|Myeongjo/i.test(font)
  const fallback = serif
    ? ["'Batang'", "'Noto Serif KR'", 'serif']
    : ["'Malgun Gothic'", "'Apple SD Gothic Neo'", "'Noto Sans KR'", 'sans-serif']
  return [`'${font.replace(/'/g, '')}'`, ...fallback].join(', ')
}

function css(look: TextLook & ParaLook, margin = 0, indent = 0): string {
  const parts = [
    `font-family:${fontStack(look.font)}`,
    `font-size:${look.size}pt`,
    `line-height:${(look.lineSpacing ?? 160) / 100}`,
  ]
  if (look.bold) parts.push('font-weight:700')
  if (look.color) parts.push(`color:${look.color}`)
  if (look.align) parts.push(`text-align:${look.align}`)
  if (look.spacingBefore) parts.push(`margin-top:${look.spacingBefore}pt`)
  if (look.spacingAfter) parts.push(`margin-bottom:${look.spacingAfter}pt`)
  if (margin) parts.push(`padding-left:${margin}pt`)
  if (indent) parts.push(`text-indent:${indent}pt`)
  return parts.join(';')
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function tableHtml(rows: readonly (readonly string[])[], header: boolean, theme: DocTheme): string {
  const widths = tableColumnWidths(rows, 1000)
  const cols = widths.map((w) => `<col style="width:${(w / 10).toFixed(1)}%">`).join('')
  const body = rows
    .map((row, r) => {
      const tag = header && r === 0 ? 'th' : 'td'
      return `<tr>${row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join('')}</tr>`
    })
    .join('')
  return `<table style="font-family:${fontStack(theme.body.font)};font-size:${theme.body.size - 1}pt"><colgroup>${cols}</colgroup>${body}</table>`
}

export function blocksToHtml(blocks: readonly DocBlock[], theme: DocTheme): string {
  const step = theme.indentStep
  const out: string[] = []
  let title = ''
  for (const b of blocks) {
    switch (b.kind) {
      case 'title':
        if (!b.text) break
        title ||= b.text
        out.push(`<h1 style="${css(theme.title)}">${escapeHtml(b.text)}</h1>`)
        break
      case 'meta':
        out.push(`<p style="${css(theme.meta)}">${escapeHtml(b.text)}</p>`)
        break
      case 'chapter':
        out.push(
          `<h2 style="${css(theme.chapter)}">${escapeHtml([b.label, b.text].filter(Boolean).join(' '))}</h2>`,
        )
        break
      case 'item': {
        const layout = itemLayout(theme, b.depth, b.marker)
        out.push(
          `<p style="${css(layout.look, layout.margin, layout.indent)}">${escapeHtml(`${b.marker ? `${b.marker} ` : ''}${b.text}`)}</p>`,
        )
        break
      }
      case 'para': {
        const layout =
          b.role === 'lead' ? { look: theme.body, margin: 0 } : bodyLayout(theme, b.depth)
        const look = b.bold ? { ...layout.look, bold: true } : layout.look
        out.push(`<p style="${css(look, layout.margin)}">${escapeHtml(b.text)}</p>`)
        break
      }
      case 'reference':
        out.push(
          `<p style="${css(theme.reference, (b.depth + 1) * step + theme.reference.size, -theme.reference.size)}">※ ${escapeHtml(b.text)}</p>`,
        )
        break
      case 'image':
        out.push(
          `<p style="padding-left:${(b.depth + 1) * step}pt"><img alt="" src="data:${b.image.mime};base64,${base64(b.image.bytes)}"></p>`,
        )
        break
      case 'table':
        out.push(tableHtml(b.rows, b.header, theme))
        break
      case 'pageBreak':
        out.push('<div class="page-break"></div>')
        break
      case 'closing':
        out.push(`<p style="${css(theme.body)}">${escapeHtml(b.text)}</p>`)
        break
    }
  }
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title || 'Hanpan')}</title>
<style>
@page { size: A4; margin: 20mm 20mm 18mm; }
html { background: #ffffff; color: #000000; }
body { max-width: 170mm; margin: 0 auto; padding: 12mm 0; font-family: ${fontStack(theme.body.font)}; word-break: keep-all; overflow-wrap: anywhere; }
@media print { body { max-width: none; padding: 0; } }
h1, h2, p { margin: 0; }
table { width: 100%; margin: 6pt 0; border-collapse: collapse; line-height: 1.35; }
th, td { padding: 3pt 5pt; border: 0.75pt solid #000000; vertical-align: top; text-align: left; }
th { background: #f2f2f2; font-weight: 700; text-align: center; }
tr { break-inside: avoid; }
img { max-width: 100%; height: auto; }
.page-break { break-after: page; }
</style>
</head>
<body>
${out.join('\n')}
</body>
</html>
`
}
