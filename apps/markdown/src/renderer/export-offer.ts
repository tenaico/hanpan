/** the last path segment: a full path is cut off in the status bar */
export function exportedFileLabel(path: string | null | undefined): string {
  if (!path) return ''
  return path.replace(/[/\\]+$/, '').replace(/^.*[/\\]/, '')
}
