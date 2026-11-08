/**
 * The agent inside the web app's frame (decision 0093, option B).
 *
 * The web app runs on its own origin, so the host page cannot touch its
 * window and the app cannot touch the host's. This agent is the only way
 * between them: it answers page API calls that come from its parent window
 * (and from the parent's origin), and it locks the frame's input while the
 * host asks it to. Nothing else of the frame is reachable from the host, and
 * nothing of the host from the frame.
 *
 * The graphics preload installs it into the frame's own world with
 * `webFrame.executeJavaScript`, so the function must stand alone: no imports,
 * no outside names. Its source text is what runs.
 */
export interface AgentLink {
  /** messages from the host (already checked to be the host's) */
  listen(handler: (data: unknown) => void): void
  post(message: Record<string, unknown>): void
}

export function installFrameAgent(
  win: Window,
  global: string,
  parentOrigin: string,
  /** tests only: in place of the window's messages to and from its parent */
  testLink?: AgentLink,
): void {
  const TAG = 'hanpan-graphics'
  const METHODS = [
    'request',
    'execute',
    'commands',
    'inspect',
    'screenshot',
    'openFile',
    'captureDownloads',
    'files',
    'readFile',
  ]
  const LOCKED_EVENTS = [
    'keydown',
    'keyup',
    'keypress',
    'beforeinput',
    'paste',
    'drop',
    'dragover',
    'pointerdown',
    'mousedown',
    'wheel',
    'contextmenu',
    'touchstart',
  ]
  const holder = win as unknown as Record<string, unknown>
  if (holder.__hanpanFrameAgent) return
  holder.__hanpanFrameAgent = true

  const api = (): Record<string, (...args: unknown[]) => unknown> | null => {
    const value = holder[global]
    return value && typeof value === 'object'
      ? (value as Record<string, (...args: unknown[]) => unknown>)
      : null
  }
  const link: AgentLink = testLink ?? {
    listen(handler) {
      win.addEventListener('message', (event: MessageEvent) => {
        // only the parent window, on the host's origin, speaks to the agent
        if (event.source !== win.parent) return
        if (parentOrigin !== '*' && event.origin !== parentOrigin) return
        handler(event.data)
      })
    },
    post(message) {
      win.parent.postMessage(message, parentOrigin)
    },
  }
  const post = (message: Record<string, unknown>): void => link.post({ tag: TAG, ...message })
  const whenReady = (): Promise<Record<string, (...args: unknown[]) => unknown>> =>
    new Promise((resolve) => {
      const look = (): void => {
        const found = api()
        if (found) resolve(found)
        else win.setTimeout(look, 100)
      }
      look()
    })

  const block = (event: Event): void => {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  let locked = false
  const setLocked = (on: boolean): void => {
    if (on === locked) return
    locked = on
    const options = { capture: true, passive: false } as const
    for (const type of LOCKED_EVENTS) {
      if (on) win.addEventListener(type, block, options)
      else win.removeEventListener(type, block, options)
    }
    // the focused control in the app (a text field) loses the keyboard too
    if (on) (win.document.activeElement as { blur?: () => void } | null)?.blur?.()
    const body = win.document.body
    if (body) {
      if (on) body.dataset.hanpanLocked = 'true'
      else delete body.dataset.hanpanLocked
    }
  }

  // Save, Save As and Print are the host's (0.17 review v2, G1-G3): the web build asks with a
  // window event in embedded mode, and the keys are taken before the app sees them, so the
  // app's own save (which writes nothing to disk) never runs.
  const HOST_REQUESTS = ['save', 'saveAs', 'print']
  for (const request of HOST_REQUESTS) {
    win.addEventListener(`hanpan-host-${request}`, () => post({ type: 'host', request }))
  }
  win.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (locked || !(event.ctrlKey || event.metaKey) || event.altKey) return
      const key =
        event.code === 'KeyS' ? 's' : event.code === 'KeyP' ? 'p' : event.key.toLowerCase()
      const request =
        key === 's'
          ? event.shiftKey
            ? 'saveAs'
            : 'save'
          : key === 'p' && !event.shiftKey
            ? 'print'
            : null
      if (!request) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) post({ type: 'host', request })
    },
    { capture: true },
  )

  link.listen((raw: unknown) => {
    const data = raw as { tag?: unknown; type?: unknown } | null
    if (!data || data.tag !== TAG) return
    if (data.type === 'hello') {
      void whenReady().then(() => post({ type: 'ready' }))
      return
    }
    if (data.type === 'lock') {
      setLocked((data as { on?: unknown }).on === true)
      return
    }
    if (data.type !== 'call') return
    const { id, method, args } = data as { id?: unknown; method?: unknown; args?: unknown }
    if (typeof id !== 'number' || typeof method !== 'string' || !METHODS.includes(method)) return
    void whenReady()
      .then((found) => {
        const fn = found[method]
        if (typeof fn !== 'function') throw new Error(`the app has no ${method}`)
        return fn.apply(found, Array.isArray(args) ? args : [])
      })
      .then(
        (value) => {
          try {
            post({ type: 'reply', id, ok: true, value })
          } catch {
            post({ type: 'reply', id, ok: false, error: `the answer to ${method} cannot cross` })
          }
        },
        (error: unknown) =>
          post({
            type: 'reply',
            id,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
      )
  })
}
