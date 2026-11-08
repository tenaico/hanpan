/**
 * The two graphics tab kinds and the file formats each one opens, writes and
 * exports. The shell's routing, open dialog, folder tree and recent files read
 * the lists from here, so they cannot drift (decision 0093).
 */
import type { Lang } from '@genoffice/i18n'

export const GRAPHICS_KINDS = ['photo', 'illust'] as const
export type GraphicsKind = (typeof GRAPHICS_KINDS)[number]

/** The page API global each web build installs. */
export const APP_GLOBAL: Record<GraphicsKind, 'photocraft' | 'vectorcraft'> = {
  photo: 'photocraft',
  illust: 'vectorcraft',
}

/** Extensions each tab opens; pdf stays with the PDF editor. */
export const OPEN_EXTS: Record<GraphicsKind, readonly string[]> = {
  photo: ['psd', 'psb', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif'],
  illust: ['svg', 'svgz', 'ai', 'vectorcraft'],
}

/** Extensions each app writes back; an opened file in another one is saved as NEW_DOC_EXT. */
export const WRITABLE_EXTS: Record<GraphicsKind, readonly string[]> = {
  photo: ['psd', 'png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'],
  illust: ['vectorcraft', 'svg', 'svgz', 'ai'],
}

/** The format a new document is saved in: one that keeps layers and editing data. */
export const NEW_DOC_EXT: Record<GraphicsKind, string> = { photo: 'psd', illust: 'vectorcraft' }

/** Photo formats that cannot hold layers, editable type or masks. */
export const LAYERLESS_EXTS: readonly string[] = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'bmp',
  'tif',
  'tiff',
  'heic',
  'heif',
]

export const EXPORT_FORMATS: Record<GraphicsKind, readonly ('png' | 'jpg' | 'svg')[]> = {
  photo: ['png', 'jpg'],
  illust: ['png', 'svg'],
}

/** The extension of a path, lowercased, without the dot; '' when it has none. */
export function extOf(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function graphicsKindForPath(path: string): GraphicsKind | undefined {
  const ext = extOf(path)
  if (!ext) return undefined
  return GRAPHICS_KINDS.find((kind) => OPEN_EXTS[kind].includes(ext))
}

/**
 * Hanpan's language → the app's interface language. Chinese, Hebrew and
 * Devanagari fonts are not bundled (design 6-2), and the apps carry no Thai or
 * Malay interface, so those fall back to English; VectorCraft has no Arabic one.
 */
export function appLanguage(kind: GraphicsKind, lang: Lang): string {
  switch (lang) {
    case 'ko':
    case 'en':
    case 'ja':
    case 'fr':
    case 'de':
    case 'es':
    case 'id':
    case 'ru':
    case 'it':
    case 'pl':
    case 'cs':
    case 'nl':
    case 'vi':
      return lang
    case 'pt':
      return 'pt-br'
    case 'ar':
      return kind === 'photo' ? 'ar' : 'en'
    default:
      return 'en'
  }
}
