/**
 * The AI pane on the screen: where it sits (under the property panel), the
 * ribbon button that shows and hides it, the quick actions above its input,
 * and the request it sends (the drawing's prompt and tools). The model is
 * scripted; no provider is reached.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import {
  addShape,
  createDocument,
  createKernel,
  saveCadFile,
  type Kernel,
} from '@genoffice/cad-engine'
import { PRODUCT_NAME, UPSTREAM_PRODUCT_NAME } from '@genoffice/i18n'
import { applyKoreanDocFeatures, aiSubscriptionText } from '@genoffice/ui'
import { selection } from '../src/renderer/editing/selection'
import { strings } from '../src/renderer/i18n/strings'
import type { Rasterize } from '../src/renderer/sheet/sheet-png'
import {
  aiFake,
  click,
  mountAiApp,
  recordingViewport,
  sendMessage,
  settle,
  until,
  type Mounted,
} from './helpers/ai-app'

const en = strings.en
const ko = strings.ko

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
  applyKoreanDocFeatures(null)
  vi.unstubAllGlobals()
})

const realKernel = (): Promise<Kernel> => createKernel()
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7])
const fakeRasterize: Rasterize = async () => PNG

function boxBytes(): Uint8Array {
  return saveCadFile(
    addShape(createDocument(), 'box', { name: 'Base', dims: { width: 80, depth: 50 } }).doc,
  )
}

const composerValue = (c: HTMLElement): string =>
  c.querySelector<HTMLTextAreaElement>('.ai-input-box textarea')!.value

const quick = (name: string) => `.cad-ai-quick [data-ai-quick="${name}"]`

describe('the AI pane', () => {
  it('sits under the property panel and the ribbon button hides and shows it', async () => {
    mounted = await mountAiApp(aiFake(null), recordingViewport().factory)
    const { container } = mounted
    const side = container.querySelector('.cad-side')!
    const props = side.querySelector('[data-cad-properties]')!
    const dock = side.querySelector('.ai-dock')!
    expect(dock).not.toBeNull()
    // the property panel first, the assistant under it
    expect(props.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(dock.classList.contains('collapsed')).toBe(false)
    const title = container.querySelector('.ai-panel-title')!.textContent
    expect(title).toContain(aiSubscriptionText('en', 'aiAssistant'))

    const button = container.querySelector<HTMLButtonElement>('.ribbon-tabs [data-action="ai"]')!
    expect(button.textContent).toContain(aiSubscriptionText('en', 'aiAssistant'))
    expect(button.getAttribute('aria-pressed')).toBe('true')
    await act(async () => button.click())
    expect(dock.classList.contains('collapsed')).toBe(true)
    expect(button.getAttribute('aria-pressed')).toBe('false')
    // the rail brings it back too
    await click(container, '.ai-dock .ai-rail')
    expect(dock.classList.contains('collapsed')).toBe(false)
  })

  it('sends the drawing prompt and tools, and shows the reply', async () => {
    const fake = aiFake(null, () => [
      { type: 'delta', text: 'Hello from the model.' },
      { type: 'done' },
    ])
    mounted = await mountAiApp(fake, recordingViewport().factory)
    await sendMessage(mounted.container, 'what is on the plate?')
    await until(() => fake.requests.length === 1, 'the request')
    const request = fake.requests[0] as unknown as { system: string; tools: { name: string }[] }
    expect(request.system).toContain(`${PRODUCT_NAME} AI Drawing`)
    expect(request.system).not.toContain(UPSTREAM_PRODUCT_NAME)
    // the reply language line follows the UI language
    expect(request.system).toContain("Reply in the same language as the user's message")
    await until(
      () => !!mounted!.container.querySelector('.ai-msg-assistant')?.textContent?.includes('Hello'),
      'the reply',
    )
  })

  it('shows the tool steps in the UI language', async () => {
    const fake = aiFake(null, (_request, nth) =>
      nth === 1
        ? [
            {
              type: 'tool-call',
              toolCall: { id: 'c1', name: 'add_shapes', input: { shapes: [{ kind: 'box' }] } },
            },
            { type: 'done' },
          ]
        : [{ type: 'delta', text: 'Done.' }, { type: 'done' }],
    )
    mounted = await mountAiApp(fake, recordingViewport().factory)
    await sendMessage(mounted.container, 'a box')
    await until(() => !mounted!.container.querySelector('.ai-stop-btn'), 'the request to end')
    await click(mounted.container, '.ai-work-group-summary')
    const steps = [...mounted.container.querySelectorAll('.ai-step-title')].map(
      (s) => s.textContent,
    )
    expect(steps).toEqual([en.aiToolAddShapes.replace('{n}', '1')])
  })
})

describe('the quick actions', () => {
  it('quick action room start fills the input', async () => {
    const fake = aiFake(null)
    mounted = await mountAiApp(fake, recordingViewport().factory)
    const { container } = mounted
    await click(container, quick('room'))
    expect(composerValue(container)).toBe(en.aiQuickRoomPrompt)
    // nothing was sent: the person reads and sends it
    await settle()
    expect(fake.requests).toHaveLength(0)
    expect(ko.aiQuickRoomPrompt).toBe('방 5×4m 작업판을 만들고 책상 4개를 놓아 줘')
  })

  it('quick action sheet opens the sheet dialog without calling the AI', async () => {
    const fake = aiFake({ status: 'ok', bytes: boxBytes() })
    mounted = await mountAiApp(fake, recordingViewport().factory, realKernel, fakeRasterize)
    const { container } = mounted
    await until(
      () => container.querySelector<HTMLButtonElement>(quick('sheet'))?.disabled === false,
      'the sheet to be possible',
    )
    await click(container, quick('sheet'))
    expect(container.querySelector('[data-sheet-preview]')).not.toBeNull()
    await settle()
    expect(fake.requests).toHaveLength(0)
  })

  it('the sheet and send quick actions are off on an empty drawing and say why', async () => {
    mounted = await mountAiApp(aiFake(null), recordingViewport().factory)
    for (const name of ['sheet', 'send']) {
      const button = mounted.container.querySelector<HTMLButtonElement>(quick(name))!
      expect(button.disabled).toBe(true)
      expect(button.getAttribute('data-tip')).toBe(en.sheetEmpty)
    }
    expect(mounted.container.querySelector<HTMLButtonElement>(quick('room'))!.disabled).toBe(false)
  })

  it('the send quick action sends the sheet and follows the Korean document switch', async () => {
    applyKoreanDocFeatures(true)
    const fake = aiFake({ status: 'ok', bytes: boxBytes() })
    mounted = await mountAiApp(fake, recordingViewport().factory, realKernel, fakeRasterize)
    const { container } = mounted
    await until(
      () => container.querySelector<HTMLButtonElement>(quick('send'))?.disabled === false,
      'the send to be possible',
    )
    expect(container.querySelector(quick('send'))!.textContent).toBe(en.sendHwp)
    await act(async () => applyKoreanDocFeatures(false))
    expect(container.querySelector(quick('send'))!.textContent).toBe(en.sendDocx)
    await click(container, quick('send'))
    await until(() => fake.sends.length === 1, 'the send')
    expect(fake.sends[0]!.target).toBe('docx')
    expect(fake.requests).toHaveLength(0)
  })
})
