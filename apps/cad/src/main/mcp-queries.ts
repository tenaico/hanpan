/**
 * Questions the in-app MCP server asks an open drawing: its model summary and
 * the bytes a save would write, unsaved edits included. Nothing here writes a
 * file; saving goes through `cadSaveToPath` in the main module.
 *
 * The renderer answers on `summaryResult` / `bytesResult`. It stays silent
 * while the drawing is still loading, and its listener registers while mounting,
 * so a request can go unanswered: it is sent again until an answer comes or
 * the time runs out. A renderer that cannot answer sends an error.
 */
import { ipcMain } from 'electron'
import type { WebContents } from 'electron'
import { CAD_CHANNELS } from '../shared/ipc'

/** How long a read waits for the renderer before giving up. */
const READ_TIMEOUT_MS = 30_000
/** How often an unanswered request is sent again. */
const RESEND_MS = 250

type Answer<T> = { value: T } | { error: string }

interface Question<T> {
  request: string
  result: string
  /** what the renderer sent, checked; null when it is not an answer at all */
  parse: (reply: unknown) => Answer<T> | null
  waiters: Map<number, (answer: Answer<T>) => void>
  /** one question per view at a time: concurrent callers share the promise */
  inFlight: Map<number, Promise<T>>
  registered: boolean
}

function errorOf(reply: object): Answer<never> | null {
  return 'error' in reply ? { error: String((reply as { error: unknown }).error) } : null
}

const summary: Question<string> = {
  request: CAD_CHANNELS.summaryRequest,
  result: CAD_CHANNELS.summaryResult,
  parse: (reply) => {
    if (!reply || typeof reply !== 'object') return null
    if ('text' in reply && typeof (reply as { text: unknown }).text === 'string') {
      return { value: (reply as { text: string }).text }
    }
    return errorOf(reply)
  },
  waiters: new Map(),
  inFlight: new Map(),
  registered: false,
}

const bytes: Question<Uint8Array> = {
  request: CAD_CHANNELS.bytesRequest,
  result: CAD_CHANNELS.bytesResult,
  parse: (reply) => {
    if (!reply || typeof reply !== 'object') return null
    if ('bytes' in reply) {
      const raw = (reply as { bytes: unknown }).bytes
      if (raw instanceof ArrayBuffer) return { value: new Uint8Array(raw) }
      if (ArrayBuffer.isView(raw)) {
        return { value: new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength) }
      }
      return { error: 'the drawing sent no bytes' }
    }
    return errorOf(reply)
  },
  waiters: new Map(),
  inFlight: new Map(),
  registered: false,
}

function listen<T>(question: Question<T>): void {
  if (question.registered) return
  question.registered = true
  ipcMain.on(question.result, (e, reply: unknown) => {
    const waiter = question.waiters.get(e.sender.id)
    if (!waiter) return
    const answer = question.parse(reply)
    if (!answer) return
    waiter(answer)
  })
}

function ask<T>(question: Question<T>, contents: WebContents): Promise<T> {
  if (contents.isDestroyed()) return Promise.reject(new Error('the drawing is no longer open'))
  listen(question)
  const wcId = contents.id
  const pending = question.inFlight.get(wcId)
  if (pending) return pending
  const asked = new Promise<T>((resolve, reject) => {
    let settled = false
    const settle = (finish: () => void): void => {
      if (settled) return
      settled = true
      clearInterval(resend)
      clearTimeout(timer)
      question.waiters.delete(wcId)
      question.inFlight.delete(wcId)
      finish()
    }
    const resend = setInterval(() => {
      if (contents.isDestroyed()) {
        settle(() => reject(new Error('the drawing is no longer open')))
        return
      }
      contents.send(question.request)
    }, RESEND_MS)
    const timer = setTimeout(
      () => settle(() => reject(new Error('timed out reading the drawing'))),
      READ_TIMEOUT_MS,
    )
    question.waiters.set(wcId, (answer) => {
      settle(() => {
        if ('value' in answer) resolve(answer.value)
        else reject(new Error(answer.error))
      })
    })
    contents.send(question.request)
  })
  question.inFlight.set(wcId, asked)
  return asked
}

/** The drawing as summary text (parts, kinds and sizes), unsaved edits included. */
export function cadReadSummary(contents: WebContents): Promise<string> {
  return ask(summary, contents)
}

/** The drawing as the `.ttukcad` bytes a save would write, unsaved edits included. Nothing is written. */
export function cadReadBytes(contents: WebContents): Promise<Uint8Array> {
  return ask(bytes, contents)
}
