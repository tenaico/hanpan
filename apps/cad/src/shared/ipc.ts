/**
 * The contract between the AI Drawing renderer, its preload and the main
 * process, for the whole feature. Later stages add handlers and callers, not
 * names: every channel this editor will own is listed here once.
 *
 * Every channel of this editor starts with `cad:`. The main processes of all
 * editors run in one process, so a name may be registered only once. Channels
 * owned by the shell (`app:*`) and the shared AI channels (`ai:*`) are listed
 * separately below; this editor never registers those, it only calls them.
 */
import type { Lang } from '@genoffice/i18n'
import type { AiPanelPrefs } from '@genoffice/ui'
import type { AiSettings, AiStreamChunk, AiStreamRequest } from '@genoffice/ai-provider'
import type { CadSubscriptionApi } from './subscription-api'

export const CAD_CHANNELS = {
  // ---- open and save (stage 2) ----
  /** invoke → `string | null`: the path queued for this view, null for a new drawing */
  consumePending: 'cad:consume-pending',
  /** invoke(path) → `OpenFileResult` */
  openFile: 'cad:open-file',
  /** invoke(`SaveCadRequest`) → `SaveCadResult` */
  save: 'cad:save',
  /** main → renderer(`SaveMode`): the menu's Save / Save As */
  saveRequest: 'cad:save-request',
  /** renderer → main(boolean): a save request that ended without a save call */
  saveRequestAck: 'cad:save-request-ack',
  /** renderer → main(boolean): unsaved changes, for the close prompt */
  dirtyChanged: 'cad:dirty-changed',
  /** main → renderer: "Save" was picked in the close prompt */
  closeSaveRequest: 'cad:close-save-request',
  /** renderer → main(boolean): how that save ended */
  closeSaveResult: 'cad:close-save-result',
  /** main → renderer(newPath): the file was renamed on disk */
  fileRenamed: 'cad:file-renamed',
  /** main → renderer(`CadMenuCommand`) */
  menuCommand: 'cad:menu-command',

  // ---- crash-recovery copies (stage 2, decision 0061) ----
  /** invoke(`RecoveryCopyRequest`) → `RecoveryCopyResult` */
  recoveryCopy: 'cad:recovery-copy',
  /** main → renderer: the OS is ending the session, copy now */
  recoveryCopyNow: 'cad:recovery-copy-now',
  /** renderer → main: that copy is done */
  recoveryCopyNowDone: 'cad:recovery-copy-now-done',
  /** main → renderer: the last copy was dropped, copy again on the next tick */
  recoveryReset: 'cad:recovery-reset',

  // ---- questions from the in-app MCP server (stage 2) ----
  /** main → renderer: send the model summary */
  summaryRequest: 'cad:summary-request',
  /** renderer → main(`SummaryReply`) */
  summaryResult: 'cad:summary-result',
  /** main → renderer: send the bytes a save would write */
  bytesRequest: 'cad:bytes-request',
  /** renderer → main(`BytesReply`) */
  bytesResult: 'cad:bytes-result',

  // ---- export, copy and send (stages 3 and 4) ----
  /** invoke(`ExportFileRequest`) → `ExportResult` (stage 3) */
  exportFile: 'cad:export-file',
  /** main → renderer(`ExportFormat`): the menu's export items (stage 3) */
  exportRequest: 'cad:export-request',
  /** invoke(png bytes) → boolean: put a picture on the OS clipboard (stage 4) */
  copyImage: 'cad:copy-image',
  /** invoke(`SendToDocumentRequest`) → `SendToDocumentResult` (stage 4) */
  sendToDocument: 'cad:send-to-document',
} as const

/** Channels the shell registers for every editor. Called here, never registered. */
export const APP_CHANNELS = {
  getLanguage: 'app:get-language',
  languageChanged: 'app:language-changed',
  getTheme: 'app:get-theme',
  themeChanged: 'app:theme-changed',
  getDocumentTheme: 'app:get-document-theme',
  documentThemeChanged: 'app:document-theme-changed',
  getAutoSaveDefault: 'app:get-auto-save-default',
  autoSaveDefaultChanged: 'app:auto-save-default-changed',
  getAiPanelPrefs: 'app:get-ai-panel-prefs',
  setAiPanelPrefs: 'app:set-ai-panel-prefs',
  aiPanelPrefsChanged: 'app:ai-panel-prefs-changed',
  chromePressed: 'app:chrome-pressed',
  openSourcePath: 'home:open-path',
  /** the shell's open dialog (the one Home's Open uses); the picked files open in tabs */
  openFileDialog: 'home:browse',
  /** Hanpan: the stored Korean document features switch (true, false, or null when never set) */
  getKoreanDocFeatures: 'app:get-korean-doc-features',
  koreanDocFeaturesChanged: 'app:korean-doc-features-changed',
} as const

/** The shared AI channels, registered once for the whole app by the docs main. Pass-through only. */
export const AI_CHANNELS = {
  getSettings: 'ai:get-settings',
  setSettings: 'ai:set-settings',
  settingsChanged: 'ai:settings-changed',
  openModelSettings: 'ai:open-model-settings',
  stream: 'ai:stream',
  streamChunk: 'ai:stream-chunk',
  streamCancel: 'ai:stream-cancel',
  webSearch: 'ai:web-search',
  readUrl: 'ai:read-url',
  imageSearch: 'ai:image-search',
  /** Hanpan: image_search with source "gongu" (registered by the shell main) */
  gonguImageSearch: 'hanpan:gongu-image-search',
  /** () → `AiToolCapabilities | null`, registered by the docs main (shell mode only) */
  toolCapabilities: 'ai:tool-capabilities',
} as const

export type UiTheme = 'light' | 'dark' | 'system'

/** shell-wide AutoSave default; updatedAt is 0 until the user has ever set it */
export interface AutoSaveDefault {
  on: boolean
  updatedAt: number
}

// ---- open ----

/** The engine's open status for a `.ttukcad` file (`openCadFile`). */
export type CadOpenStatus = 'ok' | 'empty' | 'too-large' | 'broken' | 'unsupported'

/**
 * Files that open as a new untitled drawing; the file itself is never written.
 * The engine reads DXF, STL and OBJ; the renderer reads 3MF, GLB and PLY with
 * three's readers (they need a DOM, so they stay out of the engine).
 */
export type ImportExt = 'dxf' | 'stl' | 'obj' | '3mf' | 'glb' | 'ply'

/**
 * How a path opens.
 *
 * - `ok`: a `.ttukcad` file the main process opened with the engine; the path
 *   is now this view's save target. `restored`: the bytes are the drawing's
 *   crash-recovery copy, not the file (`file`: the path stays the target;
 *   `untitled`: the drawing has no path).
 * - `import`: a DXF, STL, OBJ, 3MF, GLB or PLY file. The renderer turns it
 *   into a new drawing named `name`; nothing is granted, so the first save asks where.
 * - `guide`: a file of a CAD program this editor cannot read (DWG, STEP,
 *   IGES, BREP). It is not read; the screen explains how to get a DXF or STL
 *   instead. `ext` is the lower-case extension, `name` the file name without it.
 * - any other status: a `.ttukcad` that does not open, or a file that cannot
 *   be read. No bytes travel and nothing is granted.
 */
export type OpenFileResult =
  | { status: 'ok'; bytes: Uint8Array; restored?: 'file' | 'untitled' }
  | { status: 'import'; bytes: Uint8Array; name: string; ext: ImportExt }
  | { status: 'guide'; ext: string; name: string }
  | { status: Exclude<CadOpenStatus, 'ok'> | 'unreadable' | 'not-found' | 'unknown-type' }

// ---- save ----

export type SaveMode = 'save' | 'saveAs'

export interface SaveCadRequest {
  /** the whole `.ttukcad` file, as the engine produced it */
  bytes: Uint8Array
  mode: SaveMode
  /** file name (no extension) offered by the save dialog of an untitled drawing */
  defaultName?: string
  /** an automatic save (the 30-second timer or a window blur) */
  auto?: boolean
}

/** `not-reopenable`: the main process opened the bytes with the engine and they did not open `ok` */
export type SaveCadResult =
  | { ok: true; path: string }
  | { ok: true; canceled: true }
  | { ok: false; error: 'not-reopenable' | 'write-failed' | 'no-target' }

// ---- menu ----

/**
 * Commands the menu sends to the drawing. New and Open are the shell's own;
 * Save and Save As go through `saveRequest` so the main process can wait.
 */
export type CadMenuCommand =
  'undo' | 'redo' | 'select-all' | 'delete' | 'view-top' | 'view-front' | 'view-side' | 'view-fit'

// ---- export (stage 3) ----

export type ExportFormat = 'stl' | 'obj' | 'png'

export interface ExportFileRequest {
  format: ExportFormat
  bytes: Uint8Array
  /** file name (no extension) suggested in the dialog */
  suggestedName: string
}

/**
 * `bad-request`: no bytes or an unknown format; `not-open`: the view's file has
 * not opened yet; `source-path`: the picked path is the file this drawing came
 * from (or was saved as), which an export never replaces.
 */
export type ExportResult =
  | { ok: true; path: string }
  | { ok: true; canceled: true }
  | { ok: false; error: 'bad-request' | 'not-open' | 'source-path' | 'write-failed' }

// ---- send to a document (stage 4) ----

/**
 * "Send to Hangul / Word": the dimension sheet and its size table, as a new
 * document. The shell checks every field again (`checkDrawingRequest`).
 */
export interface SendToDocumentRequest {
  /** `hwp` when the Korean document features are on (HWPX), `docx` when off */
  target: 'hwp' | 'docx'
  /** the drawing's title: the document title and its file name (at most 200 characters) */
  title: string
  /** the date line under the title, as shown in the title block; empty for none */
  date: string
  /** the dimension sheet as PNG, at most 10 MB */
  drawingPng: Uint8Array
  /**
   * The size table: `rows[0]` is the header row in the UI language
   * (name, width, depth, height), then one row per part with formatted mm.
   * At most 501 rows of at most 4 cells.
   */
  rows: string[][]
}

/** `title`: the new tab's title */
export type SendToDocumentResult = { ok: true; title: string } | { ok: false; error: string }

// ---- questions from the in-app MCP server ----

/** The model as summary text, unsaved edits included. */
export type SummaryReply = { text: string } | { error: string }

/** The drawing as the file a save would write, unsaved edits included. Nothing is written. */
export type BytesReply = { bytes: Uint8Array } | { error: string }

// ---- crash-recovery copies ----

export interface RecoveryCopyRequest {
  /** the whole `.ttukcad` file, as a save would write it now */
  bytes: Uint8Array
  /** a name for an untitled drawing's copy when the shell gives none */
  name?: string
}

/** `skipped`: nothing to keep; `superseded`: a save or a "Don't Save" came first */
export type RecoveryCopyResult = 'written' | 'superseded' | 'skipped'

/** Open, save, menu commands and the shell's settings. */
export interface CadCoreApi {
  /** Take the path pending for this view; null = a new untitled drawing */
  consumePending(): Promise<string | null>
  openFile(path: string): Promise<OpenFileResult>
  save(request: SaveCadRequest): Promise<SaveCadResult>
  setDirty(dirty: boolean): void
  onSaveRequest(handler: (mode: SaveMode) => void): () => void
  sendSaveRequestAck(ok: boolean): void
  onCloseSaveRequest(handler: () => void): () => void
  sendCloseSaveResult(ok: boolean): void
  onFileRenamed(handler: (newPath: string) => void): () => void
  onMenuCommand(handler: (command: CadMenuCommand) => void): () => void
  getLanguage(): Promise<Lang>
  onLanguageChanged(handler: (lang: Lang) => void): () => void
  getTheme(): Promise<UiTheme>
  onThemeChanged(handler: (theme: UiTheme) => void): () => void
  getAutoSaveDefault(): Promise<AutoSaveDefault>
  onAutoSaveDefaultChanged(handler: (value: AutoSaveDefault) => void): () => void
  /** press on the shell chrome: dismiss open popovers */
  onChromePressed(handler: () => void): () => void
  /** the stored Korean document features switch (decision 0091): null when never set */
  getKoreanDocFeatures?(): Promise<boolean | null>
  onKoreanDocFeaturesChanged?(handler: (stored: boolean | null) => void): () => void
}

/** Answers to the in-app MCP server. */
export interface CadQueryApi {
  onSummaryRequest(handler: () => void): () => void
  sendSummaryResult(reply: SummaryReply): void
  onBytesRequest(handler: () => void): () => void
  sendBytesResult(reply: BytesReply): void
}

/** Crash-recovery copies: written by the renderer, kept by the main process. */
export interface CadRecoveryApi {
  writeRecoveryCopy(request: RecoveryCopyRequest): Promise<RecoveryCopyResult>
  onRecoveryCopyNow(handler: () => void): () => void
  sendRecoveryCopyNowDone(): void
  onRecoveryReset(handler: () => void): () => void
}

/** Export (stage 3): the renderer makes the bytes, the main process asks where and writes. */
export interface CadExportApi {
  exportFile(request: ExportFileRequest): Promise<ExportResult>
  /** the menu's File › Export items */
  onExportRequest(handler: (format: ExportFormat) => void): () => void
}

/** Copy and send (stage 4): the renderer makes the PNG, the main process and the shell do the rest. */
export interface CadSendApi {
  /** the dimension sheet as a new Hangul or Word tab */
  sendToDocument(request: SendToDocumentRequest): Promise<SendToDocumentResult>
  /** put PNG bytes on the OS clipboard; false when they are refused */
  copyImage(png: Uint8Array): Promise<boolean>
}

/**
 * The AI pane's bridge (stage 5): the mind map's AI bridge without its
 * attachments, pictures, web search and hand-over. Every call goes to a shared
 * `ai:*` or `app:*` channel; this editor registers none of them.
 */
export interface CadAiApi {
  getAiPanelPrefs(): Promise<AiPanelPrefs>
  setAiPanelPrefs(patch: Partial<AiPanelPrefs>): Promise<AiPanelPrefs>
  onAiPanelPrefsChanged(handler: (prefs: AiPanelPrefs) => void): () => void
  getAiSettings(): Promise<AiSettings>
  setAiSettings(settings: AiSettings): Promise<void>
  onAiSettingsChanged(handler: () => void): () => void
  /** shell only: switch to Home and open Settings › AI Model (rejects in standalone) */
  openAiModelSettings(): Promise<void>
  subscription: CadSubscriptionApi
  aiStream(request: AiStreamRequest): Promise<void>
  aiStreamCancel(requestId: string): Promise<void>
  onAiStream(handler: (chunk: AiStreamChunk) => void): () => void
}

/** API exposed by preload to the renderer (window.cadApi). */
export type CadApi = CadCoreApi &
  CadQueryApi &
  CadRecoveryApi &
  CadExportApi &
  CadSendApi &
  CadAiApi
