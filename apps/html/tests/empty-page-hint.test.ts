// 새 웹 문서는 하얀 화면 대신 무엇을 하면 되는지 알려 준다(0.17 리뷰 #17)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { EmptyPageHint } from '../src/renderer/components/EmptyPageHint'
import { ko } from '../src/renderer/i18n/app/ko'
import { starterDocument } from '../src/renderer/document/skeleton'
import { isDocEmpty } from '../src/renderer/document/blank'

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
afterEach(() => vi.unstubAllGlobals())

describe('EmptyPageHint', () => {
  it('offers the AI panel, a starter page and the source view', () => {
    const onStarter = vi.fn()
    const onAskAi = vi.fn()
    const onSource = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => root.render(createElement(EmptyPageHint, { onStarter, onAskAi, onSource })))
    const buttons = [...container.querySelectorAll('button')]
    expect(container.querySelector('[role="note"]')).not.toBeNull()
    expect(buttons).toHaveLength(3)
    act(() => buttons[0]!.click())
    act(() => buttons[1]!.click())
    act(() => buttons[2]!.click())
    expect(onAskAi).toHaveBeenCalledTimes(1)
    expect(onStarter).toHaveBeenCalledTimes(1)
    expect(onSource).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('speaks plain Korean', () => {
    expect(ko.emptyPageTitle).toBe('빈 웹 문서입니다')
    expect(ko.insertSkeleton).toBe('기본 틀 넣기')
    expect(ko.emptyPageStarter).toBe('제목과 문단으로 시작')
    expect(ko.emptyPageBody).toContain('오른쪽 AI 도우미')
  })
})

describe('starterDocument', () => {
  it('is a standards page with a visible, editable heading and paragraph', () => {
    const html = starterDocument('ko', '제목 <1>', '여기에 내용을 적으세요.')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('<html lang="ko-KR">')
    expect(html).toContain('<h1>제목 &lt;1&gt;</h1>')
    expect(html).toContain('<p>여기에 내용을 적으세요.</p>')
    expect(isDocEmpty(html)).toBe(false)
  })
})
