// Developer-facing tools (image upload server, backlinks, graph) sit behind one
// "Advanced" menu instead of leading the ribbon, and the paper theme menu shows
// translated names in a layer above the ribbon and the AI panel (UX v2 #15, #16).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { buildExtensions } from '../src/renderer/editor/extensions'
import { Ribbon } from '../src/renderer/components/Ribbon'
import { strings } from '../src/renderer/i18n/strings'

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

const zh = strings.zh

function renderRibbon() {
  const editor = new Editor({
    extensions: buildExtensions({
      slashController: { onOpen() {}, onUpdate() {}, onKeyDown: () => false, onClose() {} },
      slashItems: () => [],
    }),
    content: '<p>doc</p>',
  })
  const handlers = {
    onImageHost: vi.fn(),
    onToggleBacklinks: vi.fn(),
    onOpenGraph: vi.fn(),
    onMarkdownTheme: vi.fn(),
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const props = {
    ...handlers,
    disabled: false,
    dirty: false,
    onFind: vi.fn(),
    autoSave: false,
    onToggleAutoSave: vi.fn(),
    aiOpen: false,
    onToggleAi: vi.fn(),
    onAiPreset: vi.fn(),
    editor,
    imageEnabled: true,
    onInsertImage: vi.fn(),
    frontmatterOpen: false,
    onToggleFrontmatter: vi.fn(),
    outlineOpen: false,
    onToggleOutline: vi.fn(),
    mdTheme: 'default',
  }
  act(() => root.render(createElement(Ribbon, props as never)))
  cleanups.push(() => {
    act(() => root.unmount())
    editor.destroy()
    container.remove()
  })
  return { container, ...handlers }
}

const tipButton = (root: ParentNode, tip: string) =>
  root.querySelector<HTMLButtonElement>(`button[data-tip="${tip}"]`)

describe('markdown ribbon — advanced tools and theme menu', () => {
  it('keeps image host, backlinks and graph off the ribbon face', () => {
    const { container } = renderRibbon()
    expect(tipButton(container, zh.imageHostTitle)).toBeNull()
    expect(tipButton(container, zh.backlinks)).toBeNull()
    expect(tipButton(container, zh.graph)).toBeNull()
  })

  it('opens them from the Advanced menu', () => {
    const { container, onImageHost, onToggleBacklinks, onOpenGraph } = renderRibbon()
    const more = tipButton(container, zh.ribbonAdvancedTip)
    expect(more, 'an Advanced button on the ribbon').not.toBeNull()
    const pick = (label: string) => {
      act(() => more!.click())
      const entry = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
        (b) => b.textContent?.includes(label),
      )
      expect(entry, label).toBeDefined()
      act(() => entry!.click())
    }
    pick(zh.backlinks)
    expect(onToggleBacklinks).toHaveBeenCalledTimes(1)
    pick(zh.graph)
    expect(onOpenGraph).toHaveBeenCalledTimes(1)
    pick(zh.imageHostTitle)
    expect(onImageHost).toHaveBeenCalledTimes(1)
  })

  it('names the paper themes in the UI language, in a layer outside the ribbon', () => {
    const { container } = renderRibbon()
    act(() => tipButton(container, zh.mdThemeTitle)!.click())
    const menu = document.querySelector<HTMLElement>('.md-theme-menu')
    expect(menu).not.toBeNull()
    // portalled to <body>: the ribbon's overflow no longer clips it
    expect(container.contains(menu)).toBe(false)
    const labels = [...menu!.querySelectorAll('button')].map((b) => b.textContent)
    expect(labels).toContain(zh.mdThemeNotionLight)
    expect(labels.join(' ')).not.toMatch(/Notion|Drake/)
  })
})
