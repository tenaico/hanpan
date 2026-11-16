/**
 * One AI request is one undo step (apps/cad/AGENTS.md, plan Review Focus 1-2):
 * the pane opens a history group when a request starts and closes it however
 * the request ends: done, stopped or failed. Checked on the whole screen, with
 * the model's tool calls scripted (no provider is reached).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addShape, createDocument, saveCadFile } from '@genoffice/cad-engine'
import { CAD_TOOL_NAMES } from '../src/renderer/ai/cad-tools'
import { selection } from '../src/renderer/editing/selection'
import {
  aiFake,
  click,
  mountAiApp,
  recordingViewport,
  sendMessage,
  settle,
  toolCall,
  until,
  type Chunk,
  type Mounted,
} from './helpers/ai-app'

let mounted: Mounted | null = null

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
  Element.prototype.scrollTo = () => undefined
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  selection.clear()
  vi.unstubAllGlobals()
})

const box = (name: string, x: number) => ({ kind: 'box', name, position: [x, 0, 0] })
const add = (id: string, ...shapes: ReturnType<typeof box>[]) =>
  toolCall(CAD_TOOL_NAMES.addShapes, { shapes }, id)
const done: Chunk = { type: 'done' }
const said = (text: string): Chunk[] => [{ type: 'delta', text }, done]

/** A stream held open until the test lets it go. */
function held(): { promise: Promise<Chunk[]>; release(chunks: Chunk[]): void } {
  let release!: (chunks: Chunk[]) => void
  const promise = new Promise<Chunk[]>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

const undoButton = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.ribbon-tabs [data-action="undo"]')!

async function undo(c: HTMLElement): Promise<void> {
  await click(c, '.ribbon-tabs [data-action="undo"]')
  await settle(2)
}

const names = (view: ReturnType<typeof recordingViewport>) =>
  view.doc().parts.map((part) => part.name)

describe('one AI request is one undo step', () => {
  it('one AI request that adds three shapes is undone by one undo', async () => {
    const view = recordingViewport()
    const fake = aiFake(null, (_request, nth) =>
      nth === 1
        ? [add('c1', box('A', 0)), add('c2', box('B', 50)), add('c3', box('C', 100)), done]
        : said('Placed three boxes.'),
    )
    mounted = await mountAiApp(fake, view.factory)
    const { container } = mounted
    await sendMessage(container, 'three boxes in a row')
    await until(() => names(view).length === 3, 'the three boxes')
    expect(names(view)).toEqual(['A', 'B', 'C'])
    await until(() => !container.querySelector('.ai-stop-btn'), 'the request to end')
    expect(undoButton(container).disabled).toBe(false)
    await undo(container)
    expect(names(view)).toEqual([])
    // that was the only step
    expect(undoButton(container).disabled).toBe(true)
  })

  it('a stopped request still closes the group', async () => {
    const view = recordingViewport()
    const second = held()
    const fake = aiFake(null, (_request, nth) =>
      nth === 1 ? [add('c1', box('A', 0)), done] : second.promise,
    )
    mounted = await mountAiApp(fake, view.factory)
    const { container } = mounted
    await sendMessage(container, 'a box, then think a long time')
    await until(() => names(view).length === 1, 'the first box')
    await until(() => fake.requests.length === 2, 'the second turn')
    // the model is still thinking: Stop
    await click(container, '.ai-stop-btn')
    await until(() => !container.querySelector('.ai-stop-btn'), 'the request to stop')
    expect(fake.cancels).toHaveLength(1)
    // an edit by hand after the stop is a step of its own
    await click(container, '[data-ribbon-pane="home"] [data-action="shape-cylinder"]')
    expect(view.doc().parts).toHaveLength(2)
    await undo(container)
    expect(names(view)).toEqual(['A'])
    await undo(container)
    expect(names(view)).toEqual([])
    second.release([])
  })

  it('an error mid-request closes the group and keeps the edits made so far as one step', async () => {
    const view = recordingViewport()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = aiFake(null, (_request, nth) =>
      nth === 1
        ? [add('c1', box('A', 0)), add('c2', box('B', 50)), done]
        : [{ type: 'error', error: 'the model fell over' }],
    )
    mounted = await mountAiApp(fake, view.factory)
    const { container } = mounted
    await sendMessage(container, 'two boxes')
    await until(() => !container.querySelector('.ai-stop-btn'), 'the request to fail')
    expect(container.querySelector('.ai-msg-error')?.textContent).toContain('the model fell over')
    // the edits made before the error stay
    expect(names(view)).toEqual(['A', 'B'])
    await click(container, '[data-ribbon-pane="home"] [data-action="shape-cylinder"]')
    expect(view.doc().parts).toHaveLength(3)
    await undo(container)
    expect(names(view)).toEqual(['A', 'B'])
    await undo(container)
    expect(names(view)).toEqual([])
    expect(undoButton(container).disabled).toBe(true)
    error.mockRestore()
  })

  it('an undo in the middle of a request leaves what the request does next one step', async () => {
    const view = recordingViewport()
    const second = held()
    const fake = aiFake(null, (_request, nth) =>
      nth === 1 ? [add('c1', box('A', 0)), done] : nth === 2 ? second.promise : said('Done.'),
    )
    mounted = await mountAiApp(fake, view.factory)
    const { container } = mounted
    await sendMessage(container, 'boxes')
    await until(() => fake.requests.length === 2, 'the second turn')
    expect(names(view)).toEqual(['A'])
    // the person takes A back while the model still works
    await undo(container)
    expect(names(view)).toEqual([])
    second.release([add('c2', box('B', 0)), add('c3', box('C', 50)), done])
    await until(() => names(view).length === 2, 'the next boxes')
    await until(() => !container.querySelector('.ai-stop-btn'), 'the request to end')
    expect(names(view)).toEqual(['B', 'C'])
    await undo(container)
    expect(names(view)).toEqual([])
    expect(undoButton(container).disabled).toBe(true)
  })

  it('the tools reach the drawing on screen, opened from a file', async () => {
    const view = recordingViewport()
    const bytes = saveCadFile(addShape(createDocument(), 'box', { name: 'Base' }).doc)
    const fake = aiFake({ status: 'ok', bytes }, (_request, nth) =>
      nth === 1 ? [add('c1', box('Lid', 0)), done] : said('Added a lid.'),
    )
    mounted = await mountAiApp(fake, view.factory)
    await sendMessage(mounted.container, 'add a lid')
    await until(() => names(view).length === 2, 'the lid')
    expect(names(view)).toEqual(['Base', 'Lid'])
    // the request carried the eight drawing tools
    const tools = (fake.requests[0] as unknown as { tools: { name: string }[] }).tools.map(
      (tool) => tool.name,
    )
    expect(tools).toEqual(expect.arrayContaining(Object.values(CAD_TOOL_NAMES)))
  })
})
