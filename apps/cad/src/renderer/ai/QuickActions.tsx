/**
 * The three quick actions above the AI pane's input (design 8; the values
 * stand until the CEO confirms them, design 10):
 *
 * - "Make a dimension sheet" opens the stage 4 sheet dialog. No AI call.
 * - "Start a room layout" fills the input with a room request; the person
 *   reads it and sends it.
 * - "Send to Hangul" / "Send to Word" runs the stage 4 send; its name follows
 *   the Korean document switch (decision 0091), like the ribbon's.
 *
 * With nothing placed, the sheet and the send are off and their tip says why,
 * as on the ribbon.
 */
import type { ReactElement } from 'react'
import { useI18n, type StringKey } from '../i18n/locale'

export interface QuickActionsProps {
  /** why there is no dimension sheet to show or send; null when there is */
  sheetBlocked: StringKey | null
  /** nothing can be edited now (loading, or a guide instead of a drawing) */
  disabled: boolean
  /** "Send to Hangul" or "Send to Word" */
  sendLabel: StringKey
  onSheet(): void
  onRoom(): void
  onSend(): void
}

export function QuickActions(p: QuickActionsProps): ReactElement {
  const { t } = useI18n()
  const blockedTip = p.sheetBlocked ? t(p.sheetBlocked) : undefined
  const sheetOff = p.disabled || !!p.sheetBlocked
  return (
    <div className="cad-ai-quick" role="group" aria-label={t('aiQuickActions')}>
      <button
        type="button"
        className="cad-ai-quick-btn"
        data-ai-quick="sheet"
        data-tip={blockedTip ?? t('aiQuickSheet')}
        disabled={sheetOff}
        onClick={p.onSheet}
      >
        {t('aiQuickSheet')}
      </button>
      <button
        type="button"
        className="cad-ai-quick-btn"
        data-ai-quick="room"
        data-tip={t('aiQuickRoomPrompt')}
        disabled={p.disabled}
        onClick={p.onRoom}
      >
        {t('aiQuickRoom')}
      </button>
      <button
        type="button"
        className="cad-ai-quick-btn"
        data-ai-quick="send"
        data-tip={blockedTip ?? t(p.sendLabel)}
        disabled={sheetOff}
        onClick={p.onSend}
      >
        {t(p.sendLabel)}
      </button>
    </div>
  )
}
