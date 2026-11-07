import { useEffect, useRef, type RefObject } from 'react'

/**
 * Esc closes an overlay wherever focus is (the editor behind it included), and
 * focus moves into the overlay when it opens so keys reach it, not the page.
 */
export function useEscapeClose(onClose: () => void, focusRef?: RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      event.stopPropagation()
      closeRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    focusRef?.current?.focus()
    return () => window.removeEventListener('keydown', onKey, true)
  }, [focusRef])
}
