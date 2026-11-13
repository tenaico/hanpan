import { join } from 'node:path'
import { BrowserWindow } from 'electron'
import { SECUREKEY_CHANNELS, type SecureKeyUiState } from '../../shared/securekey-api'
import { routeSecureKeyPage } from './window'

/**
 * The lock cover over every window while the security key is missing
 * (spec 7-4). Tabs draw over the shell page, so a cover inside the page
 * would not hide them: each visible top-level window gets a modal child
 * window of its own size instead. Nothing is closed: the documents and their
 * unsaved changes stay underneath. The shell window's cover shows the lock
 * screen ([Check again], [Quit]); the others show a title line.
 */

interface Cover {
  parent: BrowserWindow
  overlay: BrowserWindow
  main: boolean
  detach(): void
}

interface OverlayConfig {
  mainWindow(): BrowserWindow | null
  retry(): Promise<SecureKeyUiState | 'passed'>
  quit(): void
}

let config: OverlayConfig | null = null
let lockState: SecureKeyUiState | null = null
const covers = new Map<number, Cover>()
const overlayIds = new Set<number>()

export function configureLockOverlays(next: OverlayConfig): void {
  config = next
}

// a cover cannot register a key (that runs only in the gate window): no [Register a key] there
const stateFor = (cover: Cover): SecureKeyUiState =>
  cover.main
    ? { ...lockState!, cover: false, canRegister: false }
    : { ...lockState!, cover: true, canRegister: false }

function send(cover: Cover): void {
  if (!cover.overlay.isDestroyed() && lockState) {
    cover.overlay.webContents.send(SECUREKEY_CHANNELS.changed, stateFor(cover))
  }
}

function coverWindow(parent: BrowserWindow): void {
  const main = config?.mainWindow() === parent
  const bounds = parent.getContentBounds()
  const overlay = new BrowserWindow({
    ...bounds,
    parent,
    modal: true,
    frame: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: lockState?.strings.skCoverTitle ?? 'Hanpan',
    webPreferences: {
      preload: join(__dirname, '../preload/securekey.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  const follow = () => {
    if (!overlay.isDestroyed() && !parent.isDestroyed())
      overlay.setBounds(parent.getContentBounds())
  }
  // the window underneath is closing (quit, or its own close): its cover goes with it
  let parentClosing = false
  const onParentClose = () => {
    parentClosing = true
  }
  parent.on('move', follow)
  parent.on('resize', follow)
  parent.on('close', onParentClose)
  const cover: Cover = {
    parent,
    overlay,
    main,
    detach: () => {
      parent.removeListener('move', follow)
      parent.removeListener('resize', follow)
      parent.removeListener('close', onParentClose)
    },
  }
  // Alt+F4 or any other close by the person does not take the cover away while locked
  overlay.on('close', (event: { preventDefault(): void }) => {
    if (lockState && !parentClosing && !parent.isDestroyed()) event.preventDefault()
  })
  covers.set(parent.id, cover)
  overlayIds.add(overlay.id)
  const contentsId = overlay.webContents.id
  routeSecureKeyPage(contentsId, {
    state: () => stateFor(cover),
    retry: async () => {
      if (!config || !lockState) return
      const busy = { ...lockState, busy: true }
      lockState = busy
      send(cover)
      const next = await config.retry().catch(() => null)
      if (next === 'passed') return
      lockState = { ...(next ?? lockState), busy: false }
      for (const c of covers.values()) send(c)
    },
    quit: () => config?.quit(),
  })
  overlay.once('ready-to-show', () => overlay.show())
  overlay.on('closed', () => {
    routeSecureKeyPage(contentsId, null)
    overlayIds.delete(overlay.id)
    cover.detach()
    if (covers.get(parent.id) === cover) covers.delete(parent.id)
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    void overlay.loadURL(`${process.env.ELECTRON_RENDERER_URL}/securekey.html`)
  } else {
    void overlay.loadFile(join(__dirname, '../renderer/securekey.html'))
  }
}

/** Cover every visible top-level window that has no cover yet; update the ones that do */
export function showLockOverlays(state: SecureKeyUiState): void {
  lockState = { ...state, busy: false }
  for (const cover of covers.values()) send(cover)
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed() || !win.isVisible()) continue
    if (win.getParentWindow() !== null) continue
    if (overlayIds.has(win.id) || covers.has(win.id)) continue
    coverWindow(win)
  }
}

/** Take every cover away; the windows underneath stay as they were */
export function hideLockOverlays(): void {
  lockState = null
  for (const cover of [...covers.values()]) {
    covers.delete(cover.parent.id)
    cover.detach()
    if (!cover.overlay.isDestroyed()) cover.overlay.close()
  }
}

/**
 * A window made while locked (a detached editor, a tool window) gets its own
 * cover once it shows. Call for every new window; outside a lock it does nothing.
 */
export function coverNewWindow(win: BrowserWindow): void {
  win.once('show', () => {
    if (lockState && !win.isDestroyed()) showLockOverlays(lockState)
  })
}

export function lockOverlaysShown(): boolean {
  return covers.size > 0
}
