/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeApi } from '../src/shared/home-api'
import { StartBoard } from '../src/renderer/src/hanpan/StartBoard'

/**
 * The start card (spec 7.3): the topic box, the office examples that start a
 * map and the user guide button with its F1 key. The flow drawing is gone.
 */

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let openHelp: ReturnType<typeof vi.fn>
let newMap: ReturnType<typeof vi.fn>

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  openHelp = vi.fn(async () => undefined)
  newMap = vi.fn(async () => ({ ok: true }))
  window.aiOffice = { openHelp } as unknown as HomeApi
  window.hanpanApi = { newMap } as unknown as typeof window.hanpanApi
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function renderBoard(): void {
  act(() => root.render(createElement(StartBoard, { greeting: 'Hi', t: (key) => key })))
}

describe('StartBoard', () => {
  it('has no flow figure', () => {
    renderBoard()
    expect(host.querySelector('.hp-flow')).toBeNull()
  })

  it("shows F1 on the guide button and opens Hanpan's guide", async () => {
    renderBoard()
    const guide = host.querySelector<HTMLElement>('[data-hanpan="start-guide"]')!
    expect(guide.querySelector('kbd')?.textContent).toBe('F1')
    expect(guide.dataset.tip).toBe('hpManualTip')
    await act(async () => guide.click())
    expect(openHelp).toHaveBeenCalledWith('hanpan')
  })

  it('offers office examples that start a map', async () => {
    renderBoard()
    const chips = Array.from(host.querySelectorAll<HTMLElement>('.hp-example'))
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'hbExample1',
      'hbExample2',
      'hbExample3',
    ])
    await act(async () => chips[0]!.click())
    expect(newMap).toHaveBeenCalledWith('hbExample1')
  })
})
