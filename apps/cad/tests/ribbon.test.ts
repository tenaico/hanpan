/**
 * The ribbon: the tab picked last comes back, the shape buttons and the
 * gallery place every shape, and the Make group starts sketching and asks for
 * the text of a text shape.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SHAPE_DIMS, type ShapeKind } from '@genoffice/cad-engine'
import { Ribbon, type RibbonProps } from '../src/renderer/components/Ribbon'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { strings } from '../src/renderer/i18n/strings'

const en = strings.en

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(window as unknown as { cadApi: unknown }).cadApi = { onLanguageChanged: () => () => {} }
  localStorage.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function props(over: Partial<RibbonProps> = {}): RibbonProps {
  return {
    title: 'bracket',
    stateText: en.saved,
    dirty: false,
    disabled: false,
    canUndo: true,
    canRedo: false,
    autoSave: false,
    selected: 0,
    canUngroup: false,
    handleMode: 'move',
    sketching: false,
    onToggleAutoSave: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onExport: vi.fn(),
    onPlaceShape: vi.fn(),
    onToggleHole: vi.fn(),
    onSketch: vi.fn(),
    onText: vi.fn(),
    onGroup: vi.fn(),
    onUngroup: vi.fn(),
    onAlign: vi.fn(),
    onView: vi.fn(),
    onHandleMode: vi.fn(),
    ...over,
  }
}

function show(p: RibbonProps): void {
  act(() => root.render(createElement(LocaleProvider, { initial: 'en' }, createElement(Ribbon, p))))
}

const pane = (name: string) => host.querySelector<HTMLElement>(`[data-ribbon-pane="${name}"]`)!
const action = (name: string) => host.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)

describe('the ribbon', () => {
  it('ribbon remembers the chosen tab', () => {
    show(props())
    expect(pane('home').hidden).toBe(false)
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[data-ribbon-tab]')].map(
      (b) => b.dataset.ribbonTab,
    )
    expect(tabs).toEqual(['file', 'home', 'view', 'help'])
    act(() => host.querySelector<HTMLButtonElement>('[data-ribbon-tab="view"]')!.click())
    expect(pane('view').hidden).toBe(false)
    expect(pane('home').hidden).toBe(true)
    expect(localStorage.getItem('cadapp.ribbonTab')).toBe('view')

    // a new tab of the editor starts where the last one was left
    act(() => root.unmount())
    root = createRoot(host)
    show(props())
    expect(pane('view').hidden).toBe(false)

    // a stored value that is not a tab falls back to Home
    localStorage.setItem('cadapp.ribbonTab', 'nonsense')
    act(() => root.unmount())
    root = createRoot(host)
    show(props())
    expect(pane('home').hidden).toBe(false)
  })

  it('shows the title and the saved state in the tab row', () => {
    show(props({ dirty: true, stateText: en.unsaved }))
    expect(host.querySelector('.cad-title')!.textContent).toBe('bracket')
    expect(host.querySelector('.cad-state')!.textContent).toBe(en.unsaved)
  })

  it('places the four common shapes and the other eleven from the gallery', () => {
    const p = props()
    show(p)
    for (const kind of ['box', 'cylinder', 'sphere', 'cone']) {
      act(() => action(`shape-${kind}`)!.click())
    }
    expect(p.onPlaceShape).toHaveBeenCalledTimes(4)
    act(() => action('more-shapes')!.click())
    const items = [...host.querySelectorAll<HTMLButtonElement>('[data-shape]')]
    expect(items.map((b) => b.dataset.shape)).toEqual(Object.keys(SHAPE_DIMS))
    expect(items[0]!.textContent).toContain(en.shapeBox)
    for (const item of items.filter((b) => b.dataset.shape !== 'text')) {
      // picking a shape closes the gallery: open it again for the next one
      if (!host.querySelector('[data-shape]')) act(() => action('more-shapes')!.click())
      act(() =>
        host.querySelector<HTMLButtonElement>(`[data-shape="${item.dataset.shape}"]`)!.click(),
      )
      expect(host.querySelector('[data-shape]')).toBeNull()
    }
    const placed = vi.mocked(p.onPlaceShape).mock.calls.map((c) => c[0] as ShapeKind)
    expect(new Set(placed)).toEqual(new Set(Object.keys(SHAPE_DIMS).filter((k) => k !== 'text')))
  })

  it('the Make group: hole, sketch, and text asks for the words first', () => {
    const p = props({ selected: 1 })
    show(p)
    act(() => action('hole')!.click())
    expect(p.onToggleHole).toHaveBeenCalledTimes(1)
    act(() => action('sketch')!.click())
    expect(p.onSketch).toHaveBeenCalledTimes(1)

    act(() => action('text')!.click())
    const input = host.querySelector<HTMLInputElement>('[data-text-input]')!
    expect(input).not.toBeNull()
    // nothing typed: nothing to place
    expect(host.querySelector<HTMLButtonElement>('[data-text-place]')!.disabled).toBe(true)
    act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(input, 'Hi')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => host.querySelector<HTMLButtonElement>('[data-text-place]')!.click())
    expect(p.onText).toHaveBeenCalledWith('Hi')
    expect(host.querySelector('[data-text-input]')).toBeNull()

    // the gallery's Text asks the same way
    act(() => action('more-shapes')!.click())
    act(() => host.querySelector<HTMLButtonElement>('[data-shape="text"]')!.click())
    expect(host.querySelector('[data-text-input]')).not.toBeNull()
    expect(p.onPlaceShape).not.toHaveBeenCalled()
  })

  it('selection tools are off until enough is selected', () => {
    show(props({ selected: 0 }))
    expect(action('hole')!.disabled).toBe(true)
    expect(action('group')!.disabled).toBe(true)
    expect(action('align')!.disabled).toBe(true)
    show(props({ selected: 2, canUngroup: true }))
    expect(action('hole')!.disabled).toBe(false)
    expect(action('group')!.disabled).toBe(false)
    expect(action('ungroup')!.disabled).toBe(false)
    expect(action('align')!.disabled).toBe(false)
  })

  it('align offers nine lines and hands back the axis and the anchor', () => {
    const p = props({ selected: 2 })
    show(p)
    act(() => action('align')!.click())
    const items = [...host.querySelectorAll<HTMLButtonElement>('[data-align]')]
    expect(items.map((b) => b.dataset.align)).toEqual([
      'x-min',
      'x-center',
      'x-max',
      'y-min',
      'y-center',
      'y-max',
      'z-min',
      'z-center',
      'z-max',
    ])
    act(() => items[1]!.click())
    expect(p.onAlign).toHaveBeenCalledWith('x', 'center')
  })

  it('the View tab turns the camera and picks the handle', () => {
    const p = props()
    show(p)
    act(() => action('view-top')!.click())
    act(() => action('view-fit')!.click())
    expect(vi.mocked(p.onView).mock.calls.map((c) => c[0])).toEqual(['top', 'fit'])
    act(() => action('handle-rotate')!.click())
    expect(p.onHandleMode).toHaveBeenCalledWith('rotate')
  })

  it('the File tab saves and exports', () => {
    const p = props()
    show(p)
    act(() => action('export-stl')!.click())
    act(() => action('export-png')!.click())
    expect(vi.mocked(p.onExport).mock.calls.map((c) => c[0])).toEqual(['stl', 'png'])
    act(() => action('save')!.click())
    expect(p.onSave).toHaveBeenCalledTimes(1)
  })
})
