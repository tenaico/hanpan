/**
 * @vitest-environment jsdom
 */
// Hanpan's "send to a document" menu offers the Korean targets (HWP report,
// design board, sync, picture credits) only while the Korean document features
// are on (decision 0091). Slides and Word stay in every language.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Lang } from '@genoffice/i18n'
import { applyKoreanDocFeatures } from '@genoffice/ui'
import { SendMenu } from '../src/renderer/hanpan/SendMenu'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type { MindmapApi } from '../src/shared/ipc'

let container: HTMLElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  ;(window as unknown as { mindmapApi: Partial<MindmapApi> }).mindmapApi = {
    onLanguageChanged: () => () => {},
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  applyKoreanDocFeatures(null)
})

/** opens the menu and lists the targets it offers, in order */
async function offered(lang: Lang): Promise<string[]> {
  const none = () => {}
  await act(async () => {
    root.render(
      createElement(LocaleProvider, {
        initial: lang,
        children: createElement(SendMenu, {
          disabled: false,
          onPick: none,
          onSync: none,
          onDesign: none,
          onCredits: none,
        }),
      }),
    )
  })
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-action="send-to"]')!.click()
  })
  return [...container.querySelectorAll('[data-send]')].map((item) =>
    item.getAttribute('data-send'),
  ) as string[]
}

describe('the send menu and the Korean document features switch', () => {
  it('offers only slides and Word when Korean features are off', async () => {
    expect(await offered('vi')).toEqual(['slides', 'docx'])
  })

  it('offers HWP, design, sync and credits when on', async () => {
    applyKoreanDocFeatures(true)
    expect(await offered('en')).toEqual(['hwp', 'slides', 'docx', 'design', 'sync', 'credits'])
  })
})

describe('the send button', () => {
  it('carries its name on screen, not only in a tooltip', async () => {
    applyKoreanDocFeatures(true)
    await act(async () => {
      root.render(
        createElement(LocaleProvider, {
          initial: 'ko',
          children: createElement(SendMenu, { disabled: false, onPick: () => {} }),
        }),
      )
    })
    const button = container.querySelector<HTMLButtonElement>('[data-action="send-to"]')!
    expect(button.textContent?.trim()).toBe('한판으로 보내기')
    expect(button.querySelector('svg')).not.toBeNull()
  })

  it('stays in view at the end of a toolbar that scrolls', () => {
    const css = readFileSync(join(__dirname, '../src/renderer/styles.css'), 'utf8')
    const at = css.indexOf('.mm-tools-end {')
    const body = css.slice(at, css.indexOf('}', at))
    expect(body).toContain('position: sticky')
    expect(body).toContain('flex-shrink: 0')
  })
})
