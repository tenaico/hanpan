/**
 * The mind map editor: toolbar on top, the map in a card with the theme panel
 * beside it, sheet tabs and the zoom ratio below.
 *
 * The map lives in a `DocumentSession` (the engine's document and the history
 * of every sheet). Each sheet that has been shown has its own `MapController`
 * with its own instance of the drawing library, so the undo history of one
 * sheet never reaches another. Everything that changes the map goes through a
 * controller's edit functions; this component only wires the screen to them.
 */
import type { SendTarget } from '@genoffice/hanpan-core/renderer'
import { SendDialog } from './hanpan/SendDialog'
import { SyncDialog } from './hanpan/SyncDialog'
import { CreditCheckDialog } from './hanpan/CreditCheckDialog'
import { outlineAsIndentedText, sheetOutline } from './hanpan/map-outline'
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  templateDocumentOf,
  presentationKeyOf,
  useAutoSavePref,
  useSplitPaneFocusPing,
  type TemplateDocument,
} from '@genoffice/ui'
import type { ThemeId, ViewLayout } from '@genoffice/xmind-engine'
import { t as translate, useI18n } from './i18n/locale'
import { mapStrings } from './i18n/map-strings'
import type { StringKey } from './i18n/locale'
import type { Params } from '@genoffice/i18n'
import { linkFromInput, linkInputKind } from './document/link-input'
import { newMap, type OpenFailure, type OpenNotices, openMapBytes } from './document/open'
import { openCopiedMap, seededMap } from './document/open'
import { useRecoveryCopies } from './document/recovery-copies'
import type { DocumentSession, SheetTab } from './document/session'
import { deleteSheetAfterConfirm } from './document/sheet-actions'
import { thumbnailForSave } from './document/thumbnail'
import { useMapExport } from './export/use-map-export'
import { MapController, type MapHost, type TopicRequest } from './map/controller'
import { findMatches, type FindMatch, type FindOptions } from './map/find'
import { HIDDEN_PARTS, type HiddenPart } from './map/hidden-parts'
import { FindBar } from './components/FindBar'
import { controllerFor } from './ai/map-tools'
import { pictureFromBase64 } from './ai/image-tools'
import { Toolbar } from './components/Toolbar'
import { SheetTabs } from './components/SheetTabs'
import { ThemePanel } from './components/ThemePanel'
import { IconPanel } from './components/IconPanel'
import { MarkerMenu, type MarkerMenuRequest } from './components/MarkerMenu'
import { markerFamily, type MarkerFamily, withMarker } from './map/marker-families'
import { NotePanel, type NotePanelHandle } from './components/NotePanel'
import { MindmapAiDock, useMindmapAi } from './ai/AiDock'
import { PrintDialog } from './components/PrintDialog'
import { useMapHandoff } from './ai/use-handoff'
import {
  ConfirmDialog,
  type ConfirmRequest,
  Notice,
  TopicFieldDialog,
  type TopicFieldRequest,
} from './components/dialogs'
import type { MindmapMenuCommand, PrintJob, PrintResult, SaveMode } from '../shared/ipc'

type LoadStatus = 'loading' | 'ready' | 'failed' | 'error'
type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

/** What the screen says for a file that did not open. Such a file has no map and is never written. */
const OPEN_FAILURE_TEXT: Readonly<Record<OpenFailure, StringKey>> = {
  'legacy-format': 'openLegacy',
  encrypted: 'openEncrypted',
  unreadable: 'openUnreadable',
  rejected: 'openRejected',
}

const AUTO_SAVE_INTERVAL_MS = 30_000
/** Labels are typed in one field, separated by a comma: the plain one, the full-width one or the ideographic one. */
const LABEL_SEPARATORS = /[,\uFF0C\u3001]/
const TOAST_MS = 4000

/** The keys that step a presentation: forward or back by one main topic. */
const PRESENT_KEYS: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ' ': 1,
  PageDown: 1,
  Enter: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
  PageUp: -1,
  Backspace: -1,
}

const HIDDEN_PARTS_KEY = 'mindmapapp.hiddenParts'

function rememberedHiddenParts(): HiddenPart[] {
  try {
    const saved = (localStorage.getItem(HIDDEN_PARTS_KEY) ?? '').split(',')
    return HIDDEN_PARTS.filter((part) => saved.includes(part))
  } catch {
    return []
  }
}

/** The find bar while it is open: what it looks for and where it stands. */
interface FindState {
  withReplace: boolean
  query: string
  options: FindOptions
  matches: FindMatch[]
  /** the match shown now, -1 before the first step */
  index: number
  message: string | null
}

/** true while the keyboard is in a text field or in a title being typed on the map */
function typingInText(): boolean {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return false
  return active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA'
}

export default function App() {
  const { lang, t } = useI18n()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [failure, setFailure] = useState<OpenFailure | null>(null)
  const [session, setSession] = useState<DocumentSession | null>(null)
  const [path, setPath] = useState<string | null>(null)
  const [tabs, setTabs] = useState<SheetTab[]>([])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [notices, setNotices] = useState<OpenNotices>({ preserved: 0, unknownTheme: false })
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [fieldRequest, setFieldRequest] = useState<TopicFieldRequest | null>(null)
  const [toast, setToast] = useState<{ key: StringKey; params?: Params } | null>(null)
  // Hanpan: the "send to a document" dialog's target, and the line told after a send
  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null)
  const [sendNotice, setSendNotice] = useState<string | null>(null)
  const [syncOpen, setSyncOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  /** F5: the map alone, shell chrome covered by HTML fullscreen */
  const [presenting, setPresenting] = useState(false)
  /** a new, empty map: the line on how to add topics shows until the map is first changed */
  const [startHint, setStartHint] = useState(false)
  const [hiddenParts, setHiddenParts] = useState<HiddenPart[]>(rememberedHiddenParts)
  const [find, setFind] = useState<FindState | null>(null)
  const hiddenPartsRef = useRef(hiddenParts)
  hiddenPartsRef.current = hiddenParts
  const [noteOpen, setNoteOpen] = useState(
    () => localStorage.getItem('mindmapapp.showNotes') === '1',
  )
  // the note panel wins when an older run left both remembered open
  const [iconsOpen, setIconsOpen] = useState(
    () => !noteOpen && localStorage.getItem('mindmapapp.showIcons') === '1',
  )
  const [markerMenu, setMarkerMenu] = useState<MarkerMenuRequest | null>(null)
  /** bumped when a controller reports a change of selection, history, zoom or layout */
  const [, setMapTick] = useState(0)
  const [autoSave, setAutoSave] = useAutoSavePref('mindmapapp.autoSave', window.mindmapApi)

  const sessionRef = useRef<DocumentSession | null>(null)
  const statusRef = useRef<LoadStatus>('loading')
  const controllers = useRef(new Map<string, MapController>())
  const hosts = useRef(new Map<string, HTMLDivElement>())
  const noteRef = useRef<NotePanelHandle | null>(null)
  // the map keeps the host object it was made with; this reaches the newest handler
  const openTopicFieldRef = useRef<(field: TopicRequest, topicId: string) => void>(() => {})
  const confirmAnswer = useRef<((ok: boolean) => void) | null>(null)
  const savingRef = useRef(false)
  const langRef = useRef(lang)
  langRef.current = lang
  statusRef.current = status

  // the shell's split panes: tell it whenever this pane gains focus
  useSplitPaneFocusPing()

  const controller = activeKey ? (controllers.current.get(activeKey) ?? null) : null

  // ---- asking ----

  const ask = useCallback((request: ConfirmRequest): Promise<boolean> => {
    // a second question while one is open answers the first with "no"
    confirmAnswer.current?.(false)
    return new Promise<boolean>((resolve) => {
      confirmAnswer.current = resolve
      setConfirm(request)
    })
  }, [])

  const answer = useCallback((ok: boolean) => {
    const resolve = confirmAnswer.current
    confirmAnswer.current = null
    setConfirm(null)
    resolve?.(ok)
  }, [])

  const say = useCallback((key: StringKey, params?: Params) => setToast({ key, params }), [])
  useEffect(() => {
    if (toast === null) return
    const timer = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  // ---- what a map on screen needs from the screen around it ----

  const openField = useCallback((field: TopicRequest, topicId: string) => {
    const active = [...controllers.current.values()].find((candidate) => candidate.topic(topicId))
    const topic = active?.topic(topicId)
    if (!topic) return
    const value =
      field === 'label'
        ? topic.labels.join(', ')
        : field === 'note'
          ? (topic.note ?? '')
          : (topic.link ?? '')
    setFieldRequest({ field, topicId, value })
  }, [])

  const host = useMemo<MapHost>(
    () => ({
      confirmDelete: (count) =>
        ask({
          kind: 'delete-hidden',
          title: translate('deleteHiddenTitle'),
          body: translate('deleteHiddenBody', { count }),
          confirmLabel: translate('btnDelete'),
        }),
      openLink: (url) => {
        void window.mindmapApi
          .openLink(url)
          .then((opened) => {
            if (!opened) say('linkNotOpened')
          })
          .catch(() => say('linkNotOpened'))
      },
      onRequest: (field, topicId) => openTopicFieldRef.current(field, topicId),
      onBoundaryRequest: (ownerId, boundaryId) => {
        const active = [...controllers.current.values()].find((candidate) =>
          candidate.boundariesOf(ownerId).some((boundary) => boundary.id === boundaryId),
        )
        const boundary = active
          ?.boundariesOf(ownerId)
          .find((candidate) => candidate.id === boundaryId)
        if (boundary) {
          setFieldRequest({
            field: 'boundary',
            topicId: ownerId,
            boundaryId,
            value: boundary.title,
          })
        }
      },
      onStateChange: () => setMapTick((tick) => tick + 1),
    }),
    [ask, say],
  )

  // ---- opening ----

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const pending = await window.mindmapApi.consumePending()
        let opened: DocumentSession
        let found: OpenNotices = { preserved: 0, unknownTheme: false }
        let openedPath = pending
        if (pending) {
          const file = await window.mindmapApi.openFile(pending)
          const started = performance.now()
          // a restored recovery copy opens with unsaved changes; without its file it is untitled
          const result =
            file.status !== 'ok'
              ? file
              : file.restored
                ? await openCopiedMap({ bytes: file.bytes })
                : await openMapBytes(file.bytes)
          if (file.status === 'ok' && file.restored === 'untitled') openedPath = null
          // how long the engine took over the file, for measuring large maps
          performance.measure('mindmap:open', { start: started, end: performance.now() })
          if (cancelled) return
          if (result.status !== 'ok') {
            setFailure(result.status)
            setStatus('failed')
            return
          }
          opened = result.session
          found = result.notices
        } else {
          // a new map that starts with given content (a conversion's result, T17,
          // or a skill template's copy, spec 5.7), taken once
          const seed = (await window.mindmapApi.takeSeed?.()) ?? null
          if (seed && 'bytes' in seed) {
            const result = await openCopiedMap(seed)
            if (cancelled) return
            if (result.status !== 'ok') {
              setFailure(result.status)
              setStatus('failed')
              return
            }
            opened = result.session
            found = result.notices
          } else {
            opened = seed
              ? await seededMap(seed, translate('untitled'))
              : await newMap({
                  sheetTitle: translate('sheetDefaultName', { n: 1 }),
                  rootTitle: translate('centralTopic'),
                })
            // an empty new map: its central topic is picked and the keys are told
            if (!seed) setStartHint(true)
          }
          if (cancelled) return
        }
        sessionRef.current = opened
        setSession(opened)
        setPath(openedPath)
        setTabs(opened.tabs())
        setActiveKey(opened.tabs()[0]?.key ?? null)
        setNotices(found)
        setStatus('ready')
      } catch (err) {
        console.error('[mindmap] open failed:', err)
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // the session reports every change of the tree: the tabs and the unsaved mark follow
  useEffect(() => {
    if (!session) return
    const sync = (): void => {
      setTabs(session.tabs())
      setDirty(session.dirty)
    }
    sync()
    return session.subscribe(sync)
  }, [session])

  // mirror dirtiness to the main process (close prompt); a new map nobody touched never counts
  useEffect(() => {
    if (status === 'ready') window.mindmapApi.setDirty(dirty)
  }, [dirty, status])

  useEffect(() => {
    if (dirty && saveState === 'saved') setSaveState('idle')
  }, [dirty, saveState])

  const startHintRef = useRef(startHint)
  startHintRef.current = startHint
  useEffect(() => {
    if (dirty) setStartHint(false)
  }, [dirty])

  // ---- one drawing-library instance per sheet, made when the sheet is first shown ----

  useEffect(() => {
    if (!session || !activeKey || controllers.current.has(activeKey)) return
    const el = hosts.current.get(activeKey)
    if (!el) return
    const created = new MapController({
      el,
      session,
      sheetKey: activeKey,
      strings: mapStrings(langRef.current),
      host,
    })
    created.setHiddenParts(hiddenPartsRef.current)
    controllers.current.set(activeKey, created)
    // a new map starts on its central topic, so Tab and Enter work at once
    if (startHintRef.current) created.revealTopic(session.view(activeKey).root.id)
    setMapTick((tick) => tick + 1)
  }, [session, activeKey, host, tabs])

  // what the View tab hides applies to every sheet, and is remembered
  useEffect(() => {
    for (const each of controllers.current.values()) each.setHiddenParts(hiddenParts)
    try {
      localStorage.setItem(HIDDEN_PARTS_KEY, hiddenParts.join(','))
    } catch {
      // a convenience: without storage the map shows everything next time
    }
  }, [hiddenParts])

  // a sheet that comes on screen catches up on what could not be measured while it was hidden
  useEffect(() => {
    if (activeKey) controllers.current.get(activeKey)?.onShown()
  }, [activeKey])

  // a deleted sheet takes its instance with it
  useEffect(() => {
    const alive = new Set(tabs.map((tab) => tab.key))
    for (const [key, gone] of controllers.current) {
      if (alive.has(key)) continue
      gone.destroy()
      controllers.current.delete(key)
    }
  }, [tabs])

  useEffect(() => {
    const all = controllers.current
    return () => {
      all.forEach((each) => each.destroy())
      all.clear()
    }
  }, [])

  // the language changed: new topics, new summaries and the map's menu follow
  useEffect(() => {
    const strings = mapStrings(lang)
    controllers.current.forEach((each) => each.setStrings(strings))
  }, [lang])

  /** Brings the tree in line with every sheet on screen, so nothing shown is missing from what is saved or read. */
  const flushAll = useCallback(() => {
    // a note still being typed belongs to the map before it is saved or read
    noteRef.current?.commit()
    controllers.current.forEach((each) => {
      // a title still being typed is part of the map: it goes in before anything is saved or read
      each.commitEdit()
      each.flush()
    })
  }, [])

  // crash-recovery copies while the map has unsaved changes (spec "work is not lost")
  const recovery = useRecoveryCopies({
    ready: status === 'ready',
    session,
    sheets: () => [...controllers.current.values()],
    flush: (commit) =>
      controllers.current.forEach((each) => {
        // only a copy the OS session end asks for takes a title still being typed
        if (commit) each.commitEdit()
        each.flush()
      }),
    saving: () => savingRef.current,
  })

  // the AI panel works on the map through the same session and controllers (T12)
  const ai = useMindmapAi({ session, controllers, activeKey, setActiveKey, path, flush: flushAll })

  /** The note panel shares the map's end side with the theme and AI panels: one at a time. */
  const closeNote = useCallback(() => {
    noteRef.current?.commit()
    setNoteOpen(false)
  }, [])

  useEffect(() => {
    localStorage.setItem('mindmapapp.showNotes', noteOpen ? '1' : '0')
  }, [noteOpen])

  useEffect(() => {
    localStorage.setItem('mindmapapp.showIcons', iconsOpen ? '1' : '0')
  }, [iconsOpen])

  // a request the shell handed over to this new map: taken once, run through the panel (T16)
  const handoff = useMapHandoff({
    ready: status === 'ready',
    untitled: path === null,
    openPanel: () => {
      closeNote()
      setThemeOpen(false)
      setIconsOpen(false)
      ai.setOpen(true)
    },
  })

  /**
   * The map as a skill's template (spec 5.7): an .xmind file, or a new map,
   * as a save would write it now. The editor recognizes no redaction marks.
   */
  const templateDocument = useMemo<TemplateDocument | null>(
    () =>
      status !== 'ready'
        ? null
        : templateDocumentOf({
            filePath: path,
            extensions: ['xmind'],
            defaultExtension: 'xmind',
            untitledTitle: () => translate('untitled'),
            bytes: async () => {
              const current = sessionRef.current
              if (!current) return null
              flushAll()
              return current.produceBytes()
            },
          }),
    [status, path, flushAll],
  )

  // ---- saving ----

  const doSave = useCallback(
    async (mode: SaveMode, auto = false): Promise<boolean> => {
      const current = sessionRef.current
      if (statusRef.current !== 'ready' || !current) return false
      // a menu save during an autosave queues behind it instead of being dropped
      while (savingRef.current) await new Promise((resolve) => setTimeout(resolve, 50))
      savingRef.current = true
      // a recovery copy being made now may hold what this save writes: it is dropped
      recovery.noteSave()
      setSaveState('saving')
      try {
        flushAll()
        const bytes = await current.produceBytes({ thumbnail: await thumbnailForSave() })
        const rootTitle = current.view(current.tabs()[0]!.key).root.title.trim()
        const result = await window.mindmapApi.save({
          bytes,
          mode,
          // an automatic save defers to the next manual one while a copy pair holds the map
          auto,
          // an untitled map is offered its central topic as a name, unless that is still the default one
          defaultName: rootTitle !== translate('centralTopic') ? rootTitle : undefined,
        })
        if (result.ok && 'path' in result) {
          current.markWritten()
          setPath(result.path)
          setSaveState(current.dirty ? 'idle' : 'saved')
          return true
        }
        // a sibling copy holding the disk version is not a failure: an
        // automatic save is deferred silently and a declined overwrite keeps
        // the map dirty, exactly like the other editors' guard
        const deferred = !result.ok && result.error === 'external-modified'
        setSaveState(result.ok || deferred ? 'idle' : 'failed')
        if (!result.ok && !deferred) console.error('[mindmap] save failed:', result.error)
        return false
      } catch (err) {
        console.error('[mindmap] save failed:', err)
        setSaveState('failed')
        return false
      } finally {
        savingRef.current = false
      }
    },
    [flushAll, recovery],
  )

  // autosave: every 30s and on window blur; untitled maps wait for an explicit first save
  useEffect(() => {
    if (!autoSave || !path) return
    const tick = (onTimer: boolean): void => {
      if (savingRef.current) return
      const maps = [...controllers.current.values()]
      // An input method is composing: this save waits for the next occasion rather than cut into it.
      if (maps.some((each) => each.composing)) return
      // The timer does not close a title the user is in the middle of typing; the
      // next tick, leaving the window or a save by hand takes it.
      if (onTimer && maps.some((each) => each.editingText)) return
      flushAll()
      if (!sessionRef.current?.dirty) return
      void doSave('save', true)
    }
    const onTimer = (): void => tick(true)
    const onBlur = (): void => tick(false)
    const id = window.setInterval(onTimer, AUTO_SAVE_INTERVAL_MS)
    window.addEventListener('blur', onBlur)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('blur', onBlur)
    }
  }, [autoSave, path, doSave, flushAll])

  // ---- undo, redo and the other commands (toolbar, keyboard, menu: one way in) ----

  const activeController = useCallback(
    () => (activeKey ? (controllers.current.get(activeKey) ?? null) : null),
    [activeKey],
  )

  const runCommand = useCallback(
    (command: MindmapMenuCommand) => {
      const map = activeController()
      if (!map) return
      switch (command) {
        case 'undo':
        case 'redo':
          // While a title is being typed the keystroke belongs to the text, not to the map's history.
          if (typingInText()) document.execCommand(command)
          else if (command === 'undo') map.undo()
          else map.redo()
          break
        case 'add-child':
          map.addChild()
          break
        case 'add-sibling':
          map.addSibling()
          break
        case 'fold-all':
          map.setAllFolded(true)
          break
        case 'unfold-all':
          map.setAllFolded(false)
          break
        case 'zoom-in':
          map.zoomIn()
          break
        case 'zoom-out':
          map.zoomOut()
          break
        case 'zoom-reset':
          map.zoomReset()
          break
        case 'zoom-fit':
          map.zoomFit()
          break
      }
    },
    [activeController],
  )

  // ---- presentation (F5): the map alone, no ribbon or sheet tabs ----

  /** Where the presentation is: 0 is the whole map, n the n-th main topic. */
  const presentAt = useRef(0)
  /** The editor's zoom when the show started, given back when it ends. */
  const zoomBeforePresent = useRef<number | null>(null)
  const fitPresented = useCallback(() => {
    // the fullscreen bounds arrive after the event, so fit once the view has resized
    presentAt.current = 0
    window.setTimeout(() => activeController()?.presentStep(presentAt.current), 80)
  }, [activeController])

  /** The next or the previous step of the presentation, kept within the map's main topics. */
  const presentMove = useCallback(
    (by: number) => {
      const controller = activeController()
      if (!controller) return
      const next = Math.max(0, Math.min(controller.presentSteps, presentAt.current + by))
      if (next === presentAt.current) return
      presentAt.current = next
      controller.presentStep(next)
    },
    [activeController],
  )

  const exitPresent = useCallback(() => {
    setPresenting(false)
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  }, [])

  const enterPresent = useCallback(() => {
    // a title still being typed belongs to the map before the chrome goes away
    flushAll()
    zoomBeforePresent.current = activeController()?.zoom ?? null
    setPresenting(true)
    const root = document.documentElement
    if (!document.fullscreenElement && root.requestFullscreen)
      void root.requestFullscreen().then(fitPresented, fitPresented)
    else fitPresented()
  }, [flushAll, fitPresented, activeController])

  // the show enlarges the map step by step; the editor gets back the zoom it had
  useEffect(() => {
    if (presenting) return
    const scale = zoomBeforePresent.current
    if (scale === null) return
    zoomBeforePresent.current = null
    // leaving full screen resizes the view a moment after the event
    const timer = window.setTimeout(() => activeController()?.restoreView(scale), 80)
    return () => window.clearTimeout(timer)
  }, [presenting, activeController])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (status !== 'ready') return
      if (presenting && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const by = PRESENT_KEYS[event.key]
        if (by !== undefined) {
          // the map's own keys (move the selection, open the edit box) wait until the show is over
          event.preventDefault()
          event.stopPropagation()
          presentMove(by)
          return
        }
      }
      const action = presentationKeyOf(event, presenting)
      if (!action) return
      // F5 and Ctrl/Cmd/Shift+F5 both start the map's show; it has one view.
      event.preventDefault()
      if (action === 'exit') {
        // the map's own Esc (cancel a pick, close the edit box) waits until the show is over
        event.stopPropagation()
        exitPresent()
      } else enterPresent()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [status, presenting, enterPresent, exitPresent, presentMove])

  useEffect(() => {
    const onFullScreenChange = (): void => {
      if (document.fullscreenElement) fitPresented()
      else setPresenting(false)
    }
    document.addEventListener('fullscreenchange', onFullScreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange)
  }, [fitPresented])

  useEffect(() => {
    const api = window.mindmapApi
    const offSave = api.onSaveRequest((mode) => {
      if (statusRef.current !== 'ready') {
        api.sendSaveRequestAck(false)
        return
      }
      void doSave(mode).then((saved) => {
        // a save that failed before it reached the main process still has someone waiting
        if (!saved) api.sendSaveRequestAck(false)
      })
    })
    const offClose = api.onCloseSaveRequest(() => {
      void (async () => {
        while (savingRef.current) await new Promise((resolve) => setTimeout(resolve, 50))
        flushAll()
        if (!sessionRef.current?.dirty) {
          api.sendCloseSaveResult(true)
          return
        }
        api.sendCloseSaveResult(await doSave('save'))
      })()
    })
    const offRenamed = api.onFileRenamed((next) => setPath(next))
    const offMenu = api.onMenuCommand(runCommand)
    // Questions from the in-app MCP server. Staying silent while the map is
    // still loading keeps the asker retrying instead of failing.
    const offOutline = api.onOutlineRequest(() => {
      if (statusRef.current === 'loading') return
      const current = sessionRef.current
      if (!current) {
        api.sendOutlineResult({ error: 'the file did not open, so there is no map to read' })
        return
      }
      try {
        flushAll()
        api.sendOutlineResult({ text: current.outline() })
      } catch (err) {
        api.sendOutlineResult({ error: err instanceof Error ? err.message : String(err) })
      }
    })
    const offBytes = api.onBytesRequest(() => {
      if (statusRef.current === 'loading') return
      const current = sessionRef.current
      if (!current) {
        api.sendBytesResult({ error: 'the file did not open, so there is no map to read' })
        return
      }
      flushAll()
      current
        .produceBytes()
        .then((bytes) => api.sendBytesResult({ bytes }))
        .catch((err: unknown) =>
          api.sendBytesResult({ error: err instanceof Error ? err.message : String(err) }),
        )
    })
    const offChrome = api.onChromePressed(() => activeController()?.cancelRelationshipPick())
    return () => {
      offSave()
      offClose()
      offRenamed()
      offMenu()
      offOutline()
      offBytes()
      offChrome()
    }
  }, [doSave, flushAll, runCommand, activeController])

  // ---- find and replace (Ctrl+F, Ctrl+H) ----

  /** Every sheet as the engine sees it now, folded branches included. */
  const findSheets = useCallback(() => {
    const current = sessionRef.current
    if (!current) return []
    return current.tabs().map((tab) => ({ key: tab.key, root: current.view(tab.key).root }))
  }, [])

  const openFind = useCallback(
    (withReplace: boolean) => {
      // a title still being typed is part of what is searched
      flushAll()
      setFind((was) =>
        was
          ? { ...was, withReplace: was.withReplace || withReplace }
          : {
              withReplace,
              query: '',
              options: { matchCase: false, inNotes: false },
              matches: [],
              index: -1,
              message: null,
            },
      )
    },
    [flushAll],
  )

  const findQuery = (query: string, options: FindOptions): void => {
    flushAll()
    const matches = findMatches(findSheets(), query, options)
    setFind((was) => was && { ...was, query, options, matches, index: -1, message: null })
  }

  /** Shows one match: its sheet comes up, the branches above it unfold, it is selected. */
  const showMatch = async (state: FindState, target: FindMatch): Promise<void> => {
    const map = await controllerFor(ai.host, target.sheetKey)
    map?.revealTopic(target.topicId)
    // showing it may have unfolded a branch: the matches are read again
    const matches = findMatches(findSheets(), state.query, state.options)
    const index = matches.findIndex(
      (match) => match.sheetKey === target.sheetKey && match.topicId === target.topicId,
    )
    setFind((was) => was && { ...was, matches, index, message: null })
  }

  const findStep = async (direction: 1 | -1): Promise<void> => {
    if (!find) return
    flushAll()
    const matches = findMatches(findSheets(), find.query, find.options)
    if (matches.length === 0) {
      setFind((was) => was && { ...was, matches, index: -1 })
      return
    }
    const was = find.matches[find.index]
    const at = was
      ? matches.findIndex(
          (match) => match.sheetKey === was.sheetKey && match.topicId === was.topicId,
        )
      : -1
    const next =
      at < 0
        ? direction === 1
          ? 0
          : matches.length - 1
        : (at + direction + matches.length) % matches.length
    await showMatch(find, matches[next]!)
  }

  const findReplace = async (replacement: string): Promise<void> => {
    if (!find) return
    const current = find.matches[find.index]
    if (current?.where !== 'title') {
      await findStep(1)
      return
    }
    const map = await controllerFor(ai.host, current.sheetKey)
    map?.replaceInTitles(find.query, replacement, find.options.matchCase, current.topicId)
    const matches = findMatches(findSheets(), find.query, find.options)
    if (matches.length === 0) {
      setFind((was) => was && { ...was, matches, index: -1 })
      return
    }
    // the next match has moved into the place of the one replaced
    await showMatch(find, matches[Math.min(find.index, matches.length - 1)]!)
  }

  const findReplaceAll = async (replacement: string): Promise<void> => {
    if (!find) return
    flushAll()
    const back = activeKey
    const titlesOnly = { ...find.options, inNotes: false }
    const keys = [
      ...new Set(findMatches(findSheets(), find.query, titlesOnly).map((match) => match.sheetKey)),
    ]
    let sheets = 0
    let count = 0
    for (const key of keys) {
      const map = await controllerFor(ai.host, key)
      const replaced = map?.replaceInTitles(find.query, replacement, find.options.matchCase) ?? 0
      if (replaced > 0) {
        sheets++
        count += replaced
      }
    }
    if (back) setActiveKey(back)
    const matches = findMatches(findSheets(), find.query, find.options)
    setFind(
      (was) => was && { ...was, matches, index: -1, message: t('findReplaced', { sheets, count }) },
    )
  }

  // ---- the picture of the selected topic (Insert tab) ----

  const pickPicture = async (): Promise<void> => {
    const map = controller
    const topicId = map?.selectedTopicIds().at(-1)
    if (!map || !topicId) {
      say('selectTopicFirst')
      return
    }
    if (map.hasPicture(topicId)) {
      map.setPicture(topicId, null)
      return
    }
    const picked = await window.mindmapApi.pickPicture()
    if (picked.status === 'canceled') return
    if (picked.status === 'too-large') return say('pictureTooLarge')
    if (picked.status === 'unreadable') return say('pictureFailed')
    const picture = pictureFromBase64(picked.base64)
    if (!picture) return say('pictureUnsupported')
    if (!map.setPicture(topicId, picture)) say('pictureFailed')
  }

  // ---- sorting the branches of the selected topic (Format tab) ----

  const sortSelected = async (): Promise<void> => {
    const map = controller
    const topicId = map?.selectedTopicIds().at(-1)
    if (!map || !topicId) {
      say('selectTopicFirst')
      return
    }
    // a second press on branches already in order turns them the other way
    const descending = map.sortDirection(topicId, lang)
    if (map.sortNarrowsRanges(topicId, descending, lang)) {
      const ok = await ask({
        kind: 'sort-narrow',
        title: t('sortNarrowTitle'),
        body: t('sortNarrowBody'),
        confirmLabel: t('sortConfirm'),
      })
      if (!ok) return
    }
    map.sortChildren(topicId, descending, lang)
  }

  // Ctrl+S / Ctrl+Shift+S, and undo or redo pressed while the map itself does not have the keyboard
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 's') {
        event.preventDefault()
        void doSave(event.shiftKey ? 'saveAs' : 'save')
        return
      }
      if ((key === 'f' || key === 'h') && !event.shiftKey && statusRef.current === 'ready') {
        event.preventDefault()
        openFind(key === 'h')
        return
      }
      if (key !== 'z' && key !== 'y') return
      const target = event.target instanceof Element ? event.target : null
      // the map handles its own keys, and a text field its own undo
      if (target?.closest('.map-container') || typingInText()) return
      event.preventDefault()
      runCommand(key === 'y' || event.shiftKey ? 'redo' : 'undo')
    }
    // Captured: the edit box of a title keeps its keys to itself, and Ctrl+S has to work while typing.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [doSave, runCommand, openFind])

  // export, print and the preview picture a save writes (export/use-map-export.ts)
  const [printPage, setPrintPage] = useState<string | null>(null)
  const exporter = useMapExport({
    session,
    controllers,
    activeKey,
    path,
    flushAll,
    say,
    openPrint: setPrintPage,
  })
  const printJob = useCallback(
    async (job: PrintJob): Promise<PrintResult> => {
      if (printPage === null) return { ok: true, canceled: true }
      try {
        const result = await window.mindmapApi.print({ html: printPage, job })
        if (!result.ok) console.error('[mindmap] print failed:', result.error)
        else if (!('canceled' in result)) say('printSent')
        return result
      } catch (error) {
        console.error('[mindmap] print failed:', error)
        return { ok: false, error: String(error) }
      }
    },
    [printPage, say],
  )
  const closePrint = useCallback(() => setPrintPage(null), [])

  // ---- sheets ----

  const selectSheet = (key: string): void => {
    noteRef.current?.commit()
    activeController()?.flush()
    setActiveKey(key)
  }

  const addSheet = (): void => {
    if (!session) return
    activeController()?.flush()
    const added = session.addSheet({
      title: t('sheetDefaultName', { n: session.tabs().length + 1 }),
      rootTitle: t('centralTopic'),
    })
    setActiveKey(added.key)
  }

  const deleteSheet = (key: string): void => {
    if (!session) return
    const index = session.indexOf(key)
    void deleteSheetAfterConfirm(session, key, (title) =>
      ask({
        kind: 'delete-sheet',
        title: translate('deleteSheetTitle'),
        body: translate('deleteSheetBody', { name: title }),
        confirmLabel: translate('btnDelete'),
      }),
    ).then((outcome) => {
      if (outcome === 'last-sheet') say('lastSheetNote')
      if (outcome !== 'deleted') return
      const left = session.tabs()
      setActiveKey((current) =>
        current === key ? (left[Math.min(index, left.length - 1)]?.key ?? null) : current,
      )
    })
  }

  // ---- the theme of the sheet that is open ----

  const pickTheme = (id: ThemeId): void => {
    if (!controller?.setTheme(id) || !session) return
    // the sheet now carries a theme of this app: the notice about the default look may no longer apply
    if (!session.hasUnknownTheme()) {
      setNotices((current) =>
        current.unknownTheme ? { ...current, unknownTheme: false } : current,
      )
    }
  }

  // ---- labels, notes, links ----

  /** Labels and links are modal; a note belongs in the side panel, where it stays while the map is used. */
  const openTopicField = (field: TopicRequest, topicId: string): void => {
    if (field === 'note') {
      setThemeOpen(false)
      setIconsOpen(false)
      ai.setOpen(false)
      if (noteOpen) noteRef.current?.focus()
      else setNoteOpen(true)
      return
    }
    openField(field, topicId)
  }
  openTopicFieldRef.current = openTopicField

  const requestField = (field: TopicRequest): void => {
    const id = controller?.selectedTopicIds().at(-1)
    if (id) openTopicField(field, id)
    else say('selectTopicFirst')
  }

  const submitField = (value: string): boolean => {
    const map = controller
    if (!map || !fieldRequest) return true
    const { field, topicId } = fieldRequest
    if (field === 'boundary') {
      return map.setBoundaryTitle(topicId, fieldRequest.boundaryId ?? '', value)
    }
    if (field === 'label') return map.setLabels(topicId, value.split(LABEL_SEPARATORS))
    if (field === 'note') return map.setNote(topicId, value)
    // Any address is kept; the controller turns down only a reference into the file.
    return map.setLink(topicId, linkFromInput(value))
  }

  // computed on every render: `t` is a new function each time and must not be a hook dependency
  const statusText =
    toast !== null
      ? t(toast.key, toast.params)
      : saveState === 'saving'
        ? t('saving')
        : saveState === 'failed'
          ? t('saveFailedStatus')
          : dirty
            ? t('unsaved')
            : saveState === 'saved'
              ? t('savedOk')
              : ''

  if (status === 'error') return <div className="center-note">{t('loadFailed')}</div>
  if (status === 'loading') return <div className="center-note">{t('loading')}</div>
  if (status === 'failed') {
    return (
      <div className="center-note" role="alert" data-open-failure={failure ?? 'unreadable'}>
        {t(OPEN_FAILURE_TEXT[failure ?? 'unreadable'])}
      </div>
    )
  }

  const hasTopic = (controller?.selectedTopicIds().length ?? 0) > 0
  const selectedId = controller?.selectedTopicIds().at(-1)
  const selectedTopic = selectedId ? (controller?.topic(selectedId) ?? null) : null
  const picking = controller?.pickingRelationship ?? false
  const selectedIds = controller?.selectedTopicIds() ?? []
  const selectedMarkers = selectedIds.map((id) => controller?.markersOf(id) ?? [])
  const commonMarkers = (selectedMarkers[0] ?? []).filter((id) =>
    selectedMarkers.every((markers) => markers.includes(id)),
  )
  const presentFamilies = new Set(
    selectedMarkers
      .flat()
      .map(markerFamily)
      .filter((family): family is MarkerFamily => family !== null),
  )

  /** A marker on the map was pressed: its menu opens under it. */
  const onMapClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof Element)) return
    const glyph = event.target.closest<SVGElement>('.mm-marker[data-marker-index]')
    const topicId = glyph?.closest<HTMLElement>('me-tpc')?.dataset.nodeid?.replace(/^me/, '')
    if (!glyph || !topicId || !controller) return
    const index = Number(glyph.dataset.markerIndex)
    const id = controller.markersOf(topicId)[index]
    if (id === undefined) return
    event.stopPropagation()
    const box = glyph.getBoundingClientRect()
    setMarkerMenu({ topicId, index, id, left: box.left, top: box.bottom + 4 })
  }

  return (
    <div className={`app${presenting ? ' mm-presenting' : ''}`}>
      <Toolbar
        disabled={!controller}
        dirty={dirty}
        statusText={statusText}
        canUndo={controller?.canUndo ?? false}
        canRedo={controller?.canRedo ?? false}
        autoSave={autoSave}
        hasTopic={hasTopic}
        hasPicture={selectedId ? (controller?.hasPicture(selectedId) ?? false) : false}
        findOpen={find !== null}
        hiddenParts={hiddenParts}
        layout={controller?.layout ?? 'both'}
        layoutExact={controller?.layoutExact ?? true}
        pickingRelationship={picking}
        themeOpen={themeOpen}
        aiOpen={ai.open}
        noteOpen={noteOpen}
        iconsOpen={iconsOpen}
        onSave={() => void doSave('save')}
        onSaveAs={() => void doSave('saveAs')}
        onUndo={() => runCommand('undo')}
        onRedo={() => runCommand('redo')}
        onToggleAutoSave={setAutoSave}
        onAddChild={() => runCommand('add-child')}
        onAddSibling={() => runCommand('add-sibling')}
        onRelationship={() => {
          if (picking) controller?.cancelRelationshipPick()
          else if (!controller?.pickRelationshipTarget()) say('selectTopicFirst')
        }}
        onSummary={() => {
          if (!controller?.addSummary()) say('selectTopicFirst')
        }}
        onBoundary={() => {
          if (!controller?.addBoundary()) say('selectTopicFirst')
        }}
        style={{
          style: selectedId ? (controller?.styleOf(selectedId) ?? {}) : {},
          themeColors: controller?.themeColors ?? [],
          painting: controller?.painting ?? false,
          onStyle: (patch) => controller?.setStyle(selectedIds, patch),
          onToggle: (which) => {
            if (!controller) return
            if (which === 'bold') controller.toggleBold(selectedIds)
            else if (which === 'italic') controller.toggleItalic(selectedIds)
            else controller.toggleDecoration(selectedIds, which)
          },
          onFontStep: (up) => controller?.stepFontSize(selectedIds, up),
          onPainter: (sticky) => {
            if (!controller) return
            // a second click of a double click turns a painter just started into one that stays on
            if (controller.painting && !sticky) controller.stopPainting()
            else if (!controller.startPainting(sticky)) say('selectTopicFirst')
          },
          onClear: () => controller?.clearStyle(selectedIds),
        }}
        onFind={() => (find ? setFind(null) : openFind(false))}
        onDelete={() => {
          const ids = controller?.selectedTopicIds() ?? []
          if (ids.length === 0) say('selectTopicFirst')
          else void controller?.removeTopics(ids)
        }}
        onPicture={() => void pickPicture()}
        onIcons={() => {
          closeNote()
          setThemeOpen(false)
          ai.setOpen(false)
          setIconsOpen((open) => !open)
        }}
        onSort={() => void sortSelected()}
        onPresent={enterPresent}
        onFoldLevel={(level) => controller?.foldToLevel(level)}
        onToggleHiddenPart={(part) =>
          setHiddenParts((parts) =>
            parts.includes(part) ? parts.filter((each) => each !== part) : [...parts, part],
          )
        }
        onZoomReset={() => runCommand('zoom-reset')}
        onNote={() => requestField('note')}
        onLabel={() => requestField('label')}
        onLink={() => requestField('link')}
        onLayout={(layout: ViewLayout) => controller?.setLayout(layout)}
        onToggleTheme={() => {
          closeNote()
          ai.setOpen(false)
          setIconsOpen(false)
          setThemeOpen((open) => !open)
        }}
        onFoldAll={() => runCommand('fold-all')}
        onUnfoldAll={() => runCommand('unfold-all')}
        onZoomIn={() => runCommand('zoom-in')}
        onZoomOut={() => runCommand('zoom-out')}
        onZoomFit={() => runCommand('zoom-fit')}
        onToggleAi={() => {
          closeNote()
          setThemeOpen(false)
          setIconsOpen(false)
          ai.setOpen(!ai.open)
        }}
        onExport={exporter.exportAs}
        onPrint={exporter.print}
        onOpen={() => void window.mindmapApi.openFileDialog().catch(() => {})}
        mapSaved={path !== null}
        onMakeFromDocument={() => {
          if (path === null) say('makeFromNeedsSave')
          else window.mindmapApi.makeFromDocument?.()
        }}
        onSendTo={window.mindmapApi.sendToDocument ? (target) => setSendTarget(target) : undefined}
        onSync={window.mindmapApi.syncCheck ? () => setSyncOpen(true) : undefined}
        onCredits={() => {
          flushAll()
          setCreditsOpen(true)
        }}
        onDesign={
          window.mindmapApi.sendToDesign && session && activeKey
            ? () => {
                flushAll()
                void sheetOutline(session, activeKey).then(({ outline }) =>
                  window.mindmapApi.sendToDesign?.(outlineAsIndentedText(outline)),
                )
              }
            : undefined
        }
      />

      {creditsOpen && session && (
        <CreditCheckDialog
          sheets={findSheets()}
          onGo={(sheetKey, topicId) => {
            setCreditsOpen(false)
            void controllerFor(ai.host, sheetKey).then((map) => map?.revealTopic(topicId))
          }}
          onClose={() => setCreditsOpen(false)}
        />
      )}

      {syncOpen && session && (
        <SyncDialog
          session={session}
          host={ai.host}
          mapPath={path}
          flush={flushAll}
          onClose={() => setSyncOpen(false)}
        />
      )}

      {sendTarget && session && activeKey && (
        <SendDialog
          target={sendTarget}
          session={session}
          sheetKey={activeKey}
          mapPath={path}
          flush={flushAll}
          onClose={() => setSendTarget(null)}
          onSent={(warning) => {
            setSendTarget(null)
            setSendNotice(warning ?? t('sendDone'))
          }}
        />
      )}

      {(notices.preserved > 0 || notices.unknownTheme || picking || sendNotice) && (
        <div className="mm-notices">
          {sendNotice && (
            <Notice kind="hanpan-send" text={sendNotice} onClose={() => setSendNotice(null)} />
          )}
          {notices.preserved > 0 && (
            <Notice
              kind="preserved"
              text={t('noticePreserved', { count: notices.preserved })}
              onClose={() => setNotices((current) => ({ ...current, preserved: 0 }))}
            />
          )}
          {notices.unknownTheme && (
            <Notice
              kind="theme"
              text={t('noticeTheme')}
              onClose={() => setNotices((current) => ({ ...current, unknownTheme: false }))}
            />
          )}
          {picking && (
            <Notice
              kind="pick-relationship"
              text={t('pickRelationship')}
              onClose={() => controller?.cancelRelationshipPick()}
            />
          )}
        </div>
      )}

      <main className="mm-stage">
        {/* the theme panel and the AI panel dock at this element's end side, one open at a time */}
        <div
          className="mm-card"
          aria-label={t('appName')}
          onClickCapture={(event) => {
            if (presenting) {
              event.stopPropagation()
              presentMove(1)
              return
            }
            onMapClick(event)
          }}
        >
          {presenting && (
            <div className="mm-present-hint" data-hint="present" role="note">
              {t('presentHint')}
            </div>
          )}
          {startHint && !presenting && (
            <div className="mm-start-hint" data-hint="new-map" role="note">
              {t('newMapHint')}
            </div>
          )}
          {find && !presenting && (
            <FindBar
              withReplace={find.withReplace}
              matches={find.matches}
              index={find.index}
              message={find.message}
              onQuery={findQuery}
              onStep={(direction) => void findStep(direction)}
              onReplace={(replacement) => void findReplace(replacement)}
              onReplaceAll={(replacement) => void findReplaceAll(replacement)}
              onShowReplace={() => openFind(true)}
              onClose={() => setFind(null)}
            />
          )}
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className="mm-sheet-host"
              data-sheet-host={tab.key}
              hidden={tab.key !== activeKey}
              ref={(el) => {
                if (el) hosts.current.set(tab.key, el)
                else hosts.current.delete(tab.key)
              }}
            />
          ))}
        </div>
        {themeOpen && controller && (
          <ThemePanel
            themeId={controller.themeId}
            written={controller.themeWritten}
            disabled={!controller}
            onPick={pickTheme}
            onClose={() => setThemeOpen(false)}
          />
        )}
        {iconsOpen && controller && (
          <IconPanel
            common={commonMarkers}
            hasTopic={hasTopic}
            present={presentFamilies}
            anyMarker={selectedMarkers.some((markers) => markers.length > 0)}
            onToggle={(id) => {
              if (!controller.toggleMarker(controller.selectedTopicIds(), id)) {
                say('selectTopicFirst')
              }
            }}
            onRemove={(family) => controller.takeOffMarkers(controller.selectedTopicIds(), family)}
            onClose={() => setIconsOpen(false)}
          />
        )}
        {markerMenu && controller && !presenting && (
          <MarkerMenu
            request={markerMenu}
            onPick={(id) => {
              const markers = controller.markersOf(markerMenu.topicId)
              if (markers[markerMenu.index] !== markerMenu.id) return setMarkerMenu(null)
              controller.setMarkers(markerMenu.topicId, withMarker(markers, id))
              setMarkerMenu(null)
            }}
            onRemove={() => {
              const markers = controller.markersOf(markerMenu.topicId)
              if (markers[markerMenu.index] === markerMenu.id) {
                controller.setMarkers(
                  markerMenu.topicId,
                  markers.filter((_, at) => at !== markerMenu.index),
                )
              }
              setMarkerMenu(null)
            }}
            onClose={() => setMarkerMenu(null)}
          />
        )}
        {noteOpen && (
          <NotePanel
            ref={noteRef}
            sheetKey={activeKey ?? ''}
            topic={selectedTopic}
            onCommit={(topicId, note) => controller?.setNote(topicId, note)}
            onClose={closeNote}
          />
        )}
        <MindmapAiDock
          ai={ai}
          filePath={path}
          request={handoff.request}
          onRunStart={handoff.onRunStart}
          templateDocument={templateDocument}
          onSkillHandoff={() => {
            closeNote()
            setThemeOpen(false)
            setIconsOpen(false)
            ai.setOpen(true)
          }}
        />
      </main>

      <footer className="mm-foot">
        <SheetTabs
          tabs={tabs}
          activeKey={activeKey}
          disabled={!session}
          onSelect={selectSheet}
          onAdd={addSheet}
          onRename={(key, title) => session?.renameSheet(key, title)}
          onDelete={deleteSheet}
        />
        <button
          type="button"
          className="mm-zoom"
          data-action="zoom-reset"
          data-tip={t('zoomReset')}
          disabled={!controller}
          onClick={() => runCommand('zoom-reset')}
        >
          {Math.round((controller?.zoom ?? 1) * 100)}%
        </button>
      </footer>

      {confirm && <ConfirmDialog request={confirm} onAnswer={answer} />}
      {printPage !== null && (
        <PrintDialog html={printPage} onPrint={printJob} onClose={closePrint} />
      )}
      {fieldRequest && (
        <TopicFieldDialog
          key={`${fieldRequest.field}:${fieldRequest.topicId}`}
          request={fieldRequest}
          onSubmit={submitField}
          linkKind={linkInputKind}
          onClose={() => setFieldRequest(null)}
        />
      )}
    </div>
  )
}
