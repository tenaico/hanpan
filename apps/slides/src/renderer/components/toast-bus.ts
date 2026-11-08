/** Toast event bus, split from the ToastHost component so this module has no
 * component exports: React Fast Refresh replaces mixed-export modules wholesale,
 * which strands callers (file-actions) on a stale emitter during dev HMR. */

export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastData {
  text: string
  kind: 'success' | 'error'
  /** 알림 안의 단추 하나(예: 내보내기 뒤 "폴더 열기"). 있으면 알림이 더 오래 남는다 */
  action?: ToastAction
}

let emit: ((toast: ToastData) => void) | null = null

/** Registered by ToastHost on mount; null while unmounted. */
export function setToastEmitter(fn: ((toast: ToastData) => void) | null): void {
  emit = fn
}

export function showToast(
  text: string,
  kind: 'success' | 'error' = 'success',
  action?: ToastAction,
): void {
  emit?.(action ? { text, kind, action } : { text, kind })
}
