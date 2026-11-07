/**
 * Preload of the AI Photo and AI Illustration tabs: exposes `window.graphicsApi`
 * (see ../shared/ipc). The web app runs in a same-origin iframe and can reach this
 * through `parent`; main therefore decides every path itself (docs/security.md).
 */
import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { SPLIT_PANE_BRIDGE_KEY, splitPaneBridge } from '@genoffice/electron-utils/split-pane-bridge'
import { installDropOpenBridge } from '@genoffice/electron-utils/drop-open'
import { outboundBridge } from '@genoffice/electron-utils/outbound-bridge'
import type { Lang } from '@genoffice/i18n'
import type { AiPanelPrefs } from '@genoffice/ui'
import type { AiStreamChunk } from '@genoffice/ai-provider'
import { SUBSCRIPTION_IPC_CHANNELS } from '@genoffice/ai-provider/browser'
import { AI_CHANNELS, APP_CHANNELS, GRAPHICS_CHANNELS } from '../shared/ipc'
import type { GraphicsApi, GraphicsMenuCommand, SaveMode, UiTheme } from '../shared/ipc'
import {
  SUBSCRIPTION_INSTALL_HELP_CHANNEL,
  subscriptionLaunchResultOf,
  subscriptionMeteredResultOf,
  subscriptionStatusMapOf,
} from '../shared/subscription-api'
import type { GraphicsSubscriptionApi } from '../shared/subscription-api'
import { APP_GLOBAL, type GraphicsKind } from '../shared/kinds'
import { installFrameAgent } from '../renderer/frame/frame-agent'
import { clearIllustRecovery, seedPhotoPreferences } from '../renderer/frame/storage-prep'

/** Subscribes to a channel the main process sends on; returns the way to stop. */
function listen<Args extends unknown[]>(
  channel: string,
  handler: (...args: Args) => void,
): () => void {
  const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]) => handler(...(args as Args))
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// The subscription channels are registered once for the whole app by the docs
// main. Without that handler (standalone run) an invoke rejects; the panel
// reads that as "still checking".
const subscription: GraphicsSubscriptionApi = {
  statuses: async () =>
    subscriptionStatusMapOf(await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.statuses)),
  recheck: async (providers) =>
    subscriptionStatusMapOf(
      await ipcRenderer.invoke(
        SUBSCRIPTION_IPC_CHANNELS.recheck,
        providers ? { providers } : undefined,
      ),
    ),
  login: async (provider, mode) =>
    subscriptionLaunchResultOf(
      await ipcRenderer.invoke(
        SUBSCRIPTION_IPC_CHANNELS.login,
        mode ? { provider, mode } : { provider },
      ),
    ),
  install: async (provider) =>
    subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.install, { provider }),
    ),
  update: async (provider) =>
    subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.update, { provider }),
    ),
  cancelLogin: async (provider) =>
    subscriptionLaunchResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.cancelLogin, { provider }),
    ),
  setMeteredAccepted: async (provider, accepted) =>
    subscriptionMeteredResultOf(
      await ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.metered, { provider, accepted }),
    ),
  onChanged: (handler) =>
    listen<[unknown]>(SUBSCRIPTION_IPC_CHANNELS.changed, (statuses) =>
      handler(subscriptionStatusMapOf(statuses)),
    ),
  openInstallHelp: async (provider) => {
    await ipcRenderer.invoke(SUBSCRIPTION_INSTALL_HELP_CHANNEL, provider)
  },
}

const api: GraphicsApi = {
  getLanguage: () => ipcRenderer.invoke(APP_CHANNELS.getLanguage),
  onLanguageChanged: (handler) => listen<[Lang]>(APP_CHANNELS.languageChanged, handler),
  getTheme: () => ipcRenderer.invoke(APP_CHANNELS.getTheme),
  onThemeChanged: (handler) => listen<[UiTheme]>(APP_CHANNELS.themeChanged, handler),
  consumeOpen: () => ipcRenderer.invoke(GRAPHICS_CHANNELS.consumeOpen),
  webPresent: () => ipcRenderer.invoke(GRAPHICS_CHANNELS.webPresent),
  confirmOpened: (path) => ipcRenderer.send(GRAPHICS_CHANNELS.openConfirmed, path),
  setDirty: (dirty) => ipcRenderer.send(GRAPHICS_CHANNELS.dirtyChanged, dirty),
  onSaveRequest: (handler) => listen<[SaveMode]>(GRAPHICS_CHANNELS.saveRequest, handler),
  sendSaveRequestAck: (ok) => ipcRenderer.send(GRAPHICS_CHANNELS.saveRequestAck, ok),
  beginSave: (request) => ipcRenderer.invoke(GRAPHICS_CHANNELS.beginSave, request),
  commitSave: (request) => ipcRenderer.invoke(GRAPHICS_CHANNELS.commitSave, request),
  abortSave: () => ipcRenderer.send(GRAPHICS_CHANNELS.abortSave),
  onCloseSaveRequest: (handler) => listen<[]>(GRAPHICS_CHANNELS.closeSaveRequest, handler),
  sendCloseSaveResult: (ok) => ipcRenderer.send(GRAPHICS_CHANNELS.closeSaveResult, ok),
  exportFile: (request) => ipcRenderer.invoke(GRAPHICS_CHANNELS.exportFile, request),
  pickImage: () => ipcRenderer.invoke(GRAPHICS_CHANNELS.pickImage),
  print: (request) => ipcRenderer.invoke(GRAPHICS_CHANNELS.print, request),
  writeRecoveryCopy: (request) => ipcRenderer.invoke(GRAPHICS_CHANNELS.recoveryWrite, request),
  recoveryRestored: () => ipcRenderer.invoke(GRAPHICS_CHANNELS.recoveryRestored),
  onRecoveryCopyNow: (handler) => listen<[]>(GRAPHICS_CHANNELS.recoveryCopyNow, handler),
  recoveryCopyNowDone: () => ipcRenderer.send(GRAPHICS_CHANNELS.recoveryCopyNowDone),
  onRecoveryReset: (handler) => listen<[]>(GRAPHICS_CHANNELS.recoveryReset, handler),
  onMenuCommand: (handler) => listen<[GraphicsMenuCommand]>(GRAPHICS_CHANNELS.menuCommand, handler),
  getAiPanelPrefs: () => ipcRenderer.invoke(APP_CHANNELS.getAiPanelPrefs),
  setAiPanelPrefs: (patch) => ipcRenderer.invoke(APP_CHANNELS.setAiPanelPrefs, patch),
  onAiPanelPrefsChanged: (handler) =>
    listen<[AiPanelPrefs]>(APP_CHANNELS.aiPanelPrefsChanged, handler),
  getAiSettings: () => ipcRenderer.invoke(AI_CHANNELS.getSettings),
  setAiSettings: (settings) => ipcRenderer.invoke(AI_CHANNELS.setSettings, settings),
  onAiSettingsChanged: (handler) => listen<[]>(AI_CHANNELS.settingsChanged, handler),
  openAiModelSettings: () => ipcRenderer.invoke(AI_CHANNELS.openModelSettings),
  subscription,
  aiStream: (request) => ipcRenderer.invoke(AI_CHANNELS.stream, request),
  aiStreamCancel: (requestId) => ipcRenderer.invoke(AI_CHANNELS.streamCancel, requestId),
  onAiStream: (handler) => listen<[AiStreamChunk]>(AI_CHANNELS.streamChunk, handler),
}

function exposeHostBridges(): void {
  // Handed over once, to the host page at start-up (renderer/bridge.ts), and not left on
  // the window: even a frame on the host's own origin could not take it later
  let handed: GraphicsApi | null = api
  contextBridge.exposeInMainWorld('graphicsBridge', {
    take: (): GraphicsApi | null => {
      const taken = handed
      handed = null
      return taken
    },
  })
  // the AI's outbound guard (decision 0062): the graphics tools reach no address, the guard stays uniform
  contextBridge.exposeInMainWorld('aiOfficeOutbound', outboundBridge())
  // The shell's split panes: this view's pane role, and its way to ask for focus
  contextBridge.exposeInMainWorld(SPLIT_PANE_BRIDGE_KEY, splitPaneBridge(ipcRenderer))
  // open documents dragged from the OS onto this tab's own controls as a new shell tab
  installDropOpenBridge()
}

/**
 * The web app's own frame (decision 0093, option B): it runs on its own origin
 * and gets none of the host's bridges. Before the app's scripts run, its
 * storage is prepared (PhotoCraft's language, no VectorCraft recovery copies)
 * and the frame agent is put in the frame's own world: the agent is the only
 * way the host page reaches the app, by messages.
 */
function prepareAppFrame(): void {
  const match = /^\/web\/(photo|illust)\/index\.html$/.exec(location.pathname)
  if (!match) return
  const kind = match[1] as GraphicsKind
  const lang = new URLSearchParams(location.search).get('lang') ?? 'en'
  try {
    if (kind === 'photo') seedPhotoPreferences(localStorage, lang)
    else clearIllustRecovery(localStorage)
  } catch {
    // storage refused: the app starts with its own defaults
  }
  // the host page is `<kind>` when the app is `<kind>-app`; the dev server serves both on one origin
  const host = location.hostname.endsWith('-app')
    ? `${location.protocol}//${location.hostname.slice(0, -'-app'.length)}`
    : location.origin
  const source = `(${installFrameAgent.toString()})(window, ${JSON.stringify(APP_GLOBAL[kind])}, ${JSON.stringify(host)})`
  void webFrame.executeJavaScript(source).catch(() => {})
}

// One preload for every frame of the tab (nodeIntegrationInSubFrames): the host page
// is the top frame; the web app is a frame inside it
if ((process as { isMainFrame?: boolean }).isMainFrame === false) prepareAppFrame()
else exposeHostBridges()
