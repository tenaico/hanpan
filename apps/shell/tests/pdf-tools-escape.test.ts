/**
 * @vitest-environment jsdom
 */
// 0.17 리뷰 v2 shell #14: Esc in the PDF tools window goes back from a tool to
// the list, and closes the window from the list.
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PdfToolsWindow } from '../src/renderer/src/pdf-tools/PdfToolsWindow'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let close: ReturnType<typeof vi.fn>

beforeEach(async () => {
  close = vi.fn(async () => undefined)
  const off = () => () => undefined
  ;(window as unknown as { aiOfficePdfTools: unknown }).aiOfficePdfTools = new Proxy(
    { close, takeStart: async () => null },
    {
      get: (target: Record<string, unknown>, name: string) =>
        target[name] ?? (name.startsWith('on') ? off : async () => null),
    },
  )
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root.render(createElement(PdfToolsWindow, { lang: 'ko' }))
  })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const esc = () =>
  act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
  })

describe('PDF tools window Esc', () => {
  it('goes back to the list from a tool, then closes', async () => {
    await act(async () => host.querySelector<HTMLButtonElement>('.pt-card')!.click())
    expect(host.querySelector('.pt-cards')).toBeNull()
    await esc()
    expect(host.querySelector('.pt-cards')).not.toBeNull()
    expect(close).not.toHaveBeenCalled()
    await esc()
    expect(close).toHaveBeenCalled()
  })
})
