/**
 * What the host page, the AI tools and the quick actions need from a web app,
 * whatever its own commands are called. One adapter per app.
 */
import type { GraphicsKind } from '../../shared/kinds'
import type { GraphicsPageApi } from '../frame/page-api'

/**
 * Files the host page has an app write for itself (a picture copy for the AI or
 * an export). The capture watch never reads them as the app's own export.
 */
export const HOST_EXPORT_PREFIX = '.hanpan-export-'

let hostExportSerial = 0

/**
 * A capture name of its own for a copy the host has the app write: the prefix,
 * then a stamp, then `fileName`. Never the document's own capture name (an opened
 * `drawing.ai` is captured as `drawing.ai`), so the app does not take the copy for
 * a save over its source, and the capture watch does not take it for the app's.
 */
export function hostExportName(fileName: string): string {
  hostExportSerial += 1
  return `${HOST_EXPORT_PREFIX}${Date.now().toString(36)}-${hostExportSerial}-${fileName}`
}

export interface DocInfo {
  hasDocument: boolean
  dirty: boolean
  title: string | null
}

export interface GraphicsAdapter {
  readonly kind: GraphicsKind
  readonly api: GraphicsPageApi
  /** Once the API is up: capture the app's downloads (and, for VectorCraft, turn its own recovery off). */
  afterReady(): Promise<void>
  docInfo(): Promise<DocInfo>
  /** Saves through the app, so the document turns clean and takes the name; returns the file's bytes. */
  saveBytes(fileName: string, format: string): Promise<Uint8Array>
  /**
   * A copy in another format, the document left as it is (path, title and changed
   * mark unchanged); returns the file's bytes. Only the Illustration app has it.
   */
  saveCopyBytes?(fileName: string, format: string): Promise<Uint8Array>
  /** A picture or SVG of the document; the document itself is left as it is. */
  exportBytes(format: 'png' | 'jpg' | 'svg'): Promise<Uint8Array>
  /**
   * The document for a crash-recovery copy, the document left as it is (no save,
   * no changed mark moved): bytes and the extension they are in. Null when the
   * app gives none.
   */
  recoveryBytes(): Promise<{ bytes: Uint8Array; ext: string } | null>
  /** The document holds layers, type or masks that a format without layers would drop. */
  isLayered(): Promise<boolean>
  /** How many entries the app's undo history holds now. */
  historyLength(): Promise<number>
  /** The document's revision: the app moves it on every edit and every undo. */
  revision(): Promise<number>
  /** Undoes up to `steps` entries; returns how many it undid. */
  undo(steps: number): Promise<number>
  /** The document as a PNG no larger than maxSide, or null when there is none. */
  snapshotPng(maxSide: number): Promise<Uint8Array | null>
  /** A short description of the document for the AI's context, at most 2,000 characters. */
  contextSummary(): Promise<string>
  inspectDocument(depth: number, childLimit: number): Promise<unknown>
  /** Places a picture into the document as an editable copy. */
  placeImage(name: string, bytes: Uint8Array): Promise<void>
}
