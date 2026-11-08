/** @vitest-environment jsdom */
// The HWP editor's Hanpan tools button (tidy, check, tone, review, prompt) is a
// Korean document feature: it shows only while the switch is on (decision 0091).
// The editor itself opens either way.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Lang } from '@genoffice/i18n'
import { applyKoreanDocFeatures } from '@genoffice/ui'
import { HanpanTools } from '../src/renderer/hanpan/HanpanTools'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { HwpApi } from '../src/shared/ipc'

let container: HTMLElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const api: Partial<HwpApi> = { onLanguageChanged: () => () => {}, hanpanTool: vi.fn() }
  Object.assign(window, { hwpApi: api })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  delete (window as { hwpApi?: unknown }).hwpApi
  vi.unstubAllGlobals()
  applyKoreanDocFeatures(null)
})

async function renderTools(lang: Lang): Promise<void> {
  await act(async () => {
    root.render(
      createElement(LocaleProvider, { initial: lang, children: createElement(HanpanTools, {}) }),
    )
  })
}

describe('the HWP tools and the Korean document features switch', () => {
  it('renders nothing when Korean features are off', async () => {
    await renderTools('vi')
    expect(container.querySelector('[data-action="hanpan-tools"]')).toBeNull()
    expect(container.innerHTML).toBe('')
  })

  it('renders the tools button when on', async () => {
    applyKoreanDocFeatures(true)
    await renderTools('en')
    expect(container.querySelector('[data-action="hanpan-tools"]')).not.toBeNull()
  })
})
