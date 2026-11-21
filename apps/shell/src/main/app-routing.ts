import type { DocumentTabKind } from '../shared/tabs-api'
import { OPEN_EXTS } from '../../../graphics/src/shared/kinds'

// shared by the open route, the open-dialog filter and the rename gate so they cannot drift
const DOCX_RE = /\.docx$/i
// OpenDocument text opens in the Word tab too (apps/docs docFormatOfPath picks the format)
const ODT_RE = /\.odt$/i
const XLSX_RE = /\.(xlsx|xlsm|xls|csv|tsv)$/i
const PPTX_RE = /\.pptx$/i
const PDF_RE = /\.pdf$/i
const HTML_RE = /\.html?$/i
const MINDMAP_RE = /\.xmind$/i
// AI Drawing: its own document, and the 3D, DXF and DWG files it imports into a new untitled drawing
// (no other editor opens these)
const CAD_RE = /\.ttukcad$/i
const CAD_IMPORT_RE = /\.(dxf|dwg|stl|obj|3mf|glb|ply)$/i
// Files of CAD programs AI Drawing cannot read: its tab opens with a guide that says how to get
// a DXF, DWG or STL instead (no other editor opens these either; slides only inserts .glb models)
const CAD_GUIDE_RE = /\.(step|stp|iges|igs|brep)$/i
const HWP_RE = /\.hwpx?$/i
const EPUB_RE = /\.epub$/i
// AI Photo and AI Illustration (decision 0093): the graphics editor's own format table
const PHOTO_RE = new RegExp(`\\.(${OPEN_EXTS.photo.join('|')})$`, 'i')
const ILLUST_RE = new RegExp(`\\.(${OPEN_EXTS.illust.join('|')})$`, 'i')

const TEXT_RE = /\.(md|markdown|txt|json)$/i

export {
  DOCX_RE,
  ODT_RE,
  XLSX_RE,
  PPTX_RE,
  PDF_RE,
  HTML_RE,
  MINDMAP_RE,
  CAD_RE,
  CAD_IMPORT_RE,
  CAD_GUIDE_RE,
  HWP_RE,
  EPUB_RE,
  PHOTO_RE,
  ILLUST_RE,
  TEXT_RE,
}

export function appForPath(path: string): DocumentTabKind | undefined {
  if (DOCX_RE.test(path) || ODT_RE.test(path)) return 'docs'
  if (XLSX_RE.test(path)) return 'sheets'
  if (PPTX_RE.test(path)) return 'slides'
  if (PDF_RE.test(path)) return 'pdf'
  if (TEXT_RE.test(path)) return 'markdown'
  if (HTML_RE.test(path)) return 'html'
  if (MINDMAP_RE.test(path)) return 'mindmap'
  if (CAD_RE.test(path) || CAD_IMPORT_RE.test(path) || CAD_GUIDE_RE.test(path)) return 'cad'
  if (HWP_RE.test(path)) return 'hwp'
  if (EPUB_RE.test(path)) return 'epub'
  if (PHOTO_RE.test(path)) return 'photo'
  if (ILLUST_RE.test(path)) return 'illust'
  return undefined
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

/** A legal name in an extension no app routes to would turn an openable file into an unopenable one. */
export function renameStaysInApp(from: string, newName: string): boolean {
  const current = appForPath(from)
  if (!current) return true
  // .docx and .odt share the Word tab but not the bytes: renaming one into the
  // other leaves a file the Word editor reads as corrupt
  if (current === 'docs' && ODT_RE.test(from) !== ODT_RE.test(newName)) return false
  // a picture or a drawing renamed to another format keeps its bytes: the app would read it as
  // the wrong kind
  if (
    (current === 'photo' || current === 'illust' || current === 'cad') &&
    extOf(from) !== extOf(newName)
  ) {
    return false
  }
  return appForPath(newName) === current
}
