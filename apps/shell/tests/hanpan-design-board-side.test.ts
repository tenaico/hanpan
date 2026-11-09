/**
 * @vitest-environment jsdom
 */
// The design board opens on the AI helper. With no AI connected the helper shows the
// connect prompt, and picking an element must still bring its properties into view:
// someone without AI edits the design by hand (CI e2e, 2026-11-09).
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAiSettings } from '@genoffice/ai-provider'
import type { SubscriptionStatusMap } from '@genoffice/ai-provider/browser'
import type { SubscriptionApi } from '../src/shared/subscription-api'
import { DesignBoard, type DesignApi } from '../src/renderer/src/design/DesignBoard'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

const NOTHING_CONNECTED: SubscriptionStatusMap = {
  'claude-code': { provider: 'claude-code', meteredAccepted: false, state: 'not-installed' },
  codex: { provider: 'codex', meteredAccepted: false, state: 'not-installed' },
}

let host: HTMLDivElement
let root: Root
let api: DesignApi

beforeEach(() => {
  // jsdom has no element scrolling; the helper's thread scrolls to its end
  Element.prototype.scrollTo ??= () => undefined
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  window.aiOfficeSubscription = {
    statuses: async () => NOTHING_CONNECTED,
    recheck: async () => NOTHING_CONNECTED,
    login: async () => ({ ok: true }),
    install: async () => ({ ok: true }),
    setMeteredAccepted: async () => ({ ok: true, statuses: NOTHING_CONNECTED }),
    codexImageAvailable: async () => false,
    onChanged: () => () => undefined,
    openInstallHelp: async () => undefined,
  } as SubscriptionApi
  api = {
    savePng: vi.fn(async () => null),
    savePdf: vi.fn(async () => null),
    copyImage: vi.fn(async () => true),
    saveDesign: vi.fn(async () => null),
    newDesign: vi.fn(async () => undefined),
    openDesign: vi.fn(async () => null),
    pickImage: vi.fn(async () => null),
    getAiSettings: vi.fn(async () => ({ ...defaultAiSettings(), subscriptionNoticeSeen: true })),
    setAiSettings: vi.fn(async () => undefined),
    onAiSettingsChanged: () => () => undefined,
    openAiModelSettings: vi.fn(async () => undefined),
    aiStream: vi.fn(async () => undefined),
    aiStreamCancel: vi.fn(async () => undefined),
    onAiStream: () => () => undefined,
  }
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  delete window.aiOfficeSubscription
})

const $ = <T extends Element>(sel: string) => host.querySelector<T>(sel)
async function click(el: Element | null) {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}
async function settle() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

describe('the design board side with no AI connected', () => {
  it('shows the picked element’s properties instead of staying on the connect prompt', async () => {
    await act(async () => root.render(createElement(DesignBoard, { lang: 'ko', api })))
    await settle()
    // the helper is in view and asks to connect an AI
    expect($('[data-side="ai"]')?.getAttribute('aria-selected')).toBe('true')
    expect($('[data-props]')).toBeNull()

    await click($('[data-tab="text"]'))
    const addTitle = [...host.querySelectorAll('button')].find((b) => b.textContent === '제목 넣기')
    await click(addTitle!)
    await settle()

    expect($('[data-side="props"]')?.getAttribute('aria-selected')).toBe('true')
    expect($('[data-props="text"]')).not.toBeNull()
  })

  it('stays on the connect prompt that answered a request', async () => {
    await act(async () => root.render(createElement(DesignBoard, { lang: 'ko', api })))
    await settle()
    const box = $<HTMLTextAreaElement>('.dz-right textarea')!
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      setValue.call(box, '학부모 설명회 안내문')
      box.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click($('.dz-right button[aria-label="보내기"]'))
    await settle()
    expect(api.aiStream).not.toHaveBeenCalled()

    await click($('[data-tab="text"]'))
    const addTitle = [...host.querySelectorAll('button')].find((b) => b.textContent === '제목 넣기')
    await click(addTitle!)
    await settle()

    expect($('[data-side="ai"]')?.getAttribute('aria-selected')).toBe('true')
  })
})
