import { useEffect, useRef, useState } from 'react'
import { platformShortcuts } from '@genoffice/i18n'
import { useDismissablePopover } from '@genoffice/ui'
import type { PdfConvertFormat, PdfReflowFormat } from '../shared/ipc'
import type { TFunc } from './i18n/locale'

/**
 * The on-screen File menu (Hanpan 0.17 #6): the tab bar menu's file commands —
 * open, save, save as, the Office / Markdown / EPUB / image exports and print — each
 * calling the flow the tab bar menu or the ribbon already uses.
 */
export function FileMenu(p: {
  t: TFunc
  /** nothing to save, or a save is running */
  saveDisabled: boolean
  /** a conversion is running */
  busy: boolean
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onConvert: (format: PdfConvertFormat) => void
  onConvertDialog: (format: PdfReflowFormat) => void
  onPrint: () => void
  /** every page as PNG files (the ribbon's image export) */
  onExportImages: () => void
}) {
  const { t } = p
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useDismissablePopover(open, () => setOpen(false), { inside: () => [wrapRef.current] })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const run = (action: () => void) => () => {
    setOpen(false)
    action()
  }
  const key = (text: string) => <span className="pdf-file-menu-key">{platformShortcuts(text)}</span>
  return (
    <div className="file-tab-wrap" ref={wrapRef}>
      <button
        type="button"
        className={open ? 'ribbon-tab-file open' : 'ribbon-tab-file'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t('fileMenu')}
      </button>
      {open && (
        <div className="pdf-file-menu" role="menu">
          <button type="button" role="menuitem" onClick={run(p.onOpen)}>
            {t('fileMenuOpen')} {key('⌘O')}
          </button>
          <button type="button" role="menuitem" disabled={p.saveDisabled} onClick={run(p.onSave)}>
            {t('fileMenuSave')} {key('⌘S')}
          </button>
          <button type="button" role="menuitem" onClick={run(p.onSaveAs)}>
            {t('fileMenuSaveAs')} {key('⇧⌘S')}
          </button>
          <div className="pdf-file-menu-sep" role="separator" />
          {(
            [
              ['docx', 'fileMenuExportDocx'],
              ['xlsx', 'fileMenuExportXlsx'],
              ['pptx', 'fileMenuExportPptx'],
            ] as const
          ).map(([format, label]) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              disabled={p.busy}
              onClick={run(() => p.onConvert(format))}
            >
              {t(label)}
            </button>
          ))}
          {(
            [
              ['md', 'fileMenuExportMd'],
              ['epub', 'fileMenuExportEpub'],
            ] as const
          ).map(([format, label]) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              onClick={run(() => p.onConvertDialog(format))}
            >
              {t(label)}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={run(p.onExportImages)}>
            {t('fileMenuExportImages')}
          </button>
          <div className="pdf-file-menu-sep" role="separator" />
          <button type="button" role="menuitem" onClick={run(p.onPrint)}>
            {t('fileMenuPrint')} {key('⌘P')}
          </button>
        </div>
      )}
    </div>
  )
}
