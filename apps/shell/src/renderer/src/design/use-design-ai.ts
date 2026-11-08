/**
 * Hanpan design board: the AI side, wired the way every editor's AI panel is.
 * The settings and the subscription statuses are read live, every request
 * passes the shared send gate (held while a status check runs or the
 * first-connection notice is unread, refused in front of "not connected"), and
 * a run stopped by its connection comes back as the blocked notice. Three
 * kinds of request: make a design from a description, fill the design's own
 * text boxes, and rewrite one text box. Each one is a turn in the panel's
 * thread; a turn that changed the design keeps the design before it, so it can
 * be undone from there.
 */
import { useEffect, useRef, useState } from 'react'
import type { AiSettings } from '@genoffice/ai-provider'
import {
  isSubscriptionProvider,
  type AiSubscriptionProviderId,
} from '@genoffice/ai-provider/browser'
import { useAiSendGate, type AiModelPickerBridge } from '@genoffice/ui'
import type { AskBlockedRun } from '../kb-ask-connection'
import { useSubscriptionConnection } from '../subscription-client'
import {
  MAX_BRIEF_CHARS,
  MAX_FILL_CHARS,
  applyFill,
  briefRequest,
  cleanRewrite,
  designFromBrief,
  estimateLines,
  fillRequest,
  fillSlots,
  parseBrief,
  parseFill,
  rewriteRequest,
  type DesignMood,
  type RewriteMode,
} from './ai'
import { runDesignAi, type DesignAiApi } from './ai-run'
import { FORMATS, type DesignDoc, type DesignPage } from './model'
import type { Words } from './words'

/** The settings channels every editor's model picker uses. */
export interface DesignAiSettingsApi {
  setAiSettings(settings: AiSettings): Promise<unknown>
  onAiSettingsChanged(handler: () => void): () => void
  openAiModelSettings(): Promise<unknown>
}

export type DesignAiMode = 'make' | 'fill'

export type DesignAiRequest =
  | { mode: 'make'; text: string; format: string; mood: DesignMood | 'auto' }
  | { mode: 'fill'; text: string }
  | {
      mode: 'rewrite'
      id: string
      rewrite: RewriteMode
      /** where a translation goes; null or absent for the default */
      target?: string | null
    }

export interface DesignAiTurn {
  id: number
  mode: DesignAiRequest['mode']
  /** what was asked, as the thread shows it */
  label: string
  state: 'running' | 'done' | 'failed' | 'stopped' | 'undone'
  note?: string
  error?: string
  blocked?: AskBlockedRun
  /** the design before this turn changed it: Undo puts it back */
  before?: DesignDoc
}

export function useDesignAi(args: {
  lang: string
  w: Words
  api: Partial<DesignAiApi & DesignAiSettingsApi>
  docRef: { readonly current: DesignDoc }
  /** a whole new design (a made one): a new undo step, first page */
  replaceDoc: (next: DesignDoc) => void
  /** the design put back as it was (Undo of a turn): a new undo step, the page kept */
  restoreDoc: (next: DesignDoc) => void
  /** new pages for the same design (a fill, a rewrite): one undo step */
  setPages: (pages: DesignPage[]) => void
  /** the AI panel should be in view: a prompt, a notice or a blocked run is shown there */
  showPanel: () => void
}) {
  const { lang, w, api } = args
  const argsRef = useRef(args)
  argsRef.current = args
  const available = Boolean(
    api.aiStream && api.getAiSettings && api.onAiStream && api.aiStreamCancel,
  )

  const [settings, setSettings] = useState<AiSettings | null>(null)
  const subscription = useSubscriptionConnection()
  const [busy, setBusy] = useState<DesignAiRequest['mode'] | null>(null)
  const busyRef = useRef<DesignAiRequest['mode'] | null>(null)
  const [live, setLive] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [thread, setThread] = useState<DesignAiTurn[]>([])
  const [mode, setMode] = useState<DesignAiMode>('make')
  const [draft, setDraft] = useState('')
  const [format, setFormat] = useState<string>(() => {
    const doc = args.docRef.current
    return FORMATS.find((f) => f.width === doc.width && f.height === doc.height)?.id ?? 'a4'
  })
  const [mood, setMood] = useState<DesignMood | 'auto'>('auto')
  const abortRef = useRef<AbortController | null>(null)
  const seqRef = useRef(0)
  const lastRequestRef = useRef<DesignAiRequest | null>(null)

  // the settings as stored, again whenever any window saves them
  useEffect(() => {
    if (!available) return
    const read = () =>
      void api.getAiSettings!()
        .then((next) => setSettings(next ?? null))
        .catch(() => undefined)
    read()
    const off = api.onAiSettingsChanged?.(read)
    return () => off?.()
    // mount-only: the bridge does not change
  }, [])

  // a closed window stops whatever the AI was doing
  useEffect(() => () => abortRef.current?.abort(), [])

  const today = () => {
    const d = new Date()
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
  }
  const patch = (id: number, change: Partial<DesignAiTurn>) =>
    setThread((list) => list.map((t) => (t.id === id ? { ...t, ...change } : t)))

  const run = async (request: DesignAiRequest): Promise<void> => {
    if (busyRef.current) return
    const { docRef } = argsRef.current
    const before = docRef.current
    let label: string
    let prompt: { system: string; user: string }
    let maxChars: number
    let slots: ReturnType<typeof fillSlots> = []
    const format =
      request.mode === 'make' ? (FORMATS.find((f) => f.id === request.format) ?? FORMATS[1]!) : null
    const target =
      request.mode === 'rewrite'
        ? before.pages.flatMap((pg) => pg.elements).find((e) => e.id === request.id)
        : undefined
    if (request.mode === 'make') {
      label = request.text
      prompt = briefRequest(request.text, format!, lang, today())
      maxChars = MAX_BRIEF_CHARS
    } else if (request.mode === 'fill') {
      slots = fillSlots(before)
      if (!slots.length) return setError(w.aiFillNone)
      label = request.text
      prompt = fillRequest(slots, request.text, lang, today())
      maxChars = MAX_FILL_CHARS
    } else {
      if (!target?.text?.trim()) return
      const shown = target.text.replace(/\s+/g, ' ')
      label = `${w.rewrites[request.rewrite]}: “${shown.length > 40 ? `${shown.slice(0, 40)}…` : shown}”`
      prompt = rewriteRequest(target.text, request.rewrite, lang, request.target ?? undefined)
      maxChars = Math.max(2_000, target.text.length * 6)
    }

    const id = ++seqRef.current
    const controller = new AbortController()
    abortRef.current = controller
    lastRequestRef.current = request
    busyRef.current = request.mode
    setBusy(request.mode)
    setLive('')
    setError(null)
    if (request.mode !== 'rewrite') setDraft('')
    setThread((list) => [...list, { id, mode: request.mode, label, state: 'running' }])

    const turn = await runDesignAi(api as DesignAiApi, lang, w.aiErrors, prompt, {
      signal: controller.signal,
      maxChars,
      ...(request.mode === 'rewrite' ? {} : { onProgress: setLive }),
    })
    busyRef.current = null
    setBusy(null)
    setLive('')
    const giveBack = () => {
      // the request goes back in the composer, ready to send again
      if (request.mode !== 'rewrite') setDraft((d) => d || request.text)
    }
    if (!turn.ok) {
      giveBack()
      if (turn.stopped) return patch(id, { state: 'stopped', note: w.aiStopped })
      const message = `${w.aiFailed}: ${turn.error}`
      patch(id, {
        state: 'failed',
        error: message,
        ...(turn.blocked ? { blocked: turn.blocked } : {}),
      })
      setError(message)
      if (turn.blocked) {
        // the shown status may be stale (a login that expired mid-run): look again
        const provider = turn.blocked.provider
        if (provider && isSubscriptionProvider(provider)) subscription.recheck(provider)
        argsRef.current.showPanel()
      }
      return
    }

    const now = argsRef.current.docRef.current
    if (request.mode === 'make') {
      const brief = parseBrief(turn.text)
      if (!brief) {
        giveBack()
        setError(w.aiUnreadable)
        return patch(id, { state: 'failed', error: w.aiUnreadable })
      }
      if (request.mood !== 'auto') brief.mood = request.mood
      argsRef.current.replaceDoc(designFromBrief(brief, format!.id))
      return patch(id, { state: 'done', note: w.aiMadeNote, before: now })
    }
    if (request.mode === 'fill') {
      const filled = applyFill(now, slots, parseFill(turn.text, slots.length))
      if (!filled.changed) {
        giveBack()
        return patch(id, { state: 'done', note: w.aiFillSame })
      }
      argsRef.current.setPages(filled.doc.pages)
      return patch(id, { state: 'done', note: w.aiFilledNote(filled.changed), before: now })
    }
    const text = cleanRewrite(turn.text, target!.text!)
    if (!text) {
      setError(w.aiUnreadable)
      return patch(id, { state: 'failed', error: w.aiUnreadable })
    }
    const pages = now.pages.map((pg) => ({
      ...pg,
      elements: pg.elements.map((e) => {
        if (e.id !== request.id) return e
        // a longer text keeps its size and gets the height it needs
        const size = e.fontSize ?? 48
        const lines = estimateLines(text, size, e.w, e.fontWeight ?? 400)
        return { ...e, text, h: Math.max(e.h, Math.ceil(lines * size * (e.lineHeight ?? 1.35))) }
      }),
    }))
    argsRef.current.setPages(pages)
    patch(id, { state: 'done', note: w.aiRewroteNote, before: now })
  }

  const gate = useAiSendGate<DesignAiRequest>({
    settings,
    statuses: subscription.statuses,
    store: {
      getSettings: () => api.getAiSettings!(),
      setSettings: (next) => api.setAiSettings?.(next) ?? Promise.resolve(),
    },
    start: (request) => void run(request),
    onNotConnected: () => {
      subscription.refresh()
      argsRef.current.showPanel()
    },
    onSettingsSaved: setSettings,
  })

  /** Ask for a request: it runs now, waits for the gate, or the panel says what is missing. */
  const send = (request: DesignAiRequest): void => {
    if (!available || busyRef.current) return
    if (gate.admit(request)) {
      void run(request)
      return
    }
    // held or refused: the prompt or the notice is in the panel
    argsRef.current.showPanel()
  }

  const stop = () => {
    abortRef.current?.abort()
    gate.reset()
  }

  /** The newest turn that changed the design, while none is running: the one Undo takes back. */
  const latest = [...thread]
    .reverse()
    .find((t) => t.state === 'running' || (t.state === 'done' && t.before))
  const undoableId = latest?.state === 'done' ? latest.id : null
  const undo = (id: number) => {
    const turn = thread.find((t) => t.id === id)
    if (!turn?.before || busyRef.current || undoableId !== id) return
    argsRef.current.restoreDoc(turn.before)
    patch(id, { state: 'undone', note: w.aiUndoneNote })
  }

  const continueWith = (provider: AiSubscriptionProviderId) =>
    gate.continueWith(provider, () => {
      const last = lastRequestRef.current
      if (last) send(last)
    })

  const modelBridge: AiModelPickerBridge = {
    getSettings: async () => (await api.getAiSettings!()) ?? ({} as AiSettings),
    setSettings: async (next) => {
      await api.setAiSettings?.(next)
    },
    onSettingsChanged: (handler) => api.onAiSettingsChanged?.(handler) ?? (() => undefined),
    openModelSettings: () => void api.openAiModelSettings?.().catch(() => undefined),
  }

  return {
    available,
    settings: gate.settings,
    subscription,
    gate,
    busy,
    live,
    error,
    thread,
    undoableId,
    mode,
    setMode,
    draft,
    setDraft,
    format,
    setFormat,
    mood,
    setMood,
    send,
    stop,
    undo,
    continueWith,
    modelBridge,
  }
}

export type DesignAi = ReturnType<typeof useDesignAi>
