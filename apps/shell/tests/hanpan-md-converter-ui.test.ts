/**
 * @vitest-environment jsdom
 */
// 0.17 리뷰 v2 shell #4: the Markdown converter keeps what was typed when it is
// closed, drops the "put Markdown in first" error once there is text, and its
// preview follows the chosen document look.
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MarkdownConverter,
  resetConverterDraft,
  type MarkdownConverterApi,
} from '../src/renderer/src/hanpan/MarkdownConverter'
import { LocaleProvider } from '../src/renderer/src/locale'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

const api: MarkdownConverterApi = {
  mdFolder: async () => 'C:/docs/Hanpan',
  mdPickFile: async () => null,
  mdPickFolder: async () => null,
  mdConvert: async () => ({ ok: true, written: [], failed: [] }),
  mdShowFolder: async () => '',
}

async function open(): Promise<void> {
  await act(async () => {
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'ko' },
        createElement(MarkdownConverter, { api, onClose: () => undefined }),
      ),
    )
  })
}

async function close(): Promise<void> {
  await act(async () => root.render(createElement('div')))
}

async function setValue(el: Element | null, value: string): Promise<void> {
  expect(el).toBeTruthy()
  const proto = Object.getPrototypeOf(el) as object
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  await act(async () => {
    setter.call(el, value)
    const type = el instanceof HTMLSelectElement ? 'change' : 'input'
    el!.dispatchEvent(new Event(type, { bubbles: true }))
  })
}

const source = () => host.querySelector<HTMLTextAreaElement>('[data-hanpan="md-source"]')!

beforeEach(() => {
  resetConverterDraft()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('Markdown converter', () => {
  it('keeps the typed Markdown after it is closed and opened again', async () => {
    await open()
    await setValue(source(), '# 회의 결과\n\n본문')
    await close()
    await open()
    expect(source().value).toBe('# 회의 결과\n\n본문')
  })

  it('clears the "put Markdown in first" error as soon as there is text', async () => {
    await open()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[data-hanpan="md-convert"]')!.click(),
    )
    expect(host.querySelector('[data-hanpan="md-result"]')?.textContent).toContain('마크다운')
    await setValue(source(), '# 제목')
    expect(host.querySelector('[data-hanpan="md-result"]')).toBeNull()
  })

  it('draws the preview in the chosen document look', async () => {
    await open()
    await setValue(source(), '# 제목\n\n본문 한 줄')
    await new Promise((resolve) => setTimeout(resolve, 0))
    const title = () => host.querySelector<HTMLElement>('[data-hanpan="md-preview"] h1')!
    const report = title().style.fontFamily
    await setValue(host.querySelector('[data-hanpan="md-theme"]'), 'gongmun')
    expect(title().style.fontFamily).not.toBe(report)
    expect(title().style.fontFamily).toContain('맑은 고딕')
  })
})
