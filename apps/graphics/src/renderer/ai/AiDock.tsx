/**
 * Where the AI panel meets the tab: the dock at the right of the app (the rail
 * while it is collapsed) and its remembered open state. The panel stays mounted
 * either way, so a run and its chat survive a collapse.
 */
import { useCallback, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import {
  AiMark,
  aiPanelInitiallyOpen,
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
import { useI18n } from '../i18n/locale'
import { GraphicsAiPanel, type GraphicsAiPanelProps } from './AiPanel'
import { graphicsApiOrNull } from '../bridge'

/** Remembers whether the panel was open, per app, like the other editors (`<app>.showAi`). */
const OPEN_KEY: Record<GraphicsAiPanelProps['kind'], string> = {
  photo: 'photoapp.showAi',
  illust: 'illustapp.showAi',
}

export type GraphicsAiDockProps = Omit<GraphicsAiPanelProps, 'onCollapse'>

/** Below this window width the 360px panel leaves the canvas too little room (1366: about 610px). */
export const AI_DOCK_NARROW_WIDTH = 1280

/**
 * Whether the panel starts open: as remembered, but collapsed in a narrow
 * window. The narrow start is not remembered: a wider window opens it again.
 */
export function aiDockStartsOpen(remembered: boolean, windowWidth: number): boolean {
  return remembered && windowWidth >= AI_DOCK_NARROW_WIDTH
}

export function GraphicsAiDock(props: GraphicsAiDockProps): ReactElement {
  const { t } = useI18n()
  const key = OPEN_KEY[props.kind]
  const [open, setOpenState] = useState(() =>
    aiDockStartsOpen(aiPanelInitiallyOpen(key), window.innerWidth),
  )
  // only the person's own open and collapse are remembered, not the narrow window's start
  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next)
      rememberAiPanelOpen(key, next)
    },
    [key],
  )

  // the shell's AI panel preferences (text size): read once, then followed
  useEffect(() => {
    const api = graphicsApiOrNull()
    void api
      ?.getAiPanelPrefs?.()
      .then(applyAiPanelPrefs)
      .catch(() => {})
    return api?.onAiPanelPrefsChanged?.(applyAiPanelPrefs)
  }, [])

  const { role, requestFocus } = useSplitPaneRole()
  const shown = effectiveAiPanelOpen(open, role)
  return (
    <div className={`ai-dock${shown ? '' : ' collapsed'}`} data-ai-open={shown}>
      {!shown && (
        <button
          type="button"
          className="ai-rail"
          data-tip={t('aiOpenAssistant')}
          data-ai-helper=""
          aria-label={t('aiOpenAssistant')}
          onClick={() => onAiRailClick(role, open, setOpen, requestFocus)}
        >
          <AiMark size={18} />
        </button>
      )}
      <GraphicsAiPanel {...props} onCollapse={() => setOpen(false)} />
    </div>
  )
}
