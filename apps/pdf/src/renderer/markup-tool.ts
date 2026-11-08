/**
 * 형광펜·밑줄·취소선 단추. 글자가 골라져 있으면 그 자리에 바로 적용하고(Word 방식),
 * 아무것도 고르지 않았으면 도구를 켜서 다음에 끄는 글자에 곧바로 적용한다(Acrobat 방식).
 */
export type MarkupToolType = 'highlight' | 'underline' | 'strikeout'

export type MarkupButtonAction = { kind: 'apply' } | { kind: 'tool'; tool: MarkupToolType | null }

export function markupButtonAction({
  hasSelection,
  tool,
  type,
}: {
  hasSelection: boolean
  tool: MarkupToolType | null
  type: MarkupToolType
}): MarkupButtonAction {
  if (hasSelection) return { kind: 'apply' }
  return { kind: 'tool', tool: tool === type ? null : type }
}

/** 떠 있는 도구 모음의 높이와 선택과의 간격(px) */
const POPUP_HEIGHT = 44
const POPUP_GAP = 8
/** 가운데 정렬한 도구 모음이 화면 밖으로 나가지 않게 둘 여백(반 폭) */
const POPUP_HALF_WIDTH = 70

/**
 * 선택한 글자 위에 띄우면 윗줄(제목 등)을 가리므로 선택 아래에 둔다.
 * 아래에 자리가 없을 때만 위로 올린다.
 */
export function selectionPopupPosition(
  box: { left: number; top: number; width: number; bottom: number },
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const x = Math.min(
    Math.max(box.left + box.width / 2, POPUP_HALF_WIDTH),
    viewport.width - POPUP_HALF_WIDTH,
  )
  const below = box.bottom + POPUP_GAP
  if (below + POPUP_HEIGHT <= viewport.height) return { x, y: below }
  const above = box.top - POPUP_HEIGHT
  return { x, y: above >= 0 ? above : Math.max(0, viewport.height - POPUP_HEIGHT) }
}
