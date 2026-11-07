/**
 * 드롭다운이 열린 채 누른 Esc는 드롭다운만 닫는다(X7).
 *
 * Univer 사이드바(조건부 서식·데이터 유효성 패널)는 document의 keydown(버블)에서
 * Esc를 받으면 패널을 닫는다. 패널 안의 드롭다운(radix 팝업)은 document 캡처
 * 단계에서 먼저 닫히는데, 같은 Esc가 이어서 패널까지 닫아 작성 중인 규칙이
 * 사라졌다. window 캡처 단계에서 팝업이 열려 있었는지 기억해 두고, 그랬다면
 * document 버블에 닿기 전(documentElement 버블)에서 전파를 멈춘다.
 */
const POPUP_SELECTOR = '[data-radix-popper-content-wrapper]'

export function installEscapePopupGuard(win: Window, doc: Document): { dispose(): void } {
  let popupWasOpen = false
  const onCapture = (event: KeyboardEvent): void => {
    popupWasOpen = event.key === 'Escape' && doc.querySelector(POPUP_SELECTOR) !== null
  }
  const onBubble = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && popupWasOpen) event.stopPropagation()
    popupWasOpen = false
  }
  win.addEventListener('keydown', onCapture, { capture: true })
  doc.documentElement.addEventListener('keydown', onBubble)
  return {
    dispose() {
      win.removeEventListener('keydown', onCapture, { capture: true })
      doc.documentElement.removeEventListener('keydown', onBubble)
    },
  }
}
