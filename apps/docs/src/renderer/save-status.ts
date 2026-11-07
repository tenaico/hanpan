/**
 * 상태줄의 저장 표시. 저장 직후의 "저장됨"·"자동 저장됨 (시각)"은 다시 고치는 순간
 * 사실이 아니게 되므로 지우고, 대신 "저장 안 됨" 표시를 켠다. 저장과 상관없는
 * 알림(구역 나누기 삽입 등)은 그대로 둔다.
 */
export interface SaveStatusView {
  /** 상태줄에 보일 마지막 알림('' = 없음) */
  message: string
  /** 저장하지 않은 변경 사항이 있는지 */
  unsaved: boolean
}

function isSaveMessage(status: string, savedText: string, autoSavedTemplate: string): boolean {
  if (status === savedText) return true
  const at = autoSavedTemplate.indexOf('{time}')
  if (at < 0) return status === autoSavedTemplate
  const head = autoSavedTemplate.slice(0, at)
  const tail = autoSavedTemplate.slice(at + '{time}'.length)
  return (
    status.length > head.length + tail.length && status.startsWith(head) && status.endsWith(tail)
  )
}

export function saveStatusView(
  status: string,
  dirty: boolean,
  savedText: string,
  autoSavedTemplate: string,
  /** first-use hints ("type what to write in the AI panel") that the first edit makes moot */
  firstEditHints: readonly string[] = [],
): SaveStatusView {
  if (!dirty) return { message: status, unsaved: false }
  return {
    message:
      isSaveMessage(status, savedText, autoSavedTemplate) || firstEditHints.includes(status)
        ? ''
        : status,
    unsaved: true,
  }
}
