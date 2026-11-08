/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeApi } from '../src/shared/home-api'
import { LocaleProvider } from '../src/renderer/src/locale'
import { SettingsModal } from '../src/renderer/src/SettingsModal'

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
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

async function click(button: HTMLButtonElement): Promise<void> {
  await act(async () => {
    button.click()
    await Promise.resolve()
  })
}

/** Settings opened on the General pane with `stored` as the saved switch */
async function openGeneral(lang: 'en' | 'ko', stored: boolean | null) {
  const persist = vi.fn<(on: boolean) => Promise<void>>().mockResolvedValue(undefined)
  window.aiOffice = {
    getTheme: async () => 'system',
    getDefaultSaveDir: async () => '',
    getAutoSaveDefault: async () => ({ on: false, updatedAt: 1 }),
    getUpdateChannel: async () => 'stable',
    getAppVersion: async () => '1.0.0',
    getKoreanDocFeatures: async () => stored,
    setKoreanDocFeatures: persist,
  } as unknown as HomeApi

  await act(async () => {
    root.render(
      createElement(
        LocaleProvider,
        { initial: lang },
        createElement(SettingsModal, { onClose: vi.fn() }),
      ),
    )
    await Promise.resolve()
  })
  const general = Array.from(host.querySelectorAll<HTMLButtonElement>('.set-nav-item')).find(
    (button) => button.textContent?.includes(lang === 'ko' ? '일반' : 'General'),
  )
  await click(general!)
  const label = lang === 'ko' ? '한국 문서 기능' : 'Korean document features'
  const toggle = host.querySelector<HTMLButtonElement>(`.set-switch[aria-label="${label}"]`)
  return { toggle: toggle!, persist }
}

describe('Settings Korean document features switch', () => {
  it('shows the switch off on an English UI with nothing stored', async () => {
    const { toggle } = await openGeneral('en', null)
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  })

  it('shows the switch on on a Korean UI with nothing stored', async () => {
    const { toggle } = await openGeneral('ko', null)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('saves the new value when clicked', async () => {
    const { toggle, persist } = await openGeneral('en', null)
    await click(toggle)
    expect(persist).toHaveBeenLastCalledWith(true)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })
})
