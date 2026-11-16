/**
 * The bar shown while sketching: the point count, the height box and the
 * three buttons; a refused outline shows its reason and makes nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ExtrudePart } from '@genoffice/cad-engine'
import { SketchBar } from '../src/renderer/components/SketchBar'
import { SketchTool } from '../src/renderer/editing/sketch'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { strings } from '../src/renderer/i18n/strings'

const en = strings.en

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(window as unknown as { cadApi: unknown }).cadApi = { onLanguageChanged: () => () => {} }
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function toolWith(points: [number, number][]): SketchTool {
  const tool = new SketchTool(1)
  for (const p of points) tool.addPoint(p)
  return tool
}

const TRIANGLE: [number, number][] = [
  [0, 0],
  [20, 0],
  [20, 20],
]

function show(tool: SketchTool) {
  const onFinish = vi.fn<(part: ExtrudePart) => void>()
  const onCancel = vi.fn<() => void>()
  act(() =>
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'en' },
        createElement(SketchBar, { tool, onFinish, onCancel }),
      ),
    ),
  )
  return { onFinish, onCancel }
}

function button(label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll('button')].find((b) => b.textContent === label)
  if (!found) throw new Error(`no button ${label}`)
  return found
}

function heightInput(): HTMLInputElement {
  return host.querySelector('input')!
}

function count(): string {
  return host.querySelector('.cad-sketch-count')!.textContent ?? ''
}

function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('SketchBar', () => {
  it('shows the title, the hint, the point count and a 10 mm height', () => {
    const tool = new SketchTool(1)
    show(tool)
    expect(host.textContent).toContain(en.sketchTitle)
    expect(host.textContent).toContain(en.sketchHint)
    expect(host.textContent).toContain(en.sketchHeight)
    expect(heightInput().value).toBe('10')
    expect(count()).toBe('0')
    act(() => tool.addPoint([1, 1]))
    expect(count()).toBe('1')
  })

  it('shows the too-few refusal and makes nothing', () => {
    const { onFinish } = show(
      toolWith([
        [0, 0],
        [10, 0],
      ]),
    )
    act(() => button(en.sketchClose).click())
    expect(host.textContent).toContain(en.sketchTooFew)
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('shows the self-crossing refusal and makes nothing', () => {
    const { onFinish } = show(
      toolWith([
        [0, 0],
        [20, 20],
        [20, 0],
        [0, 20],
      ]),
    )
    act(() => button(en.sketchClose).click())
    expect(host.textContent).toContain(en.sketchSelfCrossing)
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('hands onFinish a part with the typed height', () => {
    const { onFinish } = show(toolWith(TRIANGLE))
    typeInto(heightInput(), '25')
    act(() => button(en.sketchClose).click())
    expect(onFinish).toHaveBeenCalledTimes(1)
    const part = onFinish.mock.calls[0]![0]
    expect(part.type).toBe('extrude')
    expect(part.height).toBe(25)
    expect(part.rings).toHaveLength(1)
  })

  it('refuses a height that is not a usable number', () => {
    const { onFinish } = show(toolWith(TRIANGLE))
    typeInto(heightInput(), '0')
    act(() => button(en.sketchClose).click())
    expect(host.textContent).toContain(en.sketchBadHeight)
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('clears a refusal once the outline changes', () => {
    const tool = toolWith([[0, 0]])
    show(tool)
    act(() => button(en.sketchClose).click())
    expect(host.textContent).toContain(en.sketchTooFew)
    act(() => tool.addPoint([5, 5]))
    expect(host.textContent).not.toContain(en.sketchTooFew)
  })

  it('undo point removes one point and cancel clears them and calls onCancel', () => {
    const tool = toolWith([
      [0, 0],
      [5, 0],
    ])
    const { onCancel } = show(tool)
    act(() => button(en.sketchUndoPoint).click())
    expect(tool.points()).toHaveLength(1)
    expect(count()).toBe('1')
    act(() => button(en.sketchCancel).click())
    expect(tool.points()).toHaveLength(0)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
