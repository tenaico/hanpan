/**
 * Hanpan: Insert ▸ Gongu pictures in the PowerPoint editor (docs/plans/gongu-images.md
 * 4.4, as the design board does it): the picture on the current slide with its
 * credit line in a small text box right under it, the two grouped, one undo
 * step — through the real main-process handlers, then save → reopen.
 */
import { tmpdir } from 'node:os'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const handlers = new Map<string, (...args: never[]) => unknown>()

vi.mock('electron', () => ({
  app: {
    getPath: () => tmpdir(),
    getName: () => 'slides-test',
    getVersion: () => '0',
    whenReady: () => Promise.resolve(),
  },
  dialog: {},
  clipboard: { writeBuffer: () => {} },
  ipcMain: {
    handle: (channel: string, fn: (...args: never[]) => unknown) => handlers.set(channel, fn),
    on: () => {},
    removeHandler: () => {},
  },
  BrowserWindow: class {},
  webContents: { getAllWebContents: () => [], fromId: () => null },
  Menu: { buildFromTemplate: () => ({}), setApplicationMenu: () => {} },
  session: { defaultSession: { protocol: {}, setDisplayMediaRequestHandler: () => {} } },
  nativeImage: {},
  shell: {},
  desktopCapturer: { getSources: async () => [] },
  WebContentsView: class {},
}))
// The shaping chain loads a harfbuzz wasm that cannot resolve in the unit-test env;
// nothing measured here renders text.
vi.mock('../src/main/shaped-metrics', () => ({
  shapedMetricsReady: async () => {},
  refineComplexWidths: async () => {},
  complexScriptOf: () => null,
  initShapedMetrics: () => {},
  gtMeasure: (t: string) => ({ width: t.length * 8 }),
  shapedFamily: () => null,
  shapedMeasure: () => ({ width: 0 }),
}))

import { createBlankPptx, openPptx, savePptx, type SlideElement } from '@genoffice/pptx-engine'
import type { GonguPicked } from '@genoffice/ui'
import { registerSlidesIpc } from '../src/main/slides-main'
import { sessions, type Session } from '../src/main/session-state'
import { insertGonguPicture } from '../src/renderer/insert-actions'
import type { ActionCtx } from '../src/renderer/action-context'
import type { RenderSlide } from '@genoffice/pptx-render'

const WC = 1
const event = { sender: { id: WC } } as never

/** Forward a renderer call straight into the real main-process handler. */
function ipc(channel: string, ...args: unknown[]): unknown {
  const fn = handlers.get(channel)
  if (!fn) throw new Error(`handler not registered: ${channel}`)
  return (fn as (...a: unknown[]) => unknown)(event, ...args)
}

let session: Session
let applied: RenderSlide | null

beforeAll(() => {
  // registerSlidesIpc is guarded by a module-level flag, so it must run exactly once
  registerSlidesIpc()
})

beforeEach(async () => {
  sessions.clear()
  session = {
    path: '',
    fitWidthPx: 1280,
    undoStack: [],
    redoStack: [],
    opened: await openPptx(await createBlankPptx()),
  }
  sessions.set(WC, session)
  applied = null

  // each call lands on the real handler, so the history under test is the one the user undoes
  selected = []
  vi.stubGlobal('window', {
    slidesApi: {
      addImageBytes: (op: unknown) => ipc('slides:add-image-bytes', op),
      addElement: (op: unknown) => ipc('slides:add-element', op),
      groupElements: (op: unknown) => ipc('slides:group-elements', op),
      beginHistoryBatch: () => ipc('slides:history-batch-begin'),
      endHistoryBatch: () => ipc('slides:history-batch-end'),
    },
  })
})

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const LINE = '「호작도」, 김홍도 / 출처: 공유마당(한국저작권위원회), 만료저작물'

const picked: GonguPicked = {
  dataUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
  width: 1120,
  height: 552,
  title: '호작도',
  credit: { collection: 'gongu', workId: '4534', title: '호작도', license: { kind: 'expired' } },
  creditLine: LINE,
  creditListTitle: '그림 출처',
}

let selected: string[] = []
function ctx(): ActionCtx {
  return {
    slide: { widthPx: 1280, heightPx: 720 },
    current: 0,
    applySlide: (_i: number, updated: RenderSlide) => {
      applied = updated
    },
    setSelectedIds: (ids: string[]) => {
      selected = ids
    },
    setStatus: () => {},
  } as unknown as ActionCtx
}

function textOf(element: SlideElement): string {
  return element.type === 'text' || element.type === 'shape'
    ? (element.text?.paragraphs ?? []).map((p) => p.runs.map((r) => r.text).join('')).join('\n')
    : ''
}

describe('Insert ▸ Gongu pictures (PowerPoint editor)', () => {
  it('puts the picture and its credit line under it on the slide, grouped, as one undo step', async () => {
    expect(await insertGonguPicture(ctx(), picked)).toBe(true)
    const elements = session.opened.deck.slides[0]!.elements
    expect(elements).toHaveLength(1)
    const group = elements[0]!
    expect(group.type).toBe('group')
    if (group.type !== 'group') return
    const [picture, credit] = group.children
    expect(picture?.type).toBe('picture')
    expect(picture?.name).toBe(LINE)
    expect(textOf(credit!)).toBe(LINE)
    // under the picture, centred, small
    const pic = picture!.transform.offset
    const box = credit!.transform.offset
    expect(box.y).toBeGreaterThanOrEqual(pic.y + pic.cy)
    expect(Math.abs(box.x + box.cx / 2 - (pic.x + pic.cx / 2))).toBeLessThan(12700)
    if (credit!.type === 'text') {
      expect(credit.text?.paragraphs[0]!.align).toBe('center')
      expect(credit.text?.paragraphs[0]!.runs[0]!.fontSize).toBe(10)
    }
    // the picture keeps its proportions and stays on the slide
    expect(pic.cx / pic.cy).toBeCloseTo(1120 / 552, 1)
    expect(box.y + box.cy).toBeLessThanOrEqual(session.opened.deck.size.cy)
    expect(applied).not.toBeNull()
    expect(selected).toEqual([group.id])
    expect(session.undoStack).toHaveLength(1)
    ipc('slides:undo')
    expect(session.opened.deck.slides[0]!.elements).toHaveLength(0)
  })

  it('survives save → reopen in the .pptx', async () => {
    await insertGonguPicture(ctx(), picked)
    const reopened = await openPptx(await savePptx(session.opened))
    const group = reopened.deck.slides[0]!.elements[0]!
    expect(group.type).toBe('group')
    if (group.type !== 'group') return
    expect(group.children.map((c) => c.type)).toEqual(['picture', 'text'])
    expect(group.children[0]!.name).toBe(LINE)
    expect(textOf(group.children[1]!)).toBe(LINE)
  })
})
