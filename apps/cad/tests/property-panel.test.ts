/**
 * The property panel: the values of the selected parts, blanks where they
 * differ, and the patch an edited box hands back.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  addShape,
  createDocument,
  groupParts,
  updatePart,
  type CadDocument,
  type Part,
  type PartPatch,
} from '@genoffice/cad-engine'
import { PropertyPanel, panelValues } from '../src/renderer/components/PropertyPanel'
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

/** Two boxes: the same depth and height, different widths, names and places. */
function twoBoxes(): { doc: CadDocument; a: string; b: string } {
  const a = addShape(createDocument(), 'box', { name: 'A', dims: { width: 20 } })
  const b = addShape(a.doc, 'box', { name: 'B', dims: { width: 30 }, position: [40, 0, 0] })
  return { doc: b.doc, a: a.id, b: b.id }
}

type Patch = PartPatch | ((part: Part) => PartPatch)

function show(doc: CadDocument, ids: string[]) {
  const onPatch = vi.fn<(patch: Patch) => void>()
  act(() =>
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'en' },
        createElement(PropertyPanel, { doc, ids, onPatch }),
      ),
    ),
  )
  return onPatch
}

const field = (name: string): HTMLInputElement | null =>
  host.querySelector<HTMLInputElement>(`[data-prop="${name}"]`)

function type(input: HTMLInputElement, value: string): void {
  act(() => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
}

describe('the property panel', () => {
  it('property panel shows blanks for differing values', () => {
    const { doc, a, b } = twoBoxes()
    const values = panelValues(doc.parts.filter((p) => [a, b].includes(p.id)))
    expect(values.name).toBeNull()
    expect(values.dims).toEqual({ width: null, depth: 20, height: 20 })
    expect(values.position).toEqual([null, 0, 0])

    show(doc, [a, b])
    expect(field('name')!.value).toBe('')
    expect(field('dims.width')!.value).toBe('')
    expect(field('dims.depth')!.value).toBe('20')
    expect(field('dims.height')!.value).toBe('20')
    expect(field('position.x')!.value).toBe('')
    expect(field('position.y')!.value).toBe('0')
    expect(field('rotation.z')!.value).toBe('0')
    expect(host.textContent).toContain(en.propCount.replace('{n}', '2'))
  })

  it('shows the dimensions in the engine order with their names', () => {
    const doc = addShape(createDocument(), 'tube', { name: 'Pipe' })
    show(doc.doc, [doc.id])
    const dims = [...host.querySelectorAll<HTMLInputElement>('[data-prop^="dims."]')].map(
      (i) => i.dataset.prop,
    )
    expect(dims).toEqual(['dims.outerDiameter', 'dims.innerDiameter', 'dims.height'])
    expect(host.textContent).toContain(en.dimOuterDiameter)
    expect(host.textContent).toContain(en.shapeTube)
    expect(field('name')!.value).toBe('Pipe')
  })

  it('shows no dimensions for parts of different kinds, and no hide or lock inside groups', () => {
    const a = addShape(createDocument(), 'box')
    const b = addShape(a.doc, 'sphere')
    show(b.doc, [a.id, b.id])
    expect(host.querySelector('[data-prop^="dims."]')).toBeNull()
    // a group: no dimensions of its own, still hide and lock (it is a top-level part)
    const g = groupParts(b.doc, [a.id, b.id])
    show(g.doc, [g.id])
    expect(host.querySelector('[data-prop^="dims."]')).toBeNull()
    expect(field('hidden')).not.toBeNull()
    expect(field('locked')).not.toBeNull()
  })

  it('an edited box hands back one patch; on several parts only the edited axis changes', () => {
    const { doc, a, b } = twoBoxes()
    let onPatch = show(doc, [a])
    type(field('dims.width')!, '35')
    expect(onPatch).toHaveBeenCalledWith({ dims: { width: 35 } })

    onPatch = show(doc, [a, b])
    type(field('position.y')!, '12.5')
    expect(onPatch).toHaveBeenCalledTimes(1)
    const patch = onPatch.mock.calls[0]![0]
    expect(typeof patch).toBe('function')
    const second = doc.parts.find((p) => p.id === b)!
    expect((patch as (p: Part) => PartPatch)(second)).toEqual({ position: [40, 12.5, 0] })
  })

  it('a box that is not a number is put back and hands back nothing', () => {
    const { doc, a } = twoBoxes()
    const onPatch = show(doc, [a])
    type(field('dims.width')!, 'abc')
    expect(onPatch).not.toHaveBeenCalled()
    expect(field('dims.width')!.value).toBe('20')
  })

  it('switches kind, hidden and locked with one patch each', () => {
    const { doc, a } = twoBoxes()
    const onPatch = show(doc, [a])
    act(() => host.querySelector<HTMLButtonElement>('[data-prop="role.hole"]')!.click())
    expect(onPatch).toHaveBeenLastCalledWith({ role: 'hole' })
    act(() => field('locked')!.click())
    expect(onPatch).toHaveBeenLastCalledWith({ locked: true })
    act(() => field('hidden')!.click())
    expect(onPatch).toHaveBeenLastCalledWith({ hidden: true })
  })

  it('dragging in the colour picker hands back one patch, when the picker commits', () => {
    const { doc, a } = twoBoxes()
    const onPatch = show(doc, [a])
    const input = field('color')!
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    // the native picker fires `input` for every step of a drag
    for (const c of ['#100000', '#200000', '#300000', '#400000', '#500000', '#ff0000']) {
      act(() => {
        set.call(input, c)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    expect(onPatch).not.toHaveBeenCalled()
    // the swatch shows the colour being dragged
    expect(field('color')!.value).toBe('#ff0000')
    // closing the picker fires `change` once: that is the one edit
    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onPatch).toHaveBeenCalledTimes(1)
    expect(onPatch).toHaveBeenLastCalledWith({ color: '#ff0000' })
    // leaving the box afterwards does not add a second step
    act(() => {
      input.dispatchEvent(new FocusEvent('blur'))
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(onPatch).toHaveBeenCalledTimes(1)
  })

  it('says how to start when nothing is selected', () => {
    const { doc } = twoBoxes()
    show(doc, [])
    expect(host.textContent).toContain(en.propEmpty)
    expect(host.querySelector('input')).toBeNull()
  })

  it('a locked part still shows its values', () => {
    const { doc, a } = twoBoxes()
    const locked = updatePart(doc, a, { locked: true })
    show(locked, [a])
    expect(field('locked')!.checked).toBe(true)
    expect(field('dims.width')!.value).toBe('20')
  })
})
