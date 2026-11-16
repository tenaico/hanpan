/**
 * The AI Drawing editor screen: a title line with the saved state, a notice
 * line when the file did not open as asked, the 3D view (or the explanation
 * when this PC cannot show 3D) and a status line.
 *
 * The tab holds one boolean kernel (manifold wasm) and evaluates the document
 * on every history change; unchanged parts come from its cache. A click in the
 * view sets the selection (editing/selection.ts); a handle release is one
 * `history.edit`. An edit the engine refuses (a locked part) leaves the
 * document as it is and says why on the status line.
 *
 * Open, save, the close prompt's save, the save request answer, the unsaved
 * mark, renames, crash-recovery copies and the in-app MCP server's questions
 * follow the mind map editor (apps/mindmap/src/renderer/App.tsx).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { CadEditError, createDocument, type Kernel } from '@genoffice/cad-engine'
import { useAutoSavePref } from '@genoffice/ui'
import type { CadMenuCommand, SaveMode } from '../shared/ipc'
import { useAutoSave } from './document/autosave'
import { openResultToSession, type OpenNotice } from './document/open'
import { useRecoveryCopies } from './document/recovery-copies'
import { CadSession } from './document/session'
import { selection } from './editing/selection'
import { t as translate, useI18n, type StringKey } from './i18n/locale'
import { NoWebGl } from './scene/NoWebGl'
import type { CanvasTheme } from './scene/canvas-colors'
import { DocEvaluator, loadKernel } from './scene/evaluator'
import { HandleRefusedError, type DocChange } from './scene/handles'
import { sceneModel } from './scene/scene-model'
import { createViewport, type Viewport, type ViewportFactory } from './scene/viewport'

type LoadStatus = 'loading' | 'ready'
type SaveState = 'idle' | 'saving' | 'saved' | 'refused' | 'failed'

const NOTICE_TEXT: Record<OpenNotice, StringKey> = {
  'not-ok': 'noticeNotOk',
  'too-large': 'noticeTooLarge',
  unreadable: 'noticeUnreadable',
  unsupported: 'noticeUnsupported',
  'import-failed': 'noticeImportFailed',
}

/** The theme the page shows now: the shell's setting, or the OS one under "system". */
function pageTheme(): CanvasTheme {
  const set = document.documentElement.getAttribute('data-theme')
  if (set === 'dark' || set === 'light') return set
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** The status-line text for an edit that was refused. */
function refusalText(err: unknown): StringKey {
  if (err instanceof HandleRefusedError) return 'editNotScalable'
  if (err instanceof CadEditError && err.code === 'locked') return 'editLocked'
  return 'editRefused'
}

export interface AppProps {
  /** makes the 3D view; tests hand in a fake so they need no WebGL */
  viewportFactory?: ViewportFactory
  /** starts the boolean kernel; tests hand in their own */
  kernelFactory?: () => Promise<Kernel>
}

export default function App({
  viewportFactory = createViewport,
  kernelFactory = loadKernel,
}: AppProps = {}) {
  const { t } = useI18n()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [session, setSession] = useState<CadSession | null>(null)
  const [notice, setNotice] = useState<OpenNotice | null>(null)
  const [dirty, setDirty] = useState(false)
  const [title, setTitle] = useState('')
  const [path, setPath] = useState<string | undefined>(undefined)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [webgl, setWebgl] = useState(true)
  const [evaluator, setEvaluator] = useState<DocEvaluator | null>(null)
  const [refusal, setRefusal] = useState<StringKey | null>(null)
  const [autoSave] = useAutoSavePref('cadapp.autoSave', window.cadApi)

  const sessionRef = useRef<CadSession | null>(null)
  const statusRef = useRef<LoadStatus>('loading')
  statusRef.current = status
  const savingRef = useRef(false)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<Viewport | null>(null)

  // ---- opening ----

  useEffect(() => {
    let cancelled = false
    void (async () => {
      let opened: { session: CadSession; notice: OpenNotice | null }
      try {
        const pending = await window.cadApi.consumePending()
        opened = pending
          ? openResultToSession(
              await window.cadApi.openFile(pending),
              translate('untitled'),
              pending,
            )
          : {
              session: new CadSession(createDocument(), { title: translate('untitled') }),
              notice: null,
            }
      } catch (err) {
        console.error('[cad] open failed:', err)
        opened = {
          session: new CadSession(createDocument(), { title: translate('untitled') }),
          notice: 'unreadable',
        }
      }
      if (cancelled) return
      sessionRef.current = opened.session
      setSession(opened.session)
      setNotice(opened.notice)
      setTitle(opened.session.title())
      setPath(opened.session.path())
      setStatus('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // every change of the history: the unsaved mark follows
  useEffect(() => {
    if (!session) return
    const sync = (): void => setDirty(session.dirty())
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

  /** The one way the screen changes the model; a refusal leaves it as it is and says why. */
  const applyEdit = useCallback((label: string, change: DocChange): void => {
    const current = sessionRef.current
    if (!current) return
    try {
      current.history.edit(label, change)
      setRefusal(null)
    } catch (err) {
      if (!(err instanceof CadEditError)) console.error('[cad] edit failed:', err)
      setRefusal(refusalText(err))
    }
  }, [])

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
      // the plate still shows; parts appear once a kernel runs (a reopened tab tries again)
      (err: unknown) => console.error('[cad] the 3D kernel did not start:', err),
    )
    return () => {
      cancelled = true
      made?.dispose()
    }
  }, [kernelFactory])

  // ---- the 3D view ----

  useEffect(() => {
    const host = stageRef.current
    if (!session || !host || !webgl) return
    let view: Viewport | null = viewportFactory(host, pageTheme(), {
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
      onRefused: (err) => setRefusal(refusalText(err)),
      issueText: (issue) => translate(issue === 'open-mesh' ? 'issueOpenMesh' : 'issueTooLarge'),
    })
    if (!view) {
      setWebgl(false)
      return
    }
    const current = view
    viewRef.current = current
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
      observer.disconnect()
      media?.removeEventListener?.('change', retheme)
      current.dispose()
      view = null
    }
  }, [session, webgl, viewportFactory, applyEdit])

  // every change of the history: evaluate (unchanged parts come from the cache) and draw
  useEffect(() => {
    const view = viewRef.current
    if (!session || !view) return
    const show = (): void => {
      const doc = session.history.current()
      selection.prune(doc)
      view.showDocument(doc, evaluator ? sceneModel(doc, evaluator.update(doc)) : [])
    }
    show()
    return session.history.subscribe(show)
  }, [session, webgl, viewportFactory, evaluator])

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

  // AutoSave: a drawing with a path, every 30 s and when the window goes to the background
  useAutoSave(autoSave && !!path && status === 'ready', {
    dirty: () => sessionRef.current?.dirty() ?? false,
    saving: () => savingRef.current,
    save: () => void doSave('save', true),
  })

  // ---- the menu, the close prompt and the MCP server ----

  const runCommand = useCallback((command: CadMenuCommand) => {
    const current = sessionRef.current
    if (!current) return
    switch (command) {
      case 'undo':
        current.history.undo()
        break
      case 'redo':
        current.history.redo()
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
      default:
        // select-all and delete come with the ribbon and the shortcuts (stage 3, Task 3)
        break
    }
  }, [])

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
  return (
    <div className="cad-app" data-cad-ready={ready ? '' : undefined}>
      <header className="cad-top">
        <span className="cad-title">{title}</span>
        <span className="cad-state" data-dirty={dirty ? '' : undefined}>
          {stateText}
        </span>
      </header>
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
      <main className="cad-stage">
        {webgl ? <div className="cad-viewport" ref={stageRef} /> : <NoWebGl />}
      </main>
      <footer
        className="cad-status"
        role="status"
        data-cad-status=""
        data-error={refusal ? '' : undefined}
      >
        {refusal ? t(refusal) : ''}
      </footer>
    </div>
  )
}
