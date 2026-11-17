/**
 * Turns what the main process answered for a path into the drawing on screen.
 *
 * - A `.ttukcad` that opened `ok` keeps its path (the main process granted it).
 *   A crash-recovery copy opens with unsaved changes; an untitled one has no path.
 * - A DXF, STL, OBJ, 3MF, GLB or PLY file becomes a new untitled drawing with
 *   one part, named after the file. Nothing is granted: the first save asks
 *   for a new `.ttukcad`. 3MF, GLB and PLY are read by three's readers, which
 *   may wait, so they open through `openResult`.
 * - A DWG, STEP, IGES or BREP file opens an empty untitled drawing with the
 *   guide that says how to get a file that opens (`guide`).
 * - Anything else opens an empty untitled drawing and says why, so the tab
 *   never shows a blank screen and never writes over a file it could not read.
 */
import {
  DEFAULT_SOLID_COLOR,
  addPart,
  createDocument,
  drawingPartFromDxf,
  newId,
  openCadFile,
  readDxf,
  readObj,
  readStl,
  type CadDocument,
  type MeshPart,
  type MeshReadResult,
} from '@genoffice/cad-engine'
import type { ImportExt, OpenFileResult } from '../../shared/ipc'
import { isThreeExt, readThreeMesh } from '../import/three-mesh'
import { CadSession, titleOfPath } from './session'

/** Why the drawing on screen is empty although a file was asked for. */
export type OpenNotice = 'not-ok' | 'too-large' | 'unreadable' | 'unsupported' | 'import-failed'

export interface OpenedDrawing {
  session: CadSession
  notice: OpenNotice | null
  /** a CAD program's file this editor cannot read: the screen shows the guide for it */
  guide?: { ext: string; name: string }
}

/**
 * @param untitledTitle the title of a drawing without a name ("Untitled Drawing")
 * @param path the path that was opened; it becomes the save target only for an `ok` `.ttukcad`
 */
export function openResultToSession(
  r: OpenFileResult,
  untitledTitle: string,
  path?: string | null,
): OpenedDrawing {
  const empty = (notice: OpenNotice): OpenedDrawing => ({
    session: new CadSession(createDocument(), { title: untitledTitle }),
    notice,
  })
  switch (r.status) {
    case 'ok': {
      const opened = openCadFile(r.bytes)
      if (opened.status !== 'ok') return empty('not-ok')
      // an untitled copy comes as "<copy title>.ttukcad": a name for the title, never a save target
      const keepsPath = r.restored !== 'untitled' && !!path
      const session = new CadSession(opened.document, {
        title: r.restored === 'untitled' && path ? titleOfPath(path) : untitledTitle,
        path: keepsPath ? path : undefined,
        dirty: r.restored !== undefined,
      })
      return { session, notice: null }
    }
    case 'import': {
      const doc = importDocument(r.bytes, r.ext, r.name)
      if (typeof doc === 'string') return empty(doc)
      return { session: new CadSession(doc, { title: r.name }), notice: null }
    }
    case 'guide':
      // nothing was read: an empty drawing behind the guide, so the tab is never blank
      return {
        session: new CadSession(createDocument(), { title: untitledTitle }),
        notice: null,
        guide: { ext: r.ext, name: r.name },
      }
    case 'too-large':
      return empty('too-large')
    case 'unreadable':
    case 'not-found':
      return empty('unreadable')
    case 'unknown-type':
      return empty('unsupported')
    case 'empty':
    case 'broken':
    case 'unsupported':
      return empty('not-ok')
  }
}

/**
 * Like `openResultToSession`, and it also reads 3MF, GLB and PLY files, whose
 * readers may wait. The screen opens every file through this.
 */
export async function openResult(
  r: OpenFileResult,
  untitledTitle: string,
  path?: string | null,
): Promise<OpenedDrawing> {
  if (r.status !== 'import' || !isThreeExt(r.ext))
    return openResultToSession(r, untitledTitle, path)
  const doc = meshDocument(await readThreeMesh(r.bytes, r.ext), r.name)
  if (typeof doc === 'string') {
    return { session: new CadSession(createDocument(), { title: untitledTitle }), notice: doc }
  }
  return { session: new CadSession(doc, { title: r.name }), notice: null }
}

/** A new drawing holding the imported file as one part, or why it could not be read. */
function importDocument(
  bytes: Uint8Array,
  ext: ImportExt,
  name: string,
): CadDocument | 'too-large' | 'import-failed' {
  if (ext === 'dxf') {
    const read = readDxf(bytes)
    if (read.status !== 'ok') return read.status === 'too-large' ? 'too-large' : 'import-failed'
    return addPart(createDocument(), drawingPartFromDxf(read, name))
  }
  // three's readers may wait: `openResult` reads these files
  if (isThreeExt(ext)) return 'import-failed'
  return meshDocument(ext === 'stl' ? readStl(bytes) : readObj(bytes), name)
}

/** A new drawing holding a mesh that was read as one part, or why it could not be read. */
function meshDocument(
  read: MeshReadResult,
  name: string,
): CadDocument | 'too-large' | 'import-failed' {
  if (read.status !== 'ok') return read.status === 'too-large' ? 'too-large' : 'import-failed'
  const part: MeshPart = {
    id: newId(),
    type: 'mesh',
    name,
    role: 'solid',
    color: DEFAULT_SOLID_COLOR,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    mesh: read.mesh,
    closed: read.closed,
  }
  return addPart(createDocument(), part)
}
