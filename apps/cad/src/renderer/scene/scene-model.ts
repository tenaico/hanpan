/**
 * What the 3D view draws for a document, as plain data (no three.js), so the
 * drawing rules are testable without WebGL:
 *
 * - one item per top-level part that is not hidden, in document order;
 * - a part's colour is document content; a hole is grey and see-through;
 * - a DXF drawing is lines in its entity colours (also inside groups);
 * - a part that could not be computed (a group holding an open mesh, a result
 *   over the triangle limit) has no mesh but keeps its box, so the view can
 *   outline it in red with the reason, and the other parts still draw.
 */
import {
  DEFAULT_HOLE_COLOR,
  IDENTITY,
  compose,
  transformOf,
  worldBounds,
  type Box3,
  type CadDocument,
  type EvalIssue,
  type EvaluatedPart,
  type Mesh,
  type Part,
  type Transform,
} from '@genoffice/cad-engine'
import { drawingLines, type DrawingLine } from './drawing-lines'

/** How much of a hole shows: enough to see where it cuts, not enough to hide what is behind. */
export const HOLE_OPACITY = 0.35

export interface SceneItem {
  /** the top-level part */
  id: string
  /** world-space triangles, or null (a drawing, or a part that could not be computed) */
  mesh: Mesh | null
  /** world-space polylines of the DXF drawings in this part, or null when it has none */
  lines: DrawingLine[] | null
  color: string
  opacity: number
  /** why the part could not be computed; the view outlines it and says so */
  issue: Exclude<EvalIssue, 'empty'> | null
  /** the world box around the part, for its outline, the selection and "fit" */
  box: Box3
  /** there is something on screen to click */
  selectable: boolean
}

/** Every DXF drawing in the part, groups included, placed in the world. */
function linesOf(part: Part, parent: Transform = IDENTITY): DrawingLine[] {
  if (part.type === 'drawing') return drawingLines(part, parent)
  if (part.type !== 'group') return []
  const frame = compose(parent, transformOf(part.position, part.rotation))
  return part.children.flatMap((child) => linesOf(child, frame))
}

function hasTriangles(mesh: Mesh | null): mesh is Mesh {
  return !!mesh && mesh.indices.length > 0
}

export function sceneModel(doc: CadDocument, evaluated: readonly EvaluatedPart[]): SceneItem[] {
  const results = new Map(evaluated.map((e) => [e.id, e]))
  const out: SceneItem[] = []
  for (const part of doc.parts) {
    if (part.hidden) continue
    const result = results.get(part.id)
    const lines = linesOf(part)
    const issue =
      result?.issue === 'open-mesh' || result?.issue === 'too-large' ? result.issue : null
    const mesh = result && hasTriangles(result.mesh) ? result.mesh : null
    const hole = part.role === 'hole'
    out.push({
      id: part.id,
      mesh,
      lines: lines.length > 0 ? lines : null,
      color: hole ? DEFAULT_HOLE_COLOR : part.color,
      opacity: hole ? HOLE_OPACITY : 1,
      issue,
      box: worldBounds(part),
      selectable: mesh !== null || lines.length > 0 || issue !== null,
    })
  }
  return out
}

/** The box around every item, or null when there is nothing to frame. */
export function sceneBounds(items: readonly SceneItem[]): Box3 | null {
  let out: Box3 | null = null
  for (const item of items) {
    if (!item.selectable) continue
    const { min, max } = item.box
    if (!out) {
      out = { min: [...min], max: [...max] }
      continue
    }
    for (let k = 0; k < 3; k++) {
      out.min[k] = Math.min(out.min[k]!, min[k]!)
      out.max[k] = Math.max(out.max[k]!, max[k]!)
    }
  }
  return out
}
