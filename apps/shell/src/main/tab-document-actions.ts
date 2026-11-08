import type { WebContents } from 'electron'
import type { TabKind, TabSummary } from '../shared/tabs-api'

export type TabDocumentAction = 'save' | 'saveAs' | 'print'
export type TabDocumentTarget = { id: string; webContents: WebContents; filePath?: string }

export interface TabDocumentActionDeps {
  tabs: {
    list(): TabSummary[]
    activateTab(id: string): void
    canDetachTab(id: string): boolean
    webContentsForTab(id: string): WebContents | undefined
  }
  savePdf(contents: WebContents): void
  savePdfAs(target: TabDocumentTarget): void
  printPdf(contents: WebContents): void
  saveMarkdown(contents: WebContents, mode: 'save' | 'saveAs'): void
  printMarkdown(contents: WebContents): void
  saveHtml(contents: WebContents, mode: 'save' | 'saveAs'): void
  printHtml(contents: WebContents): void
  saveHwp(contents: WebContents, mode: 'save' | 'saveAs'): void
  printHwp(contents: WebContents): void
  saveMindmap(contents: WebContents, mode: 'save' | 'saveAs'): void
  printMindmap(contents: WebContents): void
  saveEpub(contents: WebContents, mode: 'save' | 'saveAs'): void
  /** AI 포토 and AI 일러스트 */
  saveGraphics(contents: WebContents, mode: 'save' | 'saveAs'): void
  /** AI 포토 and AI 일러스트: the page asks the app for its picture and shows the print preview */
  printGraphics(contents: WebContents): void
}

/** document kinds whose editor has no print workflow: the tab menu switches Print off for them */
const NO_PRINT: ReadonlySet<TabKind> = new Set(['epub'])

/** Whether the tab menu can run this action on a tab of this kind (Home and the manual have none). */
export function tabDocumentActionSupported(kind: TabKind, action: TabDocumentAction): boolean {
  if (kind === 'home' || kind === 'help') return false
  return action !== 'print' || !NO_PRINT.has(kind)
}

/** Resolve the clicked tab, then use its editor's existing save and print workflows. */
export function runTabDocumentAction(
  deps: TabDocumentActionDeps,
  id: string,
  action: TabDocumentAction,
): void {
  const tab = deps.tabs.list().find((item) => item.id === id)
  const contents = deps.tabs.webContentsForTab(id)
  if (
    !tab ||
    tab.kind === 'home' ||
    tab.kind === 'help' ||
    !deps.tabs.canDetachTab(id) ||
    !contents ||
    contents.isDestroyed()
  )
    return
  if (!tabDocumentActionSupported(tab.kind, action)) return
  deps.tabs.activateTab(id)
  const mode = action === 'saveAs' ? 'saveAs' : 'save'
  const command = action === 'saveAs' ? 'save-as' : action
  switch (tab.kind) {
    case 'docs':
      contents.send('menu:command', command)
      break
    case 'sheets':
      contents.send('menu:action', command)
      break
    case 'slides':
      contents.send('slides:menu', command)
      break
    case 'pdf':
      if (action === 'print') deps.printPdf(contents)
      else if (action === 'saveAs')
        deps.savePdfAs({ id, webContents: contents, filePath: tab.filePath })
      else deps.savePdf(contents)
      break
    case 'markdown':
      if (action === 'print') deps.printMarkdown(contents)
      else deps.saveMarkdown(contents, action)
      break
    case 'html':
      if (action === 'print') deps.printHtml(contents)
      else deps.saveHtml(contents, action)
      break
    case 'hwp':
      if (action === 'print') deps.printHwp(contents)
      else deps.saveHwp(contents, mode)
      break
    case 'mindmap':
      if (action === 'print') deps.printMindmap(contents)
      else deps.saveMindmap(contents, mode)
      break
    case 'epub':
      deps.saveEpub(contents, mode)
      break
    case 'photo':
    case 'illust':
      if (action === 'print') deps.printGraphics(contents)
      else deps.saveGraphics(contents, mode)
      break
  }
}
