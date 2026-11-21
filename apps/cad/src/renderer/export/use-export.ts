/**
 * The menu's File › Export items: the main process asks for one format
 * (`cad:export-request`), the drawing makes the bytes here, and the main
 * process asks where to write them (`cad:export-file`). What went wrong comes
 * back as the key of a notice for the screen.
 */
import { useCallback, useEffect, useRef } from 'react'
import type { CadDocument, EvaluatedPart } from '@genoffice/cad-engine'
import type { CadExportApi, ExportFormat } from '../../shared/ipc'
import { type PngSource, exportDrawingFile, exportObj, exportPng, exportStl } from './export'

/** Notices an export can end with (keys of the screen's dictionary). */
export type ExportNoticeKey = 'exportEmpty' | 'exportFailed' | 'exportSourcePath'

/** What an export reads from the open drawing, at the moment it runs. */
export interface CadExportSource {
  /** the drawing as it is now */
  document(): CadDocument
  /** the results of `evaluateDocument` for the drawing as it is now */
  evaluated(): readonly EvaluatedPart[] | Promise<readonly EvaluatedPart[]>
  /** the 3D view; null when none is shown (a PC without WebGL) */
  pngSource(): PngSource | null
  /** the file name, without extension, the save dialog offers */
  suggestedName(): string
}

async function exportBytes(
  format: ExportFormat,
  source: CadExportSource,
): Promise<Uint8Array | ExportNoticeKey> {
  if (format === 'png') {
    const view = source.pngSource()
    return view ? exportPng(view) : 'exportFailed'
  }
  const doc = source.document()
  if (format === 'dxf' || format === 'dwg') {
    const made = exportDrawingFile(doc, await source.evaluated(), format)
    return made.ok ? made.bytes : made.notice
  }
  const made = (format === 'stl' ? exportStl : exportObj)(doc, await source.evaluated())
  return made.ok ? made.bytes : made.notice
}

/** One export from start to end; null when it was written or the dialog was canceled. */
export async function runExport(
  format: ExportFormat,
  source: CadExportSource,
  api: Pick<CadExportApi, 'exportFile'>,
): Promise<ExportNoticeKey | null> {
  let bytes: Uint8Array | ExportNoticeKey
  try {
    bytes = await exportBytes(format, source)
  } catch (err) {
    console.warn('[cad] the export could not be made:', err)
    return 'exportFailed'
  }
  if (typeof bytes === 'string') return bytes
  try {
    const result = await api.exportFile({ format, bytes, suggestedName: source.suggestedName() })
    if (result.ok) return null
    return result.error === 'source-path' ? 'exportSourcePath' : 'exportFailed'
  } catch (err) {
    console.warn('[cad] the export could not be written:', err)
    return 'exportFailed'
  }
}

/**
 * Answers the menu's export requests for the drawing on screen, and returns
 * the same export for the ribbon's File tab. `source` is null while nothing is
 * open; a request then, or one that comes while an export is still running,
 * is ignored.
 */
export function useCadExport(
  source: CadExportSource | null,
  onNotice: (key: ExportNoticeKey) => void,
): (format: ExportFormat) => void {
  const sourceRef = useRef(source)
  sourceRef.current = source
  const noticeRef = useRef(onNotice)
  noticeRef.current = onNotice
  const busyRef = useRef(false)
  const start = useCallback((format: ExportFormat): void => {
    const current = sourceRef.current
    const api = window.cadApi
    if (!current || busyRef.current || typeof api.exportFile !== 'function') return
    busyRef.current = true
    void runExport(format, current, api)
      .then((notice) => {
        if (notice) noticeRef.current(notice)
      })
      .finally(() => {
        busyRef.current = false
      })
  }, [])
  useEffect(() => {
    const api = window.cadApi
    // a stand-in api without export (a test double) leaves the menu unanswered
    if (typeof api.onExportRequest !== 'function') return
    return api.onExportRequest(start)
  }, [start])
  return start
}
