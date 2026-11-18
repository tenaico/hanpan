/**
 * The AI Drawing's AI pane: the same parts and rules as the other editors'
 * panels (the send gate, the connect prompt, the first-connection notice, the
 * blocked-run notice, the shared run-error wording, the person's skills),
 * with the drawing's own skill (`cad-skill.ts`) and the person's attachments
 * (`files-skill.ts`, read by main and seen by the AI as reference, never put
 * into the drawing), and nothing else: no web search or hand-over.
 *
 * One request is one undo step (apps/cad/AGENTS.md): the pane opens a group
 * in the drawing's history right before the run starts and closes it in a
 * `finally` once the run is over, whether it finished, was stopped, failed or
 * was dropped by "New chat". Every tool call inside is one `history.edit`,
 * so Ctrl+Z takes the whole request back at once.
 *
 * The quick actions above the input (QuickActions.tsx) are the screen's own
 * buttons: only "Start a room layout" touches the pane, and it only fills the
 * input; nothing is sent until the person sends it.
 */
import {
  AiBlockedNotice,
  AiComposer,
  AiConnectPrompt,
  AiFirstConnectionNotice,
  AiInputTruncatedNotice,
  AiMark,
  AiModelPicker,
  AiToolsUnsupportedNotice,
  type AiModelPickerBridge,
  AiQueueStrip,
  AI_QUEUE_LABELS,
  AiSubscriptionUsageLine,
  aiSubscriptionText,
  AiTypingIndicator,
  AiUsageChip,
  addTokenUsage,
  DocAttachButton,
  docMentionActions,
  type AiComposerDocs,
  type AiTokenUsageView,
  Markdown,
  useAiSendGate,
  useChatRunQueue,
  NO_SKILL_USE,
  SentSkillChips,
  skillChipRefsOf,
  useComposerSkills,
  panelUserSkills,
  SkillUsedNotes,
  useSkillProposals,
  useSkillTemplates,
  type SkillChipRef,
  type SkillUse,
} from '@genoffice/ui'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from 'react'
import { AgentLoop, composeSkills } from '@genoffice/agent-core'
import type { IpcStreamError } from '@genoffice/agent-core'
import type {
  AiSettings,
  AiSubscriptionProviderId,
  AiSubscriptionUsage,
} from '@genoffice/ai-provider'
import { localModelCapabilities, settingsSupportVision } from '@genoffice/ai-provider/browser'
import { ATTACHMENT_IMAGE_EXTS } from '../../shared/ipc'
import type { AttachmentMeta, CadAiApi } from '../../shared/ipc'
import type { CadSession } from '../document/session'
import { t as tGlobal, useI18n } from '../i18n/locale'
import { createCadSkill } from './cad-skill'
import { blockedRunFor, mergeSubscriptionUsage, type BlockedRun } from './connection'
import { aiLangDirective } from './lang-directive'
import { QuickActions, type QuickActionsProps } from './QuickActions'
import { useSubscriptionConnection } from './subscription-client'
import { createElectronTransport } from './transport'
import { createFilesSkill } from './files-skill'
import { AttachmentList, useAttachments, type AttachmentBridge } from './attachments'
import attachIcon from './assets/attach-icon.png'
import sendEnterOn from './assets/send-enter-on.png'
import sendEnterOff from './assets/send-enter-off.png'
import sendStop from './assets/send-stop.png'

/** The label of the history group one request makes (the undo step's name). */
export const AI_GROUP_LABEL = 'AI'

const PANEL_WIDTH_KEY = 'cad-ai-panel-width'
const PANEL_WIDTH_DEFAULT = 320
const PANEL_WIDTH_MIN = 260
const TOOL_OUTPUT_MAX_CHARS = 2000

/** The AI part of the preload bridge. A preload from an older build may lack any of it. */
function aiApi(): Partial<CadAiApi> {
  return (window.cadApi as Partial<CadAiApi> | undefined) ?? {}
}

const MODEL_BRIDGE: AiModelPickerBridge = {
  getSettings: () =>
    aiApi().getAiSettings?.() ?? Promise.reject(new Error('the AI settings cannot be read')),
  setSettings: (settings) =>
    aiApi().setAiSettings?.(settings) ??
    Promise.reject(new Error('the AI settings cannot be saved')),
  onSettingsChanged: (handler) => aiApi().onAiSettingsChanged?.(handler) ?? (() => {}),
  openModelSettings: () =>
    aiApi()
      .openAiModelSettings?.()
      .catch(() => {}) ?? Promise.resolve(),
}

function clampPanelWidth(w: number): number {
  // The viewport can be tiny for a moment (a view is 0×0 until the shell lays
  // it out), so the ceiling never drops below the minimum
  const max = Math.max(PANEL_WIDTH_MIN, Math.min(720, Math.round(window.innerWidth * 0.6)))
  return Math.min(Math.max(w, PANEL_WIDTH_MIN), max)
}

function loadPanelWidth(): number {
  const saved = Number(localStorage.getItem(PANEL_WIDTH_KEY))
  return Number.isFinite(saved) && saved > 0
    ? Math.min(Math.max(saved, PANEL_WIDTH_MIN), 720)
    : PANEL_WIDTH_DEFAULT
}

/** the preload bridge's attachment calls */
const ATTACH_BRIDGE = (): AttachmentBridge => aiApi()

interface ToolActivity {
  name: string
  summary: string
  /** still executing: rendered as a running row, replaced in place when the tool finishes */
  running?: boolean
  isError?: boolean
  output?: string
}

interface ChatEntry {
  role: 'user' | 'assistant'
  text: string
  streaming?: boolean
  isError?: boolean
  /** the run stopped because its connection cannot go on: rendered as the blocked notice */
  blocked?: BlockedRun
  /** the run failed and this user message was rolled back out of the model context */
  undelivered?: boolean
  /** skill chips this user message carried */
  skills?: SkillChipRef[]
  /** skill cards the model proposed in this turn (keys of useSkillProposals) */
  skillProposals?: string[]
  /** the skill text this message's request carried (live only): a retry resends it */
  skillText?: string
  tools?: ToolActivity[]
  /** tokens the provider billed for this reply (absent when unreported) */
  usage?: AiTokenUsageView
  /** attachments this message took from the composer (shown read-only; a retry sends them again) */
  attachments?: AttachmentMeta[]
}

export interface AiPanelProps {
  /** the drawing the AI reads and changes; null while none may be edited */
  session: CadSession | null
  /** the drawing's file, null for an untitled one: the chat history is kept per file */
  filePath: string | null
  onCollapse: () => void
  /** the quick actions above the input; the room one is the pane's own */
  quick: Omit<QuickActionsProps, 'onRoom'>
}

export function AiPanel({ session, filePath, onCollapse, quick }: AiPanelProps): ReactElement {
  const { lang, t } = useI18n()
  const [chat, setChat] = useState<ChatEntry[]>([])
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  /** Claude / Codex connection: live statuses and the connect-card actions */
  const subscription = useSubscriptionConnection()
  /** the shared AI settings as last read; null until the first read answered */
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null)
  useEffect(() => {
    let alive = true
    const refresh = () => {
      const read = aiApi().getAiSettings?.()
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
    const off = aiApi().onAiSettingsChanged?.(refresh)
    window.addEventListener('focus', refresh)
    return () => {
      alive = false
      off?.()
      window.removeEventListener('focus', refresh)
    }
  }, [])
  /** The send gate every editor shares: holds a request made during a status check or in front
      of the first-connection notice, refuses in front of "not connected", and writes this
      pane's settings changes ("continue with …", the acknowledged notice) onto the stored ones. */
  const sendGate = useAiSendGate<{
    text: string
    skillUse: SkillUse
    attachments?: AttachmentMeta[]
  }>({
    settings: aiSettings,
    statuses: subscription.statuses,
    store: MODEL_BRIDGE,
    start: (held) => {
      send(held.text, held.skillUse, held.attachments)
    },
    onSettingsSaved: setAiSettings,
  })
  const sendGateRef = useRef(sendGate)
  sendGateRef.current = sendGate
  /** rate-limit windows the subscription program reported (latest per window) */
  const [subscriptionUsage, setSubscriptionUsage] = useState<AiSubscriptionUsage[]>([])
  /** the last turn's input was cut to fit a limit; shown until dismissed */
  const [inputTruncated, setInputTruncated] = useState(false)
  /** structured cause of the last failed stream */
  const lastStreamErrorRef = useRef<IpcStreamError | null>(null)
  /** messages queued while a reply runs; the pump re-runs them through send on settle */
  const atts = useAttachments(
    ATTACH_BRIDGE,
    {
      imageReadFail: (name) => tGlobal('aiImageReadFail', { name }),
      tooManyImages: (max) => tGlobal('aiTooManyImages', { max }),
    },
    chat.flatMap((entry) => entry.attachments ?? []),
  )
  const attsRef = useRef(atts)
  attsRef.current = atts
  const statusesRef = useRef(subscription.statuses)
  statusesRef.current = subscription.statuses
  const msgQueue = useChatRunQueue<{ skillUse: SkillUse; atts: AttachmentMeta[] }>({
    busy,
    submit: (text, meta) => {
      const loop = loopRef.current
      if (!loop || loop.busy) return false
      // a queued message waits instead of being refused and dropped; in front of "not
      // connected" the queue is paused so it does not start by itself after a sign-in
      if (!sendGateRef.current.admitQueued(() => msgQueueRef.current.setPaused(true))) return false
      return send(text, meta.skillUse, meta.atts)
    },
  })
  const msgQueueRef = useRef(msgQueue)
  msgQueueRef.current = msgQueue
  /** the skills called with `/` or `$`: the list, the chips and the text a request gets */
  const skills = useComposerSkills({
    lang,
    // a chip whose skill has a template runs in that template's own tab (spec 5.7)
    onTemplateSkill: (request) => skillTemplatesRef.current.onTemplateSkill(request),
  })
  const skillsRef = useRef(skills)
  skillsRef.current = skills
  /** the skill cards `propose_skill` shows; nothing is written before their Save */
  const skillCards = useSkillProposals({
    lang,
    // a drawing is never a skill's template (design 9: no skill template copy)
    persistSaved: (record) => persistMessage('assistant', '', [record]),
  })
  const skillCardsRef = useRef(skillCards)
  skillCardsRef.current = skillCards
  /**
   * The template flow (spec 5.6, 5.7) without this editor as a target: a chip
   * whose skill has a template opens that template in its own editor's tab,
   * and a template the model used offers its new document there.
   */
  const skillTemplates = useSkillTemplates({
    lang,
    editor: null,
    cards: skillCards,
    busy,
    setComposer: setPrompt,
  })
  const skillTemplatesRef = useRef(skillTemplates)
  skillTemplatesRef.current = skillTemplates
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottomRef = useRef(true)
  const sendSeqRef = useRef(0)
  // preferred = the width the user chose (the one value kept); panelWidth = what fits the window now
  const preferredWidthRef = useRef(loadPanelWidth())
  const [panelWidth, setPanelWidth] = useState(() => clampPanelWidth(preferredWidthRef.current))
  const [resizing, setResizing] = useState(false)
  const asideRef = useRef<HTMLElement>(null)
  const mountedRef = useRef(true)

  // the pane is the right column of the editor: its width is the column's
  useEffect(() => {
    const body = asideRef.current?.closest('.cad-body') as HTMLElement | null
    body?.style.setProperty('--cad-side-width', `${panelWidth}px`)
  }, [panelWidth])

  const settingsRef = useRef<AiSettings | null>(null)
  const langRef = useRef(lang)
  langRef.current = lang
  const sessionRef = useRef(session)
  sessionRef.current = session
  const filePathRef = useRef(filePath)
  /** the instruction of the run in flight: the header retry sends it again */
  const runInstructionRef = useRef('')
  /** the skills of the last send: a retry sends the same skill text */
  const lastSkillUseRef = useRef<SkillUse>(NO_SKILL_USE)
  /** tool activity of the whole run, for the saved transcript */
  const runToolsRef = useRef<ToolActivity[]>([])
  /** tokens billed so far in the run in flight (summed across turns) */
  const runUsageRef = useRef<AiTokenUsageView | undefined>(undefined)
  /** tokens billed across the pane's session (the composer chip) */
  const [sessionUsage, setSessionUsage] = useState<AiTokenUsageView | undefined>(undefined)
  /** settles the run in flight's wait: its `finally` closes the history group */
  const runEndRef = useRef<(() => void) | null>(null)
  const endRun = (): void => {
    const end = runEndRef.current
    runEndRef.current = null
    end?.()
  }
  const chatIdsRef = useRef<{ projectId: string; chatId: string } | null>(null)
  /** messages sent before resolveChat answered, written once the chat id is known */
  const pendingPersistRef = useRef<
    Array<{
      role: 'user' | 'assistant'
      text: string
      tools?: ToolActivity[]
      attachments?: AttachmentMeta[]
      skillChips?: SkillChipRef[]
    }>
  >([])

  const patchLast = (patch: Partial<ChatEntry> | ((last: ChatEntry) => Partial<ChatEntry>)) => {
    setChat((prev) => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (!last || last.role !== 'assistant') return prev
      next[next.length - 1] = { ...last, ...(typeof patch === 'function' ? patch(last) : patch) }
      return next
    })
  }

  const persistMessage = (
    role: 'user' | 'assistant',
    text: string,
    tools?: ToolActivity[],
    skillChips?: SkillChipRef[],
    attachments?: AttachmentMeta[],
  ) => {
    const ids = chatIdsRef.current
    if (!window.projectApi) return
    if (!ids) {
      pendingPersistRef.current.push({ role, text, tools, attachments, skillChips })
      return
    }
    void window.projectApi
      .appendChat({
        projectId: ids.projectId,
        chatId: ids.chatId,
        role,
        text,
        ...(tools && tools.length > 0 ? { tools } : {}),
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
        ...(skillChips && skillChips.length > 0 ? { skills: skillChips } : {}),
      })
      .catch(() => {
        /* the transcript is a convenience: failures are silent */
      })
  }

  // The loop is built once; every value that changes goes through a ref
  const transportRef = useRef<ReturnType<typeof createElectronTransport> | null>(null)
  if (!transportRef.current) {
    transportRef.current = createElectronTransport(() => settingsRef.current!, {
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
      skill: composeSkills('cad', '', [
        createCadSkill({ session: () => sessionRef.current }),
        // the person's attachments: read_attachment pages through their text and changes nothing
        createFilesSkill(
          () => attsRef.current.available(),
          (path, offset, maxChars) =>
            aiApi().readAttachment?.(path, offset, maxChars) ??
            Promise.resolve({ ok: false, error: tGlobal('aiUnknownError') }),
        ),
        // the person's skills: use_skill, read_skill_file, propose_skill (app-run tools)
        ...panelUserSkills({
          lang: () => langRef.current,
          messages: () => loopRef.current?.messages ?? [],
          // a template skill the model used offers its new document (spec 5.7)
          onUsed: (skill) => skillTemplatesRef.current.onUsed(skill),
          onProposal: (proposal) => {
            skillCardsRef.current.add(proposal)
            patchLast((last) => ({
              skillProposals: [...(last.skillProposals ?? []), proposal.key],
            }))
          },
        }),
      ]),
      systemSuffix: () => aiLangDirective(langRef.current),
      events: {
        onText: (text) => patchLast({ text }),
        onToolStart: (call) => {
          patchLast((last) => ({
            tools: [
              ...(last.tools ?? []),
              { name: call.name, summary: call.name.replace(/[_-]+/g, ' '), running: true },
            ],
          }))
        },
        onToolExecuted: ({ call, execution }) => {
          const activity: ToolActivity = {
            name: call.name,
            summary: execution.summary,
            isError: execution.isError,
            output: execution.output?.slice(0, TOOL_OUTPUT_MAX_CHARS),
          }
          runToolsRef.current.push(activity)
          patchLast((last) => {
            // the running row pushed by onToolStart is swapped out (a call that never ran has none)
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
          persistMessage('assistant', final, runToolsRef.current)
          setBusy(false)
          endRun()
        },
        onError: (error) => {
          // a connection that cannot go on gets the blocked notice (with "continue with …") instead of an error line
          const blocked = blockedRunFor(error, lastStreamErrorRef.current)
          // the next queued message would only meet the same block
          if (blocked) msgQueueRef.current.hold()
          // once a tool ran the message was delivered; a later turn failing is not a send failure
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
          setBusy(false)
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
      // the tab is going: whatever the run did stays one step
      endRun()
    }
  }, [])

  // ── the transcript: bound to the file, the earlier conversation restored ──
  useEffect(() => {
    const api = window.projectApi
    if (!api) return
    const tempChatId = `unsaved-${Date.now()}`
    void api
      .resolveChat({ filePath: filePathRef.current ?? null, tempChatId })
      .then((ids) => {
        chatIdsRef.current = ids
        for (const msg of pendingPersistRef.current.splice(0)) {
          persistMessage(msg.role, msg.text, msg.tools, msg.skillChips, msg.attachments)
        }
        return api.loadChat({ projectId: ids.projectId, chatId: ids.chatId, limit: 200 })
      })
      .then((stored) => {
        if (stored.length === 0) return
        // skill cards come back closed; a saved card's record is not part of the conversation
        const msgs = skillCardsRef.current.restore(stored)
        let applied = false
        const restoredAtts = (m: (typeof msgs)[number]): AttachmentMeta[] | undefined =>
          m.attachments
            ?.filter((a) => a.path)
            .map((a) => ({
              name: a.name,
              path: a.path ?? '',
              ext: a.ext ?? '',
              sizeBytes: a.sizeBytes ?? 0,
            }))
        setChat((prev) => {
          // a message sent while the history was loading wins over the history
          if (prev.length > 0) return prev
          applied = true
          return msgs.map((m) => ({
            role: m.role,
            text: m.text,
            tools: m.tools?.map((tool) => ({
              name: tool.name,
              summary: tool.summary,
              isError: tool.isError,
              output: tool.output ? tool.output.slice(0, TOOL_OUTPUT_MAX_CHARS) : undefined,
            })),
            attachments: restoredAtts(m),
            ...(m.role === 'user' && skillChipRefsOf(m.skills).length > 0
              ? { skills: skillChipRefsOf(m.skills) }
              : {}),
            ...(m.skillProposals ? { skillProposals: m.skillProposals } : {}),
          }))
        })
        // the next request re-reads the current text of the skills this conversation used
        if (applied) {
          skillsRef.current.restoreHistory(
            msgs.map((m) => (m.role === 'user' ? skillChipRefsOf(m.skills) : undefined)),
          )
        }
        if (applied && !loopRef.current?.busy) {
          loopRef.current?.restore(msgs.map((m) => ({ role: m.role, text: m.text })))
          // the earlier conversation's files stay readable for the next request
          attsRef.current.keep(msgs.flatMap((m) => restoredAtts(m) ?? []))
        }
      })
      .catch(() => {
        /* a history that cannot be loaded is not shown */
      })
  }, [])

  /** after an untitled drawing's first save, the unsaved-* history moves to the real path */
  useEffect(() => {
    filePathRef.current = filePath
    const ids = chatIdsRef.current
    if (!window.projectApi || !ids || !filePath || !ids.chatId.startsWith('unsaved-')) return
    void window.projectApi
      .rebindChat({ projectId: ids.projectId, tempChatId: ids.chatId, newFilePath: filePath })
      .then((r) => {
        if (r?.chatId) chatIdsRef.current = r
      })
      .catch(() => {
        /* silent */
      })
  }, [filePath])

  useEffect(() => {
    if (stickToBottomRef.current) {
      chatRef.current?.scrollTo?.({ top: chatRef.current.scrollHeight })
    }
  }, [chat, busy])

  const onChatScroll = (): void => {
    const el = chatRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
  }

  /** false when nothing was started (empty text, a run already active, or the gate held or refused it) */
  const send = (
    text: string,
    /** the chosen skills: their text goes to the model, their chips onto the bubble */
    skillUse: SkillUse = NO_SKILL_USE,
    /** a queued or retried message's own attachments; without it the composer's go */
    attachmentsOverride?: AttachmentMeta[],
  ): boolean => {
    const instruction = text.trim()
    const loop = loopRef.current
    if (!instruction || !loop || loop.busy) return false
    // Nothing connected, or the first-connection notice not acknowledged: nothing is sent, the
    // input keeps the text, and the dock above it says what to do. A request made during a
    // status check or in front of the notice is held and starts by itself.
    if (!sendGate.admit({ text: instruction, skillUse, attachments: attachmentsOverride })) {
      return false
    }
    let sentAtts: AttachmentMeta[]
    if (attachmentsOverride) {
      atts.keep(attachmentsOverride)
      sentAtts = attachmentsOverride
    } else {
      sentAtts = atts.take()
    }
    lastStreamErrorRef.current = null
    setInputTruncated(false)
    stickToBottomRef.current = true
    runInstructionRef.current = instruction
    runToolsRef.current = []
    runUsageRef.current = undefined
    setChat((prev) => [
      ...prev,
      {
        role: 'user',
        text: instruction,
        ...(skillUse.chips.length > 0 ? { skills: skillUse.chips, skillText: skillUse.text } : {}),
        ...(sentAtts.length > 0 ? { attachments: sentAtts } : {}),
      },
      { role: 'assistant', text: '', streaming: true },
    ])
    setPrompt('')
    skillsRef.current.consume(skillUse)
    lastSkillUseRef.current = skillUse
    skillTemplatesRef.current.noteRequest(text)
    setBusy(true)
    persistMessage('user', instruction, undefined, skillUse.chips, sentAtts)
    // Stop or New chat during the read before the run bump the sequence; a stale send never starts the loop
    const seq = ++sendSeqRef.current
    void (async () => {
      /** the drawing whose history holds this request's group */
      let grouped: CadSession | null = null
      try {
        const settings = await aiApi().getAiSettings?.()
        if (!settings) throw new Error(tGlobal('aiUnknownError'))
        settingsRef.current = settings
        // attached pictures go with the request as pictures, to a model that can see them
        const seeing = settingsSupportVision(settings, statusesRef.current)
        const pictures = sentAtts.filter((a) => ATTACHMENT_IMAGE_EXTS.has(a.ext))
        const images = seeing && pictures.length > 0 ? await atts.images(sentAtts) : []
        if (!mountedRef.current || seq !== sendSeqRef.current) return
        if (!seeing && pictures.length > 0) atts.showNotice([tGlobal('aiAttachNoVision')])
        const ended = new Promise<void>((resolve) => {
          runEndRef.current = resolve
        })
        // one request, one undo step: every edit of this run lands in one group
        grouped = sessionRef.current
        grouped?.history.openGroup(AI_GROUP_LABEL)
        // the skill text rides with this request only; the bubble and the record keep the chips
        loop.run(instruction + skillUse.text, images.length > 0 ? images : undefined)
        await ended
      } catch (err) {
        if (!mountedRef.current || seq !== sendSeqRef.current) return
        patchLast({
          streaming: false,
          text: err instanceof Error ? err.message : String(err),
          isError: true,
        })
        setBusy(false)
      } finally {
        grouped?.history.closeGroup()
      }
    })()
    return true
  }

  /** a send whose read before the run is still going: cancelling it drops the empty reply and marks the message undelivered */
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

  /** Enter while a reply runs: the draft joins the queue above the input */
  const enqueueDraft = () => {
    const text = prompt.trim()
    if (!text) return
    skills.withSkills(text, (skillUse) => {
      skillsRef.current.consume(skillUse)
      // the queued message owns the composer attachments; they go with it when it runs
      msgQueue.enqueue(text, { skillUse, atts: atts.detach() })
      setPrompt('')
    })
  }

  /** the input's send: the typed text goes out with the chosen skills */
  const sendDraft = () => {
    const text = prompt.trim()
    if (!text) return
    skills.withSkills(text, (skillUse) => send(text, skillUse))
  }

  /** the skills a past user message was sent with, for resending it (none for a restored one) */
  const entrySkillUse = (entry: ChatEntry): SkillUse =>
    entry.skills && entry.skillText !== undefined
      ? { text: entry.skillText, chips: entry.skills }
      : NO_SKILL_USE

  const stop = (): void => {
    msgQueue.hold()
    const loop = loopRef.current
    if (loop?.busy) loop.cancel()
    else cancelPendingSend()
  }

  const retry = (): void => {
    const last = [...chat].reverse().find((entry) => entry.role === 'user')
    send(runInstructionRef.current, lastSkillUseRef.current, last?.attachments ?? [])
  }

  /** "Continue with …" on a blocked run: that provider becomes the selection and the request runs again */
  const continueWith = (provider: AiSubscriptionProviderId): void => {
    const last = [...chat].reverse().find((entry) => entry.role === 'user')
    sendGate.continueWith(provider, () => {
      if (last) send(last.text, entrySkillUse(last), last.attachments ?? [])
      else retry()
    })
  }

  /** The `@` document list in the input attaches through the same route as the buttons */
  const docMention: AiComposerDocs = {
    lang,
    ...docMentionActions({
      lang,
      add: async (paths) => (await ATTACH_BRIDGE().addAttachmentPaths?.(paths)) ?? null,
      merge: atts.merge,
    }),
    attachments: atts.list,
  }

  /** "Start a room layout": the request goes into the input for the person to read and send */
  const fillRoom = (): void => {
    setPrompt(t('aiQuickRoomPrompt'))
    inputRef.current?.focus()
  }

  const copyMessage = (text: string, idx: number): void => {
    void navigator.clipboard?.writeText(text)
    setCopiedIdx(idx)
    window.setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1200)
  }

  // The display width follows the window (at most 60% of it); a wider window brings the chosen width back
  useEffect(() => {
    const onResize = (): void => setPanelWidth(clampPanelWidth(preferredWidthRef.current))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const resizeCleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => () => resizeCleanupRef.current?.(), [])

  /** Dragging the pane's inner edge (its left one: the column sits at the right of the window). */
  const startResize = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.preventDefault()
    const resizer = e.currentTarget
    setResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev: PointerEvent): void => {
      const w = clampPanelWidth(window.innerWidth - ev.clientX)
      preferredWidthRef.current = w
      setPanelWidth(w)
    }
    let done = false
    const cleanup = (): void => {
      if (done) return
      done = true
      resizeCleanupRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cleanup)
      window.removeEventListener('pointercancel', cleanup)
      resizer.removeEventListener('lostpointercapture', cleanup)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setResizing(false)
      localStorage.setItem(PANEL_WIDTH_KEY, String(Math.round(preferredWidthRef.current)))
    }
    resizeCleanupRef.current = cleanup
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cleanup)
    window.addEventListener('pointercancel', cleanup)
    resizer.addEventListener('lostpointercapture', cleanup)
    resizer.setPointerCapture(e.pointerId)
  }

  return (
    <aside
      ref={asideRef}
      className={`copilot${resizing ? ' ai-panel-resizing' : ''}${atts.dragOver ? ' ai-panel-dragover' : ''}`}
      style={{ width: '100%' }}
      dir={lang === 'ar' || lang === 'he' ? 'rtl' : undefined}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          e.stopPropagation()
          atts.setDragOver(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) atts.setDragOver(false)
      }}
      onDrop={(e) => {
        // the files are this pane's: the shell's "open in a new tab" does not take them
        e.preventDefault()
        e.stopPropagation()
        atts.setDragOver(false)
        void atts.drop(Array.from(e.dataTransfer.files))
      }}
    >
      <div
        className="ai-panel-resizer"
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label={aiSubscriptionText(lang, 'aiAssistant')}
      />
      <header className="ai-panel-header">
        <span className="ai-panel-title">
          <AiMark size={20} />
          {aiSubscriptionText(lang, 'aiAssistant')}
        </span>
        <div className="ai-panel-header-actions">
          {chat.length > 0 && (
            <button
              type="button"
              className="ai-header-btn"
              onClick={() => {
                msgQueue.clear()
                sendGate.reset()
                stop()
                loopRef.current?.reset()
                // a reset run reports nothing more: its group closes here
                endRun()
                setBusy(false)
                atts.clear()
                setChat([])
                skills.resetConversation()
                skillCards.reset()
                skillTemplates.reset()
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
          </div>
        )}
        {chat.map((entry, i) => {
          if (entry.role === 'user') {
            return (
              <div key={i} className="ai-msg ai-msg-user">
                <SentSkillChips lang={lang} chips={entry.skills} isAvailable={skills.isAvailable} />
                <span dir="auto">{entry.text}</span>
                {entry.attachments && entry.attachments.length > 0 && (
                  <div className="ai-msg-attachments">
                    <AttachmentList atts={entry.attachments} previews={atts.previews} />
                  </div>
                )}
                {entry.undelivered && (
                  <div className="ai-msg-undelivered">
                    {t('aiUndelivered')}
                    {!busy && (
                      <button
                        type="button"
                        className="ai-retry-btn"
                        onClick={() => send(entry.text, entrySkillUse(entry))}
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
          if (!entry.text && !entry.streaming && !hasTools) return null
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
                  // only the run that just stopped offers "continue with …": it reruns the last request
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
              <SkillUsedNotes tools={entry.tools} />
              {entry.skillProposals?.map((key) => skillCards.render(key))}
              {entry.usage && (
                <div className="ai-message-usage">
                  <AiUsageChip usage={entry.usage} lang={lang} />
                </div>
              )}
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
        {skillTemplates.notes}
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
              onOpenSettings={() =>
                void aiApi()
                  .openAiModelSettings?.()
                  .catch(() => {})
              }
              onInstall={subscription.install}
              onUpdate={subscription.update}
              onCancelLogin={subscription.cancelLogin}
              onLogin={subscription.login}
              onRecheck={subscription.recheck}
              onAcceptMetered={subscription.acceptMetered}
              onOpenInstallHelp={subscription.openInstallHelp}
              onOpenConnectHelp={subscription.openConnectHelp}
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
        <QuickActions {...quick} onRoom={fillRoom} />
        {inputTruncated && (
          <AiInputTruncatedNotice lang={lang} onDismiss={() => setInputTruncated(false)} />
        )}
        {aiSettings !== null && localModelCapabilities(aiSettings).tools === false && (
          <AiToolsUnsupportedNotice lang={lang} />
        )}
        {atts.list.length > 0 && (
          <div className="ai-attachments">
            <AttachmentList
              atts={atts.list}
              previews={atts.previews}
              onRemove={atts.remove}
              removeLabel={t('aiRemoveAttachmentTitle')}
            />
          </div>
        )}
        {atts.notice && <div className="ai-attach-notice">{atts.notice}</div>}
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
          onSend={sendDraft}
          onStop={stop}
          skills={skills.composer}
          docs={docMention}
          onPasteFiles={(files) => void atts.paste(files)}
          footerStart={
            <>
              <AiModelPicker
                bridge={MODEL_BRIDGE}
                lang={lang}
                subscriptionStatuses={subscription.statuses}
                onRefreshSubscriptions={subscription.refresh}
              />
              <AiSubscriptionUsageLine usage={subscriptionUsage} lang={lang} />
              {sessionUsage && <AiUsageChip usage={sessionUsage} session lang={lang} />}
              <button
                type="button"
                className="ai-attach-btn"
                onClick={() => void atts.pick()}
                data-tip={t('aiAttachTitle')}
                aria-label={t('aiAttachTitle')}
              >
                <img src={attachIcon} alt="" aria-hidden />
              </button>
              <DocAttachButton
                lang={lang}
                onPicked={async ({ paths, notes }) => {
                  const added =
                    paths.length > 0 ? await ATTACH_BRIDGE().addAttachmentPaths?.(paths) : null
                  atts.merge({
                    accepted: added?.accepted ?? [],
                    rejected: [...(added?.rejected ?? []), ...notes],
                  })
                }}
              />
            </>
          }
        />
      </div>
    </aside>
  )
}

/** Step-row status icons (the same timeline glyphs as the other editors) */
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

/** Tool activity of a reply: open while tools run, folded into "Worked · N steps" when they finish; a click always wins */
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
              <div key={j} className="ai-step-row">
                <span className={`ai-step-icon ${stepStatus}`} aria-hidden>
                  <StepIcon status={stepStatus} />
                </span>
                <div className="ai-step-content">
                  {hasOutput ? (
                    <button
                      type="button"
                      className="ai-step-title clickable"
                      data-tip={tool.name}
                      aria-expanded={isOpen}
                      onClick={() => toggle(j)}
                    >
                      {tool.summary}
                    </button>
                  ) : (
                    <span className="ai-step-title" data-tip={tool.name}>
                      {tool.summary}
                    </span>
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

/** The pane folds down to its bar under the property panel. */
function IconCollapse(): ReactElement {
  return (
    <Svg>
      <rect x="2.5" y="1.5" width="11" height="13" rx="1" />
      <path d="M2.5 10.5h11" />
      <path d="M8 3.8v4.4M5.9 6.1 8 8.2l2.1-2.1" strokeWidth="1.3" />
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
