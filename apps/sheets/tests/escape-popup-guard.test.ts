// @vitest-environment jsdom
/**
 * X7: 조건부 서식 패널 안의 드롭다운에서 Esc를 누르면 드롭다운만 닫혀야 하는데
 * Univer 사이드바의 document keydown 처리가 패널까지 닫아 작성 중인 규칙이
 * 사라졌다. 드롭다운(radix 팝업)이 열려 있던 Esc는 사이드바까지 가지 않는다.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installEscapePopupGuard } from '../src/renderer/escape-popup-guard'

function press(target: Element): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

describe('installEscapePopupGuard', () => {
  let dispose: (() => void) | undefined
  afterEach(() => {
    dispose?.()
    document.body.innerHTML = ''
  })

  it('keeps the sidebar open when Escape only closes a dropdown', () => {
    dispose = installEscapePopupGuard(window, document).dispose
    const sidebarClose = vi.fn()
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') sidebarClose()
    })
    // radix closes its popup from a document capture listener
    const popupClose = vi.fn(() =>
      document.querySelector('[data-radix-popper-content-wrapper]')?.remove(),
    )
    document.addEventListener('keydown', popupClose, { capture: true })

    const popup = document.createElement('div')
    popup.setAttribute('data-radix-popper-content-wrapper', '')
    document.body.append(popup)
    const item = document.createElement('div')
    popup.append(item)

    press(item)
    expect(popupClose).toHaveBeenCalledTimes(1)
    expect(sidebarClose).not.toHaveBeenCalled()

    // with no popup open, Escape still closes the sidebar
    press(document.body)
    expect(sidebarClose).toHaveBeenCalledTimes(1)
  })
})
