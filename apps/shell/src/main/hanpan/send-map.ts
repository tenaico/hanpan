/**
 * Hanpan: "send this map to a document". The mind map tab hands over its sheet
 * as an outline; this writes the document (HWPX through the rhwp engine, PPTX
 * through the slide engine, DOCX through the docx writer), opens it as a new
 * untitled tab of its editor, and records the link between the two so later
 * edits on either side can be carried across (link store, `links.ts`).
 */
import {
  applySlideWriting,
  blocksToDocx,
  blocksToHwp,
  checkSendRequest,
  documentFileName,
  extensionOf,
  outlineToBlocks,
  outlineToSlides,
  themeFor,
  withoutImages,
  type HwpEngine,
  type MapDocLink,
  type SendRequest,
  type SendResult,
  type SlidePlan,
  type SlideStyleId,
  type StyledDeckOptions,
} from '@genoffice/hanpan-core'
import { join } from 'node:path'
import type { TabContents } from './link-store'

export type CopyEditor = 'hwp' | 'slides' | 'docs' | 'mindmap' | 'mindmap'

export interface SendMapDeps {
  loadHwpEngine(): Promise<HwpEngine>
  buildDeck(slides: SlidePlan[], style?: SlideStyleId, options?: StyledDeckOptions): Promise<Uint8Array>
  makeCopyDir(): Promise<string>
  writeFile(path: string, bytes: Uint8Array): Promise<void>
  removeDir(dir: string): Promise<void>
  openCopy(copy: {
    editor: CopyEditor
    path: string
    /** the fresh folder the copy is alone in */
    dir: string
    bytes: Uint8Array
    fileName: string
    title: string
  }): Promise<{ tabId: string; contents: TabContents } | null>
  /** remembers the link; the new tab's first save fills in the document path, the map tab's the map path */
  recordLink(link: MapDocLink, documentTab: TabContents, mapTab: TabContents | null): void
  newId(): string
  now(): number
}

const EDITOR_OF: Record<SendRequest['target'], CopyEditor> = {
  hwp: 'hwp',
  slides: 'slides',
  docx: 'docs',
}

export async function documentBytesFor(
  request: SendRequest,
  deps: Pick<SendMapDeps, 'loadHwpEngine' | 'buildDeck'>,
): Promise<Uint8Array> {
  if (request.target === 'slides') {
    const slides = outlineToSlides(request.outline, { includeNotes: request.includeNotes })
    const writing = request.slideWriting
    return deps.buildDeck(
      writing ? applySlideWriting(slides, writing) : slides,
      request.slideStyle,
      writing?.closing ? { closing: writing.closing } : undefined,
    )
  }
  const blocks = outlineToBlocks(request.outline, {
    style: request.style,
    date: request.date,
    department: request.department,
    includeNotes: request.includeNotes,
  })
  const theme = themeFor(request.style, request.theme)
  if (request.target === 'docx') return blocksToDocx(blocks, theme)
  return blocksToHwp(await deps.loadHwpEngine(), blocks, theme, 'hwpx').bytes
}

export function createMapSender(deps: SendMapDeps) {
  return async function sendMap(
    rawRequest: unknown,
    mapContents: TabContents | null,
  ): Promise<SendResult> {
    let request: SendRequest
    try {
      request = checkSendRequest(rawRequest)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
    if (!request.outline.nodes.length) return { ok: false, error: 'empty' }
    const bytes = await documentBytesFor(request, deps)
    const fileName = documentFileName(request.outline.title, extensionOf(request.target))
    const title = fileName.slice(0, fileName.lastIndexOf('.'))
    const dir = await deps.makeCopyDir()
    const path = join(dir, fileName)
    let opened: Awaited<ReturnType<SendMapDeps['openCopy']>>
    try {
      await deps.writeFile(path, bytes)
      opened = await deps.openCopy({
        editor: EDITOR_OF[request.target],
        path,
        dir,
        bytes,
        fileName,
        title,
      })
    } catch {
      opened = null
    }
    if (!opened) {
      await deps.removeDir(dir).catch(() => undefined)
      return { ok: false, error: 'the new tab did not open' }
    }
    opened.contents.once('destroyed', () => void deps.removeDir(dir).catch(() => undefined))
    const now = deps.now()
    deps.recordLink(
      {
        id: deps.newId(),
        target: request.target,
        mapPath: request.mapPath,
        sheetId: request.sheetId,
        style: request.style,
        theme: request.theme,
        docPath: null,
        base: withoutImages(request.outline),
        createdAt: now,
        updatedAt: now,
      },
      opened.contents,
      mapContents,
    )
    return { ok: true, title }
  }
}
