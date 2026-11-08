/**
 * One sheet tab menu (X12). SheetTabContextMenu replaces Univer's footer-tab
 * menu by catching the right-click, but Univer still renders its own menu off
 * screen: a second set of words ("Rename"/"Change color" beside our "Rename",
 * "Tab Color") that screen readers reach, and one that keeps the previous
 * language after a runtime switch. Hiding every entry leaves it empty.
 */
import type { IMenuManagerService, MenuSchemaType } from '@univerjs/ui'
import { ContextMenuPosition } from '@univerjs/ui'
import { of } from 'rxjs'

export function hideUniverSheetTabMenu(menus: IMenuManagerService): void {
  const groups = menus.getMenuByPositionKey(ContextMenuPosition.FOOTER_TABS)
  const schema: Record<string, Record<string, MenuSchemaType>> = {}
  for (const group of groups) {
    for (const entry of group.children ?? []) {
      const item = entry.item
      if (!item) continue
      ;(schema[group.key] ??= {})[entry.key] = {
        menuItemFactory: () => ({ ...item, hidden$: of(true) }),
      }
    }
  }
  menus.mergeMenu({ [ContextMenuPosition.FOOTER_TABS]: schema })
}
