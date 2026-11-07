/**
 * @vitest-environment jsdom
 */
// 0.17 리뷰 #8: 디자인 보드에도 다른 편집기와 같은 화면 속 "파일" 메뉴를 둔다.
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DesignFileMenu, type DesignFileActions } from '../src/renderer/src/design/DesignFileMenu'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let actions: DesignFileActions

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  actions = {
    newDesign: vi.fn(),
    open: vi.fn(),
    save: vi.fn(),
    saveAs: vi.fn(),
    exportPng: vi.fn(),
    exportJpg: vi.fn(),
    exportPdf: vi.fn(),
    print: vi.fn(),
  }
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function render(lang = 'ko', canPrint = true) {
  act(() => root.render(createElement(DesignFileMenu, { lang, actions, canPrint })))
}
const fileButton = () => host.querySelector<HTMLButtonElement>('[data-action="design-file"]')!
const items = () => [...host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
const labels = () => items().map((b) => b.querySelector('span')?.textContent)

describe('the design board File menu', () => {
  it('opens from 파일 with the same items as the other editors', () => {
    render()
    expect(fileButton().textContent).toBe('파일')
    expect(items()).toHaveLength(0)
    act(() => fileButton().click())
    expect(fileButton().getAttribute('aria-expanded')).toBe('true')
    expect(labels()).toEqual([
      '새로 만들기',
      '열기',
      '저장',
      '다른 이름으로 저장',
      'PNG로 내보내기',
      'JPG로 내보내기',
      'PDF로 내보내기',
      '인쇄',
    ])
  })

  it('runs the picked item and closes', () => {
    render()
    act(() => fileButton().click())
    act(() => items()[3]!.click())
    expect(actions.saveAs).toHaveBeenCalledTimes(1)
    expect(items()).toHaveLength(0)
  })

  it('closes with Esc and gives focus back to 파일', () => {
    render()
    act(() => fileButton().click())
    expect(document.activeElement).toBe(items()[0])
    act(() => {
      items()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(items()).toHaveLength(0)
    expect(document.activeElement).toBe(fileButton())
  })

  it('leaves out 인쇄 when printing is not available, and reads English elsewhere', () => {
    render('en', false)
    act(() => fileButton().click())
    expect(fileButton().textContent).toBe('File')
    expect(labels()).not.toContain('Print')
    expect(labels()[0]).toBe('New')
  })

  it('reads Vietnamese in Vietnamese (점검 v2 hwp-design #18), as the toolbar does', () => {
    render('vi')
    act(() => fileButton().click())
    expect(fileButton().textContent).toBe('Tệp')
    expect(labels()).toEqual([
      'Tạo mới',
      'Mở',
      'Lưu',
      'Lưu thành',
      'Xuất ra PNG',
      'Xuất ra JPG',
      'Xuất ra PDF',
      'In',
    ])
  })
})
