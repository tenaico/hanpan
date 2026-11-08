/**
 * Files each tab exported in this session. The status bar's "Open" and
 * "Open folder" buttons may only reach these: a renderer must not be able to
 * open or reveal arbitrary paths through them.
 */
export class ExportedFiles {
  private readonly byWc = new Map<number, Set<string>>()
  private readonly folders = new Set<string>()

  remember(wcId: number, path: string, folder = false): void {
    if (folder) this.folders.add(path)
    let set = this.byWc.get(wcId)
    if (!set) {
      set = new Set()
      this.byWc.set(wcId, set)
    }
    set.add(path)
  }

  allows(wcId: number, path: unknown): path is string {
    return typeof path === 'string' && this.byWc.get(wcId)?.has(path) === true
  }

  isFolder(path: string): boolean {
    return this.folders.has(path)
  }

  forget(wcId: number): void {
    this.byWc.delete(wcId)
  }
}
