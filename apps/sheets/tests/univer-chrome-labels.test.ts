// @vitest-environment jsdom
/**
 * X10·X11: Univer가 그리는 시트 탭 줄 단추(+, 모든 시트, 좌우 이동)에 이름과
 * 풍선 도움말이 없고, 작업창 닫기 단추는 영어 "Close sidebar"였다.
 */
import { describe, expect, it } from 'vitest'
import { labelUniverChrome } from '../src/renderer/univer-chrome-labels'

const t = (key: string) => `T:${key}`

describe('labelUniverChrome', () => {
  it('names the sheet bar buttons and the pane close button', () => {
    document.body.innerHTML = `
      <div id="univer-container">
        <div class="bar">
          <div class="left">
            <button data-u-comp="sheet-bar-append-button" class="univer-mr-2"></button>
            <div><button data-u-comp="sheet-bar-append-button"></button></div>
          </div>
          <div class="tabs"></div>
          <div class="scroll">
            <button data-u-comp="sheet-bar-append-button"></button>
            <button data-u-comp="sheet-bar-append-button"></button>
          </div>
        </div>
      </div>
      <aside><button aria-label="Close sidebar"></button></aside>`
    labelUniverChrome(document, t)
    const [add, all, prev, next] = document.querySelectorAll(
      '[data-u-comp="sheet-bar-append-button"]',
    )
    expect(add?.getAttribute('aria-label')).toBe('T:appSheetBarAdd')
    expect(add?.getAttribute('data-tip')).toBe('T:appSheetBarAdd')
    expect(all?.getAttribute('aria-label')).toBe('T:appSheetBarAll')
    expect(prev?.getAttribute('aria-label')).toBe('T:appSheetBarPrev')
    expect(next?.getAttribute('aria-label')).toBe('T:appSheetBarNext')
    expect(document.querySelector('aside button')?.getAttribute('aria-label')).toBe(
      'T:appCloseSidebar',
    )
  })
})
