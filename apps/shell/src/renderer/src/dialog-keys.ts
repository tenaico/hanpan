/**
 * 홈 대화상자의 키보드 동작: 열리면 포커스를 대화상자 안의 첫 컨트롤로 옮기고,
 * 닫히면 열기 전 자리로 돌려준다. Esc는 포커스가 어디 있든(대화상자 바깥 본문을
 * 눌러 포커스가 body로 빠져도) 맨 위 대화상자 하나만 닫는다. Tab은 대화상자 안에서 돈다.
 * ref는 role="dialog" 요소에 붙인다.
 */
import { useEffect, useRef } from 'react'
import { trapTab } from '@genoffice/ui'

// 열린 순서대로 쌓인 대화상자: Esc는 맨 위 것만 받는다
const stack: object[] = []

export function useDialogKeys<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
  options?: { canClose?: boolean },
) {
  const ref = useRef<T>(null)
  const close = useRef(onClose)
  close.current = onClose
  const canClose = useRef(options?.canClose ?? true)
  canClose.current = options?.canClose ?? true

  useEffect(() => {
    const el = ref.current
    const token = {}
    stack.push(token)
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (el && !el.contains(document.activeElement)) {
      const first = [...el.querySelectorAll<HTMLElement>('input, textarea, select, button')].find(
        (c) => !c.hasAttribute('disabled'),
      )
      if (first) first.focus()
      else {
        if (!el.hasAttribute('tabindex')) el.tabIndex = -1
        el.focus()
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (canClose.current) close.current()
        return
      }
      if (e.key === 'Tab') trapTab(ref.current, e)
    }
    // capture: 홈 화면 전역 Esc 처리(검색 지우기 등)보다 먼저 받는다
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      const at = stack.indexOf(token)
      if (at >= 0) stack.splice(at, 1)
      if (previous && previous.isConnected && previous !== document.body) previous.focus()
    }
  }, [])

  return ref
}
