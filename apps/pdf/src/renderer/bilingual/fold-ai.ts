/** 이보다 좁은 창에서 번역 나란히를 켜면 AI 패널을 접는다(1366에서 미리보기·문서·번역·AI 네 칸이 되어 문서가 67%로 줄었다) */
export const FOLD_AI_FOR_BILINGUAL_BELOW = 1600

export function shouldFoldAiForBilingual({
  enabled,
  aiOpen,
  windowWidth,
}: {
  enabled: boolean
  aiOpen: boolean
  windowWidth: number
}): boolean {
  return enabled && aiOpen && windowWidth < FOLD_AI_FOR_BILINGUAL_BELOW
}
