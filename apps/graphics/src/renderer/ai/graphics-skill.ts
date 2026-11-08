/**
 * The AI skill of a graphics tab: one skill for both apps, with each app's own
 * base prompt (design 6-4: `createGraphicsSkill(app, api)`).
 */
import type { AgentSkill } from '@genoffice/agent-core'
import type { GraphicsAdapter } from '../adapters'
import type { GraphicsKind } from '../../shared/kinds'
import type { ExportRequest, ExportResult } from '../../shared/ipc'
import basePhoto from './prompts/base-photo.md?raw'
import baseIllust from './prompts/base-illust.md?raw'
import { executeGraphicsTool, graphicsTools } from './tools'
import type { UndoTracker } from './undo-tracker'

export interface GraphicsSkillDeps {
  kind: GraphicsKind
  adapter: GraphicsAdapter
  tracker: UndoTracker
  /** the document summary taken before the run */
  context(): string
  exportFile(request: ExportRequest): Promise<ExportResult>
}

export interface GraphicsSkill extends AgentSkill {
  /**
   * Resolves once no tool is running. A Stop ends the run at once, while a
   * command already sent to the app finishes in the background: the run's
   * undo count and the input lock wait for this.
   */
  settled(): Promise<void>
}

export function createGraphicsSkill(deps: GraphicsSkillDeps): GraphicsSkill {
  const running = new Set<Promise<unknown>>()
  return {
    id: 'graphics',
    systemPrompt: deps.kind === 'photo' ? basePhoto : baseIllust,
    tools: graphicsTools(deps.kind),
    buildContext: () => deps.context(),
    executeTool: (call, signal) => {
      const run = executeGraphicsTool(call, { ...deps, signal })
      running.add(run)
      void run.finally(() => running.delete(run)).catch(() => {})
      return run
    },
    async settled() {
      while (running.size > 0) await Promise.allSettled([...running])
    },
  }
}
