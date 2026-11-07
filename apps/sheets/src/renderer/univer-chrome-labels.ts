/**
 * Univer가 그리는 단추에 앱 언어의 이름과 풍선 도움말(data-tip)을 붙인다(X10·X11).
 * - 시트 탭 줄: 시트 추가(+), 모든 시트, 이전/다음 시트(탭이 넘칠 때만 보임)
 * - 작업창(조건부 서식·데이터 유효성 등) 닫기: Univer에는 "Close sidebar"로 고정
 * Univer가 다시 그리면 속성이 사라지므로 MutationObserver로 다시 붙인다.
 */
type Translate = (
  key:
    'appSheetBarAdd' | 'appSheetBarAll' | 'appSheetBarPrev' | 'appSheetBarNext' | 'appCloseSidebar',
) => string

function setLabel(element: Element | undefined, label: string): void {
  if (!element) return
  if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label)
  if (element.getAttribute('data-tip') !== label) element.setAttribute('data-tip', label)
}

export function labelUniverChrome(root: ParentNode, t: Translate): void {
  const buttons = [...root.querySelectorAll('[data-u-comp="sheet-bar-append-button"]')]
  // 순서: 시트 추가(univer-mr-2), 모든 시트(메뉴 안), 그 뒤로 이전·다음
  const add = buttons.find((button) => button.classList.contains('univer-mr-2'))
  setLabel(add, t('appSheetBarAdd'))
  // 나머지는 모든 시트, (탭이 넘칠 때만) 이전·다음 순서
  const [all, previous, next] = buttons.filter((button) => button !== add)
  setLabel(all, t('appSheetBarAll'))
  setLabel(previous, t('appSheetBarPrev'))
  setLabel(next, t('appSheetBarNext'))
  for (const close of root.querySelectorAll('button[aria-label="Close sidebar"]')) {
    setLabel(close, t('appCloseSidebar'))
  }
}

export function installUniverChromeLabels(doc: Document, t: Translate): { dispose(): void } {
  let queued = false
  const run = (): void => {
    queued = false
    labelUniverChrome(doc, t)
  }
  run()
  const observer = new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(run)
  })
  observer.observe(doc.body, { childList: true, subtree: true })
  return { dispose: () => observer.disconnect() }
}
