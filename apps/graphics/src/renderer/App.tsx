/**
 * The host page of a graphics tab: the web app in a same-origin frame, and
 * Hanpan's side of it (opening, saving, the unsaved mark, menu commands).
 */
import { useEffect, useRef, useState } from 'react'
import type { Lang } from '@genoffice/i18n'
import { createAdapter, type GraphicsAdapter } from './adapters'
import { GraphicsAiDock } from './ai/AiDock'
import { lockFrameInput } from './ai/input-lock'
import { ExportDialog } from './quick/ExportDialog'
import { PrintDialog } from './quick/PrintDialog'
import { QuickBar } from './quick/QuickBar'
import { runQuickAction, type ExportChoice, type QuickActionId } from './quick/quick-actions'
import { measureImage, resizeImage, type PixelSize } from './quick/resize'
import { watchCaptures, type CaptureWatch } from './doc/capture-watch'
import { createDirtyState, type DirtyState } from './doc/dirty-state'
import { watchDoc, type DocWatch } from './doc/doc-watch'
import { openPending } from './doc/open-flow'
import { startRecoveryLoop } from './doc/recovery-loop'
import { runSave, type SaveNoticeKey } from './doc/save-flow'
import { singleFlight } from './doc/single-flight'
import { copyBytes } from './frame/bytes'
import { appFrameUrl, connectPageApi, type GraphicsPageApi } from './frame/page-api'
import { useI18n, type StringKey } from './i18n/locale'
import { extOf } from '../shared/kinds'
import type { GraphicsKind } from '../shared/kinds'
import type { ExportFormat, SaveMode } from '../shared/ipc'
import { graphicsApi } from './bridge'

type Status = 'checking' | 'loading' | 'ready' | 'failed' | 'notInstalled' | 'noGpu'

export interface AppProps {
  kind: GraphicsKind
  lang: Lang
  /** Whether this install carries the app's web build. */
  probeWeb: () => Promise<boolean>
  /** Whether this PC can draw for the app (WebGPU or WebGL2); without, the app cannot start. */
  probeGpu?: () => Promise<boolean>
  /** How often the document state is asked for. */
  pollMs?: number
  /** tests only: how the host reaches the app in the frame (the app runs on its own origin) */
  connect?: (frame: HTMLIFrameElement) => Promise<GraphicsPageApi>
}

/**
 * Whether this page can draw with WebGPU or WebGL2. The tab's page runs with the same switches as
 * the app's frame, so its answer is the app's (the e2e graphicsGpuMissing asks the same way).
 */
export async function hasGraphicsGpu(): Promise<boolean> {
  const gpu = (navigator as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  const adapter = await Promise.resolve(gpu?.requestAdapter()).catch(() => null)
  if (adapter) return true
  return Boolean(document.createElement('canvas').getContext('webgl2'))
}

export default function App({
  kind,
  lang,
  probeWeb,
  probeGpu = hasGraphicsGpu,
  pollMs = 1000,
  connect = (frame) => connectPageApi(frame),
}: AppProps) {
  const { t, lang: uiLang } = useI18n()
  /** the language the frame was started in: a change reloads an empty tab only (G9) */
  const [frameLang, setFrameLang] = useState<Lang>(lang)
  const [status, setStatus] = useState<Status>('checking')
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null)
  const noticeSeq = useRef(0)
  /** the AI or a quick action works on the document: the quick buttons wait */
  const [appBusy, setAppBusy] = useState(false)
  /** the app has a document open: the quick buttons need one */
  const [hasDocument, setHasDocument] = useState(false)
  /** the export dialog, open while an export asks for its format and size */
  const [exportAsk, setExportAsk] = useState<{
    size: PixelSize
    answer: (choice: ExportChoice | null) => void
  } | null>(null)
  /** the print preview, open on the app's adapter */
  const [printOn, setPrintOn] = useState<GraphicsAdapter | null>(null)
  const [attempt, setAttempt] = useState(0)
  /** the app's adapter once it is up: the AI panel works through it */
  const [aiAdapter, setAiAdapter] = useState<GraphicsAdapter | null>(null)
  const lockRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const adapterRef = useRef<GraphicsAdapter | null>(null)
  const dirtyRef = useRef<DirtyState>(createDirtyState((dirty) => graphicsApi().setDirty(dirty)))
  const capturesRef = useRef<CaptureWatch | null>(null)
  const docWatchRef = useRef<DocWatch | null>(null)
  const titleRef = useRef<string | null>(null)
  const hostOps = useRef(0)
  /** runs that own the document now (the AI's, a quick action's): the capture watch ignores the app */
  const appLocks = useRef(0)

  const notify = (key: SaveNoticeKey | StringKey, detail?: string): void => {
    const id = ++noticeSeq.current
    setNotice({ id, text: detail ? `${t(key)} ${detail}` : t(key) })
    window.setTimeout(() => setNotice((current) => (current?.id === id ? null : current)), 6000)
  }

  /** The person's input to the app stops until the returned unlock; the quick buttons wait meanwhile. */
  const lockApp = (): (() => void) => {
    const unlockFrame =
      frameRef.current && lockRef.current
        ? lockFrameInput(frameRef.current, lockRef.current)
        : () => {}
    appLocks.current += 1
    setAppBusy(true)
    let done = false
    return () => {
      if (done) return
      done = true
      unlockFrame()
      // what the run wrote is taken in before the capture watch listens again
      const absorbed = capturesRef.current?.absorb() ?? Promise.resolve()
      void absorbed
        .catch(() => {})
        .finally(() => {
          appLocks.current -= 1
          if (appLocks.current === 0) setAppBusy(false)
        })
    }
  }

  const runQuick = async (id: QuickActionId): Promise<void> => {
    const adapter = adapterRef.current
    if (!adapter || appLocks.current > 0) return
    const api = graphicsApi()
    const result = await runQuickAction(id, {
      adapter,
      pickImage: () => api.pickImage(),
      exportFile: (request) => api.exportFile(request),
      askExport: (_kind, size) =>
        new Promise((resolve) =>
          setExportAsk({
            size,
            answer: (choice) => {
              setExportAsk(null)
              resolve(choice)
            },
          }),
        ),
      lock: lockApp,
      measure: measureImage,
      resize: (bytes, width, height, format, quality) =>
        resizeImage(bytes, width, height, format, quality),
    })
    if (result.messageKey) notify(result.messageKey)
  }

  // one save at a time: a second request while one runs gets that run's outcome
  const saveRef = useRef(
    singleFlight(async (mode: SaveMode): Promise<boolean> => runSaveOnce(mode)),
  )
  const save = (mode: SaveMode): Promise<boolean> => saveRef.current(mode)

  const runSaveOnce = async (mode: SaveMode): Promise<boolean> => {
    const adapter = adapterRef.current
    if (!adapter) return false
    let savedName: string | null = null
    const ok = await runSave(mode, {
      adapter,
      api: graphicsApi(),
      dirty: dirtyRef.current,
      notify,
      hostOp: {
        begin: () => (hostOps.current += 1),
        end: () => (hostOps.current -= 1),
      },
      savedAs: (name) => {
        savedName = name
      },
    })
    if (savedName !== null) await capturesRef.current?.noteHostSave(savedName)
    // the save set the tab's mark; the app's own mark may have moved on meanwhile
    docWatchRef.current?.resync()
    return ok
  }

  const exportBytes = async (bytes: Uint8Array, name: string, format: ExportFormat) => {
    const result = await graphicsApi().exportFile({ bytes, defaultName: name, format })
    if (!result.ok) notify('saveFailed')
  }

  // the web build is there, then the frame (the frame's preload prepares the app's storage)
  useEffect(() => {
    let live = true
    void (async () => {
      const present = await probeWeb().catch(() => false)
      if (!live) return
      if (!present) {
        setStatus('notInstalled')
        return
      }
      // the app would only print its own error in English and still take the AI's requests
      const drawable = await probeGpu().catch(() => false)
      if (!live) return
      if (!drawable) {
        setStatus('noGpu')
        return
      }
      setStatus('loading')
    })()
    return () => {
      live = false
    }
  }, [kind, probeWeb, probeGpu, attempt])

  // Hanpan's language changed: a tab without a document starts its editor again in the new
  // language; a tab with one keeps it (reloading would drop it) and says when it changes (G9)
  const langSeen = useRef(lang)
  useEffect(() => {
    if (uiLang === langSeen.current) return
    langSeen.current = uiLang
    if (uiLang === frameLang) return
    if (status === 'ready' && hasDocument) {
      notify('editorLangOnReopen')
      return
    }
    setFrameLang(uiLang)
    setAttempt((n) => n + 1)
    // notify reads refs and state setters only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiLang])

  // the frame stands while the app loads and runs; a change between the two must not unwire it
  const frameOn = status === 'loading' || status === 'ready'

  // the app's API is up: wire it
  useEffect(() => {
    if (!frameOn || !frameRef.current) return
    let live = true
    const stops: (() => void)[] = []
    void (async () => {
      try {
        const api = await connect(frameRef.current!)
        if (!live) return
        let adapter: GraphicsAdapter
        try {
          adapter = createAdapter(kind, api)
        } catch {
          setStatus('notInstalled')
          return
        }
        await adapter.afterReady()
        adapterRef.current = adapter
        setAiAdapter(adapter)
        const opened = await openPending(
          adapter,
          () => graphicsApi().consumeOpen(),
          (path) => graphicsApi().confirmOpened(path),
        )
        if (!live) return
        if (opened === 'failed') notify('openFailed')
        // an opened file is shown whole, not cut at the app's starting zoom (W14)
        if (opened === 'opened') {
          window.setTimeout(
            () =>
              void api
                .execute(kind === 'photo' ? 'view.fitOnScreen' : 'view.fitAll', {})
                .catch(() => {}),
            300,
          )
        }
        // Save, Save As and Print inside the frame (its menus, its keys) are Hanpan's: the file
        // is written by Hanpan's save, and only then is the tab marked saved (G1-G3)
        api.onHostRequest?.((request) => {
          if (request === 'print') {
            if (appLocks.current === 0) setPrintOn(adapter)
            return
          }
          void save(request)
        })
        const captures = watchCaptures({
          adapter,
          intervalMs: pollMs,
          busy: () => hostOps.current > 0 || appLocks.current > 0,
          hostSaving: () => hostOps.current > 0,
          // the app's own save wrote nothing to disk: Hanpan's save does, or the mark stays
          onAppSave: () =>
            void save('save').then((ok) => {
              if (!ok) dirtyRef.current.saveFailed()
            }),
          onUnexpectedClean: () => dirtyRef.current.saveFailed(),
          onAppExport: (path) =>
            void (async () => {
              const format = extOf(path)
              if (format !== 'png' && format !== 'jpg' && format !== 'svg') return
              await exportBytes(copyBytes(await api.readFile(path)), path, format)
            })(),
        })
        capturesRef.current = captures
        stops.push(() => captures.stop())
        const docWatch = watchDoc(
          adapter,
          (info) => {
            titleRef.current = info.title
            setHasDocument(info.hasDocument)
            dirtyRef.current.fromApp(info.hasDocument && info.dirty)
            captures.noteDoc(info)
          },
          pollMs,
        )
        docWatchRef.current = docWatch
        stops.push(
          startRecoveryLoop({
            adapter,
            dirty: dirtyRef.current,
            busy: () => hostOps.current > 0 || appLocks.current > 0,
            api: graphicsApi(),
          }),
        )
        stops.push(() => docWatch.stop())
        setStatus('ready')
      } catch {
        if (live) setStatus('failed')
      }
    })()
    return () => {
      live = false
      for (const stop of stops) stop()
      setAiAdapter(null)
    }
    // save/exportBytes read refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameOn, kind, pollMs, attempt])

  // Hanpan's menus and the close question
  useEffect(() => {
    const api = graphicsApi()
    const offs = [
      api.onSaveRequest((mode) => {
        void save(mode).then((ok) => api.sendSaveRequestAck(ok))
      }),
      api.onCloseSaveRequest(() => {
        void (async () =>
          api.sendCloseSaveResult(dirtyRef.current.current() ? await save('save') : true))()
      }),
      api.onMenuCommand((command) => {
        const adapter = adapterRef.current
        if (!adapter) return
        if (command === 'undo' || command === 'redo') {
          // a run that owns the document counts its own steps: no undo from the menu meanwhile
          if (appLocks.current > 0) return
          void adapter.api
            .execute(command === 'undo' ? 'edit.undo' : 'edit.redo', {})
            .catch(() => {})
          return
        }
        if (command === 'print') {
          setPrintOn(adapter)
          return
        }
        // the menu's Export: the export dialog, as the quick button does
        void runQuick(kind === 'photo' ? 'exportAtSize' : 'exportPngSvg')
      }),
    ]
    return () => {
      for (const off of offs) off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  return (
    <div className="gx-app" data-kind={kind} data-status={status}>
      {status === 'ready' && (
        <QuickBar
          kind={kind}
          disabled={appBusy}
          hasDocument={hasDocument}
          onRun={(id) => void runQuick(id)}
        />
      )}
      <div className="gx-body">
        <div className="gx-stage">
          {frameOn && (
            <iframe
              ref={frameRef}
              className="gx-frame"
              title={kind}
              src={appFrameUrl(kind, frameLang)}
              allow="clipboard-read; clipboard-write; local-fonts"
            />
          )}
          {/* takes the pointer while the AI works: the person's edits stay out of its undo step */}
          <div className="gx-lock" ref={lockRef} aria-hidden />
          {(status === 'checking' || status === 'loading') && (
            <div className="gx-cover" role="status">
              {t('loading')}
            </div>
          )}
          {status === 'failed' && (
            <div className="gx-cover" role="alert">
              <p>{t('failed')}</p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)}>
                {t('retry')}
              </button>
            </div>
          )}
          {status === 'noGpu' && (
            <div className="gx-cover" role="alert" data-no-gpu="">
              {t('noGpu')}
            </div>
          )}
          {status === 'notInstalled' && (
            <div className="gx-cover" role="alert">
              {t('notInstalled')}
            </div>
          )}
        </div>
        {status === 'ready' && (
          <GraphicsAiDock
            kind={kind}
            adapter={aiAdapter}
            lockFrame={lockApp}
            appHeld={appBusy}
            onBusyChange={() => {
              // the lock above already marks the run as the app's owner
            }}
          />
        )}
      </div>
      {exportAsk && <ExportDialog kind={kind} size={exportAsk.size} onDone={exportAsk.answer} />}
      {printOn && (
        <PrintDialog
          adapter={printOn}
          onClose={(message) => {
            setPrintOn(null)
            if (message) notify(message)
          }}
        />
      )}
      {notice && (
        <div className="gx-notice" role="status">
          {notice.text}
        </div>
      )}
    </div>
  )
}
