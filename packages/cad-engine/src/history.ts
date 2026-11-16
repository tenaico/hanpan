import type { CadDocument } from './model'

export const HISTORY_LIMIT = 100

interface Step {
  label: string
  before: CadDocument
  after: CadDocument
}

/**
 * The one way to change a document. Toolbar, shortcuts, the property panel,
 * handles and the AI all call `edit`. Edits between `openGroup` and the
 * matching `closeGroup` become one undo step.
 */
export class CadHistory {
  private doc: CadDocument
  private undoStack: Step[] = []
  private redoStack: Step[] = []
  private depth = 0
  private groupLabel = ''
  private openStep: Step | null = null
  private rev = 0
  private listeners = new Set<() => void>()

  constructor(initial: CadDocument) {
    this.doc = initial
  }

  current(): CadDocument {
    return this.doc
  }

  revision(): number {
    return this.rev
  }

  edit(label: string, change: (doc: CadDocument) => CadDocument): void {
    const next = change(this.doc)
    if (next === this.doc) return
    if (this.depth > 0) {
      if (this.openStep) {
        this.openStep.after = next
      } else {
        this.openStep = { label: this.groupLabel, before: this.doc, after: next }
        this.push(this.openStep)
      }
    } else {
      this.push({ label, before: this.doc, after: next })
    }
    this.redoStack = []
    this.land(next)
  }

  openGroup(label: string): void {
    if (this.depth === 0) {
      this.groupLabel = label
      this.openStep = null
    }
    this.depth++
  }

  closeGroup(): void {
    if (this.depth === 0) return
    this.depth--
    if (this.depth === 0) this.openStep = null
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  undoLabel(): string | null {
    return this.undoStack.at(-1)?.label ?? null
  }

  undo(): boolean {
    this.depth = 0
    this.openStep = null
    const step = this.undoStack.pop()
    if (!step) return false
    this.redoStack.push(step)
    this.land(step.before)
    return true
  }

  redo(): boolean {
    this.depth = 0
    this.openStep = null
    const step = this.redoStack.pop()
    if (!step) return false
    this.undoStack.push(step)
    this.land(step.after)
    return true
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private push(step: Step): void {
    this.undoStack.push(step)
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift()
  }

  private land(doc: CadDocument): void {
    this.doc = doc
    this.rev++
    for (const listener of [...this.listeners]) listener()
  }
}
