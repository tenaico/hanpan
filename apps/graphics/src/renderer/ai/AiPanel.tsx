/**
 * The AI panel of the AI Photo and AI Illustration tabs (design 6-4). The same
 * shared parts and rules as the other editors' panels (the send gate, the
 * connect prompt, the first-connection notice, the blocked-run notice, the
 * shared run-error wording, the model picker, the message queue), built on
 * the epub panel with what a picture tab has no use for left out: no
 * attachments, no web search, no Drive files, no person's skills, no saved
 * conversation.
 *
 * A run works through the app's own commands (`graphics-skill.ts`). The
 * person's input to the app is locked while it runs, so the app's undo
 * history grows by the run's edits only; the reply then carries one [Undo]
 * that takes all of them back (`undo-tracker.ts`).
 */
import {
  AiBlockedNotice,
  AiComposer,
  AiConnectPrompt,
  AiFirstConnectionNotice,
  AiInputTruncatedNotice,
  AiMark,
  AiModelPicker,
  AiQueueStrip,
  AI_QUEUE_LABELS,
  AiSubscriptionUsageLine,
  AiToolsUnsupportedNotice,
  AiTypingIndicator,
  AiUsageChip,
  addTokenUsage,
  aiSubscriptionText,
  Markdown,
  useAiSendGate,
  useChatRunQueue,
  type AiModelPickerBridge,
  type AiTokenUsageView,
} from '@genoffice/ui'
import { useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { AgentLoop, composeWithDrive } from '@genoffice/agent-core'
import type { AgentTransport, IpcStreamError } from '@genoffice/agent-core'
import type {
  AiSettings,
  AiSubscriptionProviderId,
  AiSubscriptionUsage,
} from '@genoffice/ai-provider'
import { localModelCapabilities, settingsSupportVision } from '@genoffice/ai-provider/browser'
import type { GraphicsAdapter } from '../adapters'
import type { GraphicsKind } from '../../shared/kinds'
import { t as tGlobal, useI18n, type StringKey } from '../i18n/locale'
import { aiLangDirective } from './lang-directive'
import { blockedRunFor, mergeSubscriptionUsage, type BlockedRun } from './connection'
import { createGraphicsSkill, type GraphicsSkill } from './graphics-skill'
import { canvasShot } from './snapshot'
import { useSubscriptionConnection } from './subscription-client'
import { createElectronTransport } from './transport'
import { createUndoTracker, undoRun, type RunUndo, type UndoTracker } from './undo-tracker'
import sendEnterOn from './assets/send-enter-on.png'
import sendEnterOff from './assets/send-enter-off.png'
import sendStop from './assets/send-stop.png'
import { graphicsApi, graphicsApiOrNull } from '../bridge'

const TOOL_OUTPUT_MAX_CHARS = 2000

/** tool name → the words its step row shows */
const TOOL_LABELS: Record<string, StringKey> = {
  find_commands: 'aiToolFind',
  describe_command: 'aiToolDescribe',
  run_command: 'aiToolRun',
  run_commands: 'aiToolRunMany',
  inspect_document: 'aiToolInspect',
  export_file: 'aiToolExport',
  load_guide: 'aiToolGuide',
}

function toolLabel(name: string, summary: string): string {
  const key = TOOL_LABELS[name]
  const words = key ? tGlobal(key) : name.replace(/[_-]+/g, ' ')
  return summary ? `${words} · ${summary}` : words
}

const MODEL_BRIDGE: AiModelPickerBridge = {
  getSettings: () =>
    graphicsApiOrNull()?.getAiSettings?.() ??
    Promise.reject(new Error('the AI settings cannot be read')),
  setSettings: (settings) =>
    graphicsApiOrNull()?.setAiSettings?.(settings) ??
    Promise.reject(new Error('the AI settings cannot be saved')),
  onSettingsChanged: (handler) => graphicsApiOrNull()?.onAiSettingsChanged?.(handler) ?? (() => {}),
  openModelSettings: () =>
    graphicsApiOrNull()
      ?.openAiModelSettings?.()
      .catch(() => {}) ?? Promise.resolve(),
}

interface ToolActivity {
  name: string
  summary: string
  running?: boolean
  isError?: boolean
  output?: string
}

type UndoState = 'undone' | 'changed-since' | 'failed'

interface ChatEntry {
  role: 'user' | 'assistant'
  text: string
  streaming?: boolean
  isError?: boolean
  blocked?: BlockedRun
  undelivered?: boolean
  tools?: ToolActivity[]
  usage?: AiTokenUsageView
  /** what the run changed, for its one [Undo]; absent when it changed nothing */
  undo?: RunUndo
  undoState?: UndoState
}

export interface GraphicsAiPanelProps {
  kind: GraphicsKind
  /** the app's adapter; null until the app is up (sending waits for it) */
  adapter: GraphicsAdapter | null
  /** locks the person's input to the app; returns the unlock */
  lockFrame: () => () => void
  /** a run started or ended (the capture watch ignores the app while one runs) */
  onBusyChange: (busy: boolean) => void
  onCollapse: () => void
  /** a quick action holds the app: a request waits in the queue until it lets go */
  appHeld?: boolean
  /** tests only: the transport in place of the preload's stream */
  transport?: AgentTransport
}

export function GraphicsAiPanel(props: GraphicsAiPanelProps): ReactElement {
  const { kind, adapter, onCollapse } = props
  const { lang, t } = useI18n()
  const [chat, setChat] = useState<ChatEntry[]>([])
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const subscription = useSubscriptionConnection()
  const statusesRef = useRef(subscription.statuses)
  statusesRef.current = subscription.statuses
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null)
  useEffect(() => {
    let alive = true
    const refresh = () => {
      const read = graphicsApiOrNull()?.getAiSettings?.()
      if (!read) return
      read
        .then((next) => {
          if (alive) setAiSettings(next)
        })
        .catch(() => {
          /* no settings bridge: the gate keeps waiting for the settings */
        })
    }
    refresh()
    const off = graphicsApiOrNull()?.onAiSettingsChanged?.(refresh)
    window.addEventListener('focus', refresh)
    return () => {
      alive = false
      off?.()
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const sendGate = useAiSendGate<{ text: string }>({
    settings: aiSettings,
    statuses: subscription.statuses,
    store: MODEL_BRIDGE,
    start: (held) => {
      send(held.text)
    },
    onSettingsSaved: setAiSettings,
  })
  const sendGateRef = useRef(sendGate)
  sendGateRef.current = sendGate
  const [subscriptionUsage, setSubscriptionUsage] = useState<AiSubscriptionUsage[]>([])
  const [inputTruncated, setInputTruncated] = useState(false)
  const lastStreamErrorRef = useRef<IpcStreamError | null>(null)
  const msgQueue = useChatRunQueue<Record<string, never>>({
    busy: busy || props.appHeld === true,
    submit: (text) => {
      const loop = loopRef.current
      if (!loop || loop.busy) return false
      if (!sendGateRef.current.admitQueued(() => msgQueueRef.current.setPaused(true))) return false
      return send(text)
    },
  })
  const msgQueueRef = useRef(msgQueue)
  msgQueueRef.current = msgQueue
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottomRef = useRef(true)
  const sendSeqRef = useRef(0)
  const mountedRef = useRef(true)
  const settingsRef = useRef<AiSettings | null>(null)
  const langRef = useRef(lang)
  langRef.current = lang
  const adapterRef = useRef(adapter)
  adapterRef.current = adapter
  const propsRef = useRef(props)
  propsRef.current = props
  const runInstructionRef = useRef('')
  const runToolsRef = useRef<ToolActivity[]>([])
  const runUsageRef = useRef<AiTokenUsageView | undefined>(undefined)
  const [sessionUsage, setSessionUsage] = useState<AiTokenUsageView | undefined>(undefined)
  /** the document summary taken before the run: the skill's context for every turn of it */
  const contextRef = useRef('')
  /** the run in flight: its unlock, ended once */
  const runRef = useRef<{ unlock: () => void } | null>(null)

  const patchLast = (patch: Partial<ChatEntry> | ((last: ChatEntry) => Partial<ChatEntry>)) => {
    setChat((prev) => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (!last || last.role !== 'assistant') return prev
      next[next.length - 1] = { ...last, ...(typeof patch === 'function' ? patch(last) : patch) }
      return next
    })
  }

  // The undo tracker and the loop are built once per adapter; values that change go through refs
  const trackerRef = useRef<UndoTracker | null>(null)
  const trackerFor = useRef<GraphicsAdapter | null>(null)
  if (adapter && trackerFor.current !== adapter) {
    trackerFor.current = adapter
    trackerRef.current = createUndoTracker(adapter)
  }

  /** The run ended (done, stopped or failed): the reply gets its [Undo], the app its input back. */
  const endRun = (): void => {
    const run = runRef.current
    if (!run) return
    runRef.current = null
    void (async () => {
      // a Stop ends the run while a command may still be changing the picture:
      // count the steps and give the input back once it has finished
      await graphicsSkillRef.current?.settled()
      const undo = await trackerRef.current?.finish().catch(() => null)
      if (undo && mountedRef.current) patchLast({ undo })
      run.unlock()
      propsRef.current.onBusyChange(false)
      if (mountedRef.current) setBusy(false)
    })()
  }

  const graphicsSkillRef = useRef<GraphicsSkill | null>(null)
  if (!graphicsSkillRef.current) {
    graphicsSkillRef.current = createGraphicsSkill({
      kind,
      get adapter() {
        return adapterRef.current!
      },
      get tracker() {
        return trackerRef.current!
      },
      context: () => contextRef.current,
      exportFile: (request) => graphicsApi().exportFile(request),
    })
  }

  const transportRef = useRef<AgentTransport | null>(null)
  if (!transportRef.current) {
    transportRef.current =
      props.transport ??
      createElectronTransport(() => settingsRef.current!, {
        getLang: () => langRef.current,
        onStreamError: (error) => {
          lastStreamErrorRef.current = error
        },
        onSubscriptionUsage: (usage) =>
          setSubscriptionUsage((prev) => mergeSubscriptionUsage(prev, usage)),
        onInputTruncated: () => setInputTruncated(true),
      })
  }

  const loopRef = useRef<AgentLoop | null>(null)
  if (!loopRef.current) {
    loopRef.current = new AgentLoop({
      transport: transportRef.current,
      // a local model that reported no tool support answers in text only
      toolsAllowed: () =>
        settingsRef.current ? localModelCapabilities(settingsRef.current).tools !== false : true,
      skill: composeWithDrive('graphics', '', () => loopRef.current?.messages ?? [], [
        graphicsSkillRef.current,
      ]),
      systemSuffix: () => aiLangDirective(langRef.current),
      events: {
        onText: (text) => patchLast({ text }),
        onToolStart: (call) => {
          patchLast((last) => ({
            tools: [
              ...(last.tools ?? []),
              { name: call.name, summary: toolLabel(call.name, ''), running: true },
            ],
          }))
        },
        onToolExecuted: ({ call, execution }) => {
          const activity: ToolActivity = {
            name: call.name,
            summary: toolLabel(call.name, execution.summary),
            isError: execution.isError,
            output: execution.output?.slice(0, TOOL_OUTPUT_MAX_CHARS),
          }
          runToolsRef.current.push(activity)
          patchLast((last) => {
            const tools = [...(last.tools ?? [])]
            if (tools.at(-1)?.running) tools.pop()
            return { tools: [...tools, activity] }
          })
        },
        onTurnEnd: () => {
          patchLast({ streaming: false })
          setChat((prev) => [...prev, { role: 'assistant', text: '', streaming: true }])
        },
        onUsage: (usage) => {
          runUsageRef.current = addTokenUsage(runUsageRef.current, usage)
          setSessionUsage((prev) => addTokenUsage(prev, usage))
          patchLast({ usage: runUsageRef.current })
        },
        onDone: ({ text, cancelled, turnLimit, truncated }) => {
          const base = turnLimit
            ? [text, tGlobal('aiTurnLimit')].filter(Boolean).join('\n\n')
            : text || (cancelled ? tGlobal('aiStopped') : '')
          const final = truncated
            ? [base, tGlobal('aiTruncatedNote')].filter(Boolean).join('\n\n')
            : base
          patchLast((last) => ({
            streaming: false,
            text: final || (last.tools?.length ? last.text : tGlobal('aiNoReply')),
            tools: last.tools?.filter((tl) => !tl.running),
          }))
          endRun()
        },
        onError: (error) => {
          const blocked = blockedRunFor(error, lastStreamErrorRef.current)
          if (blocked) msgQueueRef.current.hold()
          const undelivered = runToolsRef.current.length === 0
          setChat((prev) => {
            const next = [...prev]
            for (let i = undelivered ? next.length - 1 : -1; i >= 0; i--) {
              const entry = next[i]!
              if (entry.role === 'user') {
                next[i] = { ...entry, undelivered: true }
                break
              }
            }
            const last = next.at(-1)
            if (last?.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                streaming: false,
                text: error,
                isError: true,
                ...(blocked ? { blocked } : {}),
                tools: last.tools?.filter((tl) => !tl.running),
              }
            }
            return next
          })
          endRun()
        },
      },
    })
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      loopRef.current?.cancel()
      // a panel that goes away mid-run hands the app its input back
      const run = runRef.current
      runRef.current = null
      if (run) {
        run.unlock()
        propsRef.current.onBusyChange(false)
      }
    }
  }, [])

  useEffect(() => {
    if (stickToBottomRef.current) chatRef.current?.scrollTo?.({ top: chatRef.current.scrollHeight })
  }, [chat, busy])

  const onChatScroll = (): void => {
    const el = chatRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
  }

  /** false when nothing was started (empty text, no app yet, a run already active, or the gate held or refused it) */
  const send = (text: string): boolean => {
    const instruction = text.trim()
    const loop = loopRef.current
    const app = adapterRef.current
    if (!instruction || !loop || loop.busy || runRef.current || !app) return false
    if (propsRef.current.appHeld) {
      // the app is a quick action's until it ends: the request waits its turn
      msgQueue.enqueue(instruction, {})
      setPrompt('')
      return true
    }
    if (!sendGate.admit({ text: instruction })) return false
    lastStreamErrorRef.current = null
    setInputTruncated(false)
    stickToBottomRef.current = true
    runInstructionRef.current = instruction
    runToolsRef.current = []
    runUsageRef.current = undefined
    setChat((prev) => [
      ...prev,
      { role: 'user', text: instruction },
      { role: 'assistant', text: '', streaming: true },
    ])
    setPrompt('')
    setBusy(true)
    const seq = ++sendSeqRef.current
    void (async () => {
      try {
        const settings = await graphicsApi().getAiSettings()
        if (!settings) throw new Error(tGlobal('aiUnknownError'))
        settingsRef.current = settings
        contextRef.current = await app.contextSummary().catch(() => '')
        const shot = await canvasShot(app, settingsSupportVision(settings, statusesRef.current))
        if (!mountedRef.current || seq !== sendSeqRef.current) return
        runRef.current = { unlock: propsRef.current.lockFrame() }
        propsRef.current.onBusyChange(true)
        loop.run(`${instruction}\n\n${shot.note}`, shot.images)
      } catch (err) {
        if (!mountedRef.current || seq !== sendSeqRef.current) return
        patchLast({
          streaming: false,
          text: err instanceof Error ? err.message : String(err),
          isError: true,
        })
        if (runRef.current) endRun()
        else setBusy(false)
      }
    })()
    return true
  }

  /** a send whose reads before the run are still going: dropping it marks the message undelivered */
  const cancelPendingSend = (): void => {
    sendSeqRef.current++
    setChat((prev) => {
      const last = prev.at(-1)
      if (!last || last.role !== 'assistant' || !last.streaming || last.text) return prev
      const rest = prev.slice(0, -1)
      const user = rest.at(-1)
      if (user?.role === 'user') rest[rest.length - 1] = { ...user, undelivered: true }
      return rest
    })
    setBusy(false)
  }

  const stop = (): void => {
    msgQueue.hold()
    const loop = loopRef.current
    if (loop?.busy) loop.cancel()
    else cancelPendingSend()
  }

  const enqueueDraft = () => {
    const text = prompt.trim()
    if (!text) return
    msgQueue.enqueue(text, {})
    setPrompt('')
  }

  const retry = (): void => {
    send(runInstructionRef.current)
  }

  const continueWith = (provider: AiSubscriptionProviderId): void => {
    const last = [...chat].reverse().find((entry) => entry.role === 'user')
    sendGate.continueWith(provider, () => {
      if (last) send(last.text)
      else retry()
    })
  }

  /** [Undo] on a reply: every step of that run, while nothing has changed since */
  const undoEntry = async (index: number): Promise<void> => {
    const entry = chat[index]
    const app = adapterRef.current
    if (!entry?.undo || !app || busy) return
    const outcome = await undoRun(app, entry.undo).catch(() => 'failed' as const)
    if (!mountedRef.current) return
    setChat((prev) => prev.map((e, i) => (i === index ? { ...e, undoState: outcome } : e)))
  }

  const copyMessage = (text: string, idx: number): void => {
    void navigator.clipboard?.writeText(text)
    setCopiedIdx(idx)
    window.setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1200)
  }

  const example = kind === 'photo' ? t('aiEmptyPhoto') : t('aiEmptyIllust')

  return (
    <aside
      className="copilot"
      style={{ width: '100%' }}
      dir={lang === 'ar' || lang === 'he' ? 'rtl' : undefined}
    >
      <header className="ai-panel-header">
        <span className="ai-panel-title">
          <AiMark size={22} />
          {aiSubscriptionText(lang, 'aiAssistant')}
        </span>
        <div className="ai-panel-header-actions">
          {chat.length > 0 && (
            <button
              type="button"
              className="ai-header-btn"
              disabled={busy}
              onClick={() => {
                msgQueue.clear()
                sendGate.reset()
                loopRef.current?.reset()
                setChat([])
              }}
              data-tip={t('aiNewChat')}
              aria-label={t('aiNewChat')}
            >
              <IconNewChat />
            </button>
          )}
          <button
            type="button"
            className="ai-header-btn ai-panel-collapse"
            onClick={onCollapse}
            data-tip={t('aiCollapsePanel')}
            aria-label={t('aiCollapsePanel')}
          >
            <IconCollapse />
          </button>
        </div>
      </header>

      <div className="ai-chat" ref={chatRef} onScroll={onChatScroll}>
        {chat.length === 0 && (
          <div className="ai-chat-empty">
            <div className="ai-chat-empty-title">{t('aiEmptyTitle')}</div>
            <div className="ai-chat-empty-body">{t('aiEmptyBody')}</div>
            <div className="ai-chat-empty-body gx-ai-example">{example}</div>
          </div>
        )}
        {chat.map((entry, i) => {
          if (entry.role === 'user') {
            return (
              <div key={i} className="ai-msg ai-msg-user">
                <span dir="auto">{entry.text}</span>
                {entry.undelivered && (
                  <div className="ai-msg-undelivered">
                    {t('aiUndelivered')}
                    {!busy && (
                      <button
                        type="button"
                        className="ai-retry-btn"
                        onClick={() => send(entry.text)}
                      >
                        {t('aiRetry')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          }
          const hasTools = (entry.tools?.length ?? 0) > 0
          if (!entry.text && !entry.streaming && !hasTools && !entry.undo) return null
          const isLast = i === chat.length - 1
          const nextEntry = chat[i + 1]
          const turnEnded = nextEntry ? nextEntry.role === 'user' : !busy
          const showToolbar = !entry.streaming && turnEnded && !!entry.text && !entry.isError
          return (
            <div
              key={i}
              className={`ai-msg ai-msg-assistant${entry.isError ? ' ai-msg-error' : ''}${entry.streaming ? ' ai-msg-streaming' : ''}`}
            >
              {!entry.text && entry.streaming ? (
                <span className="ai-typing-row">
                  <AiTypingIndicator label={hasTools ? t('aiWorking') : t('aiThinking')} />
                </span>
              ) : entry.blocked ? (
                <AiBlockedNotice
                  kind={entry.blocked.kind}
                  provider={entry.blocked.provider}
                  resetsAt={entry.blocked.resetsAt}
                  message={entry.text}
                  settings={aiSettings ?? {}}
                  statuses={isLast && !busy ? subscription.statuses : {}}
                  lang={lang}
                  onContinueWith={continueWith}
                />
              ) : (
                entry.text && (
                  <div dir="auto">
                    <Markdown text={entry.text} />
                  </div>
                )
              )}
              {hasTools && <ToolChipList tools={entry.tools!} />}
              {entry.usage && (
                <div className="ai-message-usage">
                  <AiUsageChip usage={entry.usage} lang={lang} />
                </div>
              )}
              {entry.undo && <UndoRow entry={entry} busy={busy} onUndo={() => void undoEntry(i)} />}
              {showToolbar && (
                <div className="ai-msg-toolbar">
                  <button
                    type="button"
                    className="ai-msg-tool-btn"
                    onClick={() => copyMessage(entry.text, i)}
                    aria-label={t('aiCopyReplyTitle')}
                    data-tip={t('aiCopyReplyTitle')}
                  >
                    {copiedIdx === i ? <IconCheck /> : <IconCopy />}
                  </button>
                  {isLast && !busy && runInstructionRef.current && (
                    <button
                      type="button"
                      className="ai-msg-tool-btn"
                      onClick={retry}
                      aria-label={t('aiRegenerateTitle')}
                      data-tip={t('aiRegenerateTitle')}
                    >
                      <IconRegenerate />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(sendGate.connectChoice || sendGate.noticeDue) && (
        <div className="ai-composer">
          {sendGate.connectChoice ? (
            <AiConnectPrompt
              choice={sendGate.connectChoice}
              statuses={subscription.statuses}
              lang={lang}
              disabled={subscription.busy}
              attention={sendGate.connectAttention}
              onOpenSettings={() => void MODEL_BRIDGE.openModelSettings?.()}
              onInstall={subscription.install}
              onUpdate={subscription.update}
              onCancelLogin={subscription.cancelLogin}
              onLogin={subscription.login}
              onRecheck={subscription.recheck}
              onAcceptMetered={subscription.acceptMetered}
              onOpenInstallHelp={subscription.openInstallHelp}
            />
          ) : (
            <AiFirstConnectionNotice
              lang={lang}
              codexKeepsHistory
              onAcknowledge={sendGate.acknowledgeNotice}
            />
          )}
        </div>
      )}
      <div className="ai-composer">
        {busy && (
          <div className="gx-ai-busy-notice" role="status">
            {t('aiBusyNotice')}
          </div>
        )}
        {inputTruncated && (
          <AiInputTruncatedNotice lang={lang} onDismiss={() => setInputTruncated(false)} />
        )}
        {aiSettings !== null && localModelCapabilities(aiSettings).tools === false && (
          <AiToolsUnsupportedNotice lang={lang} />
        )}
        <AiComposer
          queueStrip={
            <AiQueueStrip
              items={msgQueue.queued}
              labels={AI_QUEUE_LABELS[lang]}
              onUpdate={msgQueue.update}
              onRemove={msgQueue.remove}
              onClear={msgQueue.clear}
              paused={msgQueue.paused}
              onTogglePause={msgQueue.togglePaused}
              onMove={msgQueue.move}
            />
          }
          onQueue={enqueueDraft}
          queuePlaceholder={AI_QUEUE_LABELS[lang].queuePlaceholder}
          value={prompt}
          busy={busy}
          placeholder={t('aiComposerPlaceholder')}
          hintIdle={t('aiHintIdle')}
          hintBusy={t('aiHintBusy')}
          sendLabel={t('aiSend')}
          stopLabel={t('aiStop')}
          iconOnly
          sendIconEnabled={<img src={sendEnterOn} alt="" aria-hidden />}
          sendIconDisabled={<img src={sendEnterOff} alt="" aria-hidden />}
          stopIcon={<img src={sendStop} alt="" aria-hidden />}
          textareaRef={inputRef}
          onChange={setPrompt}
          onSend={() => void send(prompt)}
          onStop={stop}
          footerStart={
            <>
              <AiModelPicker
                bridge={MODEL_BRIDGE}
                lang={lang}
                subscriptionStatuses={subscription.statuses}
              />
              <AiSubscriptionUsageLine usage={subscriptionUsage} lang={lang} />
              {sessionUsage && <AiUsageChip usage={sessionUsage} session lang={lang} />}
            </>
          }
        />
      </div>
    </aside>
  )
}

/** The reply's one [Undo], or what became of it */
function UndoRow({
  entry,
  busy,
  onUndo,
}: {
  entry: ChatEntry
  busy: boolean
  onUndo: () => void
}): ReactElement | null {
  const { t } = useI18n()
  const undo = entry.undo!
  if (entry.undoState === 'undone') return <div className="gx-ai-undo-note">{t('aiUndone')}</div>
  if (entry.undoState === 'changed-since')
    return <div className="gx-ai-undo-note">{t('aiUndoChangedSince')}</div>
  if (entry.undoState === 'failed')
    return <div className="gx-ai-undo-note">{t('aiUndoFailed')}</div>
  if (undo.overflow) return <div className="gx-ai-undo-note">{t('aiUndoOverflow')}</div>
  if (undo.steps <= 0) return null
  return (
    <div className="gx-ai-undo">
      <button
        type="button"
        className="ai-retry-btn"
        data-action="ai-undo-run"
        disabled={busy}
        title={t('aiUndoTitle')}
        onClick={onUndo}
      >
        {t('aiUndoAll')}
      </button>
    </div>
  )
}

function StepIcon({ status }: { status: 'running' | 'done' | 'error' }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 14,
    height: 14,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (status === 'running') {
    return (
      <svg {...common}>
        <path d="M6.5 3.5h11M6.5 20.5h11M8 3.5v3.2c0 2.6 4 4.2 4 5.3 0 1.1 4 2.7 4 5.3v3.2M16 3.5v3.2c0 2.6-4 4.2-4 5.3 0 1.1-4 2.7-4 5.3v3.2" />
      </svg>
    )
  }
  if (status === 'error') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.4 2.4 2.4 4.6-5" />
    </svg>
  )
}

/** Tool activity of a reply: open while tools run, folded into "Worked · N steps" when they finish */
function ToolChipList({ tools }: { tools: ToolActivity[] }) {
  const { t: tr } = useI18n()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const toggle = (j: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(j)) next.delete(j)
      else next.add(j)
      return next
    })
  }
  const anyRunning = tools.some((tool) => tool.running)
  const open = userOpen ?? anyRunning
  const label = anyRunning ? tr('aiGroupWorking') : tr('aiWorkedSteps', { n: tools.length })
  return (
    <div className="ai-work-group">
      <button
        type="button"
        className={`ai-work-group-summary${anyRunning ? ' running' : ''}`}
        aria-expanded={open}
        onClick={() => setUserOpen(!open)}
      >
        {anyRunning && !open && <span className="ai-tool-chip-spinner" aria-hidden />}
        <span className="ai-work-group-label">{label}</span>
        <span className={`ai-tool-chip-caret${open ? ' open' : ''}`} aria-hidden>
          ›
        </span>
      </button>
      <div className={`ai-work-group-body${open ? ' open' : ''}`}>
        <div className="ai-work-group-body-inner">
          {tools.map((tool, j) => {
            const hasOutput = !tool.running && !!tool.output
            const isOpen = expanded.has(j)
            const stepStatus = tool.running ? 'running' : tool.isError ? 'error' : 'done'
            return (
              <div key={j} className="ai-step-row" data-tool={tool.name}>
                <span className={`ai-step-icon ${stepStatus}`} aria-hidden>
                  <StepIcon status={stepStatus} />
                </span>
                <div className="ai-step-content">
                  {hasOutput ? (
                    <button
                      type="button"
                      className="ai-step-title clickable"
                      aria-expanded={isOpen}
                      onClick={() => toggle(j)}
                    >
                      {tool.summary}
                    </button>
                  ) : (
                    <span className="ai-step-title">{tool.summary}</span>
                  )}
                  {hasOutput && isOpen && (
                    <div className="ai-step-detail">
                      <div className="ai-tool-output">
                        <div className="ai-tool-output-pre">{tool.output}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Svg({ children, size = 15 }: { children: ReactNode; size?: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

function IconNewChat(): ReactElement {
  return (
    <Svg>
      <path d="M13.5 7.2v-3A1.7 1.7 0 0 0 11.8 2.5H4.2a1.7 1.7 0 0 0-1.7 1.7v6.1a1.7 1.7 0 0 0 1.7 1.7h1.1v2l2.6-2h1.3" />
      <path d="M12.2 9.4v4M10.2 11.4h4" />
    </Svg>
  )
}

function IconCollapse(): ReactElement {
  return (
    <Svg>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1" />
      <path d="M5.5 2.5v11" />
      <path d="M12.5 8H8.1M9.8 5.9 7.7 8l2.1 2.1" strokeWidth="1.3" />
    </Svg>
  )
}

function IconCopy(): ReactElement {
  return (
    <Svg size={16}>
      <rect x="5.2" y="5.2" width="8.3" height="8.8" rx="1.6" />
      <path d="M8.2 2.6H4.1A1.6 1.6 0 0 0 2.5 4.2v5.4" />
    </Svg>
  )
}

function IconCheck(): ReactElement {
  return (
    <Svg size={14}>
      <path d="m3.4 8.4 3 3 6.2-6.6" />
    </Svg>
  )
}

function IconRegenerate(): ReactElement {
  return (
    <Svg size={18}>
      <path d="M 12.68 6.65 a 4.86 4.86 0 0 0 -9 -1.08 M 3.32 9.35 a 4.86 4.86 0 0 0 9 1.08" />
      <path d="M 12.95 3.05 v 2.7 h -2.7 M 3.05 12.95 v -2.7 h 2.7" />
    </Svg>
  )
}
