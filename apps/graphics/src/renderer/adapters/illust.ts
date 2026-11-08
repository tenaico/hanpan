/**
 * VectorCraft's web build (`window.vectorcraft`), as checked against the
 * official 0.21.0 build on 2026-11-05:
 *
 * - `file.save {path}` writes through a browser download (captured), turns the
 *   document clean and gives it that name; SVG needs `svg: {}` and .ai needs
 *   `options: {}` or the app opens its options dialog instead.
 * - `document.export {format}` answers with the bytes (`dataBase64`) and leaves
 *   the document alone. The recovery copy asks it for `vectorcraft` (the app's
 *   own format); when the build refuses that, there is no copy.
 * - `document.inspect {ids: []}` is a small answer that carries the undo
 *   history; `screenshot()` carries no picture, so snapshots are exports.
 */
import { base64ToBytes, bytesToBase64, copyBytes, downscalePng } from '../frame/bytes'
import type { GraphicsPageApi } from '../frame/page-api'
import type { DocInfo, GraphicsAdapter } from './types'

const SUMMARY_MAX = 2000

interface InspectNode {
  id?: number
  name?: string
  kind?: string
  children?: InspectNode[]
}

interface DocInspect {
  title?: string
  dirty?: boolean
  units?: string
  artboards?: { name?: string; width?: number; height?: number }[]
  selection?: number[]
  tool?: string
  history?: string[]
  layers?: InspectNode[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function docInfoFromInspect(value: unknown): DocInfo {
  const ui = asRecord(value)
  const index = typeof ui.activeDocument === 'number' ? ui.activeDocument : null
  const docs = Array.isArray(ui.documents) ? ui.documents : []
  const doc = index === null ? undefined : asRecord(docs[index])
  if (!doc) return { hasDocument: false, dirty: false, title: null }
  return {
    hasDocument: true,
    dirty: doc.dirty === true,
    title: typeof doc.title === 'string' ? doc.title : null,
  }
}

function describeLayers(layers: InspectNode[]): string[] {
  const lines: string[] = []
  for (const layer of layers) {
    const children = layer.children ?? []
    const shown = children
      .slice(0, 12)
      .map(
        (c) =>
          `${c.kind ?? '?'} #${c.id ?? '?'}${c.name && !c.name.startsWith('<') ? ` "${c.name}"` : ''}`,
      )
    const more = children.length > shown.length ? `, … ${children.length - shown.length} more` : ''
    lines.push(
      `- ${layer.name ?? 'Layer'} (#${layer.id ?? '?'}, ${children.length} objects): ${shown.join(', ')}${more}`,
    )
  }
  return lines
}

export function createIllustAdapter(api: GraphicsPageApi): GraphicsAdapter {
  async function inspectDoc(params: object): Promise<DocInspect> {
    return asRecord(await api.execute('document.inspect', params)) as DocInspect
  }

  async function exportBytes(format: 'png' | 'jpg' | 'svg'): Promise<Uint8Array> {
    const result = asRecord(await api.execute('document.export', { format }))
    if (typeof result.dataBase64 === 'string') return base64ToBytes(result.dataBase64)
    if (typeof result.text === 'string') return new TextEncoder().encode(result.text)
    throw new Error(`document.export ${format}: no bytes in the answer`)
  }

  return {
    kind: 'illust',
    api,
    async afterReady() {
      api.captureDownloads(true)
      await api.execute('prefs.set', { key: 'autosaveRecovery', value: false })
    },
    async docInfo() {
      return docInfoFromInspect(await api.inspect())
    },
    async saveBytes(fileName, format) {
      const params: Record<string, unknown> = { path: fileName }
      if (format === 'svg' || format === 'svgz') params.svg = {}
      if (format === 'ai') params.options = {}
      const result = asRecord(await api.execute('file.save', params))
      const path = typeof result.path === 'string' ? result.path : fileName
      const bytes = copyBytes(await api.readFile(path))
      if (typeof result.bytes === 'number' && result.bytes !== bytes.length) {
        throw new Error(
          `capture size mismatch: the app wrote ${result.bytes} bytes, read ${bytes.length}`,
        )
      }
      return bytes
    },
    exportBytes,
    async recoveryBytes() {
      try {
        const result = asRecord(await api.execute('document.export', { format: 'vectorcraft' }))
        const bytes =
          typeof result.dataBase64 === 'string'
            ? base64ToBytes(result.dataBase64)
            : typeof result.text === 'string'
              ? new TextEncoder().encode(result.text)
              : null
        return bytes && bytes.byteLength > 0 ? { bytes, ext: 'vectorcraft' } : null
      } catch {
        return null
      }
    },
    async isLayered() {
      return false
    },
    async revision() {
      const doc = asRecord(await api.execute('document.inspect', { ids: [] }))
      return typeof doc.revision === 'number' ? doc.revision : -1
    },
    async historyLength() {
      const doc = await inspectDoc({ ids: [] })
      return Array.isArray(doc.history) ? doc.history.length : 0
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
      if (!docInfoFromInspect(await api.inspect()).hasDocument) return null
      return downscalePng(await exportBytes('png'), maxSide)
    },
    async contextSummary() {
      const doc = await inspectDoc({ depth: 2, childLimit: 15 })
      const board = doc.artboards?.[0]
      const lines = [
        `Document "${doc.title ?? 'Untitled'}" (${doc.dirty ? 'unsaved changes' : 'saved'}), units ${doc.units ?? 'Points'}`,
        `Artboards: ${doc.artboards?.length ?? 0}${board ? `, the first ${board.width} × ${board.height} pt` : ''}`,
        `Selection: ${doc.selection?.length ? `ids ${doc.selection.join(', ')}` : 'nothing'}`,
        `Tool: ${doc.tool ?? 'selection'}`,
        'Layers (top first):',
        ...describeLayers(doc.layers ?? []),
      ]
      const text = lines.join('\n')
      return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX - 2)} …` : text
    },
    async inspectDocument(depth, childLimit) {
      return api.execute('document.inspect', { depth, childLimit })
    },
    async placeImage(name, bytes) {
      await api.execute('file.place', { name, dataBase64: bytesToBase64(bytes), link: false })
    },
  }
}
