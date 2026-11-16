/**
 * The whole AI Drawing screen against a scripted main process, for the AI
 * pane's tests: the model's answers are written out here as stream chunks, so
 * no provider is ever reached. The settings resolve to a subscription
 * provider (Claude is `ready`), which is exactly why the stream channel is a
 * fake: nothing here can start a `claude` or `codex` program.
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { vi } from 'vitest'
import {
  defaultAiSettings,
  type AiSettings,
  type AiStreamChunk,
  type AiStreamRequest,
} from '@genoffice/ai-provider'
import type { SubscriptionStatusMap } from '@genoffice/ai-provider/browser'
import type { CadDocument, Kernel } from '@genoffice/cad-engine'
import type { Lang } from '@genoffice/i18n'
import App from '../../src/renderer/App'
import { LocaleProvider } from '../../src/renderer/i18n/locale'
import type { Rasterize } from '../../src/renderer/sheet/sheet-png'
import type { ViewportFactory } from '../../src/renderer/scene/viewport'
import type { CadApi, OpenFileResult, SendToDocumentRequest } from '../../src/shared/ipc'

export type Chunk = Partial<AiStreamChunk>

/** The chunks of the `nth` stream (1-based); a promise holds the stream until it settles. */
export type Reply = (request: AiStreamRequest, nth: number) => Chunk[] | Promise<Chunk[]>

const READY: SubscriptionStatusMap = {
  'claude-code': { provider: 'claude-code', state: 'ready', meteredAccepted: false },
  codex: { provider: 'codex', state: 'not-installed', meteredAccepted: false },
}

export const readySettings = (): AiSettings => ({
  ...defaultAiSettings(),
  subscriptionNoticeSeen: true,
})

export interface AiFake {
  api: CadApi
  /** every stream the panel asked for, in order */
  requests: AiStreamRequest[]
  /** every stream the panel cancelled */
  cancels: string[]
  sends: SendToDocumentRequest[]
}

export function aiFake(file: OpenFileResult | null, reply?: Reply): AiFake {
  const on = () => () => () => {}
  let streamListener: ((chunk: AiStreamChunk) => void) | null = null
  const emit = (requestId: string, chunks: Chunk[]) => {
    for (const chunk of chunks) streamListener?.({ requestId, ...chunk } as AiStreamChunk)
  }
  const fake: AiFake = {
    requests: [],
    cancels: [],
    sends: [],
    api: {
      consumePending: async () => (file ? 'C:/models/a.ttukcad' : null),
      openFile: async () => file ?? { status: 'unreadable' },
      save: async () => ({ ok: true, path: 'C:/models/a.ttukcad' }),
      setDirty: () => {},
      onSaveRequest: on(),
      sendSaveRequestAck: () => {},
      onCloseSaveRequest: on(),
      sendCloseSaveResult: () => {},
      onFileRenamed: on(),
      onMenuCommand: on(),
      getLanguage: async () => 'en' as Lang,
      onLanguageChanged: on(),
      getTheme: async () => 'system' as const,
      onThemeChanged: on(),
      getAutoSaveDefault: async () => ({ on: false, updatedAt: 0 }),
      onAutoSaveDefaultChanged: on(),
      onChromePressed: on(),
      onSummaryRequest: on(),
      sendSummaryResult: () => {},
      onBytesRequest: on(),
      sendBytesResult: () => {},
      writeRecoveryCopy: async () => 'written' as const,
      onRecoveryCopyNow: on(),
      sendRecoveryCopyNowDone: () => {},
      onRecoveryReset: on(),
      exportFile: async () => ({ ok: true, canceled: true }) as const,
      onExportRequest: on(),
      sendToDocument: async (request: SendToDocumentRequest) => {
        fake.sends.push(request)
        return { ok: true, title: request.title }
      },
      copyImage: async () => true,
      // ---- the AI bridge ----
      getAiSettings: async () => readySettings(),
      setAiSettings: async () => {},
      onAiSettingsChanged: () => () => {},
      openAiModelSettings: async () => {},
      getAiPanelPrefs: async () => ({}) as never,
      setAiPanelPrefs: async () => ({}) as never,
      onAiPanelPrefsChanged: () => () => {},
      subscription: {
        statuses: vi.fn(async () => READY),
        recheck: vi.fn(async () => READY),
        login: vi.fn(async () => ({ ok: true }) as const),
        install: vi.fn(async () => ({ ok: true }) as const),
        update: vi.fn(async () => ({ ok: true }) as const),
        cancelLogin: vi.fn(async () => ({ ok: true }) as const),
        setMeteredAccepted: vi.fn(async () => ({ ok: true, statuses: READY }) as never),
        onChanged: () => () => {},
        openInstallHelp: vi.fn(async () => undefined),
        openConnectHelp: vi.fn(async () => undefined),
      },
      onAiStream: (listener: (chunk: AiStreamChunk) => void) => {
        streamListener = listener
        return () => {
          streamListener = null
        }
      },
      // the one way a run reaches a model: scripted here, no program is started
      aiStream: async (request: AiStreamRequest) => {
        fake.requests.push(request)
        const chunks = (await reply?.(request, fake.requests.length)) ?? [
          { type: 'delta', text: 'ok' },
          { type: 'done' },
        ]
        emit(request.requestId, chunks)
      },
      // the main process ends a cancelled stream with `done` (docs-main ai:stream)
      aiStreamCancel: async (requestId: string) => {
        fake.cancels.push(requestId)
        emit(requestId, [{ type: 'done' }])
      },
    } as CadApi,
  }
  return fake
}

/** One tool call of a turn; end the turn's chunks with `{ type: 'done' }`. */
export const toolCall = (name: string, input: Record<string, unknown>, id: string): Chunk => ({
  type: 'tool-call',
  toolCall: { id, name, input },
})

/** A 3D view that records the drawings it was shown. */
export function recordingViewport() {
  const docs: CadDocument[] = []
  const factory: ViewportFactory = () => ({
    setTheme: () => {},
    showDocument: (doc) => void docs.push(doc),
    setSelection: () => {},
    setHandleMode: () => {},
    view: () => {},
    setSketch: () => {},
    setMeasure: () => {},
    snapshot: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    dispose: () => {},
  })
  return { factory, doc: () => docs.at(-1)! }
}

export interface Mounted {
  container: HTMLElement
  unmount(): void
}

export async function settle(turns = 8): Promise<void> {
  for (let turn = 0; turn < turns; turn++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

export async function until(done: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 5_000
  while (!done()) {
    if (Date.now() > deadline) throw new Error(`still waiting for ${what}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  }
}

export async function mountAiApp(
  fake: AiFake,
  viewportFactory: ViewportFactory,
  kernelFactory: () => Promise<Kernel> = () => new Promise(() => {}),
  rasterize?: Rasterize,
): Promise<Mounted> {
  ;(window as unknown as { cadApi: CadApi }).cadApi = fake.api
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      createElement(LocaleProvider, {
        initial: 'en',
        children: createElement(App, { viewportFactory, kernelFactory, rasterize }),
      }),
    )
  })
  await until(() => !!container.querySelector('[data-cad-ready]'), 'the drawing to open')
  await settle()
  return { container, unmount: () => act(() => root.unmount()) }
}

/** Types into the AI pane's input and presses its send button. */
export async function sendMessage(container: HTMLElement, text: string): Promise<void> {
  const box = container.querySelector<HTMLTextAreaElement>('.ai-input-box textarea')!
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(box, text)
    box.dispatchEvent(new Event('input', { bubbles: true }))
  })
  act(() => container.querySelector<HTMLButtonElement>('.ai-send-btn')!.click())
  await settle(16)
}

export async function click(container: HTMLElement, selector: string): Promise<void> {
  const el = container.querySelector<HTMLElement>(selector)
  if (!el) throw new Error(`no ${selector}`)
  await act(async () => el.click())
}
