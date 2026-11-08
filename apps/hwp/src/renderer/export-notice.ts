import type { ExportCommand, PrintResult } from '../shared/ipc'

/** What a notice's button does with the file it names (HwpApi.revealOutput). */
export type NoticeAction = 'open' | 'folder'

/** A notice about a file the tab just wrote: its words, and the buttons that reach the file. */
export interface FileNotice {
  key: 'savedNotice' | 'exportedPdf' | 'exportedDocx' | 'exportedPng'
  params: Record<string, string | number>
  path: string
  actions: NoticeAction[]
}

const fileNameOf = (path: string) => path.split(/[\\/]/).pop() ?? path

/**
 * The notice after an export (0.17 UI/UX review v2, hwp-design #8): the file stays where it was
 * written and the tab stays on the document; the notice offers to open a PDF or Word file in the
 * app, or to show the pictures' folder. Null when there is nothing to say (cancel, failure, print).
 */
export function exportNoticeOf(
  mode: ExportCommand,
  result: PrintResult,
  pictures: number,
): FileNotice | null {
  if (!result.ok || result.canceled || !result.path) return null
  const path = result.path
  if (mode === 'pdf' || mode === 'docx') {
    return {
      key: mode === 'pdf' ? 'exportedPdf' : 'exportedDocx',
      params: { name: fileNameOf(path) },
      path,
      actions: ['open', 'folder'],
    }
  }
  if (mode === 'png' || mode === 'pngPage') {
    return { key: 'exportedPng', params: { count: pictures }, path, actions: ['folder'] }
  }
  return null
}

/** The notice after a save the user asked for (#7): the file's name, and its folder. */
export function savedNoticeOf(path: string): FileNotice {
  return { key: 'savedNotice', params: { name: fileNameOf(path) }, path, actions: ['folder'] }
}
