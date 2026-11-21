import type { AiPanelPrefs } from '@genoffice/ui'
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { installDropOpenBridge } from '@genoffice/electron-utils/drop-open'
import { userSkillsBridge } from '@genoffice/electron-utils/user-skills-bridge'
import { USER_SKILLS_BRIDGE_KEY } from '@genoffice/electron-utils/user-skills-channels'
import { docAttachBridge } from '@genoffice/electron-utils/doc-attach-bridge'
import { DOC_ATTACH_BRIDGE_KEY } from '@genoffice/electron-utils/doc-attach-channels'
import { SPLIT_PANE_BRIDGE_KEY, splitPaneBridge } from '@genoffice/electron-utils/split-pane-bridge'
import type { Lang } from '@genoffice/i18n'
import type { AiStreamChunk } from '@genoffice/ai-provider'
import { SUBSCRIPTION_IPC_CHANNELS } from '@genoffice/ai-provider/browser'
import type { ProjectApi } from '@genoffice/project-store'
import { AI_CHANNELS, APP_CHANNELS, CAD_CHANNELS } from '../shared/ipc'
import type {
  AutoSaveDefault,
  CadAiApi,
  CadApi,
  CadCoreApi,
  CadExportApi,
  CadMenuCommand,
  CadQueryApi,
  CadRecoveryApi,
  CadSendApi,
  ExportFormat,
  SaveMode,
  UiTheme,
} from '../shared/ipc'
import {
  SUBSCRIPTION_CONNECT_HELP_CHANNEL,
  SUBSCRIPTION_INSTALL_HELP_CHANNEL,
  subscriptionLaunchResultOf,
  subscriptionMeteredResultOf,
  subscriptionStatusMapOf,
} from '../shared/subscription-api'
import type { CadSubscriptionApi } from '../shared/subscription-api'

/** Subscribes to a channel the main process sends on; returns the way to stop. */
function listen<Args extends unknown[]>(
  channel: string,
  handler: (...args: Args) => void,
): () => void {
  const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]) => handler(...(args as Args))
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// ---- the editor itself: open, save, menu commands, the shell's settings ----

const core: CadCoreApi = {
  consumePending: () => ipcRenderer.invoke(CAD_CHANNELS.consumePending),
  openFile: (path) => ipcRenderer.invoke(CAD_CHANNELS.openFile, path),
  openFileDialog: () => ipcRenderer.invoke(APP_CHANNELS.openFileDialog, { first: 'cad' }),
  save: (request) => ipcRenderer.invoke(CAD_CHANNELS.save, request),
  setDirty: (dirty) => ipcRenderer.send(CAD_CHANNELS.dirtyChanged, dirty),
  onSaveRequest: (handler) => listen<[SaveMode]>(CAD_CHANNELS.saveRequest, handler),
  sendSaveRequestAck: (ok) => ipcRenderer.send(CAD_CHANNELS.saveRequestAck, ok),
  onCloseSaveRequest: (handler) => listen<[]>(CAD_CHANNELS.closeSaveRequest, handler),
  sendCloseSaveResult: (ok) => ipcRenderer.send(CAD_CHANNELS.closeSaveResult, ok),
  onFileRenamed: (handler) => listen<[string]>(CAD_CHANNELS.fileRenamed, handler),
  onMenuCommand: (handler) => listen<[CadMenuCommand]>(CAD_CHANNELS.menuCommand, handler),
  getLanguage: () => ipcRenderer.invoke(APP_CHANNELS.getLanguage),
  onLanguageChanged: (handler) => listen<[Lang]>(APP_CHANNELS.languageChanged, handler),
  getTheme: () => ipcRenderer.invoke(APP_CHANNELS.getTheme),
  onThemeChanged: (handler) => listen<[UiTheme]>(APP_CHANNELS.themeChanged, handler),
  getAutoSaveDefault: () => ipcRenderer.invoke(APP_CHANNELS.getAutoSaveDefault),
  onAutoSaveDefaultChanged: (handler) =>
    listen<[AutoSaveDefault]>(APP_CHANNELS.autoSaveDefaultChanged, handler),
  onChromePressed: (handler) => listen<[]>(APP_CHANNELS.chromePressed, handler),
  getKoreanDocFeatures: () =>
    ipcRenderer
      .invoke(APP_CHANNELS.getKoreanDocFeatures)
      .then((stored: unknown) => (typeof stored === 'boolean' ? stored : null)),
  onKoreanDocFeaturesChanged: (handler) =>
    listen<[unknown]>(APP_CHANNELS.koreanDocFeaturesChanged, (stored) =>
      handler(typeof stored === 'boolean' ? stored : null),
    ),
}

// ---- questions from the in-app MCP server: the renderer answers, the main process asks ----

const queries: CadQueryApi = {
  onSummaryRequest: (handler) => listen<[]>(CAD_CHANNELS.summaryRequest, handler),
  sendSummaryResult: (reply) => ipcRenderer.send(CAD_CHANNELS.summaryResult, reply),
  onBytesRequest: (handler) => listen<[]>(CAD_CHANNELS.bytesRequest, handler),
  sendBytesResult: (reply) => ipcRenderer.send(CAD_CHANNELS.bytesResult, reply),
}

// ---- crash-recovery copies ----

const recovery: CadRecoveryApi = {
  writeRecoveryCopy: (request) => ipcRenderer.invoke(CAD_CHANNELS.recoveryCopy, request),
  onRecoveryCopyNow: (handler) => listen<[]>(CAD_CHANNELS.recoveryCopyNow, handler),
  sendRecoveryCopyNowDone: () => ipcRenderer.send(CAD_CHANNELS.recoveryCopyNowDone),
  onRecoveryReset: (handler) => listen<[]>(CAD_CHANNELS.recoveryReset, handler),
}

// ---- export: the renderer makes the bytes, the main process asks where and writes ----

const exporting: CadExportApi = {
  exportFile: (request) => ipcRenderer.invoke(CAD_CHANNELS.exportFile, request),
  onExportRequest: (handler) => listen<[ExportFormat]>(CAD_CHANNELS.exportRequest, handler),
}

// ---- copy and send: the renderer makes the PNG ----

const sending: CadSendApi = {
  sendToDocument: (request) => ipcRenderer.invoke(CAD_CHANNELS.sendToDocument, request),
  copyImage: (png) => ipcRenderer.invoke(CAD_CHANNELS.copyImage, png),
}

// ---- the AI pane: shared channels only, registered once for the whole app ----

// The subscription channels are registered once for the whole app by the docs
// main. Without that handler (standalone run) an invoke rejects; the pane
// treats a rejection as "no answer" and keeps the statuses at `checking`.
const subscription: CadSubscriptionApi = {
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
  openConnectHelp: async (path) => {
    await ipcRenderer.invoke(SUBSCRIPTION_CONNECT_HELP_CHANNEL, path)
  },
}

const ai: CadAiApi = {
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
  pickAttachments: () => ipcRenderer.invoke(CAD_CHANNELS.filesPick),
  addAttachmentPaths: (paths) => ipcRenderer.invoke(CAD_CHANNELS.filesAdd, paths),
  addPastedImage: (data, ext) => ipcRenderer.invoke(CAD_CHANNELS.filesAddPastedImage, data, ext),
  readAttachment: (path, offset, maxChars) =>
    ipcRenderer.invoke(CAD_CHANNELS.filesRead, path, offset, maxChars),
  readAttachmentImage: (path) => ipcRenderer.invoke(CAD_CHANNELS.filesReadImage, path),
  getPathForFile: (file) => webUtils.getPathForFile(file),
}

const api: CadApi = { ...core, ...queries, ...recovery, ...exporting, ...sending, ...ai }

/** Chat persistence: the shared project:* handlers are registered once by the shell (docs-main registerProjectIpc) */
const projectApi: Pick<ProjectApi, 'resolveChat' | 'appendChat' | 'loadChat' | 'rebindChat'> = {
  resolveChat: (args) => ipcRenderer.invoke('project:resolveChat', args),
  appendChat: (args) => ipcRenderer.invoke('project:appendChat', args),
  loadChat: (args) => ipcRenderer.invoke('project:loadChat', args),
  rebindChat: (args) => ipcRenderer.invoke('project:rebindChat', args),
}

contextBridge.exposeInMainWorld('cadApi', api)
// the person's skills: the AI pane's `/` list and skill reads, skill cards (shell main checks each)
contextBridge.exposeInMainWorld(USER_SKILLS_BRIDGE_KEY, userSkillsBridge())
// The shell's document picker, for the AI pane's attach button (decision 0035)
contextBridge.exposeInMainWorld(DOC_ATTACH_BRIDGE_KEY, docAttachBridge())
// The shell's split panes: this view's pane role, and its way to ask for focus
contextBridge.exposeInMainWorld(SPLIT_PANE_BRIDGE_KEY, splitPaneBridge(ipcRenderer))
contextBridge.exposeInMainWorld('projectApi', projectApi)

// open documents dragged from the OS onto this tab as a new shell tab
installDropOpenBridge()
