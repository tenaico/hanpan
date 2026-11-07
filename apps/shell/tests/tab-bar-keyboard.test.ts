/**
 * @vitest-environment jsdom
 */
// 0.17 리뷰 v2 shell #31: the tab strip is a tab list a keyboard can use. Tab
// lands on the active tab (not on every close button), arrows move between
// tabs, Enter or Space shows the focused one, and Delete closes it.
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TabBar } from '../src/renderer/src/TabBar'
import { LocaleProvider } from '../src/renderer/src/locale'
import type { TabSummary } from '../src/shared/tabs-api'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let activate: ReturnType<typeof vi.fn>
let close: ReturnType<typeof vi.fn>

const TABS: TabSummary[] = [
  { id: 'home', kind: 'home', title: 'Hanpan', closable: false, active: false },
  { id: 'a', kind: 'docs', title: 'a.docx', closable: true, active: true, filePath: 'C:\\a.docx' },
  {
    id: 'b',
    kind: 'sheets',
    title: 'b.xlsx',
    closable: true,
    active: false,
    filePath: 'C:\\b.xlsx',
  },
]

beforeEach(async () => {
  Element.prototype.scrollIntoView = () => undefined
  activate = vi.fn(async () => undefined)
  close = vi.fn(async () => undefined)
  const off = () => () => undefined
  ;(window as unknown as { aiOfficeTabs: unknown }).aiOfficeTabs = new Proxy(
    { list: async () => TABS, activate, close },
    {
      get: (target: Record<string, unknown>, name: string) =>
        target[name] ?? (name.startsWith('on') ? off : async () => undefined),
    },
  )
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root.render(
      createElement(LocaleProvider, { initial: 'ko' }, createElement(TabBar, { split: null })),
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const tabEls = () => Array.from(host.querySelectorAll<HTMLElement>('[role="tab"]'))
const key = async (el: HTMLElement, k: string) =>
  act(async () => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
  })

describe('tab strip keyboard', () => {
  it('is a tab list whose only Tab stop is the active tab', () => {
    expect(host.querySelector('[role="tablist"]')).not.toBeNull()
    expect(tabEls().map((el) => el.tabIndex)).toEqual([-1, 0, -1])
    expect(tabEls()[1]!.getAttribute('aria-selected')).toBe('true')
    // the close buttons are not separate Tab stops
    for (const button of host.querySelectorAll<HTMLElement>('.tab-close')) {
      expect(button.tabIndex).toBe(-1)
    }
  })

  it('moves with the arrows, shows a tab with Enter and closes it with Delete', async () => {
    const [, a, b] = tabEls()
    a!.focus()
    await key(a!, 'ArrowRight')
    expect(document.activeElement).toBe(b)
    await key(b!, 'Enter')
    expect(activate).toHaveBeenCalledWith('b')
    await key(b!, 'Delete')
    expect(close).toHaveBeenCalledWith('b')
    await key(b!, 'Home')
    expect(document.activeElement).toBe(tabEls()[0])
  })
})
