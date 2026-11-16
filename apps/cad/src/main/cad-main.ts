/**
 * The AI Drawing editor's main process: one view per tab, the files each view
 * may read and write, saving, the close prompt and recovery copies. The shell
 * bundles this file and calls the functions below; it is the same contract as
 * the mind map editor's main module.
 *
 * Stage 2 task 1 fixes the names; task 2 gives them their bodies.
 */
import type { BrowserWindow, WebContents, WebContentsView } from 'electron'
import type {
  RecoveryIdentity,
  RecoveryOpenFileRequest,
  RecoveryOpenUntitledRequest,
} from '@genoffice/electron-utils'
import type { CadMenuCommand, SaveMode } from '../shared/ipc'

export interface CadRuntimePaths {
  preloadPath: string
  rendererUrl?: string
  rendererFile?: string
}

function notYet(): never {
  throw new Error('not implemented')
}

/** How long a "Don't Save" keeps the view's recovery copy from coming back. */
export const CAD_DONT_SAVE_HOLD_MS = 5_000

export function configureCadRuntime(_paths: CadRuntimePaths): void {
  notYet()
}

export function setCadFileSavedHook(_hook: (wc: WebContents, path: string) => void): void {
  notYet()
}

export function setCadRecoveryTitleHook(
  _hook: ((wc: WebContents) => string | null | undefined) | null,
): void {
  notYet()
}

export function cadIsDirty(_webContentsId: number): boolean {
  return notYet()
}

export function cadFilePath(_webContentsId: number): string | undefined {
  return notYet()
}

export function cadFileRenamed(_contents: WebContents, _oldPath: string, _newPath: string): void {
  notYet()
}

export function requestCadClose(
  _contents: WebContents,
  _parent?: BrowserWindow | null,
): Promise<boolean> {
  return notYet()
}

export function requestCadSave(_contents: WebContents, _mode: SaveMode): Promise<boolean> {
  return notYet()
}

export function cadSaveToPath(_contents: WebContents, _filePath: string): Promise<void> {
  return notYet()
}

export function discardCadRecovery(_contents: WebContents): void {
  notYet()
}

export function cadRecoveryIdentity(_webContentsId: number): RecoveryIdentity | null {
  return notYet()
}

export function writeCadCopiesNow(_timeoutMs?: number): Promise<void> {
  return notYet()
}

export function openCadFileWithDecision(
  _contents: WebContents,
  _request: RecoveryOpenFileRequest,
): void {
  notYet()
}

export function openCadUntitledCopy(
  _contents: WebContents,
  _request: RecoveryOpenUntitledRequest,
): void {
  notYet()
}

export function sendCadMenuCommand(_contents: WebContents, _command: CadMenuCommand): void {
  notYet()
}

export function cadReadSummary(_contents: WebContents): Promise<string> {
  return notYet()
}

export function cadReadBytes(_contents: WebContents): Promise<Uint8Array> {
  return notYet()
}

export function createCadView(_openPath?: string | null): WebContentsView {
  return notYet()
}

export function startCadStandalone(): void {
  notYet()
}
