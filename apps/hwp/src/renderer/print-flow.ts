import type { AgentBridge } from './ai/agent-bridge'
import type { PrintJob, PrintMode, PrintPage } from '../shared/ipc'

/**
 * Gathering the pages for a PDF or a print: the plugin draws them a few at a time (each
 * call must finish well within the bridge's ten seconds), and every picture the pages
 * carry is kept once. A logo on every page of a long document is otherwise sent and
 * written once per page.
 */

/** A picture in a page, as the editor writes it into the SVG. */
const PICTURE = /\bhref="(data:image\/[^"]*)"/g

/** The page with its pictures moved into `images`, each picture once across the job. */
export function sharePictures(svg: string, images: string[], known: Map<string, number>): string {
  return svg.replace(PICTURE, (_, dataUrl: string) => {
    let index = known.get(dataUrl)
    if (index === undefined) {
      index = images.length
      images.push(dataUrl)
      known.set(dataUrl, index)
    }
    return `href="ieum-image:${index}"`
  })
}

/** Calls of printPages one job makes at most: a plugin that stops moving must not hang it. */
const MAX_PRINT_CALLS = 10_000

export async function gatherPrintJob(
  bridge: Pick<AgentBridge, 'printPages'>,
  mode: PrintMode,
  onProgress: (done: number, total: number) => void,
): Promise<PrintJob> {
  const pages: PrintPage[] = []
  const images: string[] = []
  const known = new Map<string, number>()
  let total = 0
  for (let calls = 0; calls < MAX_PRINT_CALLS; calls++) {
    const batch = await bridge.printPages(pages.length)
    // a page count that moved under the job (an edit while gathering) stops it: the pages
    // gathered so far no longer belong with the ones still to come
    if (calls > 0 && batch.pageCount !== total) {
      throw new Error('the document changed while printing')
    }
    total = batch.pageCount
    if (batch.from !== pages.length) throw new Error('pages came back out of order')
    for (const page of batch.pages) {
      pages.push({ ...page, svg: sharePictures(page.svg, images, known) })
    }
    onProgress(pages.length, total)
    if (pages.length >= total) return { mode, pages, images }
    if (batch.pages.length === 0) break
  }
  throw new Error('the pages could not be drawn')
}

/**
 * One page of the document as a job of its own (0.17 "this page as a picture"): the page
 * `page` (0-based) with its pictures kept once, as gatherPrintJob keeps them.
 */
export async function gatherPageJob(
  bridge: Pick<AgentBridge, 'printPages'>,
  mode: PrintMode,
  page: number,
): Promise<PrintJob> {
  const batch = await bridge.printPages(page)
  const first = batch.pages[0]
  if (!first || batch.from !== page) throw new Error('the page could not be drawn')
  const images: string[] = []
  const svg = sharePictures(first.svg, images, new Map())
  return { mode, pages: [{ ...first, svg }], images }
}

/** Page `index` of the job as an image URL for the screen (the print preview). */
export function pageImageUrl(job: PrintJob, index: number): string {
  const page = job.pages[index]
  if (!page) return ''
  const svg = page.svg.replace(
    /\bhref="ieum-image:(\d+)"/g,
    (_, n: string) => `href="${job.images[Number(n)] ?? ''}"`,
  )
  const withNs = svg.includes('xmlns=')
    ? svg
    : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withNs)}`
}

/** Page `index` of the job drawn as PNG bytes at `scale` (the page picture export). */
export async function rasterizePage(job: PrintJob, index: number, scale = 2): Promise<Uint8Array> {
  const page = job.pages[index]
  if (!page) throw new Error('no such page')
  const image = new Image()
  image.src = pageImageUrl(job, index)
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(page.width * scale)
  canvas.height = Math.round(page.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no canvas')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('the picture could not be written')
  return new Uint8Array(await blob.arrayBuffer())
}
