import { statSync } from 'node:fs'
import { normalizeShortcutTarget } from '../shared/home-layout'

/**
 * A Home shortcut widget's target, opened in main (0.17 위젯). The value comes
 * from the renderer, so it is checked again here: links must be http(s), paths
 * must be absolute and exist as the kind they claim to be. App shortcuts never
 * reach main; Home runs the app card itself.
 */
export interface WidgetTargetDeps {
  /** what is at `path`: a file, a directory or nothing */
  kindOf(path: string): 'file' | 'dir' | null
  openDocument(path: string): void
  openFolder(path: string): void | Promise<unknown>
  openExternal(url: string): void | Promise<unknown>
}

export function pathKind(path: string): 'file' | 'dir' | null {
  try {
    const stat = statSync(path)
    return stat.isDirectory() ? 'dir' : stat.isFile() ? 'file' : null
  } catch {
    return null
  }
}

export async function openWidgetTarget(raw: unknown, deps: WidgetTargetDeps): Promise<boolean> {
  const target = normalizeShortcutTarget(raw)
  if (!target) return false
  switch (target.kind) {
    case 'link':
      await deps.openExternal(target.value)
      return true
    case 'file':
      if (deps.kindOf(target.value) !== 'file') return false
      deps.openDocument(target.value)
      return true
    case 'folder':
      if (deps.kindOf(target.value) !== 'dir') return false
      await deps.openFolder(target.value)
      return true
    default:
      return false
  }
}
