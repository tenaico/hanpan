/**
 * 작업창(Univer 사이드바: 데이터 유효성, 조건부 서식 등)과 AI 창이 함께 열리면
 * 좁은 창에서 시트가 절반으로 줄었다(X21). 작업창이 열릴 때 AI 창을 접고,
 * 닫힐 때 우리가 접었던 경우에만 다시 연다.
 */
export const TASK_PANE_DOCK_WIDTH = 1600

export function taskPaneDockStep(input: {
  paneOpen: boolean
  aiOpen: boolean
  autoCollapsed: boolean
  width: number
}): { setAiOpen?: boolean; autoCollapsed: boolean } {
  if (input.paneOpen) {
    if (input.aiOpen && input.width < TASK_PANE_DOCK_WIDTH) {
      return { setAiOpen: false, autoCollapsed: true }
    }
    return { autoCollapsed: input.autoCollapsed }
  }
  if (input.autoCollapsed && !input.aiOpen) return { setAiOpen: true, autoCollapsed: false }
  return { autoCollapsed: false }
}
