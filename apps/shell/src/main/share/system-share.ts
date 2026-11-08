/**
 * 공유하기: the operating system's share sheet with the tab's file attached (decision 0095).
 *
 * - Windows: the helper win-share.exe (C#, built by build-win.mjs) opens the system Share UI.
 *   DataTransferManager only takes a window of its own process, so the helper anchors the sheet
 *   to an invisible window of its own laid over the app window whose handle it is given.
 * - macOS: Electron's ShareMenu (the shell wires it; see index.ts).
 * - Linux has no system share sheet: the entries are off.
 *
 * What is shared is the file on disk. A tab with unsaved changes (or no file yet) is saved first,
 * after the person agrees; the sheet opens once the tab reports itself saved.
 *
 * No Electron import, so the flow is tested with the native parts injected
 * (tests/system-share.test.ts).
 */
import type { Readable, Writable } from 'node:stream'
import type { TabKind } from '../../shared/tabs-api'

export type ShareAnswer = { ok: true } | { ok: false; message: string }

/** Whether the share entries are on for a tab of this kind on this system. */
export function canShareTab(platform: NodeJS.Platform, kind: TabKind): boolean {
  if (platform !== 'win32' && platform !== 'darwin') return false
  return kind !== 'home' && kind !== 'help'
}

/** BrowserWindow.getNativeWindowHandle() (an HWND in a buffer) as the helper's decimal argument. */
export function windowHandleArg(handle: Buffer): string {
  return handle.length >= 8 ? handle.readBigUInt64LE(0).toString() : String(handle.readUInt32LE(0))
}

/** The part of a ChildProcess the helper wrapper uses. */
export interface ShareHelperProcess {
  stdout: Readable | null
  stdin: Writable | null
  kill(): boolean
  on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this
  on(event: 'error', listener: (error: Error) => void): this
}

export interface WindowsShareDeps {
  /** the helper's path, or null when this build has none */
  helperPath(): string | null
  spawn(command: string, args: string[]): ShareHelperProcess
}

/**
 * Open the Windows share sheet for `files`, anchored over the window `ownerHwnd`. Answers once the
 * sheet is up (or failed). The helper stays alive while the sheet is open, so the chosen app can
 * still read the files; sharing again ends the previous helper, and so does the app quitting
 * (its stdin closes).
 */
export function createWindowsShare(
  deps: WindowsShareDeps,
): (ownerHwnd: string, files: string[]) => Promise<ShareAnswer> {
  let current: ShareHelperProcess | null = null
  return (ownerHwnd, files) =>
    new Promise<ShareAnswer>((resolve) => {
      const helperPath = deps.helperPath()
      if (!helperPath) {
        resolve({ ok: false, message: 'win-share.exe is missing from this build' })
        return
      }
      if (current) current.kill()
      let answered = false
      const answer = (value: ShareAnswer): void => {
        if (answered) return
        answered = true
        resolve(value)
      }
      const helper = deps.spawn(helperPath, [ownerHwnd, ...files])
      current = helper
      helper.on('error', (error) => answer({ ok: false, message: error.message }))
      helper.on('exit', (code) => {
        if (current === helper) current = null
        answer({ ok: false, message: `win-share.exe exited (${code ?? 'signal'})` })
      })
      let buffered = ''
      helper.stdout?.setEncoding('utf8')
      helper.stdout?.on('data', (chunk: string) => {
        buffered += chunk
        let newline = buffered.indexOf('\n')
        while (newline >= 0) {
          const line = buffered.slice(0, newline).trim()
          buffered = buffered.slice(newline + 1)
          newline = buffered.indexOf('\n')
          if (!line) continue
          let message: { type?: string; message?: string }
          try {
            message = JSON.parse(line) as typeof message
          } catch {
            continue
          }
          if (message.type === 'shown') answer({ ok: true })
          else if (message.type === 'error')
            answer({ ok: false, message: message.message ?? 'share failed' })
        }
      })
    })
}

export interface ShareTabDocument {
  kind: TabKind
  filePath?: string
  dirty: boolean
}

export interface ShareTabDeps {
  platform: NodeJS.Platform
  /** the tab as it is now; undefined once it is closed */
  document(id: string): Promise<ShareTabDocument | undefined>
  fileExists(path: string): boolean
  /** ask before saving; `untitled` means the save asks where */
  confirmSave(untitled: boolean): Promise<boolean>
  /** run the tab's own Save (Save As for an untitled one) */
  save(id: string): void
  share(files: string[]): Promise<ShareAnswer>
  reportFailure(kind: 'missing' | 'failed', detail: string): void
  /** how often to look whether the save finished, and for how long */
  waitMs?: number
  timeoutMs?: number
}

export type ShareTabResult = 'shared' | 'canceled' | 'failed' | 'unsupported'

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

/** Share one tab's file, saving it first when it has unsaved changes or no file yet. */
export async function shareTab(deps: ShareTabDeps, id: string): Promise<ShareTabResult> {
  let doc = await deps.document(id)
  if (!doc || !canShareTab(deps.platform, doc.kind)) return 'unsupported'

  if (!doc.filePath || doc.dirty) {
    if (!(await deps.confirmSave(!doc.filePath))) return 'canceled'
    deps.save(id)
    // the editors save asynchronously (and an untitled one asks where first): watch the tab
    // until it has a file and no unsaved changes; a cancelled save dialog never gets there
    const waitMs = deps.waitMs ?? 300
    const deadline = Date.now() + (deps.timeoutMs ?? 2 * 60_000)
    for (;;) {
      await sleep(waitMs)
      doc = await deps.document(id)
      if (!doc) return 'canceled'
      if (doc.filePath && !doc.dirty) break
      if (Date.now() > deadline) return 'canceled'
    }
  }

  const file = doc.filePath!
  if (!deps.fileExists(file)) {
    deps.reportFailure('missing', file)
    return 'failed'
  }
  const answer = await deps.share([file])
  if (answer.ok) return 'shared'
  deps.reportFailure('failed', answer.message)
  return 'failed'
}
