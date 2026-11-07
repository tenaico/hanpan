// "AI 수정 요청" 칩: 측면 창이 열려 무대가 줄면 자리를 다시 재고, 무대 오른쪽 밖(측면 창 위)으로 나가지 않는다(0.17 UX v2 #14)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AiAskTrigger, type AnchorRect } from '../src/renderer/components/AiAskPopover'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('AiAskTrigger follows layout changes', () => {
  it('re-measures when the stage resizes and stays inside the stage', () => {
    const observers: Array<() => void> = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          observers.push(cb)
        }
        observe() {}
        disconnect() {}
      },
    )
    const stage = document.createElement('div')
    stage.className = 'stage-wrap'
    let stageRight = 1200
    stage.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: stageRight,
        bottom: 700,
        width: stageRight,
        height: 700,
      }) as DOMRect
    document.body.appendChild(stage)
    const host = document.createElement('div')
    document.body.appendChild(host)
    let rect: AnchorRect = {
      left: 400,
      top: 100,
      right: 800,
      bottom: 200,
      viewTop: 0,
      viewBottom: 700,
    }
    root = createRoot(host)
    act(() =>
      root!.render(createElement(AiAskTrigger, { getAnchorRect: () => rect, onOpen: () => {} })),
    )
    const btn = () => host.querySelector<HTMLButtonElement>('.ai-ask-trigger')!
    expect(btn().style.left).toBe('806px')
    // 애니메이션 창이 열려 무대가 800px로 줄고 요소도 왼쪽으로 옮겨졌다
    stageRight = 800
    rect = { left: 300, top: 100, right: 700, bottom: 200, viewTop: 0, viewBottom: 700 }
    expect(observers.length).toBeGreaterThan(0)
    act(() => observers.forEach((cb) => cb()))
    expect(parseFloat(btn().style.left)).toBeLessThanOrEqual(800 - 96 - 8)
  })
})
