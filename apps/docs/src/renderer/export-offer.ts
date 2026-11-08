/**
 * After an export the status bar names the written file and offers "Open" and
 * "Open folder" instead of jumping to a new tab: repeated exports used to pile
 * up tabs and pull the user away from the document they were working on.
 */
export interface ExportedOffer {
  /** the written file, or the folder for a multi-file export */
  path: string
  /** true: `path` is a folder (image export), only "Open folder" applies */
  folder: boolean
  /** the status line this offer belongs to: a newer status hides the buttons */
  message: string
}

export interface ExportReportSink {
  setStatus: (status: string) => void
  offerExported?: (offer: ExportedOffer) => void
}

/** the last path segment: a full path is cut off in the status bar */
export function exportedFileLabel(path: string | null | undefined): string {
  if (!path) return ''
  return path.replace(/[/\\]+$/, '').replace(/^.*[/\\]/, '')
}

export function reportExported(
  sink: ExportReportSink,
  message: string,
  path: string | null | undefined,
  folder = false,
): void {
  sink.setStatus(message)
  if (path) sink.offerExported?.({ path, folder, message })
}
