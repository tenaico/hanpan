/**
 * Deleting files from Home that are open in tabs (0.17 리뷰 v2 shell #2).
 *
 * A file open in a tab used to go to the trash with its tab left open and
 * nothing said: the person kept editing a document whose file was gone. Now
 * Home says which files are open before asking, and the delete closes those
 * tabs first. A tab with unsaved changes asks as any close does; when the
 * person cancels that, its file stays where it is.
 */

export interface OpenTabRef {
  id: string
  filePath?: string
}

export interface DeleteOpenFilesDeps {
  /** the tabs as the strip lists them */
  tabs(): OpenTabRef[]
  /** the same path in any spelling (case, separators) maps to one key */
  canonical(path: string): string | undefined
  /** closes a tab, asking about unsaved changes as a normal close does */
  closeTab(id: string): Promise<void>
  trash(path: string): Promise<void>
}

/** the subset of `paths` that is open in a tab, in the order given */
export function pathsOpenInTabs(
  paths: readonly string[],
  deps: Pick<DeleteOpenFilesDeps, 'tabs' | 'canonical'>,
): string[] {
  const open = new Set(
    deps
      .tabs()
      .flatMap((tab) => (tab.filePath ? [deps.canonical(tab.filePath)] : []))
      .filter((key): key is string => !!key),
  )
  return paths.filter((path) => {
    const key = deps.canonical(path)
    return !!key && open.has(key)
  })
}

/**
 * Closes the tabs holding these files, then trashes the files. Returns the
 * paths actually trashed (or already missing): a file whose tab stayed open
 * because the person cancelled its save question is left alone.
 */
export async function trashFilesClosingTabs(
  paths: readonly string[],
  deps: DeleteOpenFilesDeps,
): Promise<string[]> {
  const done: string[] = []
  for (const path of paths) {
    const key = deps.canonical(path)
    const holding = deps
      .tabs()
      .filter((tab) => tab.filePath && deps.canonical(tab.filePath) === key)
    for (const tab of holding) await deps.closeTab(tab.id)
    const stillOpen = deps
      .tabs()
      .some((tab) => tab.filePath && deps.canonical(tab.filePath) === key)
    if (stillOpen) continue
    try {
      await deps.trash(path)
    } catch {
      // already gone or no trash here: it still leaves the lists
    }
    done.push(path)
  }
  return done
}
