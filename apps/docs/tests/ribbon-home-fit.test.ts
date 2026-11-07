/**
 * Home tab fits common laptop widths (Hanpan 0.17 #3). Measured in the built
 * app (ko UI): the Home band needed 1551px, so 1280- and 1366-wide windows
 * showed a horizontal scrollbar under the ribbon. Below 1600px the four AI
 * preset buttons stack two by two with small icons and the style gallery may
 * shrink to its expander; below 1366px the presets drop their labels (the
 * tooltip keeps the name). Layout itself is checked in the built app.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { describe, expect, it, vi } from 'vitest'
import { editorExtensions } from '../src/renderer/editor/extensions'
import { computeFormatState } from '../src/renderer/components/ribbon-format-state'
import { Ribbon } from '../src/renderer/components/Ribbon'
import { LocaleProvider, setModuleLang } from '../src/renderer/i18n/locale'
import { ribbonProps } from './helpers/ribbon-props'

const css = readFileSync(join(__dirname, '../src/renderer/styles.css'), 'utf8')

function mediaBlock(query: string): string {
  const at = css.indexOf(`@media ${query}`)
  expect(at, `@media ${query}`).toBeGreaterThanOrEqual(0)
  let depth = 0
  for (let i = css.indexOf('{', at); i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(at, i + 1)
  }
  throw new Error('unbalanced')
}

describe('Home tab fits narrower windows', () => {
  it('marks the AI group and its four preset buttons', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    ;(window as unknown as { desktop: unknown }).desktop = { onLanguageChanged: () => () => {} }
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: editorExtensions,
    })
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    setModuleLang('ko')
    act(() =>
      root.render(
        createElement(LocaleProvider, {
          initial: 'ko',
          children: createElement(Ribbon, ribbonProps(editor, computeFormatState(editor))),
        }),
      ),
    )
    const group = host.querySelector('.ribbon-group-ai')
    expect(group).not.toBeNull()
    const presets = group!.querySelectorAll('.ai-preset')
    expect(presets).toHaveLength(4)
    for (const p of presets) expect(p.getAttribute('data-tip')).toBeTruthy()
    act(() => root.unmount())
    host.remove()
    editor.destroy()
    setModuleLang('zh')
    vi.unstubAllGlobals()
  })

  it('stacks the presets and lets the style gallery shrink below 1600px', () => {
    const block = mediaBlock('(max-width: 1599px)')
    expect(block).toMatch(/\.ribbon-group-ai > \.ribbon-group-items\s*\{[^}]*display: grid/)
    expect(block).toMatch(/\.ribbon-group-styles\s*\{[^}]*min-width: 105px/)
    // a gallery narrower than one card hides the card instead of showing half of it
    expect(css).toContain('container: style-gallery / inline-size')
    expect(css).toMatch(
      /@container style-gallery \(max-width: 73px\)\s*\{\s*\.style-gallery > \*\s*\{\s*visibility: hidden/,
    )
  })

  it('drops the preset labels below 1366px', () => {
    const block = mediaBlock('(max-width: 1365px)')
    expect(block).toMatch(/\.ai-preset > span:last-child\s*\{[^}]*display: none/)
  })
})

describe('File menu items stay on one line', () => {
  // measured: "다른 이름으로 저장…" broke onto two lines beside "Ctrl+Shift+S" in the 210px menu
  it('does not wrap item labels', () => {
    expect(css).toMatch(/\.file-menu button\s*\{[^}]*white-space: nowrap/)
  })
})
