import { describe, expect, it, vi } from 'vitest'
import type { WebContents } from 'electron'
import type { TabKind, TabSummary } from '../src/shared/tabs-api'
import {
  runTabDocumentAction,
  tabDocumentActionSupported,
  type TabDocumentActionDeps,
} from '../src/main/tab-document-actions'

function fixture(kind: TabKind) {
  const selected = {
    id: 'selected',
    kind: 'docs',
    title: 'Selected',
    active: true,
    closable: true,
  } as TabSummary
  const clicked = {
    id: 'clicked',
    kind,
    title: 'Clicked',
    active: false,
    closable: true,
    filePath: '/docs/clicked.pdf',
  } as TabSummary
  const contents = { send: vi.fn(), isDestroyed: () => false } as unknown as WebContents
  const deps: TabDocumentActionDeps = {
    tabs: {
      list: () => [selected, clicked],
      activateTab: vi.fn(),
      canDetachTab: () => true,
      webContentsForTab: (id) => (id === clicked.id ? contents : undefined),
    },
    savePdf: vi.fn(),
    savePdfAs: vi.fn(),
    printPdf: vi.fn(),
    saveMarkdown: vi.fn(),
    printMarkdown: vi.fn(),
    saveHtml: vi.fn(),
    printHtml: vi.fn(),
    saveHwp: vi.fn(),
    printHwp: vi.fn(),
    saveMindmap: vi.fn(),
    printMindmap: vi.fn(),
    saveEpub: vi.fn(),
    saveGraphics: vi.fn(),
    printGraphics: vi.fn(),
  }
  return { deps, contents }
}

describe('document actions from a background tab context menu', () => {
  it.each([
    ['docs', 'menu:command'],
    ['sheets', 'menu:action'],
    ['slides', 'slides:menu'],
  ] as const)('targets the clicked %s editor rather than the selected tab', (kind, channel) => {
    const { deps, contents } = fixture(kind)
    for (const action of ['save', 'saveAs', 'print'] as const)
      runTabDocumentAction(deps, 'clicked', action)
    expect(deps.tabs.activateTab).toHaveBeenCalledWith('clicked')
    expect(contents.send).toHaveBeenNthCalledWith(1, channel, 'save')
    expect(contents.send).toHaveBeenNthCalledWith(2, channel, 'save-as')
    expect(contents.send).toHaveBeenNthCalledWith(3, channel, 'print')
  })

  it('keeps PDF Save As bound to the clicked document throughout its asynchronous flow', () => {
    const { deps, contents } = fixture('pdf')
    runTabDocumentAction(deps, 'clicked', 'saveAs')
    expect(deps.savePdfAs).toHaveBeenCalledWith({
      id: 'clicked',
      webContents: contents,
      filePath: '/docs/clicked.pdf',
    })
    expect(deps.savePdf).not.toHaveBeenCalled()
    runTabDocumentAction(deps, 'clicked', 'save')
    runTabDocumentAction(deps, 'clicked', 'print')
    expect(deps.savePdf).toHaveBeenCalledWith(contents)
    expect(deps.printPdf).toHaveBeenCalledWith(contents)
  })

  it.each(['markdown', 'html'] as const)(
    'uses the %s save and print workflow for untitled tabs too',
    (kind) => {
      const { deps, contents } = fixture(kind)
      const tabs = deps.tabs.list()
      delete tabs[1]!.filePath
      deps.tabs.list = () => tabs
      for (const action of ['save', 'saveAs', 'print'] as const)
        runTabDocumentAction(deps, 'clicked', action)
      const save = kind === 'markdown' ? deps.saveMarkdown : deps.saveHtml
      const print = kind === 'markdown' ? deps.printMarkdown : deps.printHtml
      expect(save).toHaveBeenNthCalledWith(1, contents, 'save')
      expect(save).toHaveBeenNthCalledWith(2, contents, 'saveAs')
      expect(print).toHaveBeenCalledWith(contents)
    },
  )

  it.each(['home', 'help'] as const)('does not send editor commands to a %s tab', (kind) => {
    const { deps, contents } = fixture(kind)
    runTabDocumentAction(deps, 'clicked', 'print')
    expect(contents.send).not.toHaveBeenCalled()
    expect(deps.tabs.activateTab).not.toHaveBeenCalled()
  })

  it.each(['save', 'saveAs', 'print'] as const)(
    'does not activate or send %s to a Present tab',
    (action) => {
      const { deps, contents } = fixture('html')
      deps.tabs.canDetachTab = () => false
      runTabDocumentAction(deps, 'clicked', action)
      expect(deps.tabs.activateTab).not.toHaveBeenCalled()
      expect(contents.send).not.toHaveBeenCalled()
      expect(deps.saveHtml).not.toHaveBeenCalled()
      expect(deps.printHtml).not.toHaveBeenCalled()
    },
  )

  it('ignores tabs closed while the context menu was open', () => {
    const { deps, contents } = fixture('docs')
    runTabDocumentAction(deps, 'gone', 'saveAs')
    expect(contents.send).not.toHaveBeenCalled()
    expect(deps.tabs.activateTab).not.toHaveBeenCalled()
  })

  it('saves and prints the clicked AI 한글 tab through the hwp editor', () => {
    const { deps, contents } = fixture('hwp')
    for (const action of ['save', 'saveAs', 'print'] as const)
      runTabDocumentAction(deps, 'clicked', action)
    expect(deps.saveHwp).toHaveBeenNthCalledWith(1, contents, 'save')
    expect(deps.saveHwp).toHaveBeenNthCalledWith(2, contents, 'saveAs')
    expect(deps.printHwp).toHaveBeenCalledWith(contents)
  })

  it('saves and prints the clicked mind map', () => {
    const { deps, contents } = fixture('mindmap')
    for (const action of ['save', 'saveAs', 'print'] as const)
      runTabDocumentAction(deps, 'clicked', action)
    expect(deps.saveMindmap).toHaveBeenNthCalledWith(1, contents, 'save')
    expect(deps.saveMindmap).toHaveBeenNthCalledWith(2, contents, 'saveAs')
    expect(deps.printMindmap).toHaveBeenCalledWith(contents)
  })

  it.each(['photo', 'illust'] as const)('saves and prints the clicked %s tab', (kind) => {
    const { deps, contents } = fixture(kind)
    for (const action of ['save', 'saveAs', 'print'] as const)
      runTabDocumentAction(deps, 'clicked', action)
    expect(deps.saveGraphics).toHaveBeenNthCalledWith(1, contents, 'save')
    expect(deps.saveGraphics).toHaveBeenNthCalledWith(2, contents, 'saveAs')
    expect(deps.saveGraphics).toHaveBeenCalledTimes(2)
    expect(deps.printGraphics).toHaveBeenCalledWith(contents)
  })

  it('saves the clicked book and never pretends to print it', () => {
    const { deps, contents } = fixture('epub')
    for (const action of ['save', 'saveAs', 'print'] as const)
      runTabDocumentAction(deps, 'clicked', action)
    expect(deps.saveEpub).toHaveBeenNthCalledWith(1, contents, 'save')
    expect(deps.saveEpub).toHaveBeenNthCalledWith(2, contents, 'saveAs')
    expect(deps.saveEpub).toHaveBeenCalledTimes(2)
    expect(deps.printGraphics).not.toHaveBeenCalled()
    expect(contents.send).not.toHaveBeenCalled()
  })
})

describe('which tab kinds can save and print from the tab menu', () => {
  it('lets every document kind save', () => {
    for (const kind of [
      'docs',
      'sheets',
      'slides',
      'pdf',
      'markdown',
      'html',
      'mindmap',
      'hwp',
      'epub',
      'photo',
      'illust',
    ] as const) {
      expect(tabDocumentActionSupported(kind, 'save')).toBe(true)
      expect(tabDocumentActionSupported(kind, 'saveAs')).toBe(true)
    }
  })

  it('prints only where the editor has a print workflow', () => {
    for (const kind of [
      'docs',
      'sheets',
      'slides',
      'pdf',
      'markdown',
      'html',
      'mindmap',
      'hwp',
      'photo',
      'illust',
    ] as const)
      expect(tabDocumentActionSupported(kind, 'print')).toBe(true)
    for (const kind of ['epub', 'home', 'help'] as const)
      expect(tabDocumentActionSupported(kind, 'print')).toBe(false)
  })
})
