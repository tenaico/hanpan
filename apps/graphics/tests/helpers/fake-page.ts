/**
 * A scriptable stand-in for a web build's page API (`window.vectorcraft` /
 * `window.photocraft`), shaped as the official VectorCraft 0.21.0 answers it
 * (checked on 2026-11-05). Tests change `handlers` to script commands.
 */
import type { AppCommand, GraphicsPageApi } from '../../src/renderer/frame/page-api'

export interface FakeDoc {
  dirty: boolean
  title: string
}

export type Handler = (params: Record<string, unknown>, page: FakePage) => unknown

export class FakePage implements GraphicsPageApi {
  activeDocument: number | null = null
  documents: FakeDoc[] = []
  history: string[] = []
  captured = new Map<string, Uint8Array>()
  capturing = false
  executed: Array<[string, Record<string, unknown>]> = []
  inspects = 0
  commandList: AppCommand[] = []
  handlers: Record<string, Handler> = {}
  opened: Array<[string, Uint8Array]> = []

  /** Starts with one document open. */
  withDocument(title = 'Untitled-1', dirty = false): this {
    this.documents = [{ title, dirty }]
    this.activeDocument = 0
    return this
  }

  /** A command that edits: adds a history entry and marks the document changed. */
  edit(label: string): void {
    this.history.push(label)
    const doc = this.activeDocument === null ? undefined : this.documents[this.activeDocument]
    if (doc) doc.dirty = true
  }

  requested: Array<[string, unknown]> = []
  requestHandlers: Record<string, (params: unknown) => unknown> = {}

  async request(method: string, params?: object): Promise<unknown> {
    if (method === 'ui.inspect') return this.inspect()
    this.requested.push([method, params])
    const handler = this.requestHandlers[method]
    if (handler) return handler(params)
    throw new Error(`unknown method \`${method}\``)
  }

  async execute(id: string, params: object = {}): Promise<unknown> {
    const p = params as Record<string, unknown>
    this.executed.push([id, p])
    const handler = this.handlers[id]
    if (!handler) throw new Error(`unknown command \`${id}\``)
    return handler(p, this)
  }

  async commands(): Promise<AppCommand[]> {
    return this.commandList
  }

  async inspect(): Promise<unknown> {
    this.inspects += 1
    return {
      activeDocument: this.activeDocument,
      documents: this.documents.map((d) => ({ ...d })),
    }
  }

  async screenshot(): Promise<unknown> {
    return { width: 10, height: 10 }
  }

  openFile(name: string, bytes: Uint8Array): Promise<boolean> {
    this.opened.push([name, bytes])
    this.documents.push({ title: name, dirty: false })
    this.activeDocument = this.documents.length - 1
    return Promise.resolve(true)
  }

  captureDownloads(on: boolean): void {
    this.capturing = on
  }

  async files(): Promise<{ path: string; size: number }[]> {
    return [...this.captured].map(([path, bytes]) => ({ path, size: bytes.length }))
  }

  async readFile(path: string): Promise<Uint8Array> {
    const bytes = this.captured.get(path)
    if (!bytes) throw new Error(`${path}: not found`)
    return bytes
  }
}
