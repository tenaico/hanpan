/** 파일 나누기 창: 총 쪽 수를 몇 쪽마다 나누면 파일이 몇 개 나오는지. 쓸 수 없는 값이면 null */
export function splitFileCount(total: number, perFile: number): number | null {
  if (!Number.isInteger(perFile) || perFile < 1 || !(total > 0)) return null
  return Math.ceil(total / perFile)
}
