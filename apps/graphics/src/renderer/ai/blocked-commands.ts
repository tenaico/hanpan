/**
 * Commands the AI may not run (design 6-4). Saving, opening and exporting go
 * through Hanpan's own save flow and `export_file`; the undo history is the
 * panel's (one [Undo] per request; the app's history panel and purges too); links, updates, preferences, plug-ins,
 * scripts and the app's windows are outside the document. Prefix match.
 */
export const BLOCKED_PREFIXES: readonly string[] = [
  'file.',
  'app.',
  'help.',
  'prefs.',
  'edit.preferences',
  'edit.undo',
  'edit.redo',
  'edit.clearHistory',
  // the app's own history panel (PhotoCraft): stepping or clearing it breaks the one-step undo
  'history.',
  'edit.purge',
  'image.duplicate',
  // opens a smart object's contents as a second document in the tab
  'layer.smartObjects.editContents',
  'document.open',
  'document.close',
  'document.activate',
  'document.save',
  'document.export',
  'document.serialize',
  'document.recent',
  'document.presets.save',
  'document.presets.delete',
  'docInfo.save',
  'plugin.',
  'plugins.',
  'addon.',
  'script.',
  'scripts.',
  'action.',
  'actions.',
  'automate.',
  'presets.',
  'imageTrace.presets.save',
  'imageTrace.presets.delete',
  'links.',
  'library.',
  'print.',
  'webExport.',
  'shortcuts.',
  'shortcutSet.',
  'window.',
  'ui.',
  'updates.',
]

export function isBlockedCommand(id: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => id === prefix || id.startsWith(prefix))
}

const READ_ONLY_SUFFIXES = [
  '.info',
  '.list',
  '.inspect',
  '.find',
  '.node',
  '.fontList',
  '.formats',
  '.json',
]

/** Commands that only read: they start no undo tracking. */
export function isReadOnlyCommand(id: string): boolean {
  return READ_ONLY_SUFFIXES.some((suffix) => id.endsWith(suffix))
}
