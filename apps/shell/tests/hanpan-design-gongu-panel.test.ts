/**
 * @vitest-environment jsdom
 */
// 0.17 UI/UX 점검 v2 hwp-design #16: with no Gongu key the design board's picture
// search says where the key goes and gives a button that opens that Settings page.
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GonguPanel } from '../src/renderer/src/design/GonguPanel'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function searchWithAnswer(error: 'no-key' | 'network', openSettings?: () => void) {
  const api = {
    gonguSearch: vi.fn(async () => ({ ok: false as const, error })),
    gonguPicture: vi.fn(),
  }
  act(() =>
    root.render(
      createElement(GonguPanel, {
        lang: 'ko',
        api: api as never,
        insert: () => true,
        ...(openSettings ? { openSettings } : {}),
        openSettingsLabel: '설정 열기',
      }),
    ),
  )
  const input = host.querySelector<HTMLInputElement>('[data-hanpan="gongu-query"]')!
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, '나무')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    host.querySelector<HTMLButtonElement>('[data-action="gongu-search"]')!.click()
  })
}

describe('Gongu search without a key', () => {
  it('offers to open Settings', async () => {
    const openSettings = vi.fn()
    await searchWithAnswer('no-key', openSettings)
    const button = host.querySelector<HTMLButtonElement>('[data-action="gongu-open-settings"]')
    expect(button?.textContent).toBe('설정 열기')
    act(() => button!.click())
    expect(openSettings).toHaveBeenCalledTimes(1)
  })

  it('shows no such button for other failures', async () => {
    await searchWithAnswer('network', vi.fn())
    expect(host.querySelector('[data-action="gongu-open-settings"]')).toBeNull()
  })
})
