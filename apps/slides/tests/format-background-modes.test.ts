// 배경 서식 창: 채우기 방식은 낱말 중간에서 꺾이는 단추 줄이 아니라 세로 라디오 목록이다(0.17 UX v2 #13)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { FormatBackgroundPane } from '../src/renderer/components/FormatBackgroundPane'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('FormatBackgroundPane fill modes', () => {
  it('are radios in one vertical group, and picking one applies it', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onApply = vi.fn()
    const slide = { background: { kind: 'solid', color: '#ffffff' } } as never
    root = createRoot(host)
    act(() =>
      root!.render(createElement(FormatBackgroundPane, { slide, onApply, onCollapse: () => {} })),
    )
    const group = host.querySelector('[role="radiogroup"].fp-fill-modes')
    expect(group).not.toBeNull()
    const radios = group!.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    expect(radios).toHaveLength(3)
    expect(radios[0]!.checked).toBe(true)
    act(() => radios[1]!.click())
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ kind: 'gradient' }))
  })
})
