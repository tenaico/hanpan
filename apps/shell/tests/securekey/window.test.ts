import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SecureKeyUiState } from '../../src/shared/securekey-api'
import { SECUREKEY_CHANNELS } from '../../src/shared/securekey-api'

type Handler = (event?: unknown, ...args: unknown[]) => unknown

const handlers = new Map<string, Handler>()
const winOptions: Array<Record<string, unknown>> = []
const sent: Array<{ channel: string; state: SecureKeyUiState }> = []
const openExternal = vi.fn()
const showOpenDialog = vi.fn()
let windows: FakeBrowserWindow[] = []

class FakeBrowserWindow {
  closedListeners: Array<() => void> = []
  destroyed = false
  closeCalls = 0
  loaded: string | null = null
  webContents = {
    send: (channel: string, state: SecureKeyUiState) => sent.push({ channel, state }),
  }
  constructor(options: Record<string, unknown>) {
    winOptions.push(options)
    windows.push(this)
  }
  isDestroyed(): boolean {
    return this.destroyed
  }
  show(): void {}
  focus(): void {}
  isMinimized(): boolean {
    return false
  }
  restore(): void {}
  once(event: string, listener: () => void): void {
    if (event === 'ready-to-show') listener()
  }
  on(event: string, listener: () => void): void {
    if (event === 'closed') this.closedListeners.push(listener)
  }
  close(): void {
    this.closeCalls += 1
    this.destroyed = true
    for (const l of this.closedListeners) l()
  }
  loadURL(url: string): Promise<void> {
    this.loaded = url
    return Promise.resolve()
  }
  loadFile(file: string): Promise<void> {
    this.loaded = file
    return Promise.resolve()
  }
}

vi.mock('electron', () => ({
  BrowserWindow: FakeBrowserWindow,
  ipcMain: {
    handle: (channel: string, handler: Handler) => handlers.set(channel, handler),
    removeHandler: (channel: string) => handlers.delete(channel),
  },
  dialog: { showOpenDialog: (...args: unknown[]) => showOpenDialog(...args) },
  shell: { openExternal: (url: string) => openExternal(url) },
}))

const state = (patch: Partial<SecureKeyUiState> = {}): SecureKeyUiState => ({
  mode: 'create',
  reason: null,
  usbLetters: ['E'],
  busy: false,
  error: null,
  lang: 'ko',
  strings: {},
  ...patch,
})

const noHandlers = () => ({
  acceptTerms: vi.fn(async (): Promise<SecureKeyUiState | 'passed'> => state()),
  create: vi.fn(async () => null as string | null),
  retry: vi.fn(async () => 'passed' as const),
  reset: vi.fn(async () => state()),
  openLicense: vi.fn(),
})

const invoke = (channel: string, ...args: unknown[]) => handlers.get(channel)!({}, ...args)
const settled = async <T>(p: Promise<T>) => {
  let done = false
  void p.then(() => (done = true))
  await new Promise((r) => setTimeout(r, 0))
  return done
}

beforeEach(() => {
  vi.resetModules()
  handlers.clear()
  winOptions.length = 0
  sent.length = 0
  windows = []
  openExternal.mockClear()
  showOpenDialog.mockReset()
})

const load = () => import('../../src/main/securekey/window')

describe('security key window', () => {
  it('loads securekey.html with its own preload', async () => {
    const mod = await load()
    void mod.showSecureKeyWindow(state(), noHandlers())
    const opts = winOptions[0]!
    const prefs = opts.webPreferences as Record<string, unknown>
    expect(String(prefs.preload).replace(/\\/g, '/')).toMatch(/preload\/securekey\.js$/)
    expect(prefs.sandbox).toBe(true)
    expect(prefs.contextIsolation).toBe(true)
    expect(opts.frame).toBe(false)
    expect(opts.parent).toBeUndefined()
    expect(opts.show).toBe(false)
    expect(String(windows[0]!.loaded).replace(/\\/g, '/')).toMatch(/securekey\.html$/)
    expect(await invoke(SECUREKEY_CHANNELS.getState)).toMatchObject({ mode: 'create' })
  })

  it('closing the window counts as quit', async () => {
    const mod = await load()
    const result = mod.showSecureKeyWindow(state(), noHandlers())
    windows[0]!.close()
    expect(await result).toBe('quit')
  })

  it('quit ends with quit', async () => {
    const mod = await load()
    const result = mod.showSecureKeyWindow(state(), noHandlers())
    await invoke(SECUREKEY_CHANNELS.quit)
    expect(await result).toBe('quit')
  })

  it('moves from the terms to the key step once they are accepted', async () => {
    const mod = await load()
    const h = noHandlers()
    const result = mod.showSecureKeyWindow(state({ mode: 'terms' }), h)
    await invoke(SECUREKEY_CHANNELS.createKey, { where: 'usb', letter: 'E' })
    expect(h.create).not.toHaveBeenCalled()
    await invoke(SECUREKEY_CHANNELS.acceptTerms)
    expect(h.acceptTerms).toHaveBeenCalledTimes(1)
    expect(sent.at(-1)!.state).toMatchObject({ mode: 'create', busy: false })
    expect(await settled(result)).toBe(false)
  })

  it('opens the full license from the terms step only', async () => {
    const mod = await load()
    const h = noHandlers()
    void mod.showSecureKeyWindow(state({ mode: 'create' }), h)
    await invoke(SECUREKEY_CHANNELS.openLicense)
    expect(h.openLicense).not.toHaveBeenCalled()
    mod.closeSecureKeyWindow()
    void mod.showSecureKeyWindow(state({ mode: 'terms' }), h)
    await invoke(SECUREKEY_CHANNELS.openLicense)
    expect(h.openLicense).toHaveBeenCalledTimes(1)
  })

  it('passes when the terms were all that was needed', async () => {
    const mod = await load()
    const h = noHandlers()
    h.acceptTerms.mockResolvedValueOnce('passed')
    const result = mod.showSecureKeyWindow(state({ mode: 'terms' }), h)
    await invoke(SECUREKEY_CHANNELS.acceptTerms)
    expect(await result).toBe('passed')
    // the window stays until the caller has its shell window up
    expect(windows[0]!.closeCalls).toBe(0)
  })

  it('makes the key on a plugged-in stick only', async () => {
    const mod = await load()
    const h = noHandlers()
    const result = mod.showSecureKeyWindow(state(), h)
    await invoke(SECUREKEY_CHANNELS.createKey, { where: 'usb', letter: 'G' })
    expect(h.create).not.toHaveBeenCalled()
    await invoke(SECUREKEY_CHANNELS.createKey, { where: 'usb', letter: 'E' })
    expect(h.create).toHaveBeenCalledWith({ where: 'usb', letter: 'E' })
    expect(await result).toBe('registered')
  })

  it('asks for the consent before the PC', async () => {
    const mod = await load()
    const h = noHandlers()
    void mod.showSecureKeyWindow(state(), h)
    await invoke(SECUREKEY_CHANNELS.createKey, { where: 'pc', consent: false })
    expect(h.create).not.toHaveBeenCalled()
    await invoke(SECUREKEY_CHANNELS.createKey, { where: 'pc', consent: true })
    const target = h.create.mock.calls[0]!.at(0) as unknown as { where: string; consentAt: string }
    expect(target.where).toBe('pc')
    expect(Number.isFinite(Date.parse(target.consentAt))).toBe(true)
  })

  it('shows the create error and stays open', async () => {
    const mod = await load()
    const h = noHandlers()
    h.create.mockResolvedValue('could not write')
    const result = mod.showSecureKeyWindow(state(), h)
    await invoke(SECUREKEY_CHANNELS.createKey, { where: 'usb', letter: 'E' })
    expect(sent.at(-1)!.state).toMatchObject({ error: 'could not write', busy: false })
    expect(windows[0]!.closeCalls).toBe(0)
    expect(await settled(result)).toBe(false)
  })

  it('makes a new key only from the wait screen', async () => {
    const mod = await load()
    const h = noHandlers()
    void mod.showSecureKeyWindow(state(), h)
    await invoke(SECUREKEY_CHANNELS.resetKey)
    expect(h.reset).not.toHaveBeenCalled()
    mod.closeSecureKeyWindow()
    void mod.showSecureKeyWindow(state({ mode: 'lock', reason: 'usb-missing' }), h)
    await invoke(SECUREKEY_CHANNELS.resetKey)
    expect(h.reset).toHaveBeenCalledTimes(1)
    expect(sent.at(-1)!.state).toMatchObject({ mode: 'create', busy: false })
  })

  it('retry passes or shows the new state', async () => {
    const mod = await load()
    const h = noHandlers()
    h.retry.mockResolvedValueOnce(
      state({ mode: 'lock', reason: 'unregistered-usb', usbLetters: [] }) as never,
    )
    const result = mod.showSecureKeyWindow(state({ mode: 'lock', reason: 'usb-missing' }), h)
    await invoke(SECUREKEY_CHANNELS.retry)
    expect(sent.at(-1)!.state.reason).toBe('unregistered-usb')
    expect(await settled(result)).toBe(false)
    await invoke(SECUREKEY_CHANNELS.retry)
    expect(await result).toBe('passed')
  })

  it('reports whether it is open and brings it forward', async () => {
    const mod = await load()
    expect(mod.secureKeyWindowOpen()).toBe(false)
    void mod.showSecureKeyWindow(state(), noHandlers())
    expect(mod.secureKeyWindowOpen()).toBe(true)
    mod.focusSecureKeyWindow()
    mod.closeSecureKeyWindow()
    expect(mod.secureKeyWindowOpen()).toBe(false)
  })
})
