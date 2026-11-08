/**
 * Esc가 무엇을 닫는지 정하는 순수 함수(0.17 점검 v2 slides-mindmap #8).
 * 리본 드롭다운은 Ribbon.tsx가 한 번에 닫고, 여기는 측면 창과 전체 화면 보기다.
 */

export type MasterEscAction = 'none' | 'closeShapes' | 'deselect' | 'close'

/** 슬라이드 마스터 보기에서 Esc: 안쪽 것부터 하나씩, 남은 게 없으면 보기를 닫는다. */
export function masterEscapeAction(s: {
  editing: boolean
  drawing: boolean
  shapesOpen: boolean
  menuOpen: boolean
  selected: number
}): MasterEscAction {
  // 글 편집·그리기·오른쪽 클릭 메뉴는 각자 Esc를 처리한다
  if (s.editing || s.drawing || s.menuOpen) return 'none'
  if (s.shapesOpen) return 'closeShapes'
  if (s.selected > 0) return 'deselect'
  return 'close'
}

/**
 * 배경 서식 창에서 Esc: 창 안에 포커스가 있으면 닫는다. 캔버스에서 누른 Esc는
 * 선택 해제·편집 끝내기가 먼저이고, 그럴 것이 없을 때만 창을 닫는다.
 */
export function bgPaneClosesOnEscape(s: {
  inPane: boolean
  editing: boolean
  selected: number
  defaultPrevented: boolean
}): boolean {
  if (s.defaultPrevented) return false
  if (s.inPane) return true
  return !s.editing && s.selected === 0
}
