// 이미지로 내보내기 대화상자: 고른 형식·범위·크기를 그대로 넘긴다(0.17 UX v2 #21)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ExportImagesDialog } from '../src/renderer/components/ExportImagesDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('ExportImagesDialog', () => {
  it('passes the chosen format, range and size', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onExport = vi.fn()
    root = createRoot(host)
    act(() =>
      root!.render(
        createElement(ExportImagesDialog, {
          visibleCount: 5,
          slideWidthPx: 960,
          slideHeightPx: 540,
          onExport,
          onClose: () => {},
        }),
      ),
    )
    expect(host.textContent).toContain('1920×1080')
    const pick = (name: string, i: number) =>
      host.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)[i]!
    act(() => pick('xi-format', 1).click())
    act(() => pick('xi-range', 1).click())
    act(() => pick('xi-scale', 0).click())
    act(() => host.querySelector<HTMLButtonElement>('button.primary')!.click())
    expect(onExport).toHaveBeenCalledWith({ format: 'jpg', range: 'current', scale: 1 })
  })
})
