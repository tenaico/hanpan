import { useI18n } from '../i18n/locale'
import { IconSave, IconSaveAs } from './icons'

/**
 * The quick-access row's Save and Save As, the same pair the Markdown and web
 * editors show: Save is off until something changed, so Save As is how a copy
 * of an unchanged document is made without opening the File menu.
 */
export function QuickSaveButtons({
  hasDoc,
  dirty,
  onSave,
  onSaveAs,
}: {
  hasDoc: boolean
  dirty: boolean
  onSave: () => void
  onSaveAs: () => void
}) {
  const { t } = useI18n()
  return (
    <>
      <button
        className="qa-btn"
        data-tip={t('appSaveShortcutTip')}
        aria-label={t('appSaveShortcutTip')}
        disabled={!hasDoc || !dirty}
        onClick={onSave}
      >
        <IconSave size={16} />
      </button>
      <button
        className="qa-btn"
        data-tip={t('ribbonSaveAs')}
        aria-label={t('ribbonSaveAs')}
        disabled={!hasDoc}
        onClick={onSaveAs}
      >
        <IconSaveAs size={16} />
      </button>
    </>
  )
}
