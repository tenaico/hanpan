import { contextBridge, ipcRenderer } from 'electron'
import { installDropOpenBridge } from '@genoffice/electron-utils/drop-open'
import type { Lang } from '@genoffice/i18n'
import { APP_CHANNELS, CAD_CHANNELS } from '../shared/ipc'
import type {
  AutoSaveDefault,
  CadApi,
  CadCoreApi,
  CadExportApi,
  CadMenuCommand,
  CadQueryApi,
  CadRecoveryApi,
  ExportFormat,
  SaveMode,
  UiTheme,
} from '../shared/ipc'

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

const api: CadApi = { ...core, ...queries, ...recovery, ...exporting }

contextBridge.exposeInMainWorld('cadApi', api)

// open documents dragged from the OS onto this tab as a new shell tab
installDropOpenBridge()
