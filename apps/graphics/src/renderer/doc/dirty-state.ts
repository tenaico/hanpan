/**
 * The tab's "unsaved changes" mark. Once the app reports an edit, only a file
 * Hanpan wrote clears it: the app's document turning clean by itself (its own
 * Save, which writes nothing to disk; an undo back to the start) does not, so a
 * close always asks while the edits are not on disk (0.17 review v2, G1/G2).
 */
export interface DirtyState {
  fromApp(dirty: boolean): void
  saveFailed(): void
  /** A save was written; `stillChanged` when the document was edited again meanwhile. */
  saved(stillChanged?: boolean): void
  current(): boolean
}

export function createDirtyState(setDirty: (dirty: boolean) => void): DirtyState {
  let app = false
  let failed = false
  let shown: boolean | null = null
  const publish = (): void => {
    const value = app || failed
    if (value !== shown) {
      shown = value
      setDirty(value)
    }
  }
  return {
    fromApp(dirty) {
      // sticky: the app's clean is not a save; `saved` clears the mark
      app = app || dirty
      publish()
    },
    saveFailed() {
      failed = true
      publish()
    },
    saved(stillChanged = false) {
      failed = false
      app = stillChanged
      publish()
    },
    current: () => app || failed,
  }
}
