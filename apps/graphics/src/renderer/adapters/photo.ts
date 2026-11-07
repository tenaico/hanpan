/**
 * The PhotoCraft adapter (AI Photo), written against the pinned 0.20.2-h1 web
 * build's page API as it answered in the built app (2026-11-05):
 *
 * - The document state is `inspect().session.documents[session.active]`
 *   ({dirty, name, revision}); the open document's detail is `inspect().document`.
 * - `request('app.save', {path})` is File › Save: PSD is a real save (the
 *   document turns clean and takes the name), a flat format (PNG, JPEG, …) is
 *   written as a copy and leaves the document's name and changed mark alone.
 * - `request('app.exportImage', {format, maxSide?})` (h2) gives the composited
 *   picture without writing a file or touching the document; copies and the
 *   AI's canvas picture come from it. `{format: 'psd'}` (h4) gives the layered
 *   document the same way, for the recovery copy; h3 refuses it ("format must be
 *   png or jpeg"), and the copy is the flattened PNG then.
 * - The history is `document.history` (one entry per step); `edit.undo` throws
 *   when there is nothing left to undo.
 */
import { LAYERLESS_EXTS } from '../../shared/kinds'
import { base64ToBytes, copyBytes } from '../frame/bytes'
import type { GraphicsPageApi } from '../frame/page-api'
import type { DocInfo, GraphicsAdapter } from './types'

const SUMMARY_MAX = 2000
const SUMMARY_LAYERS = 40

interface SessionDoc {
  dirty?: boolean
  name?: string
  revision?: number
}

interface PhotoLayer {
  id?: number
  name?: string
  kind?: string
  hasMask?: boolean
  hasVectorMask?: boolean
  visible?: boolean
  text?: { text?: string }
}

interface PhotoDocument {
  name?: string
  width?: number
  height?: number
  mode?: string
  resolution?: number
  history?: string[]
  layers?: PhotoLayer[]
  selectedLayers?: number[]
  hasSelection?: boolean
  selectionBounds?: unknown
  activeLayer?: number
}

interface PhotoInspect {
  session?: { active?: number | null; documents?: SessionDoc[] }
  document?: PhotoDocument | null
}

function asInspect(value: unknown): PhotoInspect {
  return value && typeof value === 'object' ? (value as PhotoInspect) : {}
}

function activeDoc(ui: PhotoInspect): SessionDoc | undefined {
  const index = ui.session?.active
  return typeof index === 'number' ? ui.session?.documents?.[index] : undefined
}

/**
 * The tab's own document: the first one. Embedded mode turns New and Open off,
 * but a smart object's contents, a duplicate or "new document from state" open
 * further documents from the app's own UI; they are not the tab's file.
 */
function tabDoc(ui: PhotoInspect): SessionDoc | undefined {
  return typeof ui.session?.active === 'number' ? ui.session?.documents?.[0] : undefined
}

function othersDirty(ui: PhotoInspect): boolean {
  return (ui.session?.documents ?? []).slice(1).some((d) => d.dirty)
}

function extOf(path: string): string {
  return /\.([^.\\/]+)$/.exec(path)?.[1]?.toLowerCase() ?? ''
}

function layerLine(layer: PhotoLayer): string {
  const marks = [
    layer.kind ?? 'Layer',
    `#${layer.id ?? '?'}`,
    layer.hasMask ? 'mask' : '',
    layer.hasVectorMask ? 'vector mask' : '',
    layer.visible === false ? 'hidden' : '',
  ].filter(Boolean)
  const text = layer.text?.text ? ` text "${layer.text.text.slice(0, 60)}"` : ''
  return `- ${layer.name ?? 'Layer'} (${marks.join(', ')})${text}`
}

export function createPhotoAdapter(api: GraphicsPageApi): GraphicsAdapter {
  /** a flat save leaves the app's mark on: the tab reads clean while the revision stays */
  let flatSave: { appName: string; revision: number; fileName: string } | null = null

  async function inspect(): Promise<PhotoInspect> {
    return asInspect(await api.inspect())
  }

  async function writeThroughSave(path: string): Promise<Uint8Array> {
    const result = (await api.request('app.save', { path })) as { path?: unknown } | null
    const written = typeof result?.path === 'string' ? result.path : path
    return copyBytes(await api.readFile(written))
  }

  /** The composited picture (h2's `app.exportImage`): no file, no save, no status line. */
  async function exportImage(params: Record<string, unknown>): Promise<Uint8Array> {
    const answer = (await api.request('app.exportImage', params)) as { dataBase64?: unknown } | null
    if (typeof answer?.dataBase64 !== 'string') throw new Error('app.exportImage: no picture')
    return base64ToBytes(answer.dataBase64)
  }

  async function exportBytes(format: 'png' | 'jpg' | 'svg'): Promise<Uint8Array> {
    if (format === 'svg') throw new Error('AI Photo exports PNG or JPEG, not SVG')
    return exportImage({ format: format === 'jpg' ? 'jpeg' : 'png' })
  }

  function info(ui: PhotoInspect): DocInfo {
    const doc = tabDoc(ui)
    if (!doc) return { hasDocument: false, dirty: false, title: null }
    const name = doc.name ?? null
    // a second document's unsaved changes keep the tab marked: closing would drop them
    const others = othersDirty(ui)
    if (flatSave && name !== flatSave.appName) flatSave = null
    if (flatSave) {
      return {
        hasDocument: true,
        dirty: others || (Boolean(doc.dirty) && doc.revision !== flatSave.revision),
        title: flatSave.fileName,
      }
    }
    return { hasDocument: true, dirty: others || Boolean(doc.dirty), title: name }
  }

  return {
    kind: 'photo',
    api,
    async afterReady() {
      api.captureDownloads(true)
    },
    async docInfo() {
      return info(await inspect())
    },
    async saveBytes(fileName, format) {
      if ((await inspect()).session?.active !== 0) {
        throw new Error(
          'another document is in front of the picture; switch back to its own document to save',
        )
      }
      const bytes = await writeThroughSave(fileName)
      const ext = (format || extOf(fileName)).toLowerCase()
      const doc = activeDoc(await inspect())
      if ((LAYERLESS_EXTS as readonly string[]).includes(ext) && doc?.name !== undefined) {
        flatSave = { appName: doc.name, revision: doc.revision ?? -1, fileName }
      } else {
        flatSave = null
      }
      return bytes
    },
    exportBytes,
    async recoveryBytes() {
      try {
        return { bytes: await exportImage({ format: 'psd' }), ext: 'psd' }
      } catch {
        // a build without PSD export: the flattened picture is kept, so something is
      }
      try {
        return { bytes: await exportImage({ format: 'png' }), ext: 'png' }
      } catch {
        return null
      }
    },
    async isLayered() {
      const layers = (await inspect()).document?.layers ?? []
      return (
        layers.length > 1 ||
        layers.some((l) => (l.kind ?? 'Pixel') !== 'Pixel' || l.hasMask || l.hasVectorMask)
      )
    },
    async revision() {
      return activeDoc(await inspect())?.revision ?? -1
    },
    async historyLength() {
      const history = (await inspect()).document?.history
      return Array.isArray(history) ? history.length : 0
    },
    async undo(steps) {
      let done = 0
      for (; done < steps; done++) {
        try {
          await api.execute('edit.undo', {})
        } catch {
          break
        }
      }
      return done
    },
    async snapshotPng(maxSide) {
      if (!info(await inspect()).hasDocument) return null
      return exportImage({ format: 'png', maxSide })
    },
    async contextSummary() {
      const ui = await inspect()
      const doc = ui.document ?? {}
      const state = info(ui)
      const layers = doc.layers ?? []
      const shown = layers.slice(0, SUMMARY_LAYERS)
      const lines = [
        `Picture "${state.title ?? doc.name ?? 'Untitled'}" (${state.dirty ? 'unsaved changes' : 'saved'}), ${doc.width ?? '?'} × ${doc.height ?? '?'} px${doc.mode ? `, ${doc.mode}` : ''}`,
        `Selected layers: ${doc.selectedLayers?.length ? doc.selectedLayers.map((id) => `#${id}`).join(', ') : 'none'}`,
        `Pixel selection: ${doc.hasSelection ? 'yes' : 'none'}`,
        `Layers (top first, ${layers.length}):`,
        ...shown.map(layerLine),
        ...(layers.length > shown.length ? [`- … ${layers.length - shown.length} more`] : []),
      ]
      const text = lines.join('\n')
      return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX - 2)} …` : text
    },
    async inspectDocument(_depth, childLimit) {
      const doc = (await inspect()).document
      if (!doc) return { document: null }
      return {
        name: doc.name,
        width: doc.width,
        height: doc.height,
        mode: doc.mode,
        resolution: doc.resolution,
        activeLayer: doc.activeLayer,
        selectedLayers: doc.selectedLayers,
        hasSelection: doc.hasSelection,
        selectionBounds: doc.selectionBounds,
        history: doc.history?.slice(-10),
        layers: (doc.layers ?? []).slice(0, childLimit),
        layerCount: doc.layers?.length ?? 0,
      }
    },
    async placeImage() {
      throw new Error('Placing a picture from the tab is not available in AI Photo')
    },
  }
}
