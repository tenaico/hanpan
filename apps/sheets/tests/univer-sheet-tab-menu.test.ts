/**
 * X12: the sheet tab menu is ours (SheetTabContextMenu). Univer still kept its
 * own footer-tab menu rendered off screen with other words ("이름 변경",
 * "색상 변경" against our "이름 바꾸기", "탭 색"), and after a runtime language
 * switch it stayed in the old language. Every entry of that menu is hidden so
 * only one sheet tab menu exists.
 */
import { describe, expect, it } from 'vitest'
import { Injector, type IConfigService } from '@univerjs/core'
import {
  ContextMenuGroup,
  ContextMenuPosition,
  MenuItemType,
  MenuManagerService,
} from '@univerjs/ui'
import { firstValueFrom, of } from 'rxjs'

import { hideUniverSheetTabMenu } from '../src/renderer/univer-sheet-tab-menu'

function menus(): MenuManagerService {
  const config = { getConfig: () => undefined } as unknown as IConfigService
  const service = new MenuManagerService(new Injector(), config)
  const item = (id: string) => () => ({
    id,
    type: MenuItemType.BUTTON,
    title: id,
    hidden$: of(false),
  })
  service.mergeMenu({
    [ContextMenuPosition.FOOTER_TABS]: {
      [ContextMenuGroup.OTHERS]: {
        order: 0,
        'sheet.command.rename-sheet': {
          order: 2,
          menuItemFactory: item('sheet.command.rename-sheet'),
        },
        'sheet.command.set-tab-color': {
          order: 3,
          menuItemFactory: item('sheet.command.set-tab-color'),
        },
      },
    },
    [ContextMenuPosition.MAIN_AREA]: {
      [ContextMenuGroup.OTHERS]: {
        order: 0,
        'sheet.command.copy': { order: 0, menuItemFactory: item('sheet.command.copy') },
      },
    },
  })
  return service
}

async function hiddenOf(service: MenuManagerService, position: string): Promise<boolean[]> {
  const groups = service.getMenuByPositionKey(position)
  const items = groups.flatMap((group) => group.children ?? [])
  return Promise.all(items.map((entry) => firstValueFrom(entry.item!.hidden$ ?? of(false))))
}

describe('hideUniverSheetTabMenu', () => {
  it('hides every Univer footer-tab entry and leaves the cell menu alone', async () => {
    const service = menus()
    expect(await hiddenOf(service, ContextMenuPosition.FOOTER_TABS)).toEqual([false, false])
    hideUniverSheetTabMenu(service)
    expect(await hiddenOf(service, ContextMenuPosition.FOOTER_TABS)).toEqual([true, true])
    expect(await hiddenOf(service, ContextMenuPosition.MAIN_AREA)).toEqual([false])
  })
})
