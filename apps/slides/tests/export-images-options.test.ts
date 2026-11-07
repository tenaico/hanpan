// 이미지로 내보내기: 형식·범위·크기를 고르고, 진행을 보여 주고, 끝나면 "폴더 열기"를 준다(0.17 UX v2 #21)
import { afterEach, describe, expect, it, vi } from 'vitest'

const render = vi.fn(
  async (
    slides: unknown[],
    _images: unknown,
    _ratio?: number,
    _mime?: string,
    onProgress?: (done: number, total: number) => void,
  ) => {
    slides.forEach((_s, i) => onProgress?.(i + 1, slides.length))
    return slides.map(() => 'AAAA')
  },
)
vi.mock('../src/renderer/export-render', () => ({
  renderSlidesToPngBase64: (...a: Parameters<typeof render>) => render(...a),
}))
const toast = vi.fn()
vi.mock('../src/renderer/components/toast-bus', () => ({
  showToast: (...a: unknown[]) => toast(...a),
}))

import { exportImages } from '../src/renderer/file-actions'
import { setModuleLang } from '../src/renderer/i18n/locale'
import type { ActionCtx } from '../src/renderer/action-context'

afterEach(() => {
  vi.unstubAllGlobals()
  render.mockClear()
  toast.mockClear()
  setModuleLang('zh')
})

function setup() {
  const api = {
    pickExportDir: vi.fn(async () => 'C:/Users/me/AppData/Local/Temp/very/long/folder/슬라이드'),
    exportImages: vi.fn(async (op: { pngsBase64: string[]; ext?: string }) => ({
      ok: true,
      paths: op.pngsBase64.map((_x, i) => `p${i}.${op.ext ?? 'png'}`),
    })),
    revealExportFolder: vi.fn(async () => true),
  }
  vi.stubGlobal('window', { slidesApi: api })
  const statuses: string[] = []
  const ctx = {
    slides: [{ id: 'a' }, { id: 'b', hidden: true }, { id: 'c' }],
    current: 2,
    images: new Map(),
    path: 'C:/d/영업보고.pptx',
    setStatus: (s: string) => statuses.push(s),
  } as unknown as ActionCtx
  return { api, ctx, statuses }
}

describe('exportImages with options', () => {
  it('current slide only, as JPEG at 1x', async () => {
    setModuleLang('ko')
    const { api, ctx } = setup()
    await exportImages(ctx, { format: 'jpg', range: 'current', scale: 1 })
    expect(render).toHaveBeenCalledTimes(1)
    expect((render.mock.calls[0]![0] as unknown[]).length).toBe(1)
    expect(render.mock.calls[0]![2]).toBe(1)
    expect(render.mock.calls[0]![3]).toBe('image/jpeg')
    expect(api.exportImages).toHaveBeenCalledWith(expect.objectContaining({ ext: 'jpg' }))
  })

  it('all visible slides; progress per slide; done names the folder, not the whole path', async () => {
    setModuleLang('ko')
    const { ctx, statuses } = setup()
    await exportImages(ctx, { format: 'png', range: 'all', scale: 2 })
    expect((render.mock.calls[0]![0] as unknown[]).length).toBe(2)
    expect(statuses.some((s) => s.includes('2/2'))).toBe(true)
    const done = statuses.at(-1)!
    expect(done).toContain('슬라이드')
    expect(done).not.toContain('AppData')
    expect(toast).toHaveBeenCalledTimes(1)
    const action = toast.mock.calls[0]![2] as { label: string; run: () => void }
    expect(action.label).toBe('폴더 열기')
  })
})
