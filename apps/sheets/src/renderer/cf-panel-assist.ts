/**
 * Conditional formatting panel help (X7). Univer's panel opens on an empty
 * rule list with only a "+" icon, and every new rule starts as
 * "Text > Contains", even over a range of numbers.
 *
 * - The panel's options pass through ISidebarService.sidebarOptions$; a stock
 *   new rule there is turned into "Cell value > Greater than" the selection's average when the
 *   selection holds numbers (Excel's Highlight Cells Rules > Greater Than...).
 * - The panel's own "+" keeps its rule in component state and always starts
 *   from the text default, so its click is routed through the same open path
 *   as the ribbon's quick menu.
 * - An empty rule list gets a line saying what to do and an Add Rule button.
 */
import {
  ICommandService,
  IUniverInstanceService,
  UniverInstanceType,
  type IDisposable,
  type IRange,
  type Workbook,
} from '@univerjs/core'
import { ConditionalFormattingRuleModel } from '@univerjs/preset-sheets-conditional-formatting'
import { SheetsSelectionsService } from '@univerjs/sheets'
import { ISidebarService } from '@univerjs/ui'

import type { UniverRuntime } from './univer-state'

/// Univer's component key for the panel (cf.panel.controller.ts).
export const CF_PANEL_ID = 'sheet.conditional.formatting.panel'
const OPEN_PANEL_COMMAND = 'sheet.operation.open.conditional.formatting.panel'
/// Open-panel value that preseeds a new rule over the selection.
const NEW_RULE_VALUE = 1
/// Cells read to decide whether the selection is numeric.
const MAX_SAMPLED_CELLS = 5000
const HINT_CLASS = 'cf-empty-hint'
const ADD_ICON_SELECTOR = 'svg.univerjs-icon-increase-icon'

export interface SelectionStats {
  readonly numeric: boolean
  readonly average: number
}

/// Numeric when every filled cell holds a number (and one does).
export function numericSelectionStats(values: Iterable<unknown>): SelectionStats {
  let count = 0
  let sum = 0
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    if (typeof value !== 'number' || !Number.isFinite(value)) return { numeric: false, average: 0 }
    count += 1
    sum += value
  }
  if (count === 0) return { numeric: false, average: 0 }
  return { numeric: true, average: roundForRule(sum / count) }
}

/// The average as a rule threshold: large or whole values are rounded to a
/// whole number, small fractions keep two significant digits.
function roundForRule(value: number): number {
  if (Number.isInteger(value) || Math.abs(value) >= 100) return Math.round(value)
  return Number(value.toPrecision(2))
}

interface CfRuleShape {
  readonly cfId?: string | undefined
  readonly rule: { readonly type: string; readonly subType?: string; readonly operator?: string }
}

/// Univer's stock new rule (createDefaultRule) over a numeric selection
/// becomes Greater than its average; anything else is returned untouched.
export function numericDefaultRule<T extends CfRuleShape>(rule: T, stats: SelectionStats): T {
  if (!stats.numeric || rule.cfId) return rule
  const { type, subType, operator } = rule.rule
  if (type !== 'highlightCell' || subType !== 'text' || operator !== 'containsText') return rule
  return {
    ...rule,
    rule: {
      type: 'highlightCell',
      subType: 'number',
      operator: 'greaterThan',
      value: stats.average,
    },
  }
}

/// True for a click on the rule list's "+" (the icon, its path, or the link).
export function isCfAddRuleClick(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const link = target.closest('a')
  if (!link || !link.querySelector(ADD_ICON_SELECTOR)) return false
  return link.closest('[data-u-comp="right-sidebar"]') !== null
}

export interface EmptyHintState {
  /// The conditional formatting panel is the open sidebar.
  readonly open: boolean
  readonly ruleCount: number
  readonly t: (key: 'appCfEmptyHint' | 'appCfAddRule') => string
  readonly onAdd: () => void
}

/// Puts the hint under the rule list header when the list is empty, and takes
/// it away otherwise. The list view is the one showing the "+" icon (the rule
/// editor has none).
export function syncCfEmptyHint(doc: Document, state: EmptyHintState): void {
  const sidebar = doc.querySelector('[data-u-comp="right-sidebar"]')
  const existing = sidebar?.querySelector(`.${HINT_CLASS}`) ?? null
  const icon = sidebar?.querySelector(ADD_ICON_SELECTOR)
  // header row: the "+" link, its tooltip wrapper, the button row, the header
  const header = icon?.closest('a')?.parentElement?.parentElement?.parentElement ?? null
  const host = header?.parentElement ?? null
  if (!state.open || state.ruleCount > 0 || !header || !host) {
    existing?.remove()
    return
  }
  if (existing && existing.parentElement === host) return
  existing?.remove()
  const hint = doc.createElement('div')
  hint.className = HINT_CLASS
  const text = doc.createElement('p')
  text.textContent = state.t('appCfEmptyHint')
  const button = doc.createElement('button')
  button.type = 'button'
  button.textContent = state.t('appCfAddRule')
  button.addEventListener('click', () => state.onAdd())
  hint.append(text, button)
  header.after(hint)
}

function selectionValues(workbook: Workbook, ranges: readonly IRange[]): unknown[] {
  const sheet = workbook.getActiveSheet()
  const values: unknown[] = []
  for (const range of ranges) {
    const lastRow = Math.min(range.endRow, sheet.getMaxRows() - 1)
    const lastColumn = Math.min(range.endColumn, sheet.getMaxColumns() - 1)
    for (let row = Math.max(0, range.startRow); row <= lastRow; row += 1) {
      for (let column = Math.max(0, range.startColumn); column <= lastColumn; column += 1) {
        values.push(sheet.getCellRaw(row, column)?.v ?? null)
        if (values.length >= MAX_SAMPLED_CELLS) return values
      }
    }
  }
  return values
}

export function installCfPanelAssist(
  runtime: UniverRuntime,
  doc: Document,
  t: EmptyHintState['t'],
): IDisposable {
  const injector = runtime.univer.__getInjector()
  const sidebar = injector.get(ISidebarService)
  const instances = injector.get(IUniverInstanceService)
  const selections = injector.get(SheetsSelectionsService)
  const commands = injector.get(ICommandService)
  const rules = injector.get(ConditionalFormattingRuleModel)

  let open = false
  const workbook = (): Workbook | null =>
    instances.getCurrentUnitOfType<Workbook>(UniverInstanceType.UNIVER_SHEET) ?? null
  const stats = (ranges: readonly IRange[]): SelectionStats => {
    const book = workbook()
    return book ? numericSelectionStats(selectionValues(book, ranges)) : numericSelectionStats([])
  }
  const ruleCount = (): number => {
    const book = workbook()
    if (!book) return 0
    return rules.getSubunitRules(book.getUnitId(), book.getActiveSheet().getSheetId())?.length ?? 0
  }

  // The injector hands out a proxy of the sidebar service, so its open()
  // cannot be wrapped. The options it emits carry the very `children` object
  // the panel renders from (React renders after this synchronous emission),
  // so the stock rule is replaced there.
  const visibility = sidebar.sidebarOptions$.subscribe((options) => {
    open = options.visible === true && options.id === CF_PANEL_ID
    const children = options.children as
      (Record<string, unknown> & { rule?: CfRuleShape & { ranges?: IRange[] } }) | undefined
    const rule = children?.rule
    if (!open || !children || !rule) return
    const ranges = rule.ranges?.length
      ? rule.ranges
      : (selections.getCurrentSelections()?.map((s) => s.range) ?? [])
    children.rule = numericDefaultRule(rule, stats(ranges))
  })

  const addRule = (): void => {
    void commands.executeCommand(OPEN_PANEL_COMMAND, { value: NEW_RULE_VALUE })
  }
  const onClick = (event: MouseEvent): void => {
    if (!open || !isCfAddRuleClick(event.target)) return
    event.preventDefault()
    event.stopPropagation()
    addRule()
  }
  doc.addEventListener('click', onClick, true)

  let queued = false
  const sync = (): void => {
    queued = false
    syncCfEmptyHint(doc, { open, ruleCount: ruleCount(), t, onAdd: addRule })
  }
  const observer = new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(sync)
  })
  observer.observe(doc.body, { childList: true, subtree: true })

  return {
    dispose() {
      visibility.unsubscribe()
      doc.removeEventListener('click', onClick, true)
      observer.disconnect()
    },
  }
}
