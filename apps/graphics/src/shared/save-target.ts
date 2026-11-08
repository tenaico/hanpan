/**
 * Where a save goes and in which format. Opened files are saved in their own
 * format; a photo opened from a format without layers that has gained layers,
 * type or masks is saved as PSD after asking, as other photo editors do; a
 * format the app cannot write is saved as the new-document format.
 */
import { LAYERLESS_EXTS, NEW_DOC_EXT, WRITABLE_EXTS, extOf } from './kinds'
import type { GraphicsKind } from './kinds'

export type SaveMode = 'save' | 'saveAs'

export interface SaveTargetInput {
  kind: GraphicsKind
  mode: SaveMode
  filePath: string | null
  docTitle: string
  layered: boolean
}

export type SaveTargetDecision =
  | { action: 'write'; path: string; format: string }
  | {
      action: 'ask'
      defaultName: string
      defaultFormat: string
      formats: string[]
      reason?: 'layered'
    }

/** The formats a save dialog offers, aliases folded into one name each. */
const OFFERED: Record<GraphicsKind, readonly string[]> = {
  photo: ['psd', 'png', 'jpg', 'webp', 'tif'],
  illust: ['vectorcraft', 'svg', 'ai'],
}
const CANONICAL: Record<string, string> = { jpeg: 'jpg', tiff: 'tif', svgz: 'svg' }

function baseName(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

export function decideSaveTarget(input: SaveTargetInput): SaveTargetDecision {
  const { kind, mode, filePath, docTitle, layered } = input
  const ext = filePath ? extOf(filePath) : ''
  const writable = ext !== '' && WRITABLE_EXTS[kind].includes(ext)
  const losesLayers = kind === 'photo' && layered && LAYERLESS_EXTS.includes(ext)
  const keepsFormat = writable && !losesLayers
  if (mode === 'save' && filePath && keepsFormat)
    return { action: 'write', path: filePath, format: ext }
  const defaultFormat = keepsFormat ? ext : NEW_DOC_EXT[kind]
  const canonical = CANONICAL[defaultFormat] ?? defaultFormat
  const formats = [defaultFormat, ...OFFERED[kind].filter((f) => f !== canonical)]
  const decision: SaveTargetDecision = {
    action: 'ask',
    defaultName: `${baseName(filePath ?? docTitle)}.${defaultFormat}`,
    defaultFormat,
    formats,
  }
  if (losesLayers && writable) decision.reason = 'layered'
  return decision
}
