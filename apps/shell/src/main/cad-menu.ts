/**
 * The Edit menu of AI Drawing tabs.
 *
 * - Undo and redo go to the drawing, as in the mind map's menu: its history is
 *   not the page's own, so the undo / redo roles would not reach it. The page
 *   already takes the keys itself; on Windows and Linux the shortcut is shown
 *   but not registered, or one press would undo twice.
 * - Cut, copy and paste are the roles, so the property panel's boxes and the
 *   AI box keep them.
 * - Select All and Delete go to the drawing. macOS fires a menu accelerator
 *   even when it is not registered, and before the page sees the key, so
 *   Cmd+A or Delete in a text field would select or delete parts. There these
 *   two items carry no accelerator: the page's own shortcuts take the keys and
 *   leave text fields alone.
 */
import type { MenuItemConstructorOptions } from 'electron'
import type { AppMenuLabels } from '@genoffice/electron-utils'
import type { CadMenuCommand } from '../../../cad/src/shared/ipc'

export function cadEditMenu(
  platform: NodeJS.Platform,
  labels: AppMenuLabels,
  command: (cmd: CadMenuCommand) => () => void,
): MenuItemConstructorOptions {
  const isMac = platform === 'darwin'
  /** the key shown next to an item the page handles; none on macOS (see above) */
  const shown = (accelerator: string): Partial<MenuItemConstructorOptions> =>
    isMac ? {} : { accelerator, registerAccelerator: false }
  return {
    label: labels.edit,
    submenu: [
      {
        label: labels.undo,
        accelerator: 'CmdOrCtrl+Z',
        registerAccelerator: false,
        click: command('undo'),
      },
      {
        label: labels.redo,
        accelerator: isMac ? 'Shift+Cmd+Z' : 'Ctrl+Y',
        registerAccelerator: false,
        click: command('redo'),
      },
      { type: 'separator' },
      { role: 'cut', label: labels.cut },
      { role: 'copy', label: labels.copy },
      { role: 'paste', label: labels.paste },
      { type: 'separator' },
      { label: labels.selectAll, ...shown('CmdOrCtrl+A'), click: command('select-all') },
      { label: labels.delete, ...shown('Delete'), click: command('delete') },
    ],
  }
}
