/**
 * 탭 줄에 보이는 이름(0.17 리뷰 #15). 좁은 탭에서는 이름 끝이 말줄임으로 잘려
 * "제목 없는 문서" 여러 개가 모두 "제목…"으로 보였다. 이름을 앞(base), 번호(tail),
 * 확장자(ext)로 나눠 번호는 잘리지 않게 하고(좁으면 확장자가 먼저 비켜 준다),
 * 같은 이름은 " 2", " 3"으로 나눈다. 저장된 파일의 탭은 앱이 확장자를 뺀 제목을
 * 보내도 파일 이름 그대로 보인다.
 */
import type { TabSummary } from '../../shared/tabs-api'

export interface TabLabel {
  /** the part that may ellipsize */
  base: string
  /** the number that tells same-named tabs apart: always shows */
  tail: string
  /** the extension after that number: gives way first when the tab is narrow */
  ext: string
}

const fileNameOf = (path: string) => path.split(/[\\/]/).pop() ?? path
const withoutExtension = (name: string) => name.replace(/\.[A-Za-z0-9]{1,10}$/, '')
// "이름 2.xlsx", "PDF-3.pdf", "이름 (2)": the number, then the extension
const NUMBER_TAIL = /([\s_-]+\(?\d+\)?)(\.[A-Za-z0-9]{1,10})?$/

function shownName(tab: TabSummary): string {
  if (!tab.filePath || tab.kind === 'home') return tab.title
  const file = fileNameOf(tab.filePath)
  // the app's title is the file's name without its extension: show the file name
  return tab.title === withoutExtension(file) ? file : tab.title
}

export function tabLabels(tabs: readonly TabSummary[]): Map<string, TabLabel> {
  const out = new Map<string, TabLabel>()
  const seen = new Map<string, number>()
  for (const tab of tabs) {
    const name = shownName(tab)
    if (tab.kind === 'home') {
      out.set(tab.id, { base: name, tail: '', ext: '' })
      continue
    }
    const count = (seen.get(name) ?? 0) + 1
    seen.set(name, count)
    if (count > 1) {
      out.set(tab.id, { base: name, tail: ` ${count}`, ext: '' })
      continue
    }
    const match = NUMBER_TAIL.exec(name)
    out.set(
      tab.id,
      match && match.index > 0
        ? { base: name.slice(0, match.index), tail: match[1]!, ext: match[2] ?? '' }
        : { base: name, tail: '', ext: '' },
    )
  }
  return out
}
