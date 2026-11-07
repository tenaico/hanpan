/**
 * The File menu on the editor's own screen (0.17 #6), modelled on the slide editor's: open,
 * save, save as, the three exports and print. The shell's ☰ menu stays as it is; every item
 * here runs the same handler that menu reaches (open through the shell's open dialog, export
 * and print through the map's export flow).
 *
 * The menu is the app's shared popover (`gs-dd-pop`), anchored to the button. Pressing it
 * does not take the keyboard from the map.
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import { useDismissablePopover } from '@genoffice/ui'
import { useI18n, type StringKey } from '../i18n/locale'
import type { ExportFormat } from '../../shared/ipc'

export interface FileMenuProps {
  /** no map open yet: everything but Open is off */
  disabled: boolean
  onOpen(): void
  onSave(): void
  onSaveAs(): void
  onExport(format: ExportFormat): void
  onPrint(): void
}

type FileItem = {
  id: string
  label: StringKey
  needsMap: boolean
  /** the shortcut the app's File menu gives the same command, as [key, with Shift] */
  keys?: readonly [string, boolean]
  run(p: FileMenuProps): void
}

const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

/** A shortcut as the platform writes it: Ctrl+Shift+S, or ⇧⌘S on a Mac. */
function shortcutText([key, shift]: readonly [string, boolean]): string {
  return IS_MAC ? `${shift ? '⇧' : ''}⌘${key}` : `Ctrl+${shift ? 'Shift+' : ''}${key}`
}

const ITEMS: readonly FileItem[] = [
  { id: 'open', label: 'fileOpen', needsMap: false, keys: ['O', false], run: (p) => p.onOpen() },
  { id: 'save', label: 'fileSave', needsMap: true, keys: ['S', false], run: (p) => p.onSave() },
  {
    id: 'save-as',
    label: 'saveAs',
    needsMap: true,
    keys: ['S', true],
    run: (p) => p.onSaveAs(),
  },
  { id: 'export-png', label: 'exportPng', needsMap: true, run: (p) => p.onExport('png') },
  { id: 'export-pdf', label: 'exportPdf', needsMap: true, run: (p) => p.onExport('pdf') },
  {
    id: 'export-markdown',
    label: 'exportMarkdown',
    needsMap: true,
    run: (p) => p.onExport('markdown'),
  },
  {
    id: 'print',
    label: 'filePrint',
    needsMap: true,
    keys: ['P', false],
    run: (p) => p.onPrint(),
  },
]

/** Items after which a separator stands: open | save, save as | exports | print */
const SEPARATED_AFTER = new Set(['open', 'save-as', 'export-markdown'])

export function FileMenu(p: FileMenuProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  useDismissablePopover(open, () => setOpen(false), { inside: () => [wrap.current] })
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])
  return (
    <span ref={wrap} className="gs-dd mm-file-menu">
      <button
        type="button"
        className={`ribbon-tab mm-file-tab${open ? ' active' : ''}`}
        data-action="file-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((was) => !was)}
      >
        {t('fileMenu')}
      </button>
      {open && (
        <div className="gs-dd-pop mm-file-pop" role="menu" aria-label={t('fileMenu')}>
          {ITEMS.map((item) => (
            <Fragment key={item.id}>
              <button
                type="button"
                role="menuitem"
                className="gs-dd-item mm-file-item"
                data-file={item.id}
                disabled={item.needsMap && p.disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false)
                  item.run(p)
                }}
              >
                <span className="mm-file-label">{t(item.label)}</span>
                {item.keys && <span className="mm-file-kbd">{shortcutText(item.keys)}</span>}
              </button>
              {SEPARATED_AFTER.has(item.id) && <div className="mm-file-sep" role="separator" />}
            </Fragment>
          ))}
        </div>
      )}
    </span>
  )
}
