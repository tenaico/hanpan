// 0.17 UX v2 G8: 좁은 창(1280 아래)에서는 AI 패널을 접은 채 시작하고, 사람이 정해 둔 상태는 덮어쓰지 않는다
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

vi.mock('../src/renderer/ai/AiPanel', () => ({
  GraphicsAiPanel: ({ onCollapse }: { onCollapse: () => void }) => (
    <div className="copilot">
      <button type="button" data-action="collapse" onClick={onCollapse} />
    </div>
  ),
}))

import { GraphicsAiDock, aiDockStartsOpen } from '../src/renderer/ai/AiDock'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { installGraphicsApi } from '../src/renderer/bridge'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
const fullWidth = window.innerWidth

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  host?.remove()
  host = null
  installGraphicsApi(null)
  localStorage.clear()
  window.innerWidth = fullWidth
})

async function renderDock(width: number): Promise<HTMLElement> {
  window.innerWidth = width
  installGraphicsApi({ onLanguageChanged: () => () => {} } as never)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () =>
    root!.render(
      <LocaleProvider initial="ko">
        <GraphicsAiDock
          kind="photo"
          adapter={null}
          lockFrame={() => () => {}}
          appHeld={false}
          onBusyChange={() => {}}
        />
      </LocaleProvider>,
    ),
  )
  return host.querySelector('.ai-dock') as HTMLElement
}

describe('aiDockStartsOpen', () => {
  it('opens as remembered from 1280 up, and starts collapsed below', () => {
    expect(aiDockStartsOpen(true, 1280)).toBe(true)
    expect(aiDockStartsOpen(true, 1920)).toBe(true)
    expect(aiDockStartsOpen(true, 1279)).toBe(false)
    expect(aiDockStartsOpen(true, 1024)).toBe(false)
    expect(aiDockStartsOpen(false, 1920)).toBe(false)
  })
})

describe('GraphicsAiDock', () => {
  it('starts open in a wide window', async () => {
    const dock = await renderDock(1366)
    expect(dock.dataset.aiOpen).toBe('true')
  })

  it('starts collapsed in a narrow window without forgetting that it was open', async () => {
    localStorage.setItem('photoapp.showAi', '1')
    const dock = await renderDock(1024)
    expect(dock.dataset.aiOpen).toBe('false')
    expect(localStorage.getItem('photoapp.showAi')).toBe('1')
  })

  it('remembers what the person chose', async () => {
    const dock = await renderDock(1024)
    await act(async () => (dock.querySelector('.ai-rail') as HTMLElement).click())
    expect(dock.dataset.aiOpen).toBe('true')
    expect(localStorage.getItem('photoapp.showAi')).toBe('1')
    await act(async () => (dock.querySelector('[data-action="collapse"]') as HTMLElement).click())
    expect(dock.dataset.aiOpen).toBe('false')
    expect(localStorage.getItem('photoapp.showAi')).toBe('0')
  })
})
