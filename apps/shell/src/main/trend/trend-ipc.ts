import { readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserWindow, ipcMain, net, shell } from 'electron'
import { safeExternalUrl } from '@genoffice/electron-utils'
import { readAppSettings } from '../app-settings'
import { HOME_BOARD_SETTING_KEY, boardHasTrend } from '../../shared/home-board'
import { TREND_CHANNELS } from '../../shared/trend-api'
import { TREND_SITE, trendLinkUrl } from '../../shared/trend-forecast'
import { createTrendService, type TrendService } from './trend-service'

/**
 * The Trend Radar forecast in the main process (spec 7.11, docs/security.md):
 * net.fetch with no cookies, the checked answer kept in
 * userData/trend-forecast.json, and the window told over IPC. The window's
 * CSP stays local.
 */

const STORE_FILE = 'trend-forecast.json'

export function registerTrendIpc(deps: {
  userData: () => string
  settingsPath: () => string
  url: string | null
  version: string
  window: () => BrowserWindow | null
}): TrendService {
  const storePath = () => join(deps.userData(), STORE_FILE)

  const service = createTrendService({
    url: deps.url,
    version: deps.version,
    async load(url, signal) {
      if (url.startsWith('file:')) return JSON.parse(await readFile(fileURLToPath(url), 'utf8'))
      const res = await net.fetch(url, {
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'User-Agent': `Hanpan/${deps.version}` },
        signal,
      })
      if (!res.ok) throw new Error(`forecast answered ${res.status}`)
      return res.json()
    },
    readStored() {
      try {
        return JSON.parse(readFileSync(storePath(), 'utf8'))
      } catch {
        return null
      }
    },
    writeStored(forecast) {
      writeFileSync(storePath(), JSON.stringify(forecast), 'utf8')
    },
    // only while the stored board shows a trend card (plan R9)
    wanted: () => boardHasTrend(readAppSettings(deps.settingsPath())[HOME_BOARD_SETTING_KEY]),
    broadcast(snapshot) {
      const win = deps.window()
      if (win && !win.isDestroyed()) win.webContents.send(TREND_CHANNELS.changed, snapshot)
    },
  })

  ipcMain.handle(TREND_CHANNELS.get, () => service.snapshot())
  ipcMain.handle(TREND_CHANNELS.open, (_event, path: unknown) => {
    if (path !== null && typeof path !== 'string') return
    const link = trendLinkUrl(path)
    // checked once more right before the OS sees it
    if (link === null || !link.startsWith(`${TREND_SITE}/`)) return
    const url = safeExternalUrl(link)
    if (url) shell.openExternal(url).catch(() => {})
  })

  return service
}
