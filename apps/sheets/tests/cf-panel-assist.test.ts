// @vitest-environment jsdom
/**
 * X7 (rest): the conditional formatting panel opened empty with only a "+"
 * icon, and a new rule over numbers started as "Text › Contains".
 * - a rule panel opened over a numeric selection starts as "Cell value ›
 *   Greater than" with the selection's average, like Excel's Greater Than…
 * - the empty rule list carries a line saying what to do and an Add Rule button
 * - "+" goes the same way as the quick menu so it gets the numeric default too
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CF_PANEL_ID,
  numericSelectionStats,
  numericDefaultRule,
  isCfAddRuleClick,
  syncCfEmptyHint,
} from '../src/renderer/cf-panel-assist'

const defaultRule = () => ({
  cfId: undefined,
  ranges: [{ startRow: 1, endRow: 3, startColumn: 1, endColumn: 3 }],
  stopIfTrue: false,
  rule: { type: 'highlightCell', subType: 'text', operator: 'containsText' },
})

describe('numericSelectionStats', () => {
  it('is numeric when every filled cell holds a number', () => {
    const values = [1200000, 870000, null, '', 450000]
    expect(numericSelectionStats(values)).toEqual({ numeric: true, average: 840000 })
  })
  it('is not numeric with text, or with nothing filled', () => {
    expect(numericSelectionStats([1, '서울', 3]).numeric).toBe(false)
    expect(numericSelectionStats([null, '']).numeric).toBe(false)
  })
})

describe('numericDefaultRule', () => {
  it('turns the stock text rule into Greater than the average over numbers', () => {
    const rule = numericDefaultRule(defaultRule(), { numeric: true, average: 840000 })
    expect(rule.rule).toEqual({
      type: 'highlightCell',
      subType: 'number',
      operator: 'greaterThan',
      value: 840000,
    })
    expect(rule.ranges).toEqual(defaultRule().ranges)
  })
  it('keeps text selections, existing rules and other rule kinds as they are', () => {
    const stock = defaultRule()
    expect(numericDefaultRule(stock, { numeric: false, average: 0 })).toBe(stock)
    const existing = { ...defaultRule(), cfId: 'abc' }
    expect(numericDefaultRule(existing, { numeric: true, average: 1 })).toBe(existing)
    const bar = { ...defaultRule(), rule: { type: 'dataBar', isShowValue: true } }
    expect(numericDefaultRule(bar, { numeric: true, average: 1 })).toBe(bar)
  })
})

function panel(): { root: HTMLElement; plus: SVGElement } {
  document.body.innerHTML = `
    <aside data-u-comp="right-sidebar"><section data-u-comp="sidebar">
      <div class="rule-list">
        <div class="head"><span>Rules</span>
          <div class="univer-flex univer-justify-end"><span><a class="univer-size-5 univer-cursor-pointer"><svg class="univerjs-icon univerjs-icon-increase-icon"><path></path></svg></a></span></div>
        </div>
      </div>
    </section></aside>`
  return {
    root: document.querySelector('[data-u-comp="right-sidebar"]') as HTMLElement,
    plus: document.querySelector('svg') as SVGElement,
  }
}

describe('Add Rule in the panel', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('recognizes a click on the panel "+" (or inside its icon)', () => {
    const { plus } = panel()
    expect(isCfAddRuleClick(plus.querySelector('path'))).toBe(true)
    expect(isCfAddRuleClick(plus.closest('a'))).toBe(true)
    expect(isCfAddRuleClick(document.querySelector('.head span'))).toBe(false)
  })

  it('shows the hint and the Add Rule button only on an empty rule list', () => {
    const { root } = panel()
    const onAdd = vi.fn()
    const t = (key: string) => key
    syncCfEmptyHint(document, { open: true, ruleCount: 0, t, onAdd })
    const hint = root.querySelector('.cf-empty-hint')
    expect(hint?.textContent).toContain('appCfEmptyHint')
    const button = hint?.querySelector('button')
    expect(button?.textContent).toBe('appCfAddRule')
    button?.click()
    expect(onAdd).toHaveBeenCalledTimes(1)
    // idempotent while nothing changes
    syncCfEmptyHint(document, { open: true, ruleCount: 0, t, onAdd })
    expect(root.querySelectorAll('.cf-empty-hint')).toHaveLength(1)
    // a rule exists, or the panel is another one: no hint
    syncCfEmptyHint(document, { open: true, ruleCount: 1, t, onAdd })
    expect(root.querySelector('.cf-empty-hint')).toBeNull()
    syncCfEmptyHint(document, { open: false, ruleCount: 0, t, onAdd })
    expect(root.querySelector('.cf-empty-hint')).toBeNull()
  })

  it('names the Univer panel it adjusts', () => {
    expect(CF_PANEL_ID).toBe('sheet.conditional.formatting.panel')
  })
})
