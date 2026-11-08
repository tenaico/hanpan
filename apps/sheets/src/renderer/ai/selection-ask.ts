export interface Point {
  x: number
  y: number
}

export interface ViewportBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface SelectionAskPosition {
  left: number
  top: number
}

export interface SelectionAskAnchor {
  pointer: Point
  bounds: ViewportBounds
  /** 선택 범위의 화면 사각형(구할 수 있을 때). 있으면 단추를 범위 옆에 둔다. */
  selection?: ViewportBounds
}

export const SELECTION_DRAG_THRESHOLD_PX = 4

/** Ignore pointer jitter so an ordinary cell click never summons Ask AI. */
export function isSelectionDrag(
  start: Point,
  current: Point,
  threshold = SELECTION_DRAG_THRESHOLD_PX,
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold
}

/**
 * Keep the trigger inside the grid viewport. With the selection's rectangle it
 * sits beside the selection (right of it, level with the top row; above it
 * when the right side has no room) so it never covers the cells under the
 * range (X8: "6000" in B6 was hidden). Without it, beside the drag endpoint.
 */
export function selectionAskPosition(
  pointer: Point,
  bounds: ViewportBounds,
  width: number,
  height: number,
  gap = 8,
  selection?: ViewportBounds,
): SelectionAskPosition {
  const inset = 4
  const minLeft = bounds.left + inset
  const maxLeft = Math.max(minLeft, bounds.right - width - inset)
  const minTop = bounds.top + inset
  const maxTop = Math.max(minTop, bounds.bottom - height - inset)
  if (selection) {
    const clampLeft = (left: number) => Math.min(Math.max(left, minLeft), maxLeft)
    const clampTop = (top: number) => Math.min(Math.max(top, minTop), maxTop)
    if (selection.right + gap + width <= bounds.right - inset) {
      return { left: clampLeft(selection.right + gap), top: clampTop(selection.top) }
    }
    return {
      left: clampLeft(selection.right - width),
      top: clampTop(selection.top - height - gap),
    }
  }
  const preferredLeft = pointer.x + gap
  const preferredTop = pointer.y + gap
  const flippedLeft = pointer.x - width - gap
  const flippedTop = pointer.y - height - gap

  return {
    left: Math.min(
      Math.max(
        preferredLeft + width <= bounds.right - inset ? preferredLeft : flippedLeft,
        minLeft,
      ),
      maxLeft,
    ),
    top: Math.min(
      Math.max(preferredTop + height <= bounds.bottom - inset ? preferredTop : flippedTop, minTop),
      maxTop,
    ),
  }
}
