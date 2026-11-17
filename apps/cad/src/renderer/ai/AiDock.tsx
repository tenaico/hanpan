/**
 * Where the AI pane meets the editor: the dock under the property panel in
 * the right column (the approved mock-up), its bar while it is folded, and
 * whether it is open. The ribbon's AI button and the bar both toggle it.
 *
 * The pane stays mounted while folded, so a run and its chat survive. In a
 * split (decision 0036) a secondary pane keeps its dock folded, and a click
 * on the bar asks the shell to focus this pane first.
 */
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import {
  AiMark,
  aiPanelInitiallyOpen,
  aiSubscriptionText,
  applyAiPanelPrefs,
  effectiveAiPanelOpen,
  onAiRailClick,
  rememberAiPanelOpen,
  useSplitPaneRole,
} from '@genoffice/ui'
import '@genoffice/ui/ai-model-picker.css'
import '@genoffice/ui/ai-queue-strip.css'
import '@genoffice/ui/ai-usage.css'
import '@genoffice/ui/ai-panel-prefs.css'
import './ai-panel.css'
import type { CadAiApi } from '../../shared/ipc'
import type { CadSession } from '../document/session'
import { useI18n } from '../i18n/locale'
import { AiPanel, type AiPanelProps } from './AiPanel'

/** Remembers whether the pane was open, like the other editors (`<app>.showAi`). */
const OPEN_KEY = 'cadapp.showAi'

export interface CadAi {
  open: boolean
  setOpen(open: boolean): void
}

/** Whether the pane is open, and the shell's AI panel preferences (text size) followed. */
export function useCadAi(): CadAi {
  const [open, setOpen] = useState(() => aiPanelInitiallyOpen(OPEN_KEY))
  useEffect(() => rememberAiPanelOpen(OPEN_KEY, open), [open])
  useEffect(() => {
    const api = window.cadApi as Partial<CadAiApi> | undefined
    void api
      ?.getAiPanelPrefs?.()
      .then(applyAiPanelPrefs)
      .catch(() => {})
    return api?.onAiPanelPrefsChanged?.(applyAiPanelPrefs)
  }, [])
  return { open, setOpen }
}

export interface CadAiDockProps {
  ai: CadAi
  /** the drawing the AI may change; null while none may be edited */
  session: CadSession | null
  /** the drawing's file; null for one never saved */
  filePath: string | null
  quick: AiPanelProps['quick']
}

export function CadAiDock({ ai, session, filePath, quick }: CadAiDockProps): ReactElement {
  const { lang, t } = useI18n()
  const { role, requestFocus } = useSplitPaneRole()
  const open = effectiveAiPanelOpen(ai.open, role)
  return (
    <div className={`ai-dock${open ? '' : ' collapsed'}`} data-ai-open={open}>
      {!open && (
        <button
          type="button"
          className="ai-rail"
          data-tip={t('aiOpenAssistant')}
          aria-label={t('aiOpenAssistant')}
          onClick={() => onAiRailClick(role, ai.open, ai.setOpen, requestFocus)}
        >
          <AiMark size={16} />
          <span>{aiSubscriptionText(lang, 'aiAssistant')}</span>
        </button>
      )}
      <AiPanel
        session={session}
        filePath={filePath}
        onCollapse={() => ai.setOpen(false)}
        quick={quick}
      />
    </div>
  )
}
