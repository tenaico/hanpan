/**
 * Channels between the graphics editor's main side and its host page. Every
 * editor channel starts with `graphics:`: all editor mains share one process and
 * a name may be registered only once. `app:*` is the shell's; `ai:*` is
 * registered by the Word editor's main side and only called here.
 */
import type { Lang } from '@genoffice/i18n'
import type { AiPanelPrefs } from '@genoffice/ui'
import type { AiSettings, AiStreamChunk, AiStreamRequest } from '@genoffice/ai-provider'
import type { PrintSheet } from '@genoffice/ui/image-print'
import type { SaveMode } from './save-target'
import type { GraphicsSubscriptionApi } from './subscription-api'

export type { SaveMode } from './save-target'

export const GRAPHICS_CHANNELS = {
  consumeOpen: 'graphics:consume-open',
  webPresent: 'graphics:web-present',
  openConfirmed: 'graphics:open-confirmed',
  dirtyChanged: 'graphics:dirty-changed',
  saveRequest: 'graphics:save-request',
  saveRequestAck: 'graphics:save-request-ack',
  beginSave: 'graphics:begin-save',
  commitSave: 'graphics:commit-save',
  abortSave: 'graphics:abort-save',
  closeSaveRequest: 'graphics:close-save-request',
  closeSaveResult: 'graphics:close-save-result',
  exportFile: 'graphics:export-file',
  pickImage: 'graphics:pick-image',
  menuCommand: 'graphics:menu-command',
  /** the picture the page took from the app, printed through the system dialog */
  print: 'graphics:print',
  /** crash recovery: the page hands main a copy of the document (main picks the place) */
  recoveryWrite: 'graphics:recovery-write',
  /** the document was opened from a recovery copy: the page marks it changed (asked once) */
  recoveryRestored: 'graphics:recovery-restored',
  /** the OS is ending the session: write a copy now, then answer done */
  recoveryCopyNow: 'graphics:recovery-copy-now',
  recoveryCopyNowDone: 'graphics:recovery-copy-now-done',
  /** the copy was saved or dropped: the next copy is written even if nothing changed since */
  recoveryReset: 'graphics:recovery-reset',
} as const

export const APP_CHANNELS = {
  getLanguage: 'app:get-language',
  languageChanged: 'app:language-changed',
  getTheme: 'app:get-theme',
  themeChanged: 'app:theme-changed',
  getAiPanelPrefs: 'app:get-ai-panel-prefs',
  setAiPanelPrefs: 'app:set-ai-panel-prefs',
  aiPanelPrefsChanged: 'app:ai-panel-prefs-changed',
} as const

/** The shared AI channels, registered once for the whole app by the Word editor's main. Pass-through only. */
export const AI_CHANNELS = {
  getSettings: 'ai:get-settings',
  setSettings: 'ai:set-settings',
  settingsChanged: 'ai:settings-changed',
  openModelSettings: 'ai:open-model-settings',
  stream: 'ai:stream',
  streamChunk: 'ai:stream-chunk',
  streamCancel: 'ai:stream-cancel',
} as const

export type UiTheme = 'light' | 'dark' | 'system'

export interface BeginSaveRequest {
  mode: SaveMode
  /** the document holds layers, type or masks that a format without layers would drop */
  layered: boolean
}
export type BeginSaveResult =
  | { ok: true; path: string; format: string; reason?: 'layered' }
  | { ok: true; canceled: true }
  | { ok: false; error: string }

export interface CommitSaveRequest {
  bytes: Uint8Array
  path: string
  format: string
}
export type CommitSaveResult = { ok: true; path: string } | { ok: false; error: string }

export type ExportFormat = 'png' | 'jpg' | 'svg' | 'ai'
export interface ExportRequest {
  bytes: Uint8Array
  defaultName: string
  format: ExportFormat
}
export type ExportResult =
  { ok: true; path: string } | { ok: true; canceled: true } | { ok: false; error: string }

export interface PendingOpen {
  name: string
  path: string
  bytes: Uint8Array
}
export interface PickedImage {
  name: string
  bytes: Uint8Array
}

/** A copy of the document for crash recovery; `ext` without the dot ('psd', 'png', 'vectorcraft'). */
export interface RecoveryCopyRequest {
  bytes: Uint8Array
  ext: string
}
/**
 * - `written`: kept in the profile's recovery folder.
 * - `superseded`: not kept now (the document was just dropped with "Don't Save").
 * - `refused`: a format this tab does not keep.
 */
export type RecoveryWriteAnswer = 'written' | 'superseded' | 'refused'

export type GraphicsMenuCommand = 'export' | 'undo' | 'redo' | 'print'

/** The app's picture as a PNG, and the paper the preview put it on. */
export interface PrintRequest {
  bytes: Uint8Array
  sheet: PrintSheet
}
export type PrintResult = { ok: true } | { ok: true; canceled: true } | { ok: false; error: string }

/** What the preload exposes as `window.graphicsApi`. Every `on…` returns its unsubscribe. */
export interface GraphicsApi {
  getLanguage(): Promise<Lang>
  onLanguageChanged(handler: (lang: Lang) => void): () => void
  getTheme(): Promise<UiTheme>
  onThemeChanged(handler: (theme: UiTheme) => void): () => void
  consumeOpen(): Promise<PendingOpen | null>
  /** the app's web build is installed (main reads it beside the renderer) */
  webPresent(): Promise<boolean>
  /** the app opened the handed file: only then does it become the tab's save target */
  confirmOpened(path: string): void
  setDirty(dirty: boolean): void
  onSaveRequest(handler: (mode: SaveMode) => void): () => void
  sendSaveRequestAck(ok: boolean): void
  beginSave(request: BeginSaveRequest): Promise<BeginSaveResult>
  commitSave(request: CommitSaveRequest): Promise<CommitSaveResult>
  abortSave(): void
  onCloseSaveRequest(handler: () => void): () => void
  sendCloseSaveResult(ok: boolean): void
  exportFile(request: ExportRequest): Promise<ExportResult>
  pickImage(): Promise<PickedImage | null>
  onMenuCommand(handler: (command: GraphicsMenuCommand) => void): () => void
  /** prints the picture on the paper the preview showed; main builds the page itself */
  print(request: PrintRequest): Promise<PrintResult>
  // ---- crash recovery: main writes the copy into the profile's recovery folder ----
  writeRecoveryCopy(request: RecoveryCopyRequest): Promise<RecoveryWriteAnswer>
  /** true once when the document came from a recovery copy */
  recoveryRestored(): Promise<boolean>
  onRecoveryCopyNow(handler: () => void): () => void
  recoveryCopyNowDone(): void
  onRecoveryReset(handler: () => void): () => void
  // ---- the AI panel: no attachments, no web search, no files of its own ----
  getAiPanelPrefs(): Promise<AiPanelPrefs>
  setAiPanelPrefs(patch: Partial<AiPanelPrefs>): Promise<AiPanelPrefs>
  onAiPanelPrefsChanged(handler: (prefs: AiPanelPrefs) => void): () => void
  getAiSettings(): Promise<AiSettings>
  setAiSettings(settings: AiSettings): Promise<void>
  onAiSettingsChanged(handler: () => void): () => void
  /** shell only: switch to Home and open Settings › AI Model (rejects in standalone) */
  openAiModelSettings(): Promise<void>
  subscription: GraphicsSubscriptionApi
  aiStream(request: AiStreamRequest): Promise<void>
  aiStreamCancel(requestId: string): Promise<void>
  onAiStream(handler: (chunk: AiStreamChunk) => void): () => void
}
