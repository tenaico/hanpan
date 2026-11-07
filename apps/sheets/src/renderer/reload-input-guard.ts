/**
 * 저장 뒤 다시 열기 동안 격자 입력을 막는다.
 *
 * 저장은 새 세션으로 통합 문서를 다시 연다(이전 세션은 main에서 닫힌다).
 * 그 사이에 격자에 키를 치면 Univer가 비워진 선택을 읽다가
 * `Cannot read properties of null (reading 'row')`를 던지고, 그 뒤 닫힌
 * 세션 id로 가는 요청이 `Unknown workbook session.`으로 연달아 실패했다.
 * 다시 여는 동안에만 캡처 단계에서 격자 쪽 입력을 막고, 새 세션의 첫 범위가
 * 들어오면 푼다. AI 입력란·대화상자 같은 바깥 크롬은 막지 않는다.
 */

const BLOCKED_EVENTS = [
  'keydown',
  'keypress',
  'beforeinput',
  'input',
  'paste',
  'cut',
  'drop',
  'compositionstart',
  'pointerdown',
  'mousedown',
  'dblclick',
] as const

export interface ReloadInputGuard {
  readonly active: boolean
  /** 막기 시작. 돌려받은 함수로 푼다(두 번 불러도 한 번만 푼다). */
  hold(): () => void
  dispose(): void
}

export interface ReloadInputGuardOptions {
  /** 이 이벤트 대상이 격자(또는 포커스 없는 문서)인가 */
  isGridTarget?: (target: EventTarget | null) => boolean
  /** 막는 동안 첫 입력이 들어왔을 때 한 번 */
  onBlocked?: () => void
  /** 다시 열기가 끝을 알리지 못해도 이 시간이 지나면 푼다 */
  maxHoldMs?: number
}

export function defaultIsGridTarget(target: EventTarget | null): boolean {
  if (target === null) return true
  const node = target as { closest?: (selector: string) => unknown; nodeName?: string }
  if (node.nodeName === '#document' || node.nodeName === 'BODY' || node.nodeName === 'HTML') {
    return true
  }
  if (typeof node.closest !== 'function') return target === globalThis
  return node.closest('#univer-container') !== null
}

export function createReloadInputGuard(
  target: EventTarget,
  options: ReloadInputGuardOptions = {},
): ReloadInputGuard {
  const isGridTarget = options.isGridTarget ?? defaultIsGridTarget
  const maxHoldMs = options.maxHoldMs ?? 15_000
  let holds = 0
  let notified = false

  const onEvent = (event: Event): void => {
    if (holds === 0 || !isGridTarget(event.target)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (!notified && event.type !== 'input') {
      notified = true
      options.onBlocked?.()
    }
  }
  for (const type of BLOCKED_EVENTS) target.addEventListener(type, onEvent, { capture: true })

  return {
    get active() {
      return holds > 0
    },
    hold() {
      if (holds === 0) notified = false
      holds += 1
      let released = false
      const release = (): void => {
        if (released) return
        released = true
        clearTimeout(timer)
        holds = Math.max(0, holds - 1)
      }
      const timer = setTimeout(release, maxHoldMs)
      return release
    },
    dispose() {
      holds = 0
      for (const type of BLOCKED_EVENTS) {
        target.removeEventListener(type, onEvent, { capture: true })
      }
    },
  }
}
