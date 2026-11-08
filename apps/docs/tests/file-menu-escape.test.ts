// 화면 안 파일 메뉴는 Esc로 닫혀야 한다(엑셀·한글과 같게, 0.17 리뷰 #7).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { editorExtensions } from '../src/renderer/editor/extensions'
import { computeFormatState } from '../src/renderer/components/ribbon-format-state'
import { Ribbon } from '../src/renderer/components/Ribbon'
import { ribbonProps } from './helpers/ribbon-props'

describe('파일 메뉴 Esc', () => {
  let editor: Editor
  let root: Root
  let container: HTMLElement

  beforeEach(() => {
    editor = new Editor({ element: document.createElement('div'), extensions: editorExtensions })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    editor.destroy()
  })

  it('Esc closes the open file menu and returns focus to the 파일 button', () => {
    act(() => root.render(createElement(Ribbon, ribbonProps(editor, computeFormatState(editor)))))
    const fileBtn = container.querySelector<HTMLButtonElement>('.ribbon-tab-file')!
    act(() => fileBtn.click())
    expect(container.querySelector('.file-menu')).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(container.querySelector('.file-menu')).toBeNull()
    expect(document.activeElement).toBe(fileBtn)
  })
  // 리본 드롭다운(용지 방향·여백 등)은 열면 포커스가 본문에 남는다: Esc가 어디서 눌려도 닫혀야 한다(0.17 v2 #6)
  it('Esc closes an open ribbon dropdown even while focus stays in the document', () => {
    act(() => root.render(createElement(Ribbon, ribbonProps(editor, computeFormatState(editor)))))
    // Home tab is open by default; the Paste split caret opens a ribbon dropdown
    const orient = container.querySelector<HTMLButtonElement>('.rb-big-split-caret')!
    act(() => orient.click())
    expect(container.querySelector('[data-rb-panel]')).not.toBeNull()
    const doc = document.createElement('div')
    doc.tabIndex = 0
    document.body.appendChild(doc)
    doc.focus()
    act(() => {
      doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(container.querySelector('[data-rb-panel]')).toBeNull()
    doc.remove()
  })
})
