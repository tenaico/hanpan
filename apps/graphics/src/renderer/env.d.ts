/// <reference types="vite/client" />

import type { SplitPaneBridge } from '@genoffice/ui'
import type { GraphicsApi } from '../shared/ipc'

declare global {
  interface Window {
    /** the preload's one-time hand-over of the API (renderer/bridge.ts); there is no `graphicsApi` */
    graphicsBridge?: { take(): GraphicsApi | null }
    /** the shell's split panes; read through @genoffice/ui's split-pane-role helpers */
    aiOfficeSplit?: SplitPaneBridge
  }
}

export {}
