/**
 * The document name the unsaved-changes prompt shows: with several edited tabs
 * open, "this document" alone does not say which one is asking.
 * A saved document is named by its file, an untitled one by its tab title.
 */
export function closePromptDocName(
  filePath: string | null | undefined,
  title: string | null | undefined,
): string | null {
  if (filePath) {
    const base = filePath.replace(/^.*[/\\]/, '')
    if (base) return base
  }
  const trimmed = (title ?? '').trim()
  return trimmed || null
}
