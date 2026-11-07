/**
 * The web build's page API, as the host page sees it in the iframe's window.
 * Both apps install the same nine methods (VectorCraft natively, PhotoCraft
 * through the tenaico/hanpan-graphics patch); results resolve with the
 * method's result and errors reject with an Error.
 */
import type { Lang } from '@genoffice/i18n'
import { appLanguage } from '../../shared/kinds'
import type { GraphicsKind } from '../../shared/kinds'

export interface AppCommand {
  id: string
  label: string
  menu?: string[]
  params?: string
  enabled: boolean
  disabled_reason?: string
  disabledReason?: string
  shortcut?: string | null
  ui?: boolean
}

export interface GraphicsPageApi {
  request(method: string, params?: object): Promise<unknown>
  execute(id: string, params?: object): Promise<unknown>
  commands(): Promise<AppCommand[]>
  inspect(): Promise<unknown>
  screenshot(params?: object): Promise<unknown>
  /** PhotoCraft answers with a boolean at once, VectorCraft with a promise */
  openFile(name: string, bytes: Uint8Array): Promise<boolean> | boolean
  captureDownloads(on: boolean): void
  files(): Promise<{ path: string; size: number }[]>
  readFile(path: string): Promise<Uint8Array>
  /** Save, Save As or Print asked for inside the frame (its menus or keys): the host does it. */
  onHostRequest?(handler: (request: 'save' | 'saveAs' | 'print') => void): void
}

const TAG = 'hanpan-graphics'

/** Where messages to the frame may go: its own origin, read from its address. */
function frameOrigin(frame: HTMLIFrameElement): string {
  try {
    const origin = new URL(frame.src, location.href).origin
    return origin && origin !== 'null' ? origin : '*'
  } catch {
    return '*'
  }
}

/**
 * Connects to the app in the frame through its agent (`frame-agent.ts`): the
 * app runs on its own origin, so its API is reached by messages only. Resolves
 * once the agent says the app's API is up.
 */
export interface HostLink {
  /** messages from the frame's agent (already checked to be the frame's) */
  listen(handler: (data: unknown) => void): void
  post(message: Record<string, unknown>): void
}

/** The frame's own window, on its own origin: the only one heard. */
function frameLink(frame: HTMLIFrameElement): HostLink {
  const target = frameOrigin(frame)
  return {
    listen(handler) {
      window.addEventListener('message', (event: MessageEvent) => {
        if (!frame.contentWindow || event.source !== frame.contentWindow) return
        if (target !== '*' && event.origin !== target) return
        handler(event.data)
      })
    },
    post(message) {
      frame.contentWindow?.postMessage(message, target)
    },
  }
}

export function connectPageApi(
  frame: HTMLIFrameElement,
  timeoutMs = 60_000,
  /** tests only: in place of the frame's window messages */
  testLink?: HostLink,
): Promise<GraphicsPageApi> {
  const link = testLink ?? frameLink(frame)
  const pending = new Map<number, { resolve(v: unknown): void; reject(e: Error): void }>()
  let nextId = 1
  let ready: (() => void) | null = null
  const hostHandlers: ((request: 'save' | 'saveAs' | 'print') => void)[] = []

  const send = (message: Record<string, unknown>): void => link.post({ tag: TAG, ...message })
  link.listen((raw: unknown) => {
    const data = raw as {
      tag?: unknown
      type?: unknown
      id?: unknown
      ok?: unknown
      value?: unknown
      error?: unknown
    } | null
    if (!data || data.tag !== TAG) return
    if (data.type === 'ready') {
      ready?.()
      return
    }
    if (data.type === 'host') {
      const request = (data as { request?: unknown }).request
      if (request === 'save' || request === 'saveAs' || request === 'print') {
        for (const handler of hostHandlers) handler(request)
      }
      return
    }
    if (data.type !== 'reply' || typeof data.id !== 'number') return
    const waiter = pending.get(data.id)
    if (!waiter) return
    pending.delete(data.id)
    if (data.ok === true) waiter.resolve(data.value)
    else waiter.reject(new Error(typeof data.error === 'string' ? data.error : 'the app failed'))
  })

  const call = (method: string, args: unknown[]): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      send({ type: 'call', id, method, args })
    })

  const api: GraphicsPageApi = {
    request: (method, params) =>
      call('request', params === undefined ? [method] : [method, params]),
    execute: (id, params) => call('execute', params === undefined ? [id] : [id, params]),
    commands: () => call('commands', []) as Promise<AppCommand[]>,
    inspect: () => call('inspect', []),
    screenshot: (params) => call('screenshot', params === undefined ? [] : [params]),
    openFile: (name, bytes) => call('openFile', [name, bytes]) as Promise<boolean>,
    captureDownloads: (on) => {
      void call('captureDownloads', [on]).catch(() => {})
    },
    files: () => call('files', []) as Promise<{ path: string; size: number }[]>,
    readFile: (path) => call('readFile', [path]) as Promise<Uint8Array>,
    onHostRequest: (handler) => void hostHandlers.push(handler),
  }

  return new Promise((resolve, reject) => {
    const started = Date.now()
    let done = false
    const hello = setInterval(() => {
      if (done) return
      if (Date.now() - started >= timeoutMs) {
        done = true
        clearInterval(hello)
        reject(new Error(`the app did not answer in ${timeoutMs} ms`))
        return
      }
      send({ type: 'hello' })
    }, 200)
    ready = () => {
      if (done) return
      done = true
      clearInterval(hello)
      resolve(api)
    }
    send({ type: 'hello' })
  })
}

/** Locks or frees the person's input inside the frame (the agent does it in the app's window). */
export function postFrameLock(frame: HTMLIFrameElement, on: boolean, testLink?: HostLink): void {
  ;(testLink ?? frameLink(frame)).post({ tag: TAG, type: 'lock', on })
}

export function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * The web build in Hanpan's embedded mode, in the app language Hanpan's language
 * maps to. In the app it runs on its own origin (`<kind>-app`), apart from the
 * host page: the app cannot reach the host's bridges (decision 0093, option B).
 * The dev server and the tests serve it beside the host page.
 */
export function appFrameUrl(
  kind: GraphicsKind,
  lang: Lang,
  where: { protocol: string } = location,
): string {
  const page = `web/${kind}/index.html?embedded=hanpan&lang=${appLanguage(kind, lang)}`
  return where.protocol === 'genoffice-app:' ? `genoffice-app://${kind}-app/${page}` : `./${page}`
}
