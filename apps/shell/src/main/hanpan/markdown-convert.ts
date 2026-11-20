/**
 * Hanpan: the Markdown converter. One Markdown text becomes every format the
 * user ticked (HWP, HWPX, Word, ODT, PDF, HTML) in one press, written side by
 * side in one folder. The page content is the same `markdownToBlocks` blocks the
 * 글집 templates use, so a converted file looks like a Hanpan report. ODT is made
 * from the Word file; the PDF is the HTML page printed, laid out like the HWP.
 */
import {
  DOC_THEMES,
  blocksToDocx,
  blocksToHtml,
  blocksToHwp,
  markdownToBlocks,
  type DocBlock,
  type HwpEngine,
} from '@genoffice/hanpan-core'
import { join } from 'node:path'

export const CONVERT_FORMATS = ['hwp', 'hwpx', 'docx', 'odt', 'pdf', 'html'] as const
export type ConvertFormat = (typeof CONVERT_FORMATS)[number]
export const CONVERT_THEMES = ['report', 'plain', 'gongmun', 'basic'] as const
export type ConvertTheme = (typeof CONVERT_THEMES)[number]

export interface ConvertRequest {
  markdown: string
  /** the file name without extension; also the title when the text has no `# ` heading */
  name: string
  formats: ConvertFormat[]
  theme: ConvertTheme
}

export interface ConvertResult {
  written: { format: ConvertFormat; path: string }[]
  failed: { format: ConvertFormat; error: string }[]
}

export interface ConvertDeps {
  loadHwpEngine(): Promise<HwpEngine>
  docxToOdt(docx: Uint8Array): Promise<Uint8Array>
  /** the HTML page printed to A4 PDF pages */
  htmlToPdf(html: string): Promise<Uint8Array>
  writeFile(path: string, bytes: Uint8Array): Promise<void>
  exists(path: string): boolean
}

const MAX_MARKDOWN = 5_000_000

/** Characters Windows does not allow in a file name, and trailing dots and spaces. */
export function safeFileName(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex -- Windows file names must exclude ASCII controls.
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 100)
  return cleaned || '변환 문서'
}

export function checkConvertRequest(raw: unknown): ConvertRequest {
  const value = (raw ?? {}) as Record<string, unknown>
  if (typeof value.markdown !== 'string' || !value.markdown.trim()) throw new Error('no markdown')
  if (value.markdown.length > MAX_MARKDOWN) throw new Error('the markdown is too long')
  const formats = Array.isArray(value.formats)
    ? CONVERT_FORMATS.filter((f) => (value.formats as unknown[]).includes(f))
    : []
  if (formats.length === 0) throw new Error('no format')
  const theme = CONVERT_THEMES.find((t) => t === value.theme) ?? 'report'
  return {
    markdown: value.markdown,
    name: safeFileName(typeof value.name === 'string' ? value.name : ''),
    formats,
    theme,
  }
}

/** The document's own title: its first `# ` heading, else nothing. */
export function markdownTitle(markdown: string): string | null {
  const m = /^#\s+(.+)$/m.exec(markdown.replace(/\r\n?/g, '\n'))
  return m ? safeFileName(m[1]!.replace(/[*_`]/g, '')) : null
}

/** The blocks to write: a text without a `# ` title takes the file name as its title. */
export function convertBlocks(request: ConvertRequest): DocBlock[] {
  const blocks = markdownToBlocks(request.markdown)
  return blocks.map((b) => (b.kind === 'title' && !b.text ? { ...b, text: request.name } : b))
}

/** `name.ext`, or `name (2).ext` and on while a file of that name is already there. */
export function freePath(
  folder: string,
  name: string,
  ext: string,
  exists: (path: string) => boolean,
): string {
  let path = join(folder, `${name}.${ext}`)
  for (let n = 2; exists(path); n++) path = join(folder, `${name} (${n}).${ext}`)
  return path
}

export async function convertMarkdown(
  request: ConvertRequest,
  folder: string,
  deps: ConvertDeps,
): Promise<ConvertResult> {
  const blocks = convertBlocks(request)
  const theme = DOC_THEMES[request.theme]!
  const result: ConvertResult = { written: [], failed: [] }
  const wants = (f: ConvertFormat) => request.formats.includes(f)
  let docx: Promise<Uint8Array> | null = null
  const docxBytes = () => (docx ??= blocksToDocx(blocks, theme))

  const write = async (format: ConvertFormat, make: (path: string) => Promise<void>) => {
    if (!wants(format)) return
    const path = freePath(folder, request.name, format, deps.exists)
    try {
      await make(path)
      result.written.push({ format, path })
    } catch (error) {
      result.failed.push({ format, error: error instanceof Error ? error.message : String(error) })
    }
  }

  for (const format of ['hwp', 'hwpx'] as const) {
    await write(format, async (path) =>
      deps.writeFile(path, blocksToHwp(await deps.loadHwpEngine(), blocks, theme, format).bytes),
    )
  }
  await write('docx', async (path) => deps.writeFile(path, await docxBytes()))
  await write('odt', async (path) => deps.writeFile(path, await deps.docxToOdt(await docxBytes())))
  const html = blocksToHtml(blocks, theme)
  await write('pdf', async (path) => deps.writeFile(path, await deps.htmlToPdf(html)))
  await write('html', async (path) => deps.writeFile(path, new TextEncoder().encode(html)))
  return result
}
