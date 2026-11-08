/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StartBoard, flowGeometry } from '../src/renderer/src/hanpan/StartBoard'

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function renderBoard(korean: boolean): void {
  act(() => root.render(createElement(StartBoard, { greeting: 'Hi', t: (key) => key, korean })))
}

const branches = () =>
  Array.from(host.querySelectorAll('.hp-flow-branches li')).map((li) => li.textContent)

describe('flowGeometry', () => {
  it('matches the current drawing for four branches', () =>
    expect(flowGeometry(4)).toEqual({ height: 166, rootY: 83, ends: [19, 62, 105, 148] }))

  it('fits two branches', () =>
    expect(flowGeometry(2)).toEqual({ height: 80, rootY: 40, ends: [19, 62] }))
})

describe('StartBoard', () => {
  it('shows only the slides and Word branches when Korean features are off', () => {
    renderBoard(false)
    expect(branches()).toEqual(['hpFlowPpt', 'hpFlowDocx'])
    expect(host.querySelectorAll('.hp-flow-lines path')).toHaveLength(2)
  })

  it('shows all four branches when Korean features are on', () => {
    renderBoard(true)
    expect(branches()).toEqual(['hpFlowHwp', 'hpFlowPpt', 'hpFlowDocx', 'hpFlowCard'])
    expect(host.querySelectorAll('.hp-flow-lines path')).toHaveLength(4)
  })
})
