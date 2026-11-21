/**
 * The AI Drawing editor screen, laid out as the approved mock-up: the ribbon
 * on top (with the title and the saved state), a notice line when the file
 * did not open as asked, the 3D view in the middle (or the guide for a CAD
 * program's file, or the explanation when this PC cannot show 3D), the
 * property panel and the AI assistant's place on the right, and the status
 * line at the bottom.
 *
 * The tab holds one boolean kernel (manifold wasm) and evaluates the document
 * on every history change; unchanged parts come from its cache. Every edit,
 * from the ribbon, the shortcuts, the menu, the property panel, the handles
 * and the sketch bar, is one `history.edit` (editing/commands.ts). An edit
 * the engine refuses (a locked part) leaves the document as it is and says
 * why on the status line.
 *
 * The AI pane (ai/) sits under the property panel. One request of it is one
 * undo step: it edits through the same history, inside one history group.
 * Its quick actions open the sheet dialog and run the send below.
 *
 * Measuring (measure/), the dimension sheet dialog, "Copy picture" and
 * "Send to Hangul / Word" (sheet/) read the drawing as it is when they run;
 * the only edit among them is the title block, one `history.edit`. A
 * measurement is cleared by any change of the drawing and by Esc.
 *
 * Open, save, the close prompt's save, the save request answer, the unsaved
 * mark, renames, crash-recovery copies and the in-app MCP server's questions
 * follow the mind map editor (apps/mindmap/src/renderer/App.tsx).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CadEditError,
  addPart,
  createDocument,
  partSize,
  worldBounds,
  type CadDocument,
  type EvaluatedPart,
  type ExtrudePart,
  type Kernel,
  type ShapeKind,
} from '@genoffice/cad-engine'
import { useAutoSavePref } from '@genoffice/ui'
import type { CadMenuCommand, SaveMode } from '../shared/ipc'
import { CadAiDock, useCadAi } from './ai/AiDock'
import { MeasureOverlay } from './measure/MeasureOverlay'
import { MeasureTool, bindMeasure, measureEntities, measureSnaps } from './measure/measure-tool'
import { SheetDialog } from './sheet/SheetDialog'
import {
  copyPng,
  copySheet,
  runSend,
  sheetBlocked,
  type SendTarget,
  type SheetSource,
} from './sheet/send'
import {
  PICTURE_LIMIT_BYTES,
  browserRasterize,
  sheetLabels,
  todayIso,
  type Rasterize,
} from './sheet/sheet-png'
import { useSendTarget } from './sheet/use-send-target'
import { GuideScreen } from './components/GuideScreen'
import { PropertyPanel, type PanelPatch } from './components/PropertyPanel'
import { Ribbon } from './components/Ribbon'
import { SketchBar } from './components/SketchBar'
import { StatusBar, type PartSize, type StatusMessage } from './components/StatusBar'
import { useAutoSave } from './document/autosave'
import { openResult, type OpenedDrawing, type OpenNotice } from './document/open'
import { RECOVERY_COPY_TIMING, useRecoveryCopies } from './document/recovery-copies'
import { CadSession } from './document/session'
import {
  alignSelected,
  deleteSelected,
  duplicateSelected,
  groupSelected,
  nudge,
  placeShape,
  selectAll,
  setProperty,
  toggleHole,
  ungroupSelected,
  type CommandResult,
} from './editing/commands'
import { selection, useSelection } from './editing/selection'
import { installShortcuts, type ShortcutAction } from './editing/shortcuts'
import { SketchTool } from './editing/sketch'
import { loadTextFont, textOutlines } from './editing/text-outlines'
import { useCadExport } from './export/use-export'
import { t as translate, useI18n, type StringKey } from './i18n/locale'
import { NoWebGl } from './scene/NoWebGl'
import type { CanvasTheme } from './scene/canvas-colors'
import { DocEvaluator, loadKernel } from './scene/evaluator'
import { HandleRefusedError, MOVE_SNAP_MM, type DocChange, type HandleMode } from './scene/handles'
import { sceneModel } from './scene/scene-model'
import { drawingLines } from './scene/drawing-lines'
import { EntityEditTool, bindEntityEdit } from './editing/entity-edit'
import { EntityEditBar } from './editing/EntityEditBar'
import {
  createViewport,
  type MeasureView,
  type Viewport,
  type ViewportFactory,
} from './scene/viewport'

type LoadStatus = 'loading' | 'ready'
type SaveState = 'idle' | 'saving' | 'saved' | 'refused' | 'failed'

const NOTICE_TEXT: Record<OpenNotice, StringKey> = {
  'not-ok': 'noticeNotOk',
  'too-large': 'noticeTooLarge',
  unreadable: 'noticeUnreadable',
  unsupported: 'noticeUnsupported',
  'import-failed': 'noticeImportFailed',
}

/** The size of a new text shape's letters, in millimetres. */
const TEXT_SIZE_MM = 20
/** A text shape is named after its words, up to this many characters. */
const TEXT_NAME_MAX = 40

/** The theme the page shows now: the shell's setting, or the OS one under "system". */
function pageTheme(): CanvasTheme {
  const set = document.documentElement.getAttribute('data-theme')
  if (set === 'dark' || set === 'light') return set
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** What a send or copy answers when another one is still running. */
const BUSY = Symbol('busy')

/** The status-line text for a handle edit that was refused. */
function refusalText(err: unknown): StringKey {
  if (err instanceof HandleRefusedError) return 'editNotScalable'
  if (err instanceof CadEditError && err.code === 'locked') return 'editLocked'
  return 'editRefused'
}

const untitledDrawing = (notice: OpenNotice | null): OpenedDrawing => ({
  session: new CadSession(createDocument(), { title: translate('untitled') }),
  notice,
})

export interface AppProps {
  /** makes the 3D view; tests hand in a fake so they need no WebGL */
  viewportFactory?: ViewportFactory
  /** starts the boolean kernel; tests hand in their own */
  kernelFactory?: () => Promise<Kernel>
  /** draws the sheet as PNG; tests hand in their own (jsdom has no canvas) */
  rasterize?: Rasterize
}

export default function App({
  viewportFactory = createViewport,
  kernelFactory = loadKernel,
  rasterize = browserRasterize,
}: AppProps = {}) {
  const { t } = useI18n()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [session, setSession] = useState<CadSession | null>(null)
  const [doc, setDoc] = useState<CadDocument | null>(null)
  const [notice, setNotice] = useState<OpenNotice | null>(null)
  const [guide, setGuide] = useState<OpenedDrawing['guide'] | null>(null)
  const [dirty, setDirty] = useState(false)
  const [title, setTitle] = useState('')
  const [path, setPath] = useState<string | undefined>(undefined)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [webgl, setWebgl] = useState(true)
  const [evaluator, setEvaluator] = useState<DocEvaluator | null>(null)
  const [evaluated, setEvaluated] = useState<readonly EvaluatedPart[]>([])
  const [kernelFailed, setKernelFailed] = useState(false)
  const [message, setMessage] = useState<StatusMessage | null>(null)
  const [view, setView] = useState<Viewport | null>(null)
  const [handleMode, setHandleMode] = useState<HandleMode>('move')
  const [sketch, setSketch] = useState<SketchTool | null>(null)
  const [measure, setMeasure] = useState<MeasureTool | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const send = useSendTarget()
  const ai = useCadAi()
  const [autoSave, setAutoSave] = useAutoSavePref('cadapp.autoSave', window.cadApi)
  const selected = useSelection().ids

  const sessionRef = useRef<CadSession | null>(null)
  const statusRef = useRef<LoadStatus>('loading')
  statusRef.current = status
  const savingRef = useRef(false)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<Viewport | null>(null)
  const evaluatorRef = useRef<DocEvaluator | null>(null)
  evaluatorRef.current = evaluator
  const sketchRef = useRef<SketchTool | null>(null)
  sketchRef.current = sketch
  // the "Edit lines" tool for an opened DXF or DWG
  const [lineEdit, setLineEdit] = useState<EntityEditTool | null>(null)
  const lineEditRef = useRef<EntityEditTool | null>(null)
  lineEditRef.current = lineEdit
  const measureRef = useRef<MeasureTool | null>(null)
  measureRef.current = measure
  const sendTargetRef = useRef<SendTarget>(send.target)
  sendTargetRef.current = send.target
  const busyRef = useRef(false)
  const guideRef = useRef(guide)
  guideRef.current = guide

  // ---- opening ----

  useEffect(() => {
    let cancelled = false
    void (async () => {
      let opened: OpenedDrawing
      try {
        const pending = await window.cadApi.consumePending()
        opened = pending
          ? await openResult(await window.cadApi.openFile(pending), translate('untitled'), pending)
          : untitledDrawing(null)
      } catch (err) {
        console.error('[cad] open failed:', err)
        opened = untitledDrawing('unreadable')
      }
      if (cancelled) return
      sessionRef.current = opened.session
      setSession(opened.session)
      setNotice(opened.notice)
      setGuide(opened.guide ?? null)
      setTitle(opened.session.title())
      setPath(opened.session.path())
      setStatus('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // every change of the history: the drawing on screen and the unsaved mark follow
  useEffect(() => {
    if (!session) return
    const sync = (): void => {
      const current = session.history.current()
      selection.prune(current)
      setDoc(current)
      setDirty(session.dirty())
    }
    sync()
    return session.history.subscribe(sync)
  }, [session])

  // mirror the unsaved mark to the main process (close prompt)
  useEffect(() => {
    if (status === 'ready') window.cadApi.setDirty(dirty)
  }, [dirty, status])

  useEffect(() => {
    if (dirty && saveState === 'saved') setSaveState('idle')
  }, [dirty, saveState])

  // ---- editing ----

  /** A command's outcome on the status line: a refusal says why, a success clears the line. */
  const report = useCallback((result: CommandResult): void => {
    setMessage(result.ok ? null : { key: result.message, error: true })
  }, [])

  /** A handle release: one edit; a refusal leaves the drawing as it is and says why. */
  const applyEdit = useCallback((label: string, change: DocChange): void => {
    const current = sessionRef.current
    if (!current) return
    try {
      current.history.edit(label, change)
      setMessage(null)
    } catch (err) {
      if (!(err instanceof CadEditError)) console.error('[cad] edit failed:', err)
      setMessage({ key: refusalText(err), error: true })
    }
  }, [])

  /** Runs a command on the open drawing, unless nothing may be edited now. */
  const command = useCallback(
    (run: (target: CadSession) => CommandResult | void): void => {
      const current = sessionRef.current
      if (!current || statusRef.current !== 'ready' || guideRef.current) return
      const result = run(current)
      if (result) report(result)
    },
    [report],
  )

  const placeText = useCallback(
    (value: string): void => {
      loadTextFont().then(
        (font) => {
          const outlines = textOutlines(font, value, TEXT_SIZE_MM)
          // none of these letters is in the font: nothing to stand up
          if (outlines.length === 0) {
            setMessage({ key: 'editRefused', error: true })
            return
          }
          command((s) =>
            placeShape(s, 'text', {
              name: value.slice(0, TEXT_NAME_MAX),
              dims: { size: TEXT_SIZE_MM },
              text: { value, outlines },
            }),
          )
        },
        (err: unknown) => {
          console.error('[cad] the text font did not load:', err)
          setMessage({ key: 'fontFailed', error: true })
        },
      )
    },
    [command],
  )

  /** The sketch button: start an outline, or give up the one being drawn. */
  const toggleSketch = useCallback((): void => {
    const current = sketchRef.current
    if (current) {
      current.cancel()
      setSketch(null)
      return
    }
    if (!sessionRef.current || guideRef.current) return
    selection.clear()
    setMessage(null)
    // one tool at a time: sketching ends measuring and editing lines
    setMeasure(null)
    setLineEdit(null)
    setSketch(new SketchTool(MOVE_SNAP_MM))
  }, [])

  /** The measure button: start measuring, or leave it. */
  const toggleMeasure = useCallback((): void => {
    if (measureRef.current) {
      setMeasure(null)
      return
    }
    const current = sessionRef.current
    if (!current || guideRef.current) return
    sketchRef.current?.cancel()
    setSketch(null)
    setLineEdit(null)
    setMessage(null)
    // the snap points of a drawing are worked out once per state of it (and of the kernel)
    let cached: {
      doc: CadDocument
      evaluator: DocEvaluator | null
      snaps: ReturnType<typeof measureSnaps>
    } | null = null
    const snaps = () => {
      const doc = current.history.current()
      const evaluator = evaluatorRef.current
      if (cached?.doc !== doc || cached.evaluator !== evaluator) {
        cached = { doc, evaluator, snaps: measureSnaps(doc, evaluator?.update(doc) ?? []) }
      }
      return cached.snaps
    }
    setMeasure(new MeasureTool(snaps, () => measureEntities(current.history.current())))
  }, [])

  /** The "Edit lines" button: pick and change the lines of an opened DXF or DWG, or leave it. */
  const toggleLineEdit = useCallback((): void => {
    if (lineEditRef.current) {
      setLineEdit(null)
      return
    }
    const current = sessionRef.current
    if (!current || guideRef.current) return
    sketchRef.current?.cancel()
    setSketch(null)
    setMeasure(null)
    setMessage(null)
    selection.clear()
    setLineEdit(new EntityEditTool(current.history))
  }, [])

  // Delete removes the picked lines, Esc forgets them (then leaves the tool); a new drawing ends it
  useEffect(() => {
    if (!lineEdit) return
    const off = bindEntityEdit(lineEdit, {
      keys: window,
      onExit: () => setLineEdit(null),
      onRefused: (err) => setMessage({ key: refusalText(err), error: true }),
    })
    return () => {
      off()
      lineEdit.dispose()
    }
  }, [lineEdit])
  useEffect(() => setLineEdit(null), [session])

  // a measurement goes with any change of the drawing; Esc clears it, then leaves the tool
  useEffect(() => {
    if (!measure || !session) return
    return bindMeasure(measure, {
      history: session.history,
      keys: window,
      onExit: () => setMeasure(null),
    })
  }, [measure, session])

  const finishSketch = useCallback(
    (part: ExtrudePart): void => {
      const named: ExtrudePart = { ...part, name: translate('partExtrude') }
      let result: CommandResult = { ok: true }
      try {
        sessionRef.current?.history.edit('sketch', (current) => addPart(current, named))
      } catch (err) {
        console.error('[cad] the sketch could not be added:', err)
        result = { ok: false, message: 'editRefused' }
      }
      report(result)
      setSketch(null)
      if (result.ok) selection.set([named.id])
    },
    [report],
  )

  // ---- the boolean kernel: one per tab ----

  useEffect(() => {
    let made: DocEvaluator | null = null
    let cancelled = false
    kernelFactory().then(
      (kernel) => {
        if (cancelled) {
          kernel.dispose()
          return
        }
        made = new DocEvaluator(kernel)
        setEvaluator(made)
      },
      // the plate still shows and the drawing can be edited and saved; the status line
      // says why no part appears (a reopened tab tries again)
      (err: unknown) => {
        console.error('[cad] the 3D kernel did not start:', err)
        if (!cancelled) setKernelFailed(true)
      },
    )
    return () => {
      cancelled = true
      made?.dispose()
    }
  }, [kernelFactory])

  // ---- the 3D view ----

  useEffect(() => {
    const host = stageRef.current
    if (!session || !host || !webgl || guide) return
    const made = viewportFactory(host, pageTheme(), {
      onUnavailable: () => setWebgl(false),
      onPick: (id, add) => {
        if (id === null) {
          if (!add) selection.clear()
        } else if (add) {
          const ids = selection.ids()
          selection.set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
        } else {
          selection.set([id])
        }
      },
      onEdit: (mode, change) => applyEdit(mode, change),
      onRefused: (err) => setMessage({ key: refusalText(err), error: true }),
      issueText: (issue) => translate(issue === 'open-mesh' ? 'issueOpenMesh' : 'issueTooLarge'),
      onWorkplanePoint: (point) => sketchRef.current?.addPoint(point),
      onMeasureHover: (point, reach) => void measureRef.current?.hover(point, reach),
      onMeasureClick: (point, reach) => void measureRef.current?.click(point, reach),
      onEntityClick: (point, reach, add) => lineEditRef.current?.click(point, reach, add),
    })
    if (!made) {
      setWebgl(false)
      return
    }
    const current = made
    viewRef.current = current
    setView(current)
    current.setSelection(selection.ids())
    const offSelection = selection.subscribe(() => current.setSelection(selection.ids()))
    // the shell's theme lands on <html data-theme>; "system" follows the OS
    const retheme = (): void => current.setTheme(pageTheme())
    const observer = new MutationObserver(retheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    media?.addEventListener?.('change', retheme)
    return () => {
      offSelection()
      if (viewRef.current === current) viewRef.current = null
      setView((was) => (was === current ? null : was))
      observer.disconnect()
      media?.removeEventListener?.('change', retheme)
      current.dispose()
    }
  }, [session, webgl, guide, viewportFactory, applyEdit])

  // every change of the history: evaluate (unchanged parts come from the cache) and draw
  useEffect(() => {
    if (!session) return
    const show = (): void => {
      const current = session.history.current()
      const results = evaluator ? evaluator.update(current) : []
      setEvaluated(results)
      view?.showDocument(current, evaluator ? sceneModel(current, results) : [])
    }
    show()
    return session.history.subscribe(show)
  }, [session, view, evaluator])

  useEffect(() => {
    view?.setHandleMode(handleMode)
  }, [view, handleMode])

  // the outline being sketched is drawn on the workplane; clicks there add its points
  useEffect(() => {
    if (!view) return
    if (!sketch) {
      view.setSketch(null)
      return
    }
    const draw = (): void => view.setSketch(sketch.points())
    draw()
    return sketch.subscribe(draw)
  }, [view, sketch])

  // the measuring marks follow the tool
  useEffect(() => {
    if (!view) return
    if (!measure) {
      view.setMeasure(null)
      return
    }
    const draw = (): void => {
      const reading = measure.reading()
      const marks: MeasureView = {
        snap: measure.hovered()?.at ?? null,
        a: reading?.a ?? measure.first(),
        b: reading?.b ?? null,
        label: reading?.label ?? null,
      }
      view.setMeasure(marks)
    }
    draw()
    return measure.subscribe(draw)
  }, [view, measure])

  // the picked lines are drawn over the drawing in the selection colour
  useEffect(() => {
    if (!view) return
    if (!lineEdit || !session) {
      view.setEntityEdit(null)
      return
    }
    const draw = (): void => {
      const part = lineEdit.pickedPart()
      view.setEntityEdit(
        part
          ? drawingLines({ ...part, entities: lineEdit.pickedEntities() }).map((l) => l.points)
          : [],
      )
    }
    draw()
    const offTool = lineEdit.subscribe(draw)
    const offHistory = session.history.subscribe(draw)
    return () => {
      offTool()
      offHistory()
    }
  }, [view, lineEdit, session])

  // ---- the dimension sheet, copy picture and send ----

  /** The drawing as the sheet and the send read it now. */
  const sheetSource = useCallback((): SheetSource | null => {
    const current = sessionRef.current
    if (!current) return null
    const now = current.history.current()
    return {
      doc: now,
      evaluated: evaluatorRef.current?.update(now) ?? [],
      tabTitle: current.title(),
      today: todayIso(),
      labels: sheetLabels(translate),
      header: [
        translate('tableName'),
        translate('tableWidth'),
        translate('tableDepth'),
        translate('tableHeight'),
      ],
    }
  }, [])

  /**
   * One send or copy at a time; a second press while one runs is ignored and
   * answers `BUSY`, which is not any job's answer (a send's success is null).
   */
  const once = useCallback(async <T,>(job: () => Promise<T>): Promise<T | typeof BUSY> => {
    if (busyRef.current) return BUSY
    busyRef.current = true
    try {
      return await job()
    } finally {
      busyRef.current = false
    }
  }, [])

  /**
   * Sends the sheet; null when the new tab opened, `BUSY` when another send or
   * copy is running (nothing is said), else what to say.
   */
  const sendSheet = useCallback(
    async (target: SendTarget = sendTargetRef.current): Promise<StringKey | null | typeof BUSY> => {
      const source = sheetSource()
      if (!source || statusRef.current !== 'ready' || guideRef.current) return null
      const outcome = await once(() => runSend(source, target, window.cadApi, rasterize))
      if (outcome === BUSY) return BUSY
      if (outcome === null) {
        setMessage({ key: 'sendDone', error: false })
        return null
      }
      setMessage({ key: outcome, error: true })
      return outcome
    },
    [sheetSource, once, rasterize],
  )

  /** The 3D view as a picture on the clipboard (the dialog copies the sheet instead). */
  const copyView = useCallback((): void => {
    void once(async () => {
      const current = viewRef.current
      let png: Uint8Array | null = null
      if (current) {
        try {
          png = await current.snapshot()
        } catch (err) {
          console.warn('[cad] the 3D view gave no picture:', err)
        }
      }
      const key: StringKey = png
        ? await copyPng(png.length <= PICTURE_LIMIT_BYTES ? png : null, window.cadApi)
        : 'copyFailed'
      setMessage({ key, error: key !== 'copyDone' })
    })
  }, [once])

  /** Copies the sheet picture; null (nothing to say) while another send or copy runs. */
  const copySheetPicture = useCallback(async (): Promise<StringKey | null> => {
    const source = sheetSource()
    if (!source) return 'copyFailed'
    const key = await once(() => copySheet(source, window.cadApi, rasterize))
    return key === BUSY ? null : key
  }, [sheetSource, once, rasterize])

  // ---- crash-recovery copies ----

  const recovery = useRecoveryCopies({
    ready: status === 'ready',
    session,
    saving: () => savingRef.current,
  })

  // ---- saving ----

  const doSave = useCallback(
    async (mode: SaveMode, auto = false): Promise<boolean> => {
      const current = sessionRef.current
      if (statusRef.current !== 'ready' || !current) return false
      // a save by hand during an automatic one queues behind it instead of being dropped
      while (savingRef.current) await wait(50)
      savingRef.current = true
      // a recovery copy being made now may hold what this save writes: it is dropped
      recovery.noteSave()
      setSaveState('saving')
      try {
        const revision = current.history.revision()
        const bytes = current.saveBytes()
        const untitled = translate('untitled')
        const result = await window.cadApi.save({
          bytes,
          mode,
          auto,
          // an untitled drawing is offered its name (an imported file's), unless it has none
          defaultName:
            !current.path() && current.title() !== untitled ? current.title() : undefined,
        })
        if (result.ok && 'path' in result) {
          current.markSaved(revision)
          current.setPath(result.path)
          setPath(result.path)
          setTitle(current.title())
          setDirty(current.dirty())
          setSaveState(current.dirty() ? 'idle' : 'saved')
          return true
        }
        if (result.ok) {
          // canceled, or an automatic save the main process deferred: still unsaved, no error
          setSaveState('idle')
          return false
        }
        console.error('[cad] save failed:', result.error)
        setSaveState(result.error === 'not-reopenable' ? 'refused' : 'failed')
        return false
      } catch (err) {
        console.error('[cad] save failed:', err)
        setSaveState('failed')
        return false
      } finally {
        savingRef.current = false
      }
    },
    [recovery],
  )

  // AutoSave: a drawing with a path, every 30 s and when the window goes to the background;
  // a big drawing waits for a 2 s pause with no pointer held
  useAutoSave(autoSave && !!path && status === 'ready', {
    dirty: () => sessionRef.current?.dirty() ?? false,
    saving: () => savingRef.current,
    save: () => void doSave('save', true),
    big: () => (sessionRef.current?.triangles() ?? 0) > RECOVERY_COPY_TIMING.bigTriangles,
  })

  // ---- export (File › Export in the menu and on the ribbon) ----

  const exportAs = useCadExport(
    session
      ? {
          document: () => session.history.current(),
          evaluated: () => evaluatorRef.current?.update(session.history.current()) ?? [],
          pngSource: () => viewRef.current,
          suggestedName: () => session.title(),
        }
      : null,
    (key) => setMessage({ key, error: true }),
  )

  // ---- the menu, the shortcuts, the close prompt and the MCP server ----

  const undo = useCallback(() => {
    sessionRef.current?.history.undo()
    setMessage(null)
  }, [])
  const redo = useCallback(() => {
    sessionRef.current?.history.redo()
    setMessage(null)
  }, [])

  const runCommand = useCallback(
    (cmd: CadMenuCommand) => {
      if (!sessionRef.current) return
      switch (cmd) {
        case 'undo':
          undo()
          break
        case 'redo':
          redo()
          break
        case 'select-all':
          command((s) => selectAll(s))
          break
        case 'delete':
          command((s) => deleteSelected(s))
          break
        case 'view-top':
          viewRef.current?.view('top')
          break
        case 'view-front':
          viewRef.current?.view('front')
          break
        case 'view-side':
          viewRef.current?.view('side')
          break
        case 'view-fit':
          viewRef.current?.view('fit')
          break
      }
    },
    [command, undo, redo],
  )

  const runShortcut = useCallback(
    (action: ShortcutAction): void => {
      switch (action.kind) {
        case 'undo':
          return undo()
        case 'redo':
          return redo()
        case 'select-all':
          return command((s) => selectAll(s))
        case 'delete':
          return command((s) => deleteSelected(s))
        case 'duplicate':
          return command((s) => duplicateSelected(s))
        case 'group':
          return command((s) => groupSelected(s))
        case 'ungroup':
          return command((s) => ungroupSelected(s))
        case 'toggle-hole':
          return command((s) => toggleHole(s))
        case 'nudge':
          return command((s) => nudge(s, action.dx, action.dy))
      }
    },
    [command, undo, redo],
  )

  useEffect(
    () =>
      installShortcuts(window, (action) => {
        // while an outline is drawn the sketch bar has the keyboard; a guide has nothing to edit
        if (statusRef.current !== 'ready' || sketchRef.current || guideRef.current) return
        runShortcut(action)
      }),
    [runShortcut],
  )

  useEffect(() => {
    const api = window.cadApi
    const offSave = api.onSaveRequest((mode) => {
      if (statusRef.current !== 'ready') {
        api.sendSaveRequestAck(false)
        return
      }
      void doSave(mode).then((saved) => {
        // a save that did not land still has someone waiting in the main process
        if (!saved) api.sendSaveRequestAck(false)
      })
    })
    const offClose = api.onCloseSaveRequest(() => {
      void (async () => {
        while (savingRef.current) await wait(50)
        if (!sessionRef.current?.dirty()) {
          api.sendCloseSaveResult(true)
          return
        }
        api.sendCloseSaveResult(await doSave('save'))
      })()
    })
    const offRenamed = api.onFileRenamed((next) => {
      const current = sessionRef.current
      if (!current) return
      current.setPath(next)
      setPath(next)
      setTitle(current.title())
    })
    const offMenu = api.onMenuCommand(runCommand)
    // Staying silent while the drawing is still loading keeps the asker retrying instead of failing.
    const offSummary = api.onSummaryRequest(() => {
      if (statusRef.current === 'loading') return
      const current = sessionRef.current
      if (!current) {
        api.sendSummaryResult({ error: 'no drawing is open' })
        return
      }
      try {
        api.sendSummaryResult({ text: current.summary() })
      } catch (err) {
        api.sendSummaryResult({ error: err instanceof Error ? err.message : String(err) })
      }
    })
    const offBytes = api.onBytesRequest(() => {
      if (statusRef.current === 'loading') return
      const current = sessionRef.current
      if (!current) {
        api.sendBytesResult({ error: 'no drawing is open' })
        return
      }
      try {
        api.sendBytesResult({ bytes: current.saveBytes() })
      } catch (err) {
        api.sendBytesResult({ error: err instanceof Error ? err.message : String(err) })
      }
    })
    return () => {
      offSave()
      offClose()
      offRenamed()
      offMenu()
      offSummary()
      offBytes()
    }
  }, [doSave, runCommand])

  // ---- screen ----

  const ready = status === 'ready'
  const stateText = !ready ? '' : dirty ? t('unsaved') : t('saved')
  const workplane = doc?.workplane ?? createDocument().workplane
  const chosen = doc ? doc.parts.filter((p) => selected.includes(p.id)) : []
  const size: PartSize | null = (() => {
    if (chosen.length !== 1) return null
    const part = chosen[0]!
    // the computed solid when the kernel runs, else the part's box
    const measured = partSize(evaluated.find((e) => e.id === part.id) ?? { mesh: null })
    if (measured) return { name: part.name, ...measured }
    const box = worldBounds(part)
    return {
      name: part.name,
      width: box.max[0] - box.min[0],
      depth: box.max[1] - box.min[1],
      height: box.max[2] - box.min[2],
    }
  })()
  const shown: StatusMessage | null =
    message ?? (kernelFailed ? { key: 'kernelFailed', error: true } : null)
  const locked = !ready || !!guide
  return (
    <div className="cad-app" data-cad-ready={ready ? '' : undefined}>
      <Ribbon
        title={title}
        stateText={stateText}
        dirty={dirty}
        disabled={locked}
        canUndo={!!session?.history.canUndo()}
        canRedo={!!session?.history.canRedo()}
        autoSave={autoSave}
        selected={chosen.length}
        canUngroup={chosen.some((p) => p.type === 'group')}
        handleMode={handleMode}
        sketching={!!sketch}
        measuring={!!measure}
        editingLines={!!lineEdit}
        sheetBlocked={doc ? sheetBlocked(doc) : 'sheetEmpty'}
        onToggleAutoSave={setAutoSave}
        onSave={() => void doSave('save')}
        onSaveAs={() => void doSave('saveAs')}
        onUndo={undo}
        onRedo={redo}
        onExport={exportAs}
        onPlaceShape={(kind: ShapeKind) => command((s) => placeShape(s, kind))}
        onToggleHole={() => command((s) => toggleHole(s))}
        onSketch={toggleSketch}
        onText={placeText}
        onGroup={() => command((s) => groupSelected(s))}
        onUngroup={() => command((s) => ungroupSelected(s))}
        onAlign={(axis, anchor) => command((s) => alignSelected(s, axis, anchor))}
        onView={(cmd) => viewRef.current?.view(cmd)}
        onHandleMode={setHandleMode}
        onMeasure={toggleMeasure}
        onEditLines={toggleLineEdit}
        onSheet={() => setSheetOpen(true)}
        onCopyPicture={copyView}
        onSend={() => void sendSheet()}
        aiOpen={ai.open}
        onToggleAi={() => ai.setOpen(!ai.open)}
      />
      {notice && (
        <div className="cad-notice" role="status" data-cad-notice="">
          {t(NOTICE_TEXT[notice])}
        </div>
      )}
      {(saveState === 'refused' || saveState === 'failed') && (
        <div className="cad-notice cad-notice-error" role="alert" data-cad-save-error="">
          {t(saveState === 'refused' ? 'saveRefused' : 'saveFailed')}
        </div>
      )}
      <div className="cad-body">
        <main className="cad-stage">
          {guide ? (
            <GuideScreen name={guide.name} ext={guide.ext} />
          ) : webgl ? (
            <div className="cad-viewport" ref={stageRef} />
          ) : (
            <NoWebGl />
          )}
          {sketch && (
            <div className="cad-sketch-dock" data-cad-sketch="">
              <SketchBar tool={sketch} onFinish={finishSketch} onCancel={() => setSketch(null)} />
            </div>
          )}
          {measure && (
            <div className="cad-sketch-dock cad-measure-dock" data-cad-measure="">
              <MeasureOverlay tool={measure} onDone={() => setMeasure(null)} />
            </div>
          )}
          {lineEdit && (
            <div className="cad-sketch-dock cad-measure-dock" data-cad-lines="">
              <EntityEditBar
                tool={lineEdit}
                onDone={() => setLineEdit(null)}
                onRefused={(err) => setMessage({ key: refusalText(err), error: true })}
              />
            </div>
          )}
        </main>
        <aside className="cad-side">
          {doc && (
            <PropertyPanel
              doc={doc}
              ids={selected}
              disabled={locked || !!sketch}
              onPatch={(patch: PanelPatch) =>
                command((s) => setProperty(s, selection.ids(), patch))
              }
            />
          )}
          <section className="cad-ai-slot" data-cad-ai-slot="" data-ai-open={ai.open}>
            <CadAiDock
              ai={ai}
              // a guide or a loading tab has nothing the AI may change
              session={locked ? null : session}
              filePath={path ?? null}
              quick={{
                sheetBlocked: doc ? sheetBlocked(doc) : 'sheetEmpty',
                disabled: locked || !!sketch,
                sendLabel: send.label,
                onSheet: () => setSheetOpen(true),
                onSend: () => void sendSheet(),
              }}
            />
          </section>
        </aside>
      </div>
      <StatusBar
        workplane={workplane}
        snapMm={MOVE_SNAP_MM}
        selectedCount={chosen.length}
        size={size}
        message={shown}
      />
      {sheetOpen && doc && session && (
        <SheetDialog
          doc={doc}
          evaluated={evaluated}
          tabTitle={title}
          onTitle={(next) =>
            command((s) => {
              s.history.edit('title', (d) => ({ ...d, title: next }))
            })
          }
          onCopy={copySheetPicture}
          onSend={async (target) => {
            const outcome = await sendSheet(target)
            // busy: the send under way will speak; the dialog stays open and says nothing
            if (outcome === BUSY) return null
            if (outcome === null) setSheetOpen(false)
            return outcome
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  )
}
