/** @vitest-environment jsdom */
// 0.17 review #13: each Hanpan tool says in one line what it does, the prompt builder's task
// list is in the UI language, and Esc closes the menu and gives focus back to its button.
// The Hanpan strings carry every UI language (hanpan-strings.json, tools/hanpan-add-strings.mjs).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LANGS, type Lang } from '@genoffice/i18n'
import { applyKoreanDocFeatures } from '@genoffice/ui'
import { HanpanTools } from '../src/renderer/hanpan/HanpanTools'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { strings } from '../src/renderer/i18n/strings'
import hanpan from '../src/renderer/i18n/hanpan-strings.json'
import type { HwpApi } from '../src/shared/ipc'

let container: HTMLElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const api: Partial<HwpApi> = { onLanguageChanged: () => () => {}, hanpanTool: vi.fn() }
  Object.assign(window, { hwpApi: api })
  applyKoreanDocFeatures(true)
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

async function openTools(lang: Lang): Promise<HTMLButtonElement> {
  await act(async () => {
    root.render(
      createElement(LocaleProvider, { initial: lang, children: createElement(HanpanTools, {}) }),
    )
  })
  const button = container.querySelector<HTMLButtonElement>('[data-action="hanpan-tools"]')!
  await act(async () => button.click())
  return button
}

describe('the Hanpan tools menu', () => {
  it('describes every tool in one line', async () => {
    await openTools('ko')
    for (const tool of ['tidy', 'check', 'review', 'prompt']) {
      const item = container.querySelector(`[data-tool="${tool}"]`)!
      const desc = item.querySelector('.hp-tools-desc')
      expect(desc?.textContent, tool).toBeTruthy()
      expect(item.getAttribute('title'), tool).toBe(desc!.textContent)
    }
    expect(container.querySelector('[data-tool="prompt"] .hp-tools-desc')?.textContent).toContain(
      '역할',
    )
    expect(container.querySelector('.hp-tools-row .hp-tools-desc')?.textContent).toBeTruthy()
  })

  it('shows the prompt task list in the UI language', async () => {
    await openTools('en')
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-tool="prompt"]')!.click(),
    )
    const labels = Array.from(container.querySelectorAll('.hp-prompt option'), (o) => o.textContent)
    expect(labels).toContain('Summarize')
    expect(labels.join('')).not.toMatch(/[가-힣]/)
  })

  it('closes on Esc and gives focus back to its button', async () => {
    const button = await openTools('ko')
    container.querySelector<HTMLButtonElement>('[data-tool="tidy"]')!.focus()
    await act(async () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    expect(container.querySelector('.hp-tools-pop')).toBeNull()
    expect(document.activeElement).toBe(button)
  })
})

describe('the Hanpan strings', () => {
  const SAME_OK = /^[A-Za-z0-9 .()+:·-]{1,12}$/
  it('are written in every UI language and the language tables hold them', () => {
    for (const [key, text] of Object.entries(hanpan as Record<string, Record<string, string>>)) {
      for (const lang of LANGS) {
        expect(text[lang], `${key} ${lang}`).toBeTruthy()
        expect((strings[lang] as Record<string, string>)[key], `${key} ${lang}`).toBe(text[lang])
      }
      if (!SAME_OK.test(text.en!)) expect(text.vi, key).not.toBe(text.en)
    }
  })
})

// 0.17 UI/UX review v2, hwp-design #22: the 공문 점검 result landed at the bottom of the menu
// with no title, the picture-credit result under its own button, and an earlier result stayed
// when another tool ran.
describe('a tool result', () => {
  const answer = (value: unknown) =>
    ((window.hwpApi as Partial<HwpApi>).hanpanTool as ReturnType<typeof vi.fn>).mockResolvedValue(
      value,
    )

  it('shows under the tool that made it, titled with its name', async () => {
    answer({ ok: true, findings: [{ code: 'no-recipient' }] })
    await openTools('ko')
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-tool="check"]')!.click(),
    )
    const result = container.querySelector('.hp-tools-result')!
    expect(result.previousElementSibling?.getAttribute('data-tool')).toBe('check')
    expect(result.querySelector('.hp-tools-result-title')?.textContent).toBe('공문 점검 결과')
  })

  it('goes when another tool runs, so two results never mix', async () => {
    answer({ ok: true, findings: [] })
    await openTools('ko')
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-tool="check"]')!.click(),
    )
    answer({ ok: true, changed: 2 })
    await act(async () => container.querySelector<HTMLButtonElement>('[data-tool="tidy"]')!.click())
    const results = container.querySelectorAll('.hp-tools-result')
    expect(results).toHaveLength(1)
    expect(results[0]!.previousElementSibling?.getAttribute('data-tool')).toBe('tidy')
  })
})
