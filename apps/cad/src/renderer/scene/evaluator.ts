/**
 * The tab's model computer: one manifold kernel and one result cache.
 *
 * Documents are immutable and the engine keeps untouched parts as the same
 * objects, so the cache (keyed by part object) makes a change to one part cost
 * only that part. A large imported mesh is not computed again when something
 * else moves.
 *
 * The undo history keeps every older document, and with it the old object of
 * every part that changed. A cache keyed by those objects would keep their
 * results too (a moved 2-million-triangle mesh leaves a transformed copy per
 * move), so each update starts a fresh cache and carries over only the
 * results of parts the new document still holds.
 *
 * The kernel's wasm file is bundled by Vite as an asset (`?url`) and fetched
 * once per tab. manifold-3d is a dependency of the engine package, so the
 * file is reached through the engine's own node_modules.
 */
import {
  createEvalCache,
  createKernel,
  evaluatePart,
  type CadDocument,
  type EvalCache,
  type EvalOptions,
  type EvaluatedPart,
  type Kernel,
  type Part,
} from '@genoffice/cad-engine'
import manifoldWasmUrl from 'manifold-3d/manifold.wasm?url'

/** Starts the boolean kernel for this tab with the bundled wasm. */
export async function loadKernel(): Promise<Kernel> {
  const response = await fetch(manifoldWasmUrl)
  if (!response.ok) throw new Error(`manifold.wasm: HTTP ${response.status}`)
  const wasmBinary = new Uint8Array(await response.arrayBuffer())
  return createKernel({ wasmBinary })
}

export class DocEvaluator {
  readonly #kernel: Kernel
  readonly #options: EvalOptions
  #cache: EvalCache = createEvalCache()

  constructor(kernel: Kernel, options: EvalOptions = {}) {
    this.#kernel = kernel
    this.#options = options
  }

  /**
   * Every top-level part that is not hidden, in document order, as world-space
   * meshes. A part whose computation throws comes back without a mesh and the
   * others still come out.
   */
  update(doc: CadDocument): EvaluatedPart[] {
    this.#cache = carryOver(this.#cache, doc.parts)
    const out: EvaluatedPart[] = []
    for (const part of doc.parts) {
      if (part.hidden) continue
      try {
        out.push(evaluatePart(part, this.#kernel, this.#cache, this.#options))
      } catch (err) {
        console.error('[cad] could not compute part', part.id, err)
        out.push({ id: part.id, mesh: null, issue: 'empty' })
      }
    }
    return out
  }

  /** The cache holds a result for this part object (for tests). */
  holds(part: Part): boolean {
    return this.#cache.placed.has(part)
  }

  /** Lets go of the kernel and the cached results. */
  dispose(): void {
    this.#cache = createEvalCache()
    this.#kernel.dispose()
  }
}

/**
 * A new cache with the old one's results for these parts and everything
 * inside them (group children, and each group's boolean keyed by its first
 * child). Results of parts no longer in the document are left behind.
 */
function carryOver(old: EvalCache, parts: readonly Part[]): EvalCache {
  const next = createEvalCache()
  const visit = (list: readonly Part[]): void => {
    for (const part of list) {
      const placed = old.placed.get(part)
      if (placed) next.placed.set(part, placed)
      if (part.type !== 'group') continue
      const first = part.children[0]
      const group = first && old.groups.get(first)
      if (first && group) next.groups.set(first, group)
      visit(part.children)
    }
  }
  visit(parts)
  return next
}
