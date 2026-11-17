/**
 * A stand-in for the parts of Electron the main process touches: the IPC
 * registry, the dialogs and a web contents that records what it was sent.
 * Each test file builds its own with `vi.mock('electron', ...)` and these
 * pieces, the way the mind map's main tests do.
 */
export type Handler = (event: unknown, ...args: unknown[]) => unknown

export interface FakeContents {
  id: number
  sent: Array<[string, ...unknown[]]>
  destroyed: boolean
  reloads: number
  windowOpenHandler: ((details: { url: string }) => { action: string }) | null
  listeners: Map<string, (...args: unknown[]) => void>
  isDestroyed(): boolean
  setWindowOpenHandler(handler: (details: { url: string }) => { action: string }): void
  loadURL(url: string): Promise<void>
  reload(): void
  getURL(): string
  send(channel: string, ...args: unknown[]): void
  on(event: string, listener: (...args: unknown[]) => void): void
  once(event: string, listener: (...args: unknown[]) => void): void
}

let nextId = 1
export function fakeContents(): FakeContents {
  const loaded: string[] = []
  const contents: FakeContents = {
    id: nextId++,
    sent: [],
    destroyed: false,
    reloads: 0,
    windowOpenHandler: null,
    listeners: new Map(),
    isDestroyed: () => contents.destroyed,
    setWindowOpenHandler: (handler) => {
      contents.windowOpenHandler = handler
    },
    loadURL: async (url) => {
      loaded.push(url)
    },
    reload: () => {
      contents.reloads++
    },
    getURL: () => loaded.at(-1) ?? '',
    send: (channel, ...args) => {
      contents.sent.push([channel, ...args])
    },
    on: (event, listener) => {
      contents.listeners.set(event, listener)
    },
    once: (event, listener) => {
      contents.listeners.set(event, listener)
    },
  }
  return contents
}

/** The view's destruction, as Electron reports it. */
export function destroy(contents: FakeContents): void {
  contents.destroyed = true
  contents.listeners.get('destroyed')?.()
}
