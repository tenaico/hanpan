import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SecureKeyUiState } from '../../src/shared/securekey-api'
import { SECUREKEY_CHANNELS } from '../../src/shared/securekey-api'

type Handler = (event?: unknown, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
let all: FakeBrowserWindow[] = []
let nextId = 1

class FakeBrowserWindow {
  id = nextId++
  options: Record<string, unknown>
  visible = true
  destroyed = false
  bounds = { x: 10, y: 20, width: 800, height: 600 }
  listeners = new Map<string, Array<() => void>>()
  sent: Array<{ channel: string; state: SecureKeyUiState }> = []
  closeCalls = 0
  webContents = {
    id: 1000 + this.id,
    send: (channel: string, state: SecureKeyUiState) => this.sent.push({ channel, state }),
  }
  constructor(options: Record<string, unknown> = {}) {
    this.options = options
    this.visible = options.show !== false
    if (options.x !== undefined) {
      this.bounds = {
        x: options.x as number,
        y: options.y as number,
        width: options.width as number,
        height: options.height as number,
      }
    }
    all.push(this)
  }
  static getAllWindows() {
    return all.filter((w) => !w.destroyed)
  }
  isDestroyed() {
    return this.destroyed
  }
  isVisible() {
    return this.visible
  }
  isMinimized() {
    return false
  }
  getParentWindow() {
    return (this.options.parent as FakeBrowserWindow | undefined) ?? null
  }
  getContentBounds() {
    return { ...this.bounds }
  }
  setBounds(b: typeof this.bounds) {
    this.bounds = { ...b }
  }
  show() {
    this.visible = true
  }
  showInactive() {
    this.visible = true
  }
  once(event: string, l: () => void) {
    if (event === 'ready-to-show') l()
  }
  on(event: string, l: () => void) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), l])
  }
  removeListener(event: string, l: () => void) {
    this.listeners.set(
      event,
      (this.listeners.get(event) ?? []).filter((x) => x !== l),
    )
  }
  emit(event: string) {
    for (const l of this.listeners.get(event) ?? []) l()
  }
  close() {
    this.closeCalls += 1
    this.destroyed = true
    this.emit('closed')
  }
  loadURL() {
    return Promise.resolve()
  }
  loadFile() {
    return Promise.resolve()
  }
}

vi.mock('electron', () => ({
  BrowserWindow: FakeBrowserWindow,
  ipcMain: { handle: (c: string, h: Handler) => handlers.set(c, h) },
  dialog: { showOpenDialog: vi.fn() },
  shell: { openExternal: vi.fn() },
}))

const lockState = (): SecureKeyUiState => ({
  mode: 'lock',
  optional: false,
  until: null,
  reason: 'usb-missing',
  usbLetters: [],
  keyFileName: null,
  busy: false,
  error: null,
  lang: 'ko',
  strings: { skCoverTitle: 'locked' },
})

beforeEach(() => {
  vi.resetModules()
  handlers.clear()
  all = []
})

async function setup() {
  const mod = await import('../../src/main/securekey/lock-overlay')
  const shell = new FakeBrowserWindow({})
  const retry = vi.fn(async () => lockState() as SecureKeyUiState | 'passed')
  const quit = vi.fn()
  mod.configureLockOverlays({ mainWindow: () => shell as never, retry, quit })
  return { mod, shell, retry, quit }
}

const overlaysOf = (parent: FakeBrowserWindow) =>
  all.filter((w) => w.options.parent === parent && !w.destroyed)

describe('lock overlays', () => {
  it('puts one overlay on every visible top-level window', async () => {
    const { mod, shell } = await setup()
    const detached = new FakeBrowserWindow({})
    mod.showLockOverlays(lockState())
    for (const win of [shell, detached]) {
      const covers = overlaysOf(win)
      expect(covers).toHaveLength(1)
      expect(covers[0]!.options).toMatchObject({
        parent: win,
        modal: true,
        frame: false,
        skipTaskbar: true,
        resizable: false,
        movable: false,
      })
      expect(covers[0]!.bounds).toEqual(win.bounds)
    }
    // shown again (the next tick while locked): no second overlay
    mod.showLockOverlays(lockState())
    expect(overlaysOf(shell)).toHaveLength(1)
    expect(mod.lockOverlaysShown()).toBe(true)
  })

  it('skips hidden print windows', async () => {
    const { mod } = await setup()
    const print = new FakeBrowserWindow({ show: false })
    mod.showLockOverlays(lockState())
    expect(overlaysOf(print)).toHaveLength(0)
  })

  it('gives the lock screen to the shell window and a title line to the others', async () => {
    const { mod, shell } = await setup()
    const detached = new FakeBrowserWindow({})
    mod.showLockOverlays(lockState())
    const main = overlaysOf(shell)[0]!
    const other = overlaysOf(detached)[0]!
    const stateOf = (w: FakeBrowserWindow) =>
      handlers.get(SECUREKEY_CHANNELS.getState)!({ sender: w.webContents }) as SecureKeyUiState
    expect(stateOf(main)).toMatchObject({ mode: 'lock', reason: 'usb-missing' })
    expect(stateOf(main).cover).toBeFalsy()
    expect(stateOf(other).cover).toBe(true)
  })

  it('retries and quits from the shell overlay', async () => {
    const { mod, shell, retry, quit } = await setup()
    mod.showLockOverlays(lockState())
    const main = overlaysOf(shell)[0]!
    await handlers.get(SECUREKEY_CHANNELS.retry)!({ sender: main.webContents })
    expect(retry).toHaveBeenCalledTimes(1)
    await handlers.get(SECUREKEY_CHANNELS.quit)!({ sender: main.webContents })
    expect(quit).toHaveBeenCalledTimes(1)
  })

  it('closes every overlay on unlock and keeps the windows open', async () => {
    const { mod, shell } = await setup()
    const detached = new FakeBrowserWindow({})
    mod.showLockOverlays(lockState())
    mod.hideLockOverlays()
    expect(overlaysOf(shell)).toHaveLength(0)
    expect(overlaysOf(detached)).toHaveLength(0)
    expect(shell.closeCalls).toBe(0)
    expect(detached.closeCalls).toBe(0)
    expect(mod.lockOverlaysShown()).toBe(false)
  })

  it('follows the parent when it moves', async () => {
    const { mod, shell } = await setup()
    mod.showLockOverlays(lockState())
    shell.bounds = { x: 300, y: 200, width: 1000, height: 700 }
    shell.emit('move')
    expect(overlaysOf(shell)[0]!.bounds).toEqual(shell.bounds)
    shell.bounds = { x: 300, y: 200, width: 640, height: 480 }
    shell.emit('resize')
    expect(overlaysOf(shell)[0]!.bounds).toEqual(shell.bounds)
  })

  it('updates the shell overlay when the lock reason changes', async () => {
    const { mod, shell } = await setup()
    mod.showLockOverlays(lockState())
    mod.showLockOverlays({ ...lockState(), reason: 'revoked' })
    const main = overlaysOf(shell)[0]!
    expect(main.sent.at(-1)!.state.reason).toBe('revoked')
  })
})
