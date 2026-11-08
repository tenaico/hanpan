/**
 * 양식 PDF를 열었을 때 "채울 수 있는 칸이 있습니다" 알림 줄을 보일지.
 * 파일에 원래 있던 칸만 센다(양식 디자인으로 방금 그린 칸은 제외).
 */
export function shouldShowFormBanner({
  fileFieldCount,
  ribbonTab,
  dismissed,
  readOnly,
}: {
  fileFieldCount: number
  ribbonTab: string
  dismissed: boolean
  readOnly: boolean
}): boolean {
  if (readOnly || dismissed || fileFieldCount <= 0) return false
  return ribbonTab !== 'fillForm' && ribbonTab !== 'formDesign'
}
