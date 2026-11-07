/**
 * 탭 줄의 "저장 안 됨" 점을 위한 거울 상태. 대부분의 편집기는 main 쪽에서 dirty를
 * 바로 답하지만, 워드(docs)는 dirty가 렌더러 안의 합성 값이라 렌더러가 바뀔 때마다
 * 알려 준 값을 여기 둔다. 닫기 확인은 여전히 렌더러에 직접 묻는다(이 값은 표시용).
 */
const dirtyByWc = new Set<number>()

export function noteRendererDirty(webContentsId: number, dirty: boolean): void {
  if (dirty) dirtyByWc.add(webContentsId)
  else dirtyByWc.delete(webContentsId)
}

export function rendererReportedDirty(webContentsId: number): boolean {
  return dirtyByWc.has(webContentsId)
}
