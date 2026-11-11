import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ThemeRoot } from '../src/renderer/theme-root'
import type { ResolvedTheme, ThemeWatch } from '../src/renderer/theme'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  host?.remove()
})

describe('the tab root', () => {
  it('keeps a theme change made between its first render and its subscription', async () => {
    let current: ResolvedTheme = 'light'
    const watch: ThemeWatch = {
      get theme() {
        return current
      },
      stop: () => {},
    }
    const seen: ResolvedTheme[] = []
    let set: ((theme: ResolvedTheme) => void) | null = null
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root!.render(
        <ThemeRoot
          watch={watch}
          subscribe={(s) => {
            set = s
          }}
        >
          {(theme) => {
            seen.push(theme)
            // Hanpan's theme changes after this render, before the root subscribes: the
            // change goes to no one
            current = 'dark'
            return <span>{theme}</span>
          }}
        </ThemeRoot>,
      )
    })
    expect(set).not.toBeNull()
    expect(seen[0]).toBe('light')
    expect(host.textContent).toBe('dark')
    // later changes come through the subscription
    await act(async () => set!('light'))
    expect(host.textContent).toBe('light')
  })
})
