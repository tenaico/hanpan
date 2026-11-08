/** 마스터 보기 무대의 안쪽 여백(.master-stage padding 28px × 2) */
export const MASTER_STAGE_PAD = 28

/**
 * 마스터 보기에서 슬라이드를 무대에 맞추는 배율. 무대가 좁으면 줄이고, 넓어도 키우지는 않는다
 * (마스터는 1280px 고정 폭으로 그려 와서 1366폭 화면에서는 오른쪽·아래가 잘렸다).
 */
export function masterFitScale(availW: number, availH: number, w: number, h: number): number {
  if (w <= 0 || h <= 0) return 1
  const k = Math.min((availW - MASTER_STAGE_PAD * 2) / w, (availH - MASTER_STAGE_PAD * 2) / h)
  return Math.max(0.1, Math.min(1, k))
}
