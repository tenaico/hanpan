/** The quick-action buttons above the app (design 6-5): off while the AI or another action runs, and while no document is open. */
import type { ReactElement } from 'react'
import type { GraphicsKind } from '../../shared/kinds'
import { useI18n, type StringKey } from '../i18n/locale'
import { QUICK_ACTIONS, type QuickActionId } from './quick-actions'

const LABELS: Record<QuickActionId, StringKey> = {
  removeBackground: 'quickRemoveBackground',
  autoTone: 'quickAutoTone',
  exportAtSize: 'quickExportAtSize',
  traceImage: 'quickTraceImage',
  centerOnArtboard: 'quickCenter',
  exportPngSvg: 'quickExportPngSvg',
}

export function QuickBar({
  kind,
  disabled,
  hasDocument,
  onRun,
}: {
  kind: GraphicsKind
  disabled: boolean
  /** every action works on an open document: off, with the reason, until there is one */
  hasDocument: boolean
  onRun: (id: QuickActionId) => void
}): ReactElement {
  const { t } = useI18n()
  return (
    <div className="gx-quick" role="toolbar">
      {QUICK_ACTIONS[kind].map((id) => (
        <button
          key={id}
          type="button"
          className="gx-quick-btn"
          data-quick={id}
          disabled={disabled || !hasDocument}
          title={hasDocument ? undefined : t('quickNoDocument')}
          onClick={(e) => {
            // a mouse click leaves no focus behind: the button would look held
            // down after the action. A key press (detail 0) keeps it for the keyboard.
            if (e.detail > 0) e.currentTarget.blur()
            onRun(id)
          }}
        >
          {t(LABELS[id])}
        </button>
      ))}
    </div>
  )
}
