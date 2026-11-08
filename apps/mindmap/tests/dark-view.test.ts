/**
 * The dark view of a light map (0.17 review v2 slides-mindmap #37): with the
 * document page theme dark, or following a dark app, the map on screen is
 * darkened by a filter of the chrome stylesheet. The map's colours stay
 * document content: `map.css` and the drawing code do not change, and the
 * export copy (`.mm-export`) is out of the rule's reach.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { applyDocumentTheme } from '../src/renderer/doc-theme'

const HERE = dirname(fileURLToPath(import.meta.url))
const stylesCss = readFileSync(resolve(HERE, '../src/renderer/styles.css'), 'utf8')
const mapCss = readFileSync(resolve(HERE, '../src/renderer/map.css'), 'utf8')

const FILTER = 'invert(1) hue-rotate(180deg)'

/** The selectors of every rule in `css` that sets `filter: <FILTER>` */
function filterRules(css: string): string[] {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: string[] = []
  for (const match of plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[2]!.includes(`filter: ${FILTER}`)) rules.push(match[1]!.trim())
  }
  return rules
}

/** A selector list split at its own commas, not at those inside `:is(…)` or `:not(…)` */
function selectors(list: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let at = 0; at < list.length; at++) {
    if (list[at] === '(') depth++
    else if (list[at] === ')') depth--
    else if (list[at] === ',' && depth === 0) {
      out.push(list.slice(start, at).trim())
      start = at + 1
    }
  }
  out.push(list.slice(start).trim())
  return out
}

afterEach(() => document.documentElement.removeAttribute('data-doc-theme'))

describe('dark view of the map', () => {
  it('marks the page with the document theme the shell gives', () => {
    const root = document.documentElement
    applyDocumentTheme('dark')
    expect(root.dataset.docTheme).toBe('dark')
    applyDocumentTheme('light')
    expect(root.dataset.docTheme).toBe('light')
    // following the app is the absence of a choice: the app theme decides
    applyDocumentTheme('follow')
    expect(root.hasAttribute('data-doc-theme')).toBe(false)
  })

  it('darkens only the live map with a light ground, never the export copy', () => {
    const rules = filterRules(stylesCss)
    const map = rules.filter((rule) =>
      /\.map-container\s*:not\(\[data-mm-variant='dark'\]\)/.test(rule),
    )
    expect(map.length).toBeGreaterThan(0)
    for (const rule of map) {
      for (const selector of selectors(rule)) {
        expect(selector, selector).toContain('.mm-card:not(.mm-export)')
        expect(selector, selector).toMatch(/data-doc-theme/)
      }
    }
    // a light document page keeps the map as it is, whatever the app
    for (const selector of map.flatMap(selectors)) {
      if (selector.includes("[data-theme='dark']")) {
        expect(selector).toContain(":not([data-doc-theme='light'])")
      }
    }
  })

  it('turns pictures and the app menus inside the map back to their own colours', () => {
    const rules = filterRules(stylesCss).join('\n')
    for (const part of ['img', '.context-menu', '.tips', 'me-epd']) {
      expect(rules, part).toContain(part)
    }
  })

  it('leaves the map stylesheet without any view of the app or the page theme', () => {
    expect(mapCss).not.toMatch(/data-doc-theme|data-theme|filter:\s*invert/)
  })
})
