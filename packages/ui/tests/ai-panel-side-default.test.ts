/** @vitest-environment jsdom */
// Hanpan 0.17 #8: the AI panel docks on the right in every app unless the
// person picked the left side in Settings.
import { beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  delete document.documentElement.dataset.aiPanelSide
})

it('defaults to the right side', async () => {
  const { DEFAULT_AI_PANEL_PREFS, normalizeAiPanelPrefs } = await import('../src/ai-panel-prefs')
  expect(DEFAULT_AI_PANEL_PREFS.side).toBe('right')
  expect(normalizeAiPanelPrefs({ side: 'left' }).side).toBe('left')
})

it('marks the page right-docked when the shell sends the default preferences', async () => {
  const { applyAiPanelPrefs } = await import('../src/ai-panel-prefs-store')
  applyAiPanelPrefs({})
  expect(document.documentElement.dataset.aiPanelSide).toBe('right')
})
