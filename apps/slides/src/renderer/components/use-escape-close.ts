import { useEffect, useRef, type RefObject } from 'react'

/**
 * 열린 메뉴를 Esc로 닫고 포커스를 메뉴를 연 버튼으로 돌려준다.
 * 캡처 단계에서 받아 편집 영역의 Esc 처리(선택 해제 등)보다 먼저 닫는다.
 */
export function useEscapeToClose(
  open: boolean,
  close: () => void,
  trigger?: RefObject<HTMLElement | null>,
): void {
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing) return
      e.preventDefault()
      e.stopPropagation()
      closeRef.current()
      trigger?.current?.focus()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, trigger])
}
