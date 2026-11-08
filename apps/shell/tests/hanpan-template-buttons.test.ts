import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 0.16 check: "한글로 열기" in the template window broke onto two lines. A button
// keeps its label on one line; when the card is too narrow the buttons move to
// the next row instead.
const css = readFileSync(
  new URL('../src/renderer/src/hanpan/hanpan.css', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n')

function rule(selector: string): string {
  const at = css.indexOf(`\n${selector} {`)
  expect(at, selector).toBeGreaterThanOrEqual(0)
  return css.slice(at, css.indexOf('}', at))
}

describe('template window buttons', () => {
  it('never wrap their label', () => {
    expect(rule('.hp-tpl-actions button')).toMatch(/white-space:\s*nowrap/)
  })

  it('move to the next row when the card is narrow', () => {
    expect(rule('.hp-tpl-actions')).toMatch(/flex-wrap:\s*wrap/)
  })
})
