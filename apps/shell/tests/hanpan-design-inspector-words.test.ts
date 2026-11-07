/**
 * @vitest-environment jsdom
 */
// 0.17 UI/UX 점검 v2 hwp-design #20·#31·#32·#37: tooltips that say what a button does
// (colour names, which way text aligns), a translation default that names its real
// target, a layer row whose lock comes first, and no licence line under the icons.
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DesignBoard, type DesignApi } from '../src/renderer/src/design/DesignBoard'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let api: DesignApi

beforeEach(() => {
  // jsdom has no scrolling; the AI helper's thread scrolls to its end
  Element.prototype.scrollTo ??= () => undefined
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  api = {
    savePng: vi.fn(async () => null),
    savePdf: vi.fn(async () => null),
    copyImage: vi.fn(async () => true),
    saveDesign: vi.fn(async () => null),
    openDesign: vi.fn(async () => null),
    pickImage: vi.fn(async () => null),
    // an AI is there: the rewrite row (and its translation target) shows
    aiStream: vi.fn(async () => undefined),
    aiStreamCancel: vi.fn(async () => undefined),
    onAiStream: vi.fn(() => () => undefined),
    getAiSettings: vi.fn(async () => null),
  } as unknown as DesignApi
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const $ = <T extends Element>(sel: string) => host.querySelector<T>(sel)
const $$ = <T extends Element>(sel: string) => [...host.querySelectorAll<T>(sel)]
async function click(el: Element | null | undefined) {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}
async function renderWithTitle() {
  await act(async () => root.render(createElement(DesignBoard, { lang: 'ko', api })))
  await click($('[data-action="design-file"]'))
  await click($('[data-file-item="newDesign"]'))
  await click($('[data-tab="text"]'))
  await click($$('button').find((b) => b.textContent === '제목 넣기'))
  const props = $('[data-side="props"]')
  if (props) await click(props)
}

describe('the inspector says what its buttons do', () => {
  it('names the palette colours and the three text alignments', async () => {
    await renderWithTitle()
    const titles = $$<HTMLButtonElement>('.dz-swatch').map((b) => b.title)
    expect(titles).toContain('남색')
    expect(titles.some((t) => /^#[0-9A-F]{6}$/i.test(t))).toBe(false)
    for (const word of ['왼쪽 정렬', '가운데 정렬', '오른쪽 정렬'])
      expect($(`button[title="${word}"]`), word).not.toBeNull()
  })

  it('shows the language a translation really goes to', async () => {
    await renderWithTitle()
    const select = $<HTMLSelectElement>('[data-hanpan="design-translate-to"]')!
    expect(select.options[0]!.textContent).toBe('자동 (English)')
  })

  it('puts the lock first in a layer row and names the row', async () => {
    await renderWithTitle()
    await click($('[data-tab="layers"]'))
    const row = $('[data-hanpan="design-layers"] li')!
    expect(row.firstElementChild?.classList.contains('dz-layer-lock')).toBe(true)
    expect(row.querySelector<HTMLButtonElement>('.dz-layer')!.title).not.toBe('')
  })

  it('keeps the icon licence out of the icon list', async () => {
    await renderWithTitle()
    await click($('[data-tab="elements"]'))
    expect(host.textContent).not.toContain('Lucide')
  })
})
