import type { QuickLookPayload } from './quick-look-api'

// Home-side Quick Look contract. Kept apart from quick-look-api because the
// shell preload (index.ts) and the preview preload (quick-look.ts) must not
// share a value module: a shared import becomes one chunk both can require, and
// a sandboxed preload cannot require a sibling file (the window goes blank).
// See tests/quick-look-wiring.test.ts.

export interface QuickLookSettings {
  /** enable Spacebar Quick Look in Windows File Explorer / Desktop (default: false) */
  explorerSpacePreview: boolean
  /** keep the app in the system tray when all windows close so Explorer Quick Look stays ready (default: false) */
  keepInTray: boolean
}

// off until the person turns it on: it hooks the Spacebar in Explorer and on the
// desktop, an OS behaviour a new install should not take over (0.17 리뷰 v2 shell #22)
export const DEFAULT_QUICK_LOOK_SETTINGS: QuickLookSettings = {
  explorerSpacePreview: false,
  keepInTray: false,
}

export function normalizeQuickLookSettings(raw: unknown): QuickLookSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_QUICK_LOOK_SETTINGS }
  }
  const obj = raw as Record<string, unknown>
  return {
    explorerSpacePreview:
      typeof obj.explorerSpacePreview === 'boolean'
        ? obj.explorerSpacePreview
        : DEFAULT_QUICK_LOOK_SETTINGS.explorerSpacePreview,
    keepInTray:
      typeof obj.keepInTray === 'boolean' ? obj.keepInTray : DEFAULT_QUICK_LOOK_SETTINGS.keepInTray,
  }
}

export interface QuickLookHomeApi {
  preview(path: string): Promise<QuickLookPayload>
  getSettings(): Promise<QuickLookSettings>
  setSettings(patch: Partial<QuickLookSettings>): Promise<QuickLookSettings>
}

export const QUICK_LOOK_HOME_CHANNELS = {
  preview: 'quick-look:home-inspect',
  getSettings: 'quick-look:get-settings',
  setSettings: 'quick-look:set-settings',
} as const
