/**
 * Excel widens a column to fit a number or date the user has just typed
 * (X9): "2026-11-07" in a default-width column showed ######## here. After
 * an edit commits, a numeric cell that the #### rule (numfmt-fix.ts) hashed
 * gets its column widened just enough to show the value.
 *
 * Only columns at the sheet's default width qualify, plus columns this
 * module widened itself: a width the user dragged, typed or the file stored
 * stays as it is, as in Excel. The widening is its own command, so it
 * journals and saves like a column width change and undoes on its own.
 */
import { CellValueType, type IColumnData, type Workbook } from '@univerjs/core'
import { IUniverInstanceService, UniverInstanceType, isDefaultFormat } from '@univerjs/core'
import { FontCache, getFontStyleString } from '@univerjs/engine-render'
import { AFTER_CELL_EDIT, SheetInterceptorService } from '@univerjs/sheets'

import { SET_RANGE_VALUES_COMMAND } from './app-constants'
import {
  CELL_INSET_PX,
  excelWidthScale,
  formatForMeasure,
  hasGdiDigitCalibration,
  mergedSpanWidth,
  overflowHashes,
} from './numfmt-fix'
import type { UniverRuntime } from './univer-state'

const SET_COLUMN_WIDTH_COMMAND = 'sheet.command.set-worksheet-col-width'

/// The #### fill a too-narrow number displays.
export function isHashedDisplay(value: unknown): boolean {
  return typeof value === 'string' && /^#+$/.test(value)
}

/// A column width (px) at which `display` passes the #### rule in both its
/// calibrated (one digit of slack) and uncalibrated forms.
export function widthToShow(
  display: string,
  measure: (text: string) => number,
  scale: number,
): number {
  return Math.ceil((measure(display) + measure('0')) * scale + CELL_INSET_PX) + 1
}

/// Default-width columns (no stored width) and the ones widened here that
/// still have the width set here (a later drag makes it the user's width).
export function canAutoWidenColumn(
  column: Partial<IColumnData> | undefined,
  widened: ReadonlyMap<number, number>,
  index: number,
): boolean {
  if (column?.w === undefined) return true
  return widened.get(index) === column.w
}

interface EditedCell {
  readonly unitId: string
  readonly sheetId: string
  readonly row: number
  readonly column: number
}

export function installEntryAutoWiden(runtime: UniverRuntime): { dispose(): void } {
  const injector = runtime.univer.__getInjector()
  const instances = injector.get(IUniverInstanceService)
  const writeCellInterceptor = injector.get(SheetInterceptorService).writeCellInterceptor
  /// Columns widened here and the width set, per sheet ("unit/sheet" key).
  const widened = new Map<string, Map<number, number>>()
  let edited: EditedCell | null = null

  // Remember which cell the editor commits; the value lands with the
  // set-range-values command that follows.
  const disposeInterceptor = writeCellInterceptor.intercept(AFTER_CELL_EDIT, {
    priority: 1,
    handler: (cell, context, next) => {
      edited = {
        unitId: context.unitId,
        sheetId: context.subUnitId,
        row: context.row,
        column: context.col,
      }
      return next(cell)
    },
  })

  const widen = (target: EditedCell): void => {
    const workbook = instances.getUnit<Workbook>(target.unitId, UniverInstanceType.UNIVER_SHEET)
    const sheet = workbook?.getSheetBySheetId(target.sheetId)
    if (!workbook || !sheet) return
    const raw = sheet.getCellRaw(target.row, target.column)
    if (typeof raw?.v !== 'number' || raw.t === CellValueType.STRING) return
    if (!isHashedDisplay(sheet.getCell(target.row, target.column)?.v)) return
    if (mergedSpanWidth(sheet, target.row, target.column) !== null) return
    const key = `${target.unitId}/${target.sheetId}`
    const mine = widened.get(key) ?? new Map<number, number>()
    const columnData = sheet.getColumnManager().getColumnData()[target.column]
    if (!canAutoWidenColumn(columnData, mine, target.column)) return
    const style = sheet.getComposedCellStyle(target.row, target.column)
    const pattern = style.n?.pattern
    if (pattern === undefined || isDefaultFormat(pattern)) return
    const display = formatForMeasure(pattern, raw.v)
    const fontString = getFontStyleString(style).fontString
    const measure = (text: string): number => FontCache.getMeasureText(text, fontString).width
    const scale = excelWidthScale(style.ff ?? undefined, style.fs ?? 11, () => measure('0'))
    const width = widthToShow(display, measure, scale)
    if (width <= sheet.getColumnWidth(target.column)) return
    // the check the #### rule itself makes, at the new width
    const calibrated = hasGdiDigitCalibration(style.ff ?? undefined)
    if (overflowHashes(display, width, measure, scale, calibrated) !== null) return
    mine.set(target.column, width)
    widened.set(key, mine)
    void runtime.univerAPI.executeCommand(SET_COLUMN_WIDTH_COMMAND, {
      unitId: target.unitId,
      subUnitId: target.sheetId,
      ranges: [
        {
          startRow: 0,
          endRow: 0,
          startColumn: target.column,
          endColumn: target.column,
        },
      ],
      value: width,
    })
  }

  const afterCommit = runtime.univerAPI.addEvent(
    runtime.univerAPI.Event.CommandExecuted,
    (event) => {
      if (event.id !== SET_RANGE_VALUES_COMMAND || !edited) return
      const target = edited
      edited = null
      // after the render pass that formats the new value
      setTimeout(() => widen(target), 0)
    },
  )

  return {
    dispose() {
      disposeInterceptor()
      afterCommit.dispose()
    },
  }
}
