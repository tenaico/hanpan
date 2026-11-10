import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../src/renderer/App'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { GraphicsApi } from '../src/shared/ipc'
import type { GraphicsPageApi } from '../src/renderer/frame/page-api'
import { FakePage } from './helpers/fake-page'
import { installGraphicsApi } from '../src/renderer/bridge'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement

function fakeApi() {
  const listeners: Record<string, ((...args: never[]) => void) | undefined> = {}
  const on =
    (name: string) =>
    (handler: (...args: never[]) => void): (() => void) => {
      listeners[name] = handler
      return () => (listeners[name] = undefined)
    }
  const api = {
    getLanguage: vi.fn(async () => 'ko'),
    onLanguageChanged: on('language'),
    getTheme: vi.fn(async () => 'light'),
    onThemeChanged: on('theme'),
    consumeOpen: vi.fn(async () => null),
    confirmOpened: vi.fn(),
    setDirty: vi.fn(),
    onSaveRequest: on('save'),
    sendSaveRequestAck: vi.fn(),
    beginSave: vi.fn(async () => ({ ok: true, path: '/x/a.vectorcraft', format: 'vectorcraft' })),
    commitSave: vi.fn(async (req: { path: string }) => ({ ok: true, path: req.path })),
    abortSave: vi.fn(),
    onCloseSaveRequest: on('closeSave'),
    sendCloseSaveResult: vi.fn(),
    exportFile: vi.fn(),
    pickImage: vi.fn(),
    onMenuCommand: on('menu'),
    print: vi.fn(async () => ({ ok: true })),
    writeRecoveryCopy: vi.fn(async () => 'written'),
    recoveryRestored: vi.fn(async () => false),
    onRecoveryCopyNow: on('recoveryCopyNow'),
    recoveryCopyNowDone: vi.fn(),
    onRecoveryReset: on('recoveryReset'),
  }
  installGraphicsApi(api as unknown as GraphicsApi)
  return { api, listeners }
}

/**
 * The tests put the fake app straight on the frame's window (jsdom's
 * postMessage carries no source); the installed app reaches it through the
 * frame agent (tests/frame-agent.test.ts, e2e).
 */
function sameWindowApi(kind: 'photo' | 'illust') {
  const global = kind === 'photo' ? 'photocraft' : 'vectorcraft'
  return (frame: HTMLIFrameElement): Promise<GraphicsPageApi> =>
    new Promise((resolve) => {
      const look = () => {
        const api = (frame.contentWindow as unknown as Record<string, unknown> | null)?.[global]
        if (api) resolve(api as GraphicsPageApi)
        else setTimeout(look, 20)
      }
      look()
    })
}

async function mount(
  kind: 'photo' | 'illust',
  probe = async () => true,
  gpu = async () => true,
  theme: 'light' | 'dark' = 'light',
): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await render(kind, probe, gpu, theme)
}

async function render(
  kind: 'photo' | 'illust',
  probe: () => Promise<boolean>,
  gpu: () => Promise<boolean>,
  theme: 'light' | 'dark',
): Promise<void> {
  await act(async () => {
    root!.render(
      <LocaleProvider initial="ko">
        <App
          kind={kind}
          lang="ko"
          theme={theme}
          probeWeb={probe}
          probeGpu={gpu}
          pollMs={20}
          connect={sameWindowApi(kind)}
        />
      </LocaleProvider>,
    )
  })
}

/** Hanpan's theme changes while the tab runs (same props otherwise: the frame must not restart). */
async function setTheme(kind: 'photo' | 'illust', theme: 'light' | 'dark'): Promise<void> {
  await render(
    kind,
    async () => true,
    async () => true,
    theme,
  )
}

function frame(): HTMLIFrameElement | null {
  return host.querySelector('iframe')
}

async function until(check: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !check(); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
  expect(check()).toBe(true)
}

function readyPage(): FakePage {
  const page = new FakePage()
  page.handlers['prefs.set'] = () => null
  page.handlers['file.save'] = (params, p) => {
    p.captured.set(String(params.path), new Uint8Array([1, 2]))
    p.documents[0] = { title: String(params.path), dirty: false }
    return { path: params.path, bytes: 2 }
  }
  return page
}

beforeEach(() => localStorage.clear())
afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  host?.remove()
})

describe('the host page', () => {
  it('shows loading, then the frame with embedded=hanpan and the app language', async () => {
    fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    expect(frame()!.getAttribute('src')).toBe(
      './web/illust/index.html?embedded=hanpan&lang=ko&theme=light',
    )
    // the app reads the PC's fonts (queryLocalFonts) inside the frame
    expect(frame()!.getAttribute('allow')).toBe('clipboard-read; clipboard-write; local-fonts')
    expect(host.textContent).toContain('앱을 불러오는 중')
    const page = readyPage()
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => !host.textContent!.includes('앱을 불러오는 중'))
    expect(page.capturing).toBe(true)
  })

  it('starts the frame in the theme of the moment', async () => {
    fakeApi()
    await mount(
      'illust',
      async () => true,
      async () => true,
      'dark',
    )
    await until(() => frame() !== null)
    expect(frame()!.getAttribute('src')).toBe(
      './web/illust/index.html?embedded=hanpan&lang=ko&theme=dark',
    )
  })

  it('sends a theme change to the app without reloading the frame', async () => {
    fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage().withDocument('Untitled-1', false)
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => !host.textContent!.includes('앱을 불러오는 중'))
    const before = frame()
    await setTheme('illust', 'dark')
    await until(() => page.requested.some(([m]) => m === 'hanpan.theme'))
    expect(page.requested).toContainEqual(['hanpan.theme', { mode: 'dark' }])
    // src unchanged: no reload, the open document stays
    expect(frame()).toBe(before)
    expect(frame()!.getAttribute('src')).toContain('theme=light')
  })

  it('sends a change made before the app was ready once it is ready', async () => {
    fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    await setTheme('illust', 'dark')
    expect(frame()!.getAttribute('src')).toContain('theme=light')
    const page = readyPage()
    page.requestHandlers['hanpan.theme'] = () => ({ mode: 'dark' })
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => page.requested.some(([m]) => m === 'hanpan.theme'))
    expect(page.requested.filter(([m]) => m === 'hanpan.theme')).toEqual([
      ['hanpan.theme', { mode: 'dark' }],
    ])
  })

  it('says the app is missing when the web build is not there', async () => {
    fakeApi()
    await mount('illust', async () => false)
    await until(() => host.textContent!.includes('들어 있지 않습니다'))
    expect(frame()).toBeNull()
  })

  it('says in plain words that the PC cannot draw it, with no frame and no AI panel', async () => {
    fakeApi()
    await mount(
      'photo',
      async () => true,
      async () => false,
    )
    await until(() => host.textContent!.includes('그래픽 가속'))
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('그래픽 가속')
    expect(frame()).toBeNull()
    expect(host.querySelector('.ai-dock')).toBeNull()
    expect(host.textContent).not.toContain('WebGPU or WebGL2 is required')
  })

  it('keeps following the document after it is ready', async () => {
    const { api } = fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage().withDocument('Untitled-1', false)
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => !host.textContent!.includes('앱을 불러오는 중'))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    page.edit('Rectangle')
    await until(() => api.setDirty.mock.calls.some(([d]) => d === true))
  })

  // 0.17 리뷰 v2 G1·G2: 프레임 안의 저장(메뉴·Ctrl+S)은 한판 저장 대화상자로 간다
  it("a save asked for inside the frame runs Hanpan's save, which writes the file", async () => {
    const { api } = fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage().withDocument('Untitled-1', true) as FakePage & {
      onHostRequest?: (h: (r: 'save' | 'saveAs' | 'print') => void) => void
    }
    let ask: ((r: 'save' | 'saveAs' | 'print') => void) | null = null
    page.onHostRequest = (h) => void (ask = h)
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => api.setDirty.mock.calls.some(([d]) => d === true))
    await until(() => ask !== null)
    await act(async () => ask!('saveAs'))
    await until(() => api.commitSave.mock.calls.length === 1)
    expect(api.beginSave).toHaveBeenCalledWith(expect.objectContaining({ mode: 'saveAs' }))
    await until(() => api.setDirty.mock.calls.at(-1)?.[0] === false)
  })

  // 0.17 리뷰 v2 G9: 언어를 바꾸면 문서 없는 탭은 새 언어로 다시 뜨고, 문서 있는 탭은 알려 준다
  it('a language change reloads an empty tab in the new language and tells a tab with a document', async () => {
    const { listeners } = fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    expect(frame()!.getAttribute('src')).toContain('lang=ko')
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = readyPage()
    await until(() => host.querySelector('.gx-cover') === null)
    await act(async () => listeners.language!('vi' as never))
    await until(() => frame()?.getAttribute('src')?.includes('lang=vi') === true)
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft =
      readyPage().withDocument('a.psd', false)
    await until(() => host.querySelector('.gx-cover') === null)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    await act(async () => listeners.language!('ko' as never))
    await until(() => host.querySelector('.gx-notice') !== null)
    expect(frame()!.getAttribute('src')).toContain('lang=vi')
  })

  // 0.17 리뷰 v2 W14: 연 파일은 화면에 맞춰 보여 준다
  it('fits an opened file to the window', async () => {
    const { api } = fakeApi()
    api.consumeOpen = vi.fn(async () => ({
      name: 'a.svg',
      path: '/x/a.svg',
      bytes: new Uint8Array([1]),
    })) as never
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage()
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => page.executed.some(([id]) => id === 'view.fitAll'))
  })

  it('answers a close-save request with the save result', async () => {
    const { api, listeners } = fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage().withDocument('Untitled-1', true)
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => api.setDirty.mock.calls.some(([d]) => d === true))
    await act(async () => listeners.closeSave!())
    await until(() => api.sendCloseSaveResult.mock.calls.length === 1)
    expect(api.sendCloseSaveResult).toHaveBeenCalledWith(true)
    expect(api.commitSave).toHaveBeenCalled()
  })

  // 0.17 리뷰 #3: 문서가 없으면 빠른 작업 단추는 꺼져 있고, 왜 꺼졌는지 알려 준다
  it('keeps the quick buttons off until a document is open', async () => {
    fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage()
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(() => host.querySelector('[data-quick="centerOnArtboard"]') !== null)
    const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('[data-quick]')]
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80))
    })
    expect(buttons().every((b) => b.disabled)).toBe(true)
    expect(buttons()[0]!.title).toBe('먼저 그림을 열거나 새로 만들어 주세요.')
    page.withDocument('Untitled-1', false)
    await until(() => buttons().every((b) => !b.disabled))
    expect(buttons()[0]!.title).toBe('')
  })

  it('the menu Undo waits while a quick action or the AI holds the app', async () => {
    const { listeners } = fakeApi()
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage().withDocument('Untitled-1', false)
    // a quick action that does not finish: it holds the lock
    page.handlers['document.inspect'] = () => new Promise(() => {})
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(
      () =>
        host.querySelector<HTMLButtonElement>('[data-quick="centerOnArtboard"]')?.disabled ===
        false,
    )
    await act(async () =>
      (host.querySelector('[data-quick="centerOnArtboard"]') as HTMLButtonElement).click(),
    )
    await until(() => page.executed.some(([id]) => id === 'document.inspect'))
    await act(async () => listeners.menu!('undo'))
    await act(async () => listeners.menu!('redo'))
    expect(page.executed.map(([id]) => id)).not.toContain('edit.undo')
    expect(page.executed.map(([id]) => id)).not.toContain('edit.redo')
  })
})

describe('printing (0.17)', () => {
  /** a PNG head that says 3000 × 2000, as base64 */
  const pngBase64 = (() => {
    const bytes = new Uint8Array(33)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
    new DataView(bytes.buffer).setUint32(16, 3000)
    new DataView(bytes.buffer).setUint32(20, 2000)
    return btoa(String.fromCharCode(...bytes))
  })()

  /** PhotoCraft as the photo adapter reads it: one document, and h2's exportImage */
  function photoPage() {
    const page = readyPage()
    const asked: unknown[] = []
    page.inspect = async () => ({
      session: { active: 0, documents: [{ name: 'a.psd', dirty: false, revision: 1 }] },
    })
    page.request = async (method: string, params?: unknown) => {
      if (method === 'app.exportImage') {
        asked.push(params)
        return { dataBase64: pngBase64, width: 3000, height: 2000, format: 'png' }
      }
      throw new Error(`unknown method \`${method}\``)
    }
    return { page, asked }
  }

  async function readyPhoto() {
    const fake = fakeApi()
    await mount('photo')
    await until(() => frame() !== null)
    const { page, asked } = photoPage()
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).photocraft = page
    await until(() => host.querySelector('.gx-cover') === null)
    return { ...fake, asked }
  }

  it('the menu Print asks the app for its picture and shows the preview', async () => {
    const { listeners, asked } = await readyPhoto()
    await act(async () => listeners.menu!('print'))
    await until(() => host.querySelector('[data-hanpan="image-print-preview"]') !== null)
    expect(asked[0]).toMatchObject({ format: 'png', maxSide: 3508 })
    const html = host.querySelector('[data-hanpan="image-print-preview"]')!.getAttribute('srcdoc')!
    // a wide picture on landscape A4
    expect(html).toContain('@page { size: 297mm 210mm; margin: 0; }')
    expect(html).toContain(`data:image/png;base64,${pngBase64}`)
  })

  // 0.17 리뷰 v2 G3: 프레임 안의 Ctrl+P·파일 › 인쇄는 한판 인쇄 미리 보기로 간다
  it('a print asked for inside the frame shows the print preview', async () => {
    const fake = fakeApi()
    await mount('photo')
    await until(() => frame() !== null)
    const { page } = photoPage()
    let ask: ((r: 'save' | 'saveAs' | 'print') => void) | null = null
    ;(page as unknown as Record<string, unknown>).onHostRequest = (
      h: (r: 'save' | 'saveAs' | 'print') => void,
    ) => void (ask = h)
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).photocraft = page
    await until(() => host.querySelector('.gx-cover') === null)
    await until(() => ask !== null)
    await act(async () => ask!('print'))
    await until(() => host.querySelector('[data-hanpan="image-print-preview"]') !== null)
    expect(fake.api.print).not.toHaveBeenCalled()
  })

  it('prints the same picture on the paper the preview shows, then closes', async () => {
    const { api, listeners } = await readyPhoto()
    await act(async () => listeners.menu!('print'))
    await until(() => host.querySelector('[data-action="image-print-go"]:not([disabled])') !== null)
    await act(async () =>
      (host.querySelector('[data-print-orientation="portrait"]') as HTMLInputElement).click(),
    )
    await act(async () =>
      (host.querySelector('[data-action="image-print-go"]') as HTMLButtonElement).click(),
    )
    await until(() => api.print.mock.calls.length === 1)
    const [request] = api.print.mock.calls[0] as unknown as [{ bytes: Uint8Array; sheet: unknown }]
    expect(request.sheet).toEqual({ widthMm: 210, heightMm: 297, marginMm: 10 })
    expect(btoa(String.fromCharCode(...request.bytes))).toBe(pngBase64)
    await until(() => host.querySelector('[data-hanpan="image-print"]') === null)
  })
})

async function cleanup(): Promise<void> {
  await act(async () => root?.unmount())
  root = null
  host?.remove()
}

describe('the one-time note about .ai (5.4.1)', () => {
  const KEY = 'hanpan.illust.aiHintSeen'
  const NOTE =
    "AI 일러스트 문서로 저장했습니다. 일러스트레이터에서 열려면 '일러스트레이터용 .ai로 보내기'를 쓰세요."

  /** an illustration tab with a document, then one save asked for from Hanpan's menu */
  async function saveOnce(setup?: (api: ReturnType<typeof fakeApi>['api']) => void) {
    const fake = fakeApi()
    setup?.(fake.api)
    await mount('illust')
    await until(() => frame() !== null)
    const page = readyPage().withDocument('Untitled-1', true)
    ;(frame()!.contentWindow as unknown as Record<string, unknown>).vectorcraft = page
    await until(
      () => fake.api.setDirty.mock.calls.some(([d]) => d === true) || page.opened.length > 0,
    )
    // an opened file is handed over before the save is asked for
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150))
    })
    await act(async () => fake.listeners.save!('save' as never))
    await until(() => fake.api.sendSaveRequestAck.mock.calls.length === 1)
    return { ...fake, page }
  }

  const notice = () => host.querySelector('.gx-notice')?.textContent ?? null

  it('says once, after the first save of a new drawing as .vectorcraft', async () => {
    await saveOnce()
    expect(notice()).toBe(NOTE)
    expect(localStorage.getItem(KEY)).toBe('1')
  })

  it('never says it again once seen', async () => {
    localStorage.setItem(KEY, '1')
    await saveOnce()
    expect(notice()).toBeNull()
  })

  it('does not say it for a file opened from .svg or .vectorcraft', async () => {
    for (const name of ['a.svg', 'a.vectorcraft']) {
      localStorage.clear()
      await saveOnce((api) => {
        api.consumeOpen = vi.fn(async () => ({
          name,
          path: `/x/${name}`,
          bytes: new Uint8Array([1]),
        })) as never
        api.beginSave = vi.fn(async () => ({
          ok: true,
          path: `/x/${name}`,
          format: name.split('.')[1]!,
        })) as never
      })
      expect(notice(), name).toBeNull()
      expect(localStorage.getItem(KEY), name).toBeNull()
      await cleanup()
    }
  })

  it('keeps saving an opened .ai as .ai, with no note', async () => {
    const { page } = await saveOnce((api) => {
      api.consumeOpen = vi.fn(async () => ({
        name: 'a.ai',
        path: '/x/a.ai',
        bytes: new Uint8Array([1]),
      })) as never
      api.beginSave = vi.fn(async () => ({ ok: true, path: '/x/a.ai', format: 'ai' })) as never
    })
    expect(page.executed).toContainEqual(['file.save', { path: 'a.ai', options: {} }])
    expect(notice()).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('does not say it after a new drawing saved as .ai or .svg', async () => {
    await saveOnce((api) => {
      api.beginSave = vi.fn(async () => ({ ok: true, path: '/x/a.ai', format: 'ai' })) as never
    })
    expect(notice()).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('does not say it after a canceled or failed save', async () => {
    await saveOnce((api) => {
      api.beginSave = vi.fn(async () => ({ ok: true, canceled: true })) as never
    })
    expect(notice()).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
    await cleanup()
    await saveOnce((api) => {
      api.commitSave = vi.fn(async () => ({ ok: false, error: 'disk' })) as never
    })
    expect(notice()).not.toBe(NOTE)
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
