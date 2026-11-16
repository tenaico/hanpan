/**
 * The open drawing: its undo history, the bytes a save would write, whether it
 * has unsaved changes, and its title and path.
 *
 * Every change of the model goes through `history.edit` (apps/cad/AGENTS.md).
 * The session only watches the history's revision: a drawing is unsaved when
 * the revision differs from the one the last save wrote. Undoing back to the
 * saved state still counts as unsaved, the same conservative rule as the mind
 * map editor.
 */
import {
  CadHistory,
  saveCadFile,
  triangleCount,
  worldBounds,
  type CadDocument,
  type Part,
} from '@genoffice/cad-engine'

/** How many parts the summary lists before it only counts the rest. */
export const SUMMARY_PART_LIMIT = 50

export interface CadSessionOptions {
  /** the file the drawing was opened from or last saved to */
  path?: string
  /** the title of a drawing without a path (an imported file's name, or "Untitled Drawing") */
  title: string
  /** starts with unsaved changes (a crash-recovery copy) */
  dirty?: boolean
}

export class CadSession {
  readonly history: CadHistory
  /** the revision the last save wrote; -1 when no save holds the current state */
  #savedRevision: number
  #title: string
  #path: string | undefined

  constructor(doc: CadDocument, opts: CadSessionOptions) {
    this.history = new CadHistory(doc)
    this.#savedRevision = opts.dirty ? -1 : this.history.revision()
    this.#path = opts.path
    this.#title = opts.path ? titleOfPath(opts.path) : opts.title
  }

  dirty(): boolean {
    return this.history.revision() !== this.#savedRevision
  }

  /** A save landed. `revision` is the one its bytes were made at, when edits came after. */
  markSaved(revision: number = this.history.revision()): void {
    this.#savedRevision = revision
  }

  /** The whole `.ttukcad` file a save would write now. */
  saveBytes(): Uint8Array {
    return saveCadFile(this.history.current())
  }

  title(): string {
    return this.#title
  }

  path(): string | undefined {
    return this.#path
  }

  /** The drawing now lives at `p` (a save, or the file was renamed): the title follows. */
  setPath(p: string): void {
    this.#path = p
    this.#title = titleOfPath(p)
  }

  /** Triangles stored in mesh parts (imported STL/OBJ); shapes are made on the fly and not counted. */
  triangles(): number {
    return countTriangles(this.history.current().parts)
  }

  /** The model as short English text, for the in-app MCP server. */
  summary(): string {
    const parts = this.history.current().parts
    const lines = [`AI Drawing "${this.#title}": ${parts.length} parts`]
    for (const part of parts.slice(0, SUMMARY_PART_LIMIT)) lines.push(partLine(part))
    if (parts.length > SUMMARY_PART_LIMIT) {
      lines.push(`… and ${parts.length - SUMMARY_PART_LIMIT} more`)
    }
    return lines.join('\n')
  }
}

/** The file name without folders and without its extension. */
export function titleOfPath(p: string): string {
  const name = p.split(/[\\/]/).pop() ?? p
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

function countTriangles(parts: readonly Part[]): number {
  let total = 0
  for (const part of parts) {
    if (part.type === 'mesh') total += triangleCount(part.mesh)
    else if (part.type === 'group') total += countTriangles(part.children)
  }
  return total
}

/** Millimetres with at most two decimals, no trailing zeros. */
function mm(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return String(Object.is(rounded, -0) ? 0 : rounded)
}

function partLine(part: Part): string {
  const box = worldBounds(part)
  const size = [0, 1, 2].map((k) => mm(box.max[k]! - box.min[k]!)).join('×')
  const kind = part.type === 'shape' ? part.shape : part.type
  const at = part.position.map(mm).join(', ')
  return `- ${part.name} (${kind}) ${size} mm at (${at})`
}
