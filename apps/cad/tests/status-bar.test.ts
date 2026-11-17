/**
 * The status line: the workplane, snap and grid as in the approved mock-up,
 * the size of the one selected part, and a message when an edit was refused.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { StatusBar, type StatusBarProps } from '../src/renderer/components/StatusBar'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { strings } from '../src/renderer/i18n/strings'

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

function show(p: StatusBarProps, lang: 'ko' | 'en' = 'ko'): void {
  act(() =>
    root.render(createElement(LocaleProvider, { initial: lang }, createElement(StatusBar, p))),
  )
}

const info = (): string => host.querySelector('[data-cad-status-info]')!.textContent ?? ''
const message = (): string => host.querySelector('[data-cad-message]')?.textContent ?? ''

const workplane = { width: 200, depth: 200, grid: 10 }

describe('the status line', () => {
  it('shows the workplane, the snap and the grid as in the mock-up', () => {
    show({ workplane, snapMm: 1, selectedCount: 0, size: null, message: null })
    expect(info()).toBe('작업판 200 × 200 mm · 달라붙기 1mm · 격자 10mm')
    expect(message()).toBe('')
  })

  it('shows the size of the one selected part in millimetres', () => {
    show({
      workplane,
      snapMm: 1,
      selectedCount: 1,
      size: { name: 'Base', width: 20, depth: 12.345, height: 7 },
      message: null,
    })
    expect(info()).toBe(
      strings.ko.statusPartSize
        .replace('{name}', 'Base')
        .replace('{width}', '20')
        .replace('{depth}', '12.35')
        .replace('{height}', '7'),
    )
    expect(info()).toContain('20 × 12.35 × 7 mm')
  })

  it('counts several selected parts', () => {
    show({ workplane, snapMm: 1, selectedCount: 3, size: null, message: null }, 'en')
    expect(info()).toContain(strings.en.statusSelected.replace('{n}', '3'))
  })

  it('shows a refusal as an error line', () => {
    show({
      workplane,
      snapMm: 1,
      selectedCount: 0,
      size: null,
      message: { key: 'editLocked', error: true },
    })
    expect(message()).toBe(strings.ko.editLocked)
    expect(host.querySelector('[data-cad-status]')!.hasAttribute('data-error')).toBe(true)
  })
})
