import { basename, join } from 'node:path'
import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import {
  SECUREKEY_CHANNELS,
  type SecureKeyRegisterRequest,
  type SecureKeyUiState,
} from '../../shared/securekey-api'
import { KEY_PAGE_URL } from './gate'

/**
 * The security key window shown before the first shell window: register a
 * key, or see why the app is locked (spec 7-1, 7-3). One call resolves once:
 * registered, later (grace only), passed (a retry found the key) or quit.
 * Closing the window any other way counts as quit. On the first three the
 * window stays up until the caller closes it, so the app always has a window
 * while the shell window is made.
 */

export type SecureKeyRegisterTarget =
  { where: 'usb'; letter: string } | { where: 'pc'; consentAt: string }

export interface SecureKeyWindowHandlers {
  /** an error line in the window's language, or null once registered */
  register(keyFile: string, target: SecureKeyRegisterTarget): Promise<string | null>
  /** look again: the next state to show, or 'passed' */
  retry(): Promise<SecureKeyUiState | 'passed'>
}

export type SecureKeyWindowResult = 'registered' | 'later' | 'passed' | 'quit'

let win: BrowserWindow | null = null
let current: SecureKeyUiState | null = null
let keyFile: string | null = null
let handlers: SecureKeyWindowHandlers | null = null
let pending: ((result: SecureKeyWindowResult) => void) | null = null
let ipcRegistered = false

/**
 * Another page that loads securekey.html: a lock cover over a window (Task 9).
 * Its requests go to its own handlers instead of the gate window's.
 */
export interface SecureKeyPage {
  state(): SecureKeyUiState
  retry?(): Promise<void>
  quit?(): void
}
const pages = new Map<number, SecureKeyPage>()

const pageOf = (event: unknown): SecureKeyPage | undefined => {
  const id = (event as { sender?: { id?: unknown } } | null)?.sender?.id
  return typeof id === 'number' ? pages.get(id) : undefined
}

/** Route a page's requests by its webContents id; null removes it */
export function routeSecureKeyPage(webContentsId: number, page: SecureKeyPage | null): void {
  if (page) pages.set(webContentsId, page)
  else pages.delete(webContentsId)
  registerIpc()
}

function settle(result: SecureKeyWindowResult): void {
  const resolve = pending
  pending = null
  resolve?.(result)
}

function push(patch: Partial<SecureKeyUiState>): void {
  if (!current) return
  current = { ...current, ...patch }
  if (win && !win.isDestroyed()) win.webContents.send(SECUREKEY_CHANNELS.changed, current)
}

const isRequest = (v: unknown): v is SecureKeyRegisterRequest => {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    (r.where === 'usb' && typeof r.letter === 'string' && /^[A-Z]$/.test(r.letter)) ||
    (r.where === 'pc' && typeof r.consent === 'boolean')
  )
}

function registerIpc(): void {
  if (ipcRegistered) return
  ipcRegistered = true
  ipcMain.handle(SECUREKEY_CHANNELS.getState, (event) => pageOf(event)?.state() ?? current)
  ipcMain.handle(SECUREKEY_CHANNELS.pickKeyFile, async (event) => {
    if (pageOf(event) || !current || current.busy) return
    const options = {
      properties: ['openFile' as const],
      filters: [{ name: 'hanpan.key', extensions: ['key'] }],
    }
    const picked =
      win && !win.isDestroyed()
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options)
    const path = picked.canceled ? undefined : picked.filePaths[0]
    if (!path) return
    keyFile = path
    push({ keyFileName: basename(path), error: null })
  })
  ipcMain.handle(SECUREKEY_CHANNELS.register, async (event, request: unknown) => {
    if (pageOf(event) || !current || current.busy || !handlers || !keyFile || !isRequest(request))
      return
    if (request.where === 'pc' && !request.consent) return
    if (request.where === 'usb' && !current.usbLetters.includes(request.letter)) return
    const target: SecureKeyRegisterTarget =
      request.where === 'usb'
        ? { where: 'usb', letter: request.letter }
        : { where: 'pc', consentAt: new Date().toISOString() }
    push({ busy: true, error: null })
    let error: string | null
    try {
      error = await handlers.register(keyFile, target)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
    if (error === null) {
      settle('registered')
      return
    }
    push({ busy: false, error })
  })
  ipcMain.handle(SECUREKEY_CHANNELS.later, (event) => {
    if (pageOf(event)) return
    if (current?.optional && !current.busy) settle('later')
  })
  ipcMain.handle(SECUREKEY_CHANNELS.retry, async (event) => {
    const page = pageOf(event)
    if (page) return page.retry?.()
    if (!current || current.busy || !handlers) return
    push({ busy: true })
    let next: SecureKeyUiState | 'passed'
    try {
      next = await handlers.retry()
    } catch {
      push({ busy: false })
      return
    }
    if (next === 'passed') {
      settle('passed')
      return
    }
    push({ ...next, keyFileName: current.keyFileName, busy: false })
  })
  ipcMain.handle(SECUREKEY_CHANNELS.quit, (event) => {
    const page = pageOf(event)
    if (page) return page.quit?.()
    settle('quit')
    closeSecureKeyWindow()
  })
  ipcMain.handle(SECUREKEY_CHANNELS.openKeyPage, () => shell.openExternal(KEY_PAGE_URL))
}

/** Show the window and wait for its one answer */
export function showSecureKeyWindow(
  initial: SecureKeyUiState,
  next: SecureKeyWindowHandlers,
): Promise<SecureKeyWindowResult> {
  settle('quit')
  current = { ...initial, busy: false, error: null, keyFileName: null }
  keyFile = null
  handlers = next
  registerIpc()
  const result = new Promise<SecureKeyWindowResult>((resolve) => {
    pending = resolve
  })
  if (win && !win.isDestroyed()) {
    win.webContents.send(SECUREKEY_CHANNELS.changed, current)
    win.focus()
    return result
  }
  const created = new BrowserWindow({
    width: 480,
    height: 520,
    center: true,
    frame: false,
    resizable: false,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: initial.strings.skTitle ?? 'Hanpan',
    webPreferences: {
      preload: join(__dirname, '../preload/securekey.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win = created
  created.once('ready-to-show', () => created.show())
  created.on('closed', () => {
    if (win === created) win = null
    settle('quit')
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    void created.loadURL(`${process.env.ELECTRON_RENDERER_URL}/securekey.html`)
  } else {
    void created.loadFile(join(__dirname, '../renderer/securekey.html'))
  }
  return result
}

export function secureKeyWindowOpen(): boolean {
  return win !== null && !win.isDestroyed()
}

/** Bring the window forward (a second launch while it is up) */
export function focusSecureKeyWindow(): void {
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

export function closeSecureKeyWindow(): void {
  const closing = win
  win = null
  current = null
  keyFile = null
  handlers = null
  if (closing && !closing.isDestroyed()) closing.close()
}
