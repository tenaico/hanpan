/**
 * The bytes of an export: STL and OBJ hold the results of the visible
 * top-level solids merged into one mesh (holes already cut by the evaluation;
 * a hole on its own only cuts inside a group, so it is not exported),
 * DXF and DWG hold the drawings and the solids' outlines from above (0.22.3),
 * PNG is a picture of the 3D view. The main process asks where to write them
 * (`cad:export-file`).
 */
import { viewOutline, writeObj, writeStl } from '@genoffice/cad-engine'
import type { CadDocument, DrawingEntity, EvaluatedPart, Mesh } from '@genoffice/cad-engine'
// DXF and DWG writing is its own entry: acad-ts is ESM-only
import { writeDrawingFile } from '@genoffice/cad-engine/dwg'
import { placeEntities } from '../measure/measure-tool'

/** Why an export made no file; the key of the screen's notice. */
export type ExportNotice = 'exportEmpty'

export type ExportBytes = { ok: true; bytes: Uint8Array } | { ok: false; notice: ExportNotice }

/** What the PNG export needs from the 3D view: one picture on a light background. */
export interface PngSource {
  snapshot(): Promise<Uint8Array>
}

/**
 * The results of the parts that are at the top level, not hidden and not
 * holes in `doc`, as one mesh; null when none has a triangle. A result whose
 * part is no longer at the top level or is hidden now is left out, so results
 * evaluated a moment earlier never bring back a part the user hid. A
 * top-level hole only cuts inside a group; in a file it would be a solid, so
 * it is left out too.
 */
export function mergeVisibleMeshes(
  doc: CadDocument,
  evaluated: readonly EvaluatedPart[],
): Mesh | null {
  const visible = new Set(doc.parts.filter((p) => !p.hidden && p.role !== 'hole').map((p) => p.id))
  const meshes: Mesh[] = []
  for (const result of evaluated) {
    if (!visible.has(result.id) || !result.mesh || result.mesh.indices.length < 3) continue
    meshes.push(result.mesh)
  }
  if (meshes.length === 0) return null
  let vertices = 0
  let corners = 0
  for (const m of meshes) {
    vertices += m.positions.length
    corners += m.indices.length - (m.indices.length % 3)
  }
  const positions = new Float32Array(vertices)
  const indices = new Uint32Array(corners)
  let vAt = 0
  let iAt = 0
  for (const m of meshes) {
    positions.set(m.positions, vAt)
    const base = vAt / 3
    const usable = m.indices.length - (m.indices.length % 3)
    for (let i = 0; i < usable; i++) indices[iAt++] = base + m.indices[i]!
    vAt += m.positions.length
  }
  return { positions, indices }
}

function meshExport(
  doc: CadDocument,
  evaluated: readonly EvaluatedPart[],
  write: (mesh: Mesh) => Uint8Array,
): ExportBytes {
  const mesh = mergeVisibleMeshes(doc, evaluated)
  if (!mesh) return { ok: false, notice: 'exportEmpty' }
  return { ok: true, bytes: write(mesh) }
}

/** Binary STL of the visible top-level results, in millimetres. */
export function exportStl(doc: CadDocument, evaluated: readonly EvaluatedPart[]): ExportBytes {
  return meshExport(doc, evaluated, writeStl)
}

/** OBJ of the visible top-level results, in millimetres. */
export function exportObj(doc: CadDocument, evaluated: readonly EvaluatedPart[]): ExportBytes {
  return meshExport(doc, evaluated, writeObj)
}

/**
 * What a DXF or DWG export holds, in millimetres on the workplane: the
 * entities of the visible top-level drawings where they sit, and the outline of
 * every other visible top-level solid seen from above (layer "AI-DRAWING"),
 * since a drawing file has no solids of its own. Empty when nothing is visible.
 */
export function drawingEntitiesForExport(
  doc: CadDocument,
  evaluated: readonly EvaluatedPart[],
): DrawingEntity[] {
  const out: DrawingEntity[] = []
  const results = new Map(evaluated.map((e) => [e.id, e]))
  for (const part of doc.parts) {
    if (part.hidden) continue
    if (part.type === 'drawing') {
      for (const e of placeEntities(part)) out.push(e)
      continue
    }
    if (part.role === 'hole') continue
    const mesh = results.get(part.id)?.mesh
    if (!mesh || mesh.indices.length < 3) continue
    for (const [x0, y0, x1, y1] of viewOutline(mesh, 'top')) {
      out.push({ kind: 'line', a: [x0!, y0!], b: [x1!, y1!], layer: SOLID_OUTLINE_LAYER })
    }
  }
  return out
}

/** The layer the outlines of solids go on in a DXF or DWG export. */
export const SOLID_OUTLINE_LAYER = 'AI-DRAWING'

/** A DXF or DWG file of the drawing; a new file, never the one the drawing came from. */
export function exportDrawingFile(
  doc: CadDocument,
  evaluated: readonly EvaluatedPart[],
  format: 'dxf' | 'dwg',
): ExportBytes {
  const entities = drawingEntitiesForExport(doc, evaluated)
  if (entities.length === 0) return { ok: false, notice: 'exportEmpty' }
  return { ok: true, bytes: writeDrawingFile(entities, format) }
}

/** The 3D view as PNG, drawn by the view itself in the light theme. */
export function exportPng(view: PngSource): Promise<Uint8Array> {
  return view.snapshot()
}
