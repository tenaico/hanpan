/**
 * Three buttons per app that do a common job without the AI (design 6-5).
 * Each runs the app's own commands inside the input lock, like an AI run, so
 * the app's history holds the action's edits only and its own Undo takes
 * them back.
 */
import type { GraphicsAdapter } from '../adapters'
import type { ExportRequest, ExportResult, PickedImage } from '../../shared/ipc'
import type { GraphicsKind } from '../../shared/kinds'
import { t, type StringKey } from '../i18n/locale'
import type { PixelSize } from './resize'

export const QUICK_ACTIONS = {
  photo: ['removeBackground', 'autoTone', 'exportAtSize'],
  illust: ['traceImage', 'centerOnArtboard', 'exportPngSvg'],
} as const

export type QuickActionId = (typeof QUICK_ACTIONS)[GraphicsKind][number]

export type ExportFormatChoice = 'png' | 'jpg' | 'svg'

export interface ExportChoice {
  format: ExportFormatChoice
  /** a raster size other than the picture's own */
  width?: number
  height?: number
  /** JPEG quality, 0–1; the resize's own default when absent */
  quality?: number
}

export interface QuickDeps {
  adapter: Pick<GraphicsAdapter, 'api' | 'placeImage' | 'exportBytes' | 'docInfo'>
  pickImage(): Promise<PickedImage | null>
  exportFile(request: ExportRequest): Promise<ExportResult>
  /** the export dialog: null when the person canceled */
  askExport(kind: GraphicsKind, size: PixelSize): Promise<ExportChoice | null>
  /** locks the person's input to the app; returns the unlock */
  lock(): () => void
  measure(bytes: Uint8Array): Promise<PixelSize>
  resize(
    bytes: Uint8Array,
    width: number,
    height: number,
    format: 'png' | 'jpg',
    quality?: number,
  ): Promise<Uint8Array>
  /**
   * the export's file name while the app still calls the document by its own
   * default ("Untitled-1"): the Hanpan tab's name. The tab's untitled name in
   * the interface language when absent.
   */
  untitledName?: string
}

/**
 * what the bar says afterwards; null when there is nothing to say (canceled).
 * Failures carry a plain message only: the app's own refusal text is English
 * developer wording ("command `x` is not available…"), so it goes to the console.
 */
export interface QuickResult {
  ok: boolean
  messageKey: StringKey | null
}

/** what each action says once it worked */
const DONE: Record<Exclude<QuickActionId, 'exportAtSize' | 'exportPngSvg'>, QuickResult> = {
  removeBackground: { ok: true, messageKey: 'quickDoneRemoveBackground' },
  autoTone: { ok: true, messageKey: 'quickDoneAutoTone' },
  traceImage: { ok: true, messageKey: 'quickDoneTrace' },
  centerOnArtboard: { ok: true, messageKey: 'quickDoneCenter' },
}

/**
 * The likely cause when the app refuses: the pixel actions need a picture layer
 * (a type or empty layer has no pixels), the trace a placed picture, the
 * centering something on the artboard.
 */
const FAILED: Record<QuickActionId, StringKey> = {
  removeBackground: 'quickNeedPixelLayer',
  autoTone: 'quickNeedPixelLayer',
  traceImage: 'quickTraceFailed',
  centerOnArtboard: 'quickCenterFailed',
  exportAtSize: 'quickExportFailed',
  exportPngSvg: 'quickExportFailed',
}
const CANCELED: QuickResult = { ok: true, messageKey: null }
const NO_DOCUMENT: QuickResult = { ok: false, messageKey: 'quickNoDocument' }

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

async function selection(deps: QuickDeps): Promise<number[]> {
  const doc = record(await deps.adapter.api.execute('document.inspect', { ids: [] }))
  return Array.isArray(doc.selection) ? (doc.selection as number[]) : []
}

/** A placed picture is selected: VectorCraft 0.21.0's document.node answers `kind: {type: 'image', …}`. */
async function selectedImage(deps: QuickDeps): Promise<boolean> {
  const selected = await selection(deps)
  if (selected.length !== 1) return false
  const node = record(await deps.adapter.api.execute('document.node', { id: selected[0] }))
  return record(node.kind).type === 'image'
}

/** the apps' own name for a document never saved: "Untitled-1" (VectorCraft), "제목 없음-1" (PhotoCraft in Korean) */
const APP_UNTITLED = /^(untitled|제목\s*없음)(-\d+)?$/i

function baseName(title: string | null, untitled: string): string {
  const name = (title ?? '').replace(/\.[^.]+$/, '').trim()
  return !name || APP_UNTITLED.test(name) ? untitled : name
}

function untitledName(kind: GraphicsKind, deps: QuickDeps): string {
  return deps.untitledName ?? t(kind === 'photo' ? 'untitledPhoto' : 'untitledIllust')
}

async function exportWithDialog(kind: GraphicsKind, deps: QuickDeps): Promise<QuickResult> {
  const raster = await deps.adapter.exportBytes('png')
  const size = await deps.measure(raster)
  const choice = await deps.askExport(kind, size)
  if (!choice) return CANCELED
  let bytes: Uint8Array
  if (choice.format === 'svg') {
    bytes = await deps.adapter.exportBytes('svg')
  } else if (
    choice.format === 'jpg' ||
    (choice.width !== undefined && choice.width !== size.width) ||
    (choice.height !== undefined && choice.height !== size.height)
  ) {
    bytes = await deps.resize(
      raster,
      choice.width ?? size.width,
      choice.height ?? size.height,
      choice.format,
      ...(choice.quality === undefined ? [] : [choice.quality]),
    )
  } else {
    bytes = raster
  }
  const title = (await deps.adapter.docInfo()).title
  const result = await deps.exportFile({
    bytes,
    defaultName: `${baseName(title, untitledName(kind, deps))}.${choice.format}`,
    format: choice.format,
  })
  if (!result.ok) {
    console.warn('quick export failed:', result.error)
    return { ok: false, messageKey: 'quickExportFailed' }
  }
  if ('canceled' in result) return CANCELED
  return { ok: true, messageKey: 'quickExported' }
}

async function run(id: QuickActionId, deps: QuickDeps): Promise<QuickResult> {
  const execute = (command: string, params: object = {}) =>
    deps.adapter.api.execute(command, params)
  // every action works on an open document: without one the app only answers
  // with a developer error, so nothing is sent
  if (!(await deps.adapter.docInfo()).hasDocument) return NO_DOCUMENT
  switch (id) {
    case 'removeBackground':
      await execute('layer.removeBackground')
      return DONE.removeBackground
    case 'autoTone':
      await execute('image.autoTone')
      return DONE.autoTone
    case 'exportAtSize':
      return exportWithDialog('photo', deps)
    case 'exportPngSvg':
      return exportWithDialog('illust', deps)
    case 'traceImage': {
      if (!(await selectedImage(deps))) {
        const picked = await deps.pickImage()
        if (!picked) return CANCELED
        // the placed picture is left selected: the trace takes it
        await deps.adapter.placeImage(picked.name, picked.bytes)
      }
      await execute('imageTrace.makeAndExpand')
      return DONE.traceImage
    }
    case 'centerOnArtboard':
      if ((await selection(deps)).length === 0) await execute('select.all')
      await execute('object.align', { horizontal: 'center', vertical: 'center', to: 'artboard' })
      return DONE.centerOnArtboard
  }
}

export async function runQuickAction(id: QuickActionId, deps: QuickDeps): Promise<QuickResult> {
  const unlock = deps.lock()
  try {
    return await run(id, deps)
  } catch (error) {
    console.warn(`quick action ${id} failed:`, errorText(error))
    return { ok: false, messageKey: FAILED[id] }
  } finally {
    unlock()
  }
}
