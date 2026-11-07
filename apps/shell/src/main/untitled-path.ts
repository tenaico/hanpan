import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 새(제목 없는) 파일의 첫 빈 경로: "제목 없는 PDF.pdf", "제목 없는 PDF 2.pdf", …
 * 셸이 같은 이름 탭을 " 2", " 3"으로 나누는 방식과 맞춘다(하이픈 번호 대신).
 */
export function untitledPathIn(
  dir: string,
  base: string,
  ext: string,
  pathExists: (path: string) => boolean = existsSync,
): string {
  let candidate = join(dir, `${base}${ext}`)
  for (let i = 2; pathExists(candidate); i++) candidate = join(dir, `${base} ${i}${ext}`)
  return candidate
}
