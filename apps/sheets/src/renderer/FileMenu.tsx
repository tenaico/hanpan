/**
 * The File menu on the editor's own screen (0.17 #6), modelled on the slide editor's: open,
 * save, save as, PDF, image and CSV export (the sheet or all sheets), and print. The shell's ☰ menu stays as it is; each item
 * hands the same `MenuAction` that menu sends, so App runs one handler for both (print opens
 * the print preview, the exports their dialogs).
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import { useDismissablePopover } from '@genoffice/ui'
import { useI18n, type StringKey } from './i18n/locale'
import type { MenuAction } from '../shared/desktop-api'

export type FileMenuAction = Exclude<MenuAction, 'undo' | 'redo'>

interface FileMenuProps {
  /** a workbook is open: everything but Open needs one */
  readonly hasWorkbook: boolean
  readonly canSave: boolean
  readonly canSaveAs: boolean
  readonly onAction: (action: FileMenuAction) => void
}

const ITEMS: readonly { action: FileMenuAction; label: StringKey; key?: string }[] = [
  { action: 'open', label: 'appFileOpen', key: 'Ctrl+O' },
  { action: 'save', label: 'appFileSave', key: 'Ctrl+S' },
  { action: 'save-as', label: 'appFileSaveAs', key: 'Ctrl+Shift+S' },
  { action: 'export-pdf', label: 'appFileExportPdf' },
  { action: 'export-png', label: 'appFileExportPng' },
  { action: 'export-csv', label: 'appFileExportCsv' },
  { action: 'export-csv-all', label: 'appFileExportCsvAll' },
  { action: 'print', label: 'appFilePrint', key: 'Ctrl+P' },
]

/** Items after which a separator stands: open | save, save as | exports | print */
const SEPARATED_AFTER = new Set<FileMenuAction>(['open', 'save-as', 'export-csv-all'])

export function FileMenu({ hasWorkbook, canSave, canSaveAs, onAction }: FileMenuProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  useDismissablePopover(open, () => setOpen(false), { inside: () => [wrapRef.current] })
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
  const enabled = (action: FileMenuAction): boolean => {
    if (action === 'open') return true
    if (action === 'save') return hasWorkbook && canSave
    if (action === 'save-as') return hasWorkbook && canSaveAs
    return hasWorkbook
  }
  return (
    <span ref={wrapRef} className="sheet-file-menu">
      <button
        type="button"
        className={`sheet-file-tab${open ? ' open' : ''}`}
        data-action="file-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((was) => !was)}
      >
        {t('appFileMenu')}
      </button>
      {open && (
        <div className="sheet-file-pop" role="menu" aria-label={t('appFileMenu')}>
          {ITEMS.map((item) => (
            <Fragment key={item.action}>
              <button
                type="button"
                role="menuitem"
                data-file={item.action}
                disabled={!enabled(item.action)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false)
                  onAction(item.action)
                }}
              >
                <span>{t(item.label)}</span>
                {item.key && <span className="sheet-file-key">{item.key}</span>}
              </button>
              {SEPARATED_AFTER.has(item.action) && (
                <div className="sheet-file-sep" role="separator" />
              )}
            </Fragment>
          ))}
        </div>
      )}
    </span>
  )
}
