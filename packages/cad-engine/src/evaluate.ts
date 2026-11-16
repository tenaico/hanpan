import { extrudeMesh } from './extrude'
import type { Kernel } from './kernel'
import { transformMesh, triangleCount } from './mesh'
import { MAX_TRIANGLES } from './model'
import type { CadDocument, GroupPart, Mesh, Part } from './model'
import { shapeMesh } from './shapes'

export type EvalIssue = null | 'open-mesh' | 'empty' | 'too-large'

export interface EvaluatedPart {
  id: string
  /** World space. Null for drawings and when there is an issue other than 'empty'. */
  mesh: Mesh | null
  issue: EvalIssue
}

export interface EvalOptions {
  /** Results above this many triangles are refused with 'too-large'. */
  maxTriangles?: number
}

interface Entry {
  limit: number
  mesh: Mesh | null
  issue: EvalIssue
}

/**
 * Remembers results by object identity. Documents are immutable, so an
 * unchanged part keeps its object and is not computed again.
 */
export interface EvalCache {
  /** A part placed in the frame that holds it (its own position and rotation applied). */
  readonly placed: WeakMap<Part, Entry>
  /**
   * A group boolean in the group frame, keyed by its first child and matched
   * child by child, so moving a group, or copying it with the same children,
   * does not redo the boolean.
   */
  readonly groups: WeakMap<Part, { children: readonly Part[]; entry: Entry }>
}

export function createEvalCache(): EvalCache {
  return { placed: new WeakMap(), groups: new WeakMap() }
}

function emptyMesh(): Mesh {
  return { positions: new Float32Array(0), indices: new Uint32Array(0) }
}

/** True when the group, or any group inside it, holds a mesh that is not closed. */
function holdsOpenMesh(group: GroupPart): boolean {
  return group.children.some(
    (c) => (c.type === 'mesh' && !c.closed) || (c.type === 'group' && holdsOpenMesh(c)),
  )
}

function checked(mesh: Mesh, limit: number): Omit<Entry, 'limit'> {
  const n = triangleCount(mesh)
  if (n > limit) return { mesh: null, issue: 'too-large' }
  if (n === 0) return { mesh, issue: 'empty' }
  return { mesh, issue: null }
}

/** solids united, holes cut away, in the group frame. */
function groupLocal(
  group: GroupPart,
  kernel: Kernel,
  cache: EvalCache,
  limit: number,
): Omit<Entry, 'limit'> {
  const kids = group.children
  const first = kids[0]
  if (!first) return { mesh: emptyMesh(), issue: 'empty' }
  const hit = cache.groups.get(first)
  if (
    hit &&
    hit.entry.limit === limit &&
    hit.children.length === kids.length &&
    hit.children.every((c, i) => c === kids[i])
  ) {
    return hit.entry
  }
  const save = (r: Omit<Entry, 'limit'>): Omit<Entry, 'limit'> => {
    cache.groups.set(first, { children: kids.slice(), entry: { ...r, limit } })
    return r
  }
  if (holdsOpenMesh(group)) return save({ mesh: null, issue: 'open-mesh' })
  const solids: Mesh[] = []
  const holes: Mesh[] = []
  for (const child of group.children) {
    if (child.type === 'drawing') continue
    const r = placed(child, kernel, cache, limit)
    if (r.issue === 'open-mesh' || r.issue === 'too-large')
      return save({ mesh: null, issue: r.issue })
    if (!r.mesh || triangleCount(r.mesh) === 0) continue
    ;(child.role === 'hole' ? holes : solids).push(r.mesh)
  }
  if (solids.length === 0) return save({ mesh: emptyMesh(), issue: 'empty' })
  let mesh: Mesh
  try {
    const base = solids.length === 1 ? solids[0]! : kernel.union(solids)
    mesh = holes.length > 0 ? kernel.subtract(base, holes) : base
  } catch {
    // the kernel only refuses input that is not a closed solid
    return save({ mesh: null, issue: 'open-mesh' })
  }
  return save(checked(mesh, limit))
}

function placed(part: Part, kernel: Kernel, cache: EvalCache, limit: number): Entry {
  const hit = cache.placed.get(part)
  if (hit && hit.limit === limit) return hit
  let local: Omit<Entry, 'limit'>
  switch (part.type) {
    case 'drawing':
      local = { mesh: null, issue: null }
      break
    case 'group':
      local = groupLocal(part, kernel, cache, limit)
      break
    case 'mesh':
      local = checked(part.mesh, limit)
      // a lone open mesh is still drawn; it only cannot take part in a group
      break
    case 'shape':
      local = checked(shapeMesh(part), limit)
      break
    case 'extrude': {
      let mesh: Mesh
      try {
        mesh = extrudeMesh(part.rings, part.height)
      } catch {
        mesh = emptyMesh()
      }
      local = checked(mesh, limit)
      break
    }
  }
  const [px, py, pz] = part.position
  const [rx, ry, rz] = part.rotation
  const still = px === 0 && py === 0 && pz === 0 && rx === 0 && ry === 0 && rz === 0
  const mesh =
    local.mesh && !still ? transformMesh(local.mesh, part.position, part.rotation) : local.mesh
  const entry: Entry = { limit, mesh, issue: local.issue }
  cache.placed.set(part, entry)
  return entry
}

/**
 * One top-level part as a world-space mesh. A group is the union of its solid
 * children minus the union of its hole children; a part on its own is drawn as
 * it is, whatever its role.
 */
export function evaluatePart(
  part: Part,
  kernel: Kernel,
  cache: EvalCache = createEvalCache(),
  options: EvalOptions = {},
): EvaluatedPart {
  const r = placed(part, kernel, cache, options.maxTriangles ?? MAX_TRIANGLES)
  return { id: part.id, mesh: r.mesh, issue: r.issue }
}

/** Every top-level part that is not hidden, in document order. */
export function evaluateDocument(
  doc: CadDocument,
  kernel: Kernel,
  cache: EvalCache = createEvalCache(),
  options: EvalOptions = {},
): EvaluatedPart[] {
  return doc.parts.filter((p) => !p.hidden).map((p) => evaluatePart(p, kernel, cache, options))
}
