import { join } from 'node:path'
import { BrowserWindow, ipcMain } from 'electron'
import {
  SECUREKEY_CHANNELS,
  type SecureKeyCreateRequest,
  type SecureKeyUiState,
} from '../../shared/securekey-api'
import type { CreateTarget } from './create'

/**
 * The first-run window shown before the first shell window (spec 2026-11-12
 * 5-3, 5-4): the terms, making a key, or waiting for the key's stick. One call
 * resolves once: registered (a key was made), passed (the terms or a retry let
 * the app open) or quit. Closing the window any other way counts as quit. On
 * the first two the window stays up until the caller closes it, so the app
 * always has a window while the shell window is made.
 */

export interface SecureKeyWindowHandlers {
  /** the terms were accepted: the key step to show, or 'passed' */
  acceptTerms(): Promise<SecureKeyUiState | 'passed'>
  /** an error line in the window's language, or null once the key is made */
  create(target: CreateTarget): Promise<string | null>
  /** look again: the next state to show, or 'passed' */
  retry(): Promise<SecureKeyUiState | 'passed'>
  /** "make a new key": the old one is dropped, the create step comes next */
  reset(): Promise<SecureKeyUiState>
  /** [Read the full license] on the terms step */
  openLicense?(): void
}

export type SecureKeyWindowResult = 'registered' | 'passed' | 'quit'

let win: BrowserWindow | null = null
let current: SecureKeyUiState | null = null
let handlers: SecureKeyWindowHandlers | null = null
let pending: ((result: SecureKeyWindowResult) => void) | null = null
let ipcRegistered = false

/**
 * The wait screen looks again on its own (spec 5-2: the stick opens the app
 * once it is plugged in). The window is redrawn only when the reason changes,
 * so a reset confirmation on screen stays up.
 */
const POLL_MS = 3000
let poll: ReturnType<typeof setInterval> | null = null
let polling = false

function stopPoll(): void {
  if (poll) clearInterval(poll)
  poll = null
}

function startPoll(): void {
  stopPoll()
  poll = setInterval(() => void pollOnce(), POLL_MS)
}

async function pollOnce(): Promise<void> {
  if (polling || !current || current.busy || !handlers || current.mode !== 'lock') return
  polling = true
  try {
    const next = await handlers.retry()
    if (!current || current.busy || current.mode !== 'lock') return
    if (next === 'passed') {
      settle('passed')
      return
    }
    if (next.mode !== current.mode || next.reason !== current.reason) push({ ...next, busy: false })
  } catch {
    // the next look tries again
  } finally {
    polling = false
  }
}

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
  stopPoll()
  const resolve = pending
  pending = null
  resolve?.(result)
}

function push(patch: Partial<SecureKeyUiState>): void {
  if (!current) return
  current = { ...current, ...patch }
  if (win && !win.isDestroyed()) win.webContents.send(SECUREKEY_CHANNELS.changed, current)
}

const isRequest = (v: unknown): v is SecureKeyCreateRequest => {
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
  ipcMain.handle(SECUREKEY_CHANNELS.acceptTerms, async (event) => {
    if (pageOf(event) || !current || current.busy || !handlers || current.mode !== 'terms') return
    push({ busy: true, error: null })
    let next: SecureKeyUiState | 'passed'
    try {
      next = await handlers.acceptTerms()
    } catch (e) {
      push({ busy: false, error: e instanceof Error ? e.message : String(e) })
      return
    }
    if (next === 'passed') {
      settle('passed')
      return
    }
    push({ ...next, busy: false })
  })
  ipcMain.handle(SECUREKEY_CHANNELS.openLicense, (event) => {
    if (pageOf(event) || current?.mode !== 'terms') return
    handlers?.openLicense?.()
  })
  ipcMain.handle(SECUREKEY_CHANNELS.createKey, async (event, request: unknown) => {
    if (pageOf(event) || !current || current.busy || !handlers || !isRequest(request)) return
    if (current.mode !== 'create') return
    if (request.where === 'pc' && !request.consent) return
    if (request.where === 'usb' && !current.usbLetters.includes(request.letter)) return
    const target: CreateTarget =
      request.where === 'usb'
        ? { where: 'usb', letter: request.letter }
        : { where: 'pc', consentAt: new Date().toISOString() }
    push({ busy: true, error: null })
    let error: string | null
    try {
      error = await handlers.create(target)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
    if (error === null) {
      settle('registered')
      return
    }
    push({ busy: false, error })
  })
  ipcMain.handle(SECUREKEY_CHANNELS.resetKey, async (event) => {
    if (pageOf(event) || !current || current.busy || !handlers || current.mode !== 'lock') return
    push({ busy: true, error: null })
    try {
      push({ ...(await handlers.reset()), busy: false })
    } catch (e) {
      push({ busy: false, error: e instanceof Error ? e.message : String(e) })
    }
  })
  ipcMain.handle(SECUREKEY_CHANNELS.retry, async (event) => {
    const page = pageOf(event)
    if (page) return page.retry?.()
    // the terms step passes only through acceptTerms, which writes the consent
    if (!current || current.busy || !handlers || current.mode === 'terms') return
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
    push({ ...next, busy: false })
  })
  ipcMain.handle(SECUREKEY_CHANNELS.quit, (event) => {
    const page = pageOf(event)
    if (page) return page.quit?.()
    settle('quit')
    closeSecureKeyWindow()
  })
}

/** Show the window and wait for its one answer */
export function showSecureKeyWindow(
  initial: SecureKeyUiState,
  next: SecureKeyWindowHandlers,
): Promise<SecureKeyWindowResult> {
  settle('quit')
  current = { ...initial, busy: false, error: null }
  handlers = next
  registerIpc()
  startPoll()
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
  stopPoll()
  const closing = win
  win = null
  current = null
  handlers = null
  if (closing && !closing.isDestroyed()) closing.close()
}
