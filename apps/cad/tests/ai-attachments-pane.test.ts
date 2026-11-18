/**
 * Attachments in the AI pane (design 2026-11-18): files the person attaches
 * are seen by the AI as reference, never put into the drawing. A picture goes
 * with the request as a picture, a document is read through read_attachment,
 * and reading one changes nothing: the request is still one undo step.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CAD_TOOL_NAMES } from '../src/renderer/ai/cad-tools'
import { selection } from '../src/renderer/editing/selection'
import type { CadApi } from '../src/shared/ipc'
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

const done: Chunk = { type: 'done' }
const said = (text: string): Chunk[] => [{ type: 'delta', text }, done]
const sketch = { path: 'C:/ref/sketch.png', name: 'sketch.png', ext: 'png', sizeBytes: 2048 }
const spec = { path: 'C:/ref/spec.pdf', name: 'spec.pdf', ext: 'pdf', sizeBytes: 40960 }

function withAttachments(api: CadApi, accepted: unknown[]) {
  const calls = {
    pickAttachments: vi.fn(async () => ({ accepted, rejected: [] })),
    readAttachmentImage: vi.fn(async () => ({ ok: true, base64: 'QUJD', mime: 'image/png' })),
    readAttachment: vi.fn(async (_path: string, offset: number) => ({
      ok: true,
      name: 'spec.pdf',
      totalChars: 23,
      offset,
      text: 'Box: 80 x 60 x 40 mm.',
    })),
    getPathForFile: () => '',
  }
  Object.assign(api, calls)
  return calls
}

async function attach(container: HTMLElement): Promise<void> {
  expect(container.querySelector('.ai-attach-btn')).not.toBeNull()
  await click(container, '.ai-attach-btn')
  await settle(4)
}

const names = (view: ReturnType<typeof recordingViewport>) =>
  view.doc().parts.map((part) => part.name)

describe('attachments in the AI pane', () => {
  it('sends an attached picture with the request and lists it for the model', async () => {
    const fake = aiFake(null, () => said('Seen.'))
    withAttachments(fake.api, [sketch])
    mounted = await mountAiApp(fake, recordingViewport().factory)
    const { container } = mounted
    await attach(container)
    expect(container.querySelectorAll('.ai-attachments .ai-attachment-thumb')).toHaveLength(1)
    await sendMessage(container, 'lay it out like this sketch')
    await until(() => fake.requests.length === 1, 'the request')
    const last = fake.requests[0]!.messages.at(-1) as { images?: { base64: string }[] }
    expect(last.images?.map((image) => image.base64)).toEqual(['QUJD'])
    expect(JSON.stringify(fake.requests[0])).toContain('sketch.png')
    expect(container.querySelector('.ai-attachments')).toBeNull()
    expect(container.querySelectorAll('.ai-msg-user .ai-attachment-thumb')).toHaveLength(1)
  })

  it('reads an attached PDF, builds from it, and one undo takes the request back', async () => {
    const view = recordingViewport()
    const fake = aiFake(null, (_request, nth) =>
      nth === 1
        ? [toolCall('read_attachment', { index: 0 }, 'r1'), done]
        : nth === 2
          ? [
              toolCall(
                CAD_TOOL_NAMES.addShapes,
                { shapes: [{ kind: 'box', name: 'Spec box', position: [0, 0, 0] }] },
                'a1',
              ),
              done,
            ]
          : said('Made the box from the spec.'),
    )
    const calls = withAttachments(fake.api, [spec])
    mounted = await mountAiApp(fake, view.factory)
    const { container } = mounted
    await attach(container)
    await sendMessage(container, 'make the box in the spec')
    await until(() => names(view).length === 1, 'the box')
    expect(calls.readAttachment).toHaveBeenCalledWith(spec.path, 0, 24_000)
    expect(JSON.stringify(fake.requests[1])).toContain('Box: 80 x 60 x 40 mm.')
    await until(() => !container.querySelector('.ai-stop-btn'), 'the request to end')
    await click(container, '.ribbon-tabs [data-action="undo"]')
    await settle(2)
    expect(names(view)).toEqual([])
    const undo = container.querySelector<HTMLButtonElement>('.ribbon-tabs [data-action="undo"]')!
    expect(undo.disabled).toBe(true)
  })

  it('a new chat clears the attachments', async () => {
    const fake = aiFake(null, () => said('ok'))
    withAttachments(fake.api, [spec])
    mounted = await mountAiApp(fake, recordingViewport().factory)
    const { container } = mounted
    await attach(container)
    await sendMessage(container, 'first')
    await until(() => fake.requests.length === 1, 'the first request')
    await until(() => !container.querySelector('.ai-stop-btn'), 'the first request to end')
    await click(container, '.ai-panel-header-actions .ai-header-btn')
    await settle(2)
    await sendMessage(container, 'second')
    await until(() => fake.requests.length === 2, 'the second request')
    expect(JSON.stringify(fake.requests[1])).not.toContain('spec.pdf')
  })
})
