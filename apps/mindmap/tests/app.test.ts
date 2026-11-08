/**
 * The whole editor screen against a fake preload API: what it shows for each
 * way a file can open, what it asks before deleting, and what it hands the
 * main process to save.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Lang } from '@genoffice/i18n'
import {
  DEFAULT_THEME_ID,
  openXmind,
  recogniseSheetTheme,
  type XmindSheet,
  type XmindTopic,
} from '@genoffice/xmind-engine'
import App from '../src/renderer/App'
import { MapController } from '../src/renderer/map/controller'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import type {
  MindmapApi,
  MindmapMenuCommand,
  OpenFileResult,
  SaveMindmapRequest,
  SaveMode,
} from '../src/shared/ipc'
import { documentOf, IDS, plainSheet, RICH_PRESERVED, richSheet } from './helpers/fixtures'
import { mapLoaded, until } from './helpers/wait'

interface Fake {
  api: MindmapApi
  saves: SaveMindmapRequest[]
  dirty: boolean[]
  acks: boolean[]
  outlines: unknown[]
  emit: {
    saveRequest(mode: SaveMode): void
    menu(command: MindmapMenuCommand): void
    outlineRequest(): void
  }
}

function fakeApi(pending: string | null, file: OpenFileResult | null): Fake {
  const handlers: Record<string, ((...args: never[]) => void) | undefined> = {}
  const on =
    (name: string) =>
    (handler: (...args: never[]) => void): (() => void) => {
      handlers[name] = handler
      return () => {
        handlers[name] = undefined
      }
    }
  const fake: Fake = {
    saves: [],
    dirty: [],
    acks: [],
    outlines: [],
    emit: {
      saveRequest: (mode) => (handlers.save as ((mode: SaveMode) => void) | undefined)?.(mode),
      menu: (command) =>
        (handlers.menu as ((command: MindmapMenuCommand) => void) | undefined)?.(command),
      outlineRequest: () => (handlers.outline as (() => void) | undefined)?.(),
    },
    api: {
      consumePending: async () => pending,
      openFile: async () => file ?? { status: 'unreadable' },
      save: async (request: SaveMindmapRequest) => {
        fake.saves.push(request)
        return { ok: true, path: pending ?? 'C:/maps/new.xmind' }
      },
      setDirty: (dirty: boolean) => void fake.dirty.push(dirty),
      onSaveRequest: on('save'),
      sendSaveRequestAck: (ok: boolean) => void fake.acks.push(ok),
      onCloseSaveRequest: on('close'),
      sendCloseSaveResult: () => {},
      onFileRenamed: on('renamed'),
      openLink: async () => true,
      onMenuCommand: on('menu'),
      getLanguage: async () => 'en' as Lang,
      onLanguageChanged: on('language'),
      getTheme: async () => 'system' as const,
      onThemeChanged: on('theme'),
      getAutoSaveDefault: async () => ({ on: false, updatedAt: 0 }),
      onAutoSaveDefaultChanged: on('autosave'),
      onChromePressed: on('chrome'),
      onOutlineRequest: on('outline'),
      sendOutlineResult: (reply: unknown) => void fake.outlines.push(reply),
      onBytesRequest: on('bytes'),
      sendBytesResult: () => {},
      onExportRequest: on('export'),
      onPrintRequest: on('print'),
    } as unknown as MindmapApi,
  }
  return fake
}

let container: HTMLElement
let unmount: () => void = () => {}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
})
afterEach(() => {
  unmount()
  unmount = () => {}
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

async function settle(): Promise<void> {
  for (let turn = 0; turn < 6; turn++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

/** the main process has been handed `count` saves */
const savesReach = (fake: Fake, count = 1) =>
  until(() => fake.saves.length >= count, `save ${count}`)

async function mountApp(fake: Fake): Promise<void> {
  ;(window as unknown as { mindmapApi: MindmapApi }).mindmapApi = fake.api
  container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(LocaleProvider, { initial: 'en', children: createElement(App) }))
  })
  unmount = () => act(() => root.unmount())
  await until(() => mapLoaded(container), 'the file to open')
  await settle()
  await untilOpened()
}

/**
 * Opening reads, unzips and draws in several steps; on a loaded runner they
 * take more turns than settle() waits. Wait for the drawn map or the notice
 * that the file did not open (5 s at most; the test's own checks report it).
 */
async function untilOpened(): Promise<void> {
  const deadline = Date.now() + 5000
  while (!container.querySelector('[data-nodeid], [data-open-failure]') && Date.now() < deadline) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
  await settle()
}

async function openWith(...sheets: XmindSheet[]) {
  const bytes = await (await documentOf(...sheets)).save()
  const fake = fakeApi('C:/maps/test.xmind', { status: 'ok', bytes })
  await mountApp(fake)
  return { fake, bytes }
}

const click = async (selector: string): Promise<void> => {
  const element = container.ownerDocument.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`nothing matches ${selector}`)
  await act(async () => {
    element.click()
  })
  await settle()
}

const topicEl = (id: string): HTMLElement =>
  container.querySelector<HTMLElement>(`[data-nodeid="me${id}"]`)!

async function pressOnMap(key: string): Promise<void> {
  const map = container.querySelector<HTMLElement>('.map-container')!
  await act(async () => {
    map.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
  await settle()
}

async function selectOnMap(id: string): Promise<void> {
  await act(async () => {
    topicEl(id).dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
    )
  })
  await settle()
}

/** Starts typing a new title for a topic and leaves it in the edit box. */
async function typeTitle(id: string, title: string): Promise<void> {
  await selectOnMap(id)
  await pressOnMap('F2')
  container.querySelector<HTMLElement>('#input-box')!.textContent = title
}

describe('a file that does not open', () => {
  it.each([
    ['legacy-format', 'This file is in an older format and cannot be opened'],
    ['encrypted', 'This file is password-protected and cannot be opened'],
    ['unreadable', 'This file cannot be read'],
    ['rejected', 'This file cannot be opened because of its size or structure'],
  ] as const)('%s shows its message and offers nothing to save with', async (status, message) => {
    const fake = fakeApi('C:/maps/x.xmind', { status })
    await mountApp(fake)
    expect(container.textContent).toBe(message)
    expect(container.querySelector('[data-action="save"]')).toBeNull()
    expect(container.querySelector('.map-container')).toBeNull()

    // the menu's Save is turned down without a save ever being asked of the main process
    fake.emit.saveRequest('save')
    await settle()
    expect(fake.acks).toEqual([false])
    expect(fake.saves).toEqual([])
    // and Ctrl+S does nothing
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
    await settle()
    expect(fake.saves).toEqual([])
    // a question for the outline is answered with a reason, not with a map
    fake.emit.outlineRequest()
    expect(fake.outlines).toEqual([{ error: expect.any(String) }])
  })

  it('bytes the main process let through but the engine here refuses are shown the same way', async () => {
    const fake = fakeApi('C:/maps/x.xmind', { status: 'ok', bytes: new Uint8Array([1, 2, 3]) })
    await mountApp(fake)
    expect(container.textContent).toBe('This file cannot be read')
    expect(fake.saves).toEqual([])
  })
})

describe('a file that opens', () => {
  it('tells once what the editor does not show, and that the map has the default look', async () => {
    await openWith(richSheet())
    const notices = [...container.querySelectorAll('.mm-notice-text')].map(
      (node) => node.textContent,
    )
    expect(notices).toEqual([
      `This file has ${RICH_PRESERVED} elements that are not shown here. Saving does not delete them. Only those attached to a topic you delete yourself are deleted with it.`,
      "This map is shown here with the default look. The file's theme is not changed.",
    ])
    await click('[data-notice="preserved"] [data-action="notice-close"]')
    expect(container.querySelectorAll('.mm-notice')).toHaveLength(1)
  })

  it('a file with nothing hidden and no foreign theme has no notice', async () => {
    await openWith(plainSheet())
    expect(container.querySelector('.mm-notice')).toBeNull()
  })

  it('a sheet name from the file is text', async () => {
    const hostile = '<img src=x onerror="window.pwned=1"><u>name</u>'
    await openWith(plainSheet(hostile))
    expect(container.querySelector('.mm-sheet-name')!.textContent).toBe(hostile)
    expect(container.querySelectorAll('.mm-foot img, .mm-foot u')).toHaveLength(0)
  })

  it('a note from the file is shown as text in its side panel', async () => {
    const hostile = '<img src=x onerror="window.pwned=1"> note'
    const sheet = plainSheet()
    const first = sheet.rootTopic.children!.attached![0]!
    first.notes = { plain: { content: hostile } }
    await openWith(sheet)
    await act(async () => {
      topicEl(first.id).querySelector<HTMLElement>('.mm-chip-note')!.click()
    })
    await settle()
    const panel = container.querySelector<HTMLElement>('[data-note-panel]')!
    const field = panel.querySelector<HTMLTextAreaElement>('textarea')!
    expect(field.value).toBe(hostile)
    expect(panel.querySelectorAll('img')).toHaveLength(0)
    expect(document.querySelector('.mm-modal')).toBeNull()
  })

  it('a note still being typed is saved with the map', async () => {
    const { fake } = await openWith(plainSheet())
    const firstId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
    await selectOnMap(firstId)
    await click('[data-action="note"]')
    const field = container.querySelector<HTMLTextAreaElement>('[data-note-panel] textarea')!
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    await act(async () => {
      field.focus()
      setter.call(field, 'A note\nwith two lines')
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })
    // no blur: the save itself has to take the draft into the map
    await click('[data-action="save"]')
    await savesReach(fake)
    const saved = await openXmind(fake.saves[0]!.bytes)
    if (saved.status !== 'ok') throw new Error('did not open')
    expect(saved.document.sheets[0]!.rootTopic.children!.attached![0]!.notes?.plain?.content).toBe(
      'A note\nwith two lines',
    )
  })

  it('moving the selection leaves the note typed for the topic before it', async () => {
    const { fake } = await openWith(plainSheet())
    const firstId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
    const secondId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'
    await selectOnMap(firstId)
    await click('[data-action="note"]')
    const field = container.querySelector<HTMLTextAreaElement>('[data-note-panel] textarea')!
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(field, 'kept for One')
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })
    // the click selects the other topic; the draft has to reach the map first
    await selectOnMap(secondId)
    expect(container.querySelector<HTMLTextAreaElement>('[data-note-panel] textarea')!.value).toBe(
      '',
    )

    await click('[data-action="save"]')
    await savesReach(fake)
    const saved = await openXmind(fake.saves[0]!.bytes)
    if (saved.status !== 'ok') throw new Error('did not open')
    expect(saved.document.sheets[0]!.rootTopic.children!.attached![0]!.notes?.plain?.content).toBe(
      'kept for One',
    )
  })

  it('closing the side panel keeps the note that was being typed', async () => {
    const { fake } = await openWith(plainSheet())
    const firstId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
    await selectOnMap(firstId)
    await click('[data-action="note"]')
    const field = container.querySelector<HTMLTextAreaElement>('[data-note-panel] textarea')!
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(field, 'kept after closing')
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click('[data-action="note-close"]')
    expect(container.querySelector('[data-note-panel]')).toBeNull()

    await click('[data-action="save"]')
    await savesReach(fake)
    const saved = await openXmind(fake.saves[0]!.bytes)
    if (saved.status !== 'ok') throw new Error('did not open')
    expect(saved.document.sheets[0]!.rootTopic.children!.attached![0]!.notes?.plain?.content).toBe(
      'kept after closing',
    )
  })

  it('opening changes nothing: the unsaved mark stays off and a save hands over the original bytes', async () => {
    const { fake, bytes } = await openWith(richSheet(), plainSheet())
    expect(fake.dirty.at(-1)).toBe(false)
    await click('[data-action="save"]')
    await savesReach(fake)
    expect(fake.saves).toHaveLength(1)
    expect(fake.saves[0]!.mode).toBe('save')
    expect(fake.saves[0]!.bytes).toEqual(bytes)
  })

  it('marks an automatic save as one and a save by hand as not, for the copy-pair guard', async () => {
    // auto save on: the window losing focus saves without asking, and that save
    // carries the flag the main process defers on while a copy pair holds the map
    localStorage.setItem('mindmapapp.autoSave', '1')
    const { fake } = await openWith(plainSheet())
    await typeTitle('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Changed')
    await act(async () => {
      window.dispatchEvent(new Event('blur'))
    })
    await savesReach(fake)
    expect(fake.saves[0]!.auto).toBe(true)

    await click('[data-action="save"]')
    await savesReach(fake, 2)
    expect(fake.saves[1]!.auto).toBe(false)
  })

  it('keeps an automatic save deferred by a copy pair quiet, not failed', async () => {
    // while a sibling copy holds the disk version the main process defers the
    // automatic save (decision 0036): the map stays dirty and the status line
    // must not claim a failure
    localStorage.setItem('mindmapapp.autoSave', '1')
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { fake } = await openWith(plainSheet())
    fake.api.save = (async (request: SaveMindmapRequest) => {
      fake.saves.push(request)
      return { ok: false, error: 'external-modified' }
    }) as typeof fake.api.save
    await typeTitle('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'Changed again')
    await act(async () => {
      window.dispatchEvent(new Event('blur'))
    })
    await savesReach(fake)
    await settle()
    expect(fake.saves[0]!.auto).toBe(true)
    expect(container.textContent).toContain('Unsaved')
    expect(container.textContent).not.toContain('Save failed')
    expect(logged).not.toHaveBeenCalled()
    logged.mockRestore()
  })
})

describe('the link of a topic', () => {
  async function openLinkDialog(href: string) {
    const sheet = plainSheet()
    const first = sheet.rootTopic.children!.attached![0]!
    first.href = href
    const opened = await openWith(sheet)
    await selectOnMap(first.id)
    await click('[data-action="link"]')
    const field = document.querySelector<HTMLInputElement>('[data-dialog="topic-link"] input')!
    return { ...opened, first, field }
  }
  const hint = (): string => document.querySelector('.mm-modal-hint')!.textContent ?? ''
  const type = async (field: HTMLInputElement, value: string): Promise<void> => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(field, value)
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  it.each(['javascript:alert(1)', 'file:///C:/secret.txt', 'ftp://example.com/x'])(
    'the dialog opens with %s as it is in the file and says it will not be opened',
    async (href) => {
      const { field } = await openLinkDialog(href)
      expect(field.value).toBe(href)
      expect(hint()).toContain('will not open it')
    },
  )

  it('a web address gets the plain hint', async () => {
    const { field } = await openLinkDialog('https://example.com/a')
    expect(field.value).toBe('https://example.com/a')
    expect(hint()).toBe('Enter a web address (http, https) or an email address (mailto)')
  })

  it('a typed address that will not be opened is stored and shown as text', async () => {
    const { fake, first, field } = await openLinkDialog('https://example.com/a')
    await type(field, 'javascript:alert(1)')
    expect(hint()).toContain('will not open it')
    await click('[data-action="field-ok"]')
    expect(document.querySelector('.mm-modal')).toBeNull()
    expect(topicEl(first.id).querySelector('.mm-chip-link')!.textContent).toBe(
      'javascript:alert(1)',
    )
    expect(container.querySelector('.mm-card a')).toBeNull()

    await click('[data-action="save"]')
    await savesReach(fake)
    const saved = await openXmind(fake.saves[0]!.bytes)
    if (saved.status !== 'ok') throw new Error('did not open')
    expect(saved.document.sheets[0]!.rootTopic.children!.attached![0]!.href).toBe(
      'javascript:alert(1)',
    )
  })

  it('an address in the form of a reference into the file is refused, and the dialog says why', async () => {
    const { first, field } = await openLinkDialog('https://example.com/a')
    await type(field, 'xmind:#another-topic')
    await click('[data-action="field-ok"]')
    expect(document.querySelector('.mm-modal-hint.error')!.textContent).toBe(
      'An address of this form points inside the map file and cannot be entered here.',
    )
    expect(topicEl(first.id).querySelector('.mm-chip-link')!.textContent).toBe(
      'https://example.com/a',
    )
  })

  it('a click on a link the main process will not open tells the user so', async () => {
    const { fake, first } = await openLinkDialog('https://example.com/a')
    await click('[data-action="field-cancel"]')
    const asked: string[] = []
    fake.api.openLink = async (url: string) => {
      asked.push(url)
      return false
    }
    await act(async () => {
      topicEl(first.id).querySelector<HTMLElement>('.mm-chip-link')!.click()
    })
    await settle()
    expect(asked).toEqual(['https://example.com/a'])
    expect(container.querySelector('.mm-save-status')!.textContent).toBe(
      'This link cannot be opened',
    )
  })
})

describe('a title still being typed', () => {
  it('is in what a save hands over, and in the outline given on request', async () => {
    const sheet = plainSheet()
    const first = sheet.rootTopic.children!.attached![0]!
    const { fake } = await openWith(sheet)
    await selectOnMap(first.id)
    await pressOnMap('F2')
    container.querySelector<HTMLElement>('#input-box')!.textContent = '저장 직전에 친 글'

    fake.emit.outlineRequest()
    expect((fake.outlines[0] as { text: string }).text).toContain('저장 직전에 친 글')

    await pressOnMap('F2')
    container.querySelector<HTMLElement>('#input-box')!.textContent = '두 번째로 친 글'
    await click('[data-action="save"]')
    await savesReach(fake)
    const saved = await openXmind(fake.saves[0]!.bytes)
    if (saved.status !== 'ok') throw new Error('did not open')
    expect(saved.document.sheets[0]!.rootTopic.children!.attached![0]!.title).toBe(
      '두 번째로 친 글',
    )
  })
})

describe('a new map', () => {
  it("has one sheet and one central topic named in the user's language, and is not dirty", async () => {
    const fake = fakeApi(null, null)
    await mountApp(fake)
    expect([...container.querySelectorAll('.mm-sheet-name')].map((tab) => tab.textContent)).toEqual(
      ['Sheet 1'],
    )
    expect(container.querySelector('me-root me-tpc .text')!.textContent).toBe('Central Topic')
    expect(fake.dirty.at(-1)).toBe(false)

    await click('[data-action="save"]')
    await savesReach(fake)
    const reopened = await openXmind(fake.saves[0]!.bytes)
    expect(reopened.status).toBe('ok')
    // still named by default: the dialog is left to offer "Untitled"
    expect(fake.saves[0]!.defaultName).toBeUndefined()
  })
})

describe('a new map, the first thing seen', () => {
  it('opens with the central topic picked and a line on how to add topics', async () => {
    await mountApp(fakeApi(null, null))
    await until(
      () => container.querySelector('me-root me-tpc.selected') !== null,
      'the central topic to be picked',
    )
    const hint = container.querySelector('[data-hint="new-map"]')!
    expect(hint.textContent).toBe('Tab: add a subtopic · Enter: add a topic at the same level')
  })

  it('a file that opens shows no such line', async () => {
    await openWith(plainSheet())
    expect(container.querySelector('[data-hint="new-map"]')).toBeNull()
  })
})

describe('sheets', () => {
  it('the only sheet cannot be deleted', async () => {
    await openWith(plainSheet())
    const button = container.querySelector<HTMLButtonElement>('[data-action="sheet-delete"]')!
    expect(button.disabled).toBe(true)
    expect(button.dataset.tip).toBe('The last sheet cannot be deleted.')
  })

  it('deleting asks first, says it cannot be undone, and only then deletes', async () => {
    const { fake } = await openWith(plainSheet('Keep'), plainSheet('Drop'))
    await click('.mm-sheet:nth-child(2) .mm-sheet-name')
    await click('[data-action="sheet-delete"]')
    const dialog = document.querySelector('[data-dialog="delete-sheet"]')!
    expect(dialog.textContent).toContain(
      'The sheet "Drop" and everything on it will be deleted. This cannot be undone.',
    )
    await click('[data-action="confirm-cancel"]')
    expect(container.querySelectorAll('.mm-sheet')).toHaveLength(2)
    expect(fake.dirty.at(-1)).toBe(false)

    await click('[data-action="sheet-delete"]')
    await click('[data-action="confirm-ok"]')
    expect([...container.querySelectorAll('.mm-sheet-name')].map((tab) => tab.textContent)).toEqual(
      ['Keep'],
    )
    expect(fake.dirty.at(-1)).toBe(true)
  })

  it('adding a sheet needs no question and shows the new sheet', async () => {
    await openWith(plainSheet('Only'))
    await click('[data-action="sheet-add"]')
    expect(document.querySelector('.mm-modal')).toBeNull()
    expect([...container.querySelectorAll('.mm-sheet-name')].map((tab) => tab.textContent)).toEqual(
      ['Only', 'Sheet 2'],
    )
    expect(container.querySelector('.mm-sheet.on .mm-sheet-name')!.textContent).toBe('Sheet 2')
    expect(
      container.querySelector('.mm-sheet-host:not([hidden]) me-root me-tpc .text')!.textContent,
    ).toBe('Central Topic')
  })
})

describe('the theme panel', () => {
  const drawnTheme = (): string | undefined =>
    container.querySelector<HTMLElement>('.mm-sheet-host:not([hidden]) .map-container')!.dataset
      .mmTheme
  const chosen = (): string[] =>
    [...container.querySelectorAll<HTMLElement>('.mm-theme-option.on')].map(
      (option) => option.dataset.themePick!,
    )

  it('opens from the toolbar with the look of the open sheet chosen, changes nothing, and closes again', async () => {
    const { fake, bytes } = await openWith(plainSheet())
    expect(container.querySelector('.mm-theme-panel')).toBeNull()
    await click('[data-action="theme"]')
    expect(container.querySelector('.mm-theme-panel')!.getAttribute('data-theme-id')).toBe(
      DEFAULT_THEME_ID,
    )
    expect(container.querySelector('[data-action="theme"]')!.getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(chosen()).toEqual(['skeleton:pill', 'band:paper', 'variant:light'])
    expect(container.querySelectorAll('[data-theme-pick^="skeleton:"]')).toHaveLength(4)
    expect(container.querySelectorAll('[data-theme-pick^="band:"]')).toHaveLength(8)
    expect(container.querySelectorAll('[data-theme-pick^="variant:"]')).toHaveLength(3)
    // every choice has a name in the user's language
    const names = [...container.querySelectorAll('.mm-theme-name')].map((name) => name.textContent)
    expect(names).toEqual([
      'Pill',
      'Capsule',
      'Line',
      'Block',
      'Paper',
      'Slate',
      'Moss',
      'Harbor',
      'Clay',
      'Plum',
      'Signal',
      'Poppy',
      'Light',
      'Dark',
      'Tinted',
    ])
    expect(fake.dirty.at(-1)).toBe(false)
    await click('[data-action="save"]')
    await savesReach(fake)
    expect(fake.saves[0]!.bytes).toEqual(bytes)
    await click('[data-action="theme-close"]')
    expect(container.querySelector('.mm-theme-panel')).toBeNull()
  })

  it('Escape closes the theme panel and the icon panel', async () => {
    await openWith(plainSheet())
    const escape = async (): Promise<void> => {
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      })
      await settle()
    }
    await click('[data-action="theme"]')
    expect(container.querySelector('.mm-theme-panel')).not.toBeNull()
    await escape()
    expect(container.querySelector('.mm-theme-panel')).toBeNull()
    await click('[data-action="icons"]')
    expect(container.querySelector('.mm-icon-panel')).not.toBeNull()
    await escape()
    expect(container.querySelector('.mm-icon-panel')).toBeNull()
  })

  it('picking writes the theme to the sheet: the map is drawn with it, is unsaved, and the save carries it', async () => {
    const { fake } = await openWith(plainSheet())
    await click('[data-action="theme"]')
    expect(container.querySelector('[data-theme-note="not-written"]')).not.toBeNull()
    await click('[data-theme-pick="skeleton:block"]')
    expect(drawnTheme()).toBe('block/paper/light')
    expect(chosen()).toEqual(['skeleton:block', 'band:paper', 'variant:light'])
    expect(container.querySelector('[data-theme-note="not-written"]')).toBeNull()
    expect(fake.dirty.at(-1)).toBe(true)
    await click('[data-theme-pick="band:moss"]')
    await click('[data-theme-pick="variant:dark"]')
    expect(drawnTheme()).toBe('block/moss/dark')

    await click('[data-action="save"]')
    await savesReach(fake)
    const saved = await openXmind(fake.saves[0]!.bytes)
    if (saved.status !== 'ok') throw new Error('the saved map does not open')
    expect(recogniseSheetTheme(saved.document.sheets[0]!)).toBe('block/moss/dark')
  })

  it('picking is not undone by Undo', async () => {
    const { fake } = await openWith(plainSheet())
    await click('[data-action="theme"]')
    await click('[data-theme-pick="skeleton:line"]')
    expect(container.querySelector<HTMLButtonElement>('[data-action="undo"]')!.disabled).toBe(true)
    await act(async () => fake.emit.menu('undo'))
    await settle()
    expect(drawnTheme()).toBe('line/paper/light')
  })

  it('a sheet with a theme of another program says so, and picking one for it ends the notice', async () => {
    await openWith(richSheet())
    expect(container.querySelector('[data-notice="theme"]')).not.toBeNull()
    await click('[data-action="theme"]')
    expect(container.querySelector('[data-theme-note="not-written"]')!.textContent).toBe(
      'This sheet is shown with the default look. Picking a theme here writes it to the file.',
    )
    expect(chosen()).toEqual(['skeleton:pill', 'band:paper', 'variant:light'])
    await click('[data-theme-pick="variant:tint"]')
    expect(drawnTheme()).toBe('pill/paper/tint')
    expect(container.querySelector('[data-notice="theme"]')).toBeNull()
    expect(container.querySelector('[data-notice="preserved"]')).not.toBeNull()
  })

  it('each sheet has its own theme, and the panel follows the sheet that is open', async () => {
    const { fake } = await openWith(richSheet(), plainSheet('Second'))
    await click('[data-action="theme"]')
    await click('[data-theme-pick="skeleton:capsule"]')
    await act(async () => {
      container.querySelectorAll<HTMLElement>('.mm-sheet-name')[1]!.click()
    })
    await settle()
    expect(drawnTheme()).toBe(DEFAULT_THEME_ID)
    expect(chosen()).toEqual(['skeleton:pill', 'band:paper', 'variant:light'])
    expect(container.querySelector('[data-theme-note="not-written"]')).not.toBeNull()
    await click('[data-theme-pick="band:signal"]')
    expect(drawnTheme()).toBe('pill/signal/light')

    await click('[data-action="save"]')
    await savesReach(fake)
    const saved = await openXmind(fake.saves[0]!.bytes)
    if (saved.status !== 'ok') throw new Error('the saved map does not open')
    expect(saved.document.sheets.map(recogniseSheetTheme)).toEqual([
      'capsule/paper/light',
      'pill/signal/light',
    ])
  })
})

describe('deleting a topic from the screen', () => {
  it('shows the number of hidden elements and deletes only after "Delete"', async () => {
    await openWith(richSheet())
    await selectOnMap(IDS.a)
    await pressOnMap('Delete')
    const dialog = document.querySelector('[data-dialog="delete-hidden"]')!
    expect(dialog.textContent).toContain(
      '2 elements that are not shown here will be deleted with it.',
    )
    await click('[data-action="confirm-cancel"]')
    expect(container.querySelector(`[data-nodeid="me${IDS.a}"]`)).not.toBeNull()

    await pressOnMap('Delete')
    await click('[data-action="confirm-ok"]')
    expect(container.querySelector(`[data-nodeid="me${IDS.a}"]`)).toBeNull()
  })

  it('asks nothing when nothing hidden goes with the topic', async () => {
    await openWith(richSheet())
    await selectOnMap(IDS.b)
    await pressOnMap('Delete')
    expect(document.querySelector('.mm-modal')).toBeNull()
    expect(container.querySelector(`[data-nodeid="me${IDS.b}"]`)).toBeNull()
  })
})

describe('the menu', () => {
  it("Undo from the menu reaches the map's own history, and the save is the original bytes again", async () => {
    const { fake, bytes } = await openWith(richSheet())
    await selectOnMap(IDS.b)
    await pressOnMap('Delete')
    expect(fake.dirty.at(-1)).toBe(true)

    await act(async () => fake.emit.menu('undo'))
    await settle()
    expect(container.querySelector(`[data-nodeid="me${IDS.b}"]`)).not.toBeNull()
    expect(fake.dirty.at(-1)).toBe(false)

    fake.emit.saveRequest('save')
    await savesReach(fake)
    expect(fake.saves[0]!.bytes).toEqual(bytes)

    await act(async () => fake.emit.menu('redo'))
    await settle()
    expect(container.querySelector(`[data-nodeid="me${IDS.b}"]`)).toBeNull()
  })

  it('answers a question for the outline with the map as it stands', async () => {
    const { fake } = await openWith(plainSheet())
    fake.emit.outlineRequest()
    expect(fake.outlines).toHaveLength(1)
    expect((fake.outlines[0] as { text: string }).text).toContain('Center')
  })
})

describe('presentation mode', () => {
  it('F5 hides the editor chrome and Esc brings it back', async () => {
    await openWith(plainSheet())
    const app = (): Element => container.querySelector('.app')!
    expect(app().classList.contains('mm-presenting')).toBe(false)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5', bubbles: true }))
    })
    await settle()
    expect(app().classList.contains('mm-presenting')).toBe(true)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await settle()
    expect(app().classList.contains('mm-presenting')).toBe(false)
  })

  it('steps through the main branches with the arrow keys, Space and a click, and says how', async () => {
    const step = vi.spyOn(MapController.prototype, 'presentStep')
    await openWith(plainSheet())
    const key = async (name: string): Promise<void> => {
      await act(async () => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
        )
      })
      await settle()
    }
    await key('F5')
    // the fit after the screen went full arrives a moment later
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    expect(container.querySelector('[data-hint="present"]')!.textContent).toBe(
      '→ or Space: next branch · ←: back · Esc: end',
    )
    step.mockClear()
    await key('ArrowRight')
    await key(' ')
    await key('ArrowLeft')
    await act(async () => {
      container.querySelector<HTMLElement>('.mm-card')!.click()
    })
    await settle()
    expect(step.mock.calls.map((call) => call[0])).toEqual([1, 2, 1, 2])
    await key('Escape')
    expect(container.querySelector('[data-hint="present"]')).toBeNull()
    step.mockRestore()
  })

  it('ending the show puts the map back at the zoom it had before', async () => {
    const restore = vi.spyOn(MapController.prototype, 'restoreView')
    await openWith(plainSheet())
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5', bubbles: true }))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    expect(restore).toHaveBeenCalledTimes(1)
    expect(typeof restore.mock.calls[0]![0]).toBe('number')
    restore.mockRestore()
  })

  it('F5 while presenting returns to the editor', async () => {
    await openWith(plainSheet())
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5', bubbles: true }))
    })
    await settle()
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5', bubbles: true }))
    })
    await settle()
    expect(container.querySelector('.app')!.classList.contains('mm-presenting')).toBe(false)
  })
})

// ---- the ribbon tabs, find and replace, folding to a level, the parts shown ----

const ctrlKey = async (key: string): Promise<void> => {
  await act(async () => {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true }),
    )
  })
  await settle()
}

/** Types into a React field the way a person would: the value, then an input event. */
async function typeInto(selector: string, text: string): Promise<void> {
  const input = container.querySelector<HTMLInputElement>(selector)!
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setValue.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await settle()
}

async function pressIn(selector: string, key: string): Promise<void> {
  const input = container.querySelector<HTMLElement>(selector)!
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
  await settle()
}

const pane = (name: string): HTMLElement =>
  container.querySelector<HTMLElement>(`[data-ribbon-pane="${name}"]`)!

describe('the ribbon', () => {
  it('shows one tab at a time, and remembers the one picked', async () => {
    await openWith(plainSheet())
    expect(pane('home').hidden).toBe(false)
    expect(pane('insert').hidden).toBe(true)

    await click('[data-ribbon-tab="insert"]')
    expect(pane('home').hidden).toBe(true)
    expect(pane('insert').hidden).toBe(false)
    expect(
      container.querySelector('[data-ribbon-tab="insert"]')!.getAttribute('aria-selected'),
    ).toBe('true')
    expect(localStorage.getItem('mindmapapp.ribbonTab')).toBe('insert')
  })

  it('Delete on the Home tab removes the selected topic', async () => {
    await openWith(richSheet())
    await selectOnMap(IDS.b)
    await click('[data-action="delete-topic"]')
    expect(container.querySelector(`[data-nodeid="me${IDS.b}"]`)).toBeNull()
  })

  it('folding to one level closes the branches of the first level, and Undo is not needed to open them', async () => {
    const { fake } = await openWith(richSheet())
    expect(container.querySelector(`[data-nodeid="me${IDS.a1}"]`)).not.toBeNull()
    await click('[data-ribbon-tab="view"]')
    await click('[data-action="fold-level"]')
    await click('[data-menu-item="fold-level-1"]')
    expect(container.querySelector(`[data-nodeid="me${IDS.a1}"]`)).toBeNull()

    await click('[data-action="fold-level"]')
    await click('[data-menu-item="fold-level-2"]')
    expect(container.querySelector(`[data-nodeid="me${IDS.a1}"]`)).not.toBeNull()
    // folding is kept in the file like the fold handle, but it is no step of the history
    expect(fake.dirty.at(-1)).toBe(true)
  })

  it('hiding labels takes them off the screen only: the save is still the original bytes', async () => {
    const { fake, bytes } = await openWith(richSheet())
    await click('[data-ribbon-tab="view"]')
    await click('[data-action="show-parts"]')
    await click('[data-menu-item="show-labels"]')
    const map = container.querySelector<HTMLElement>('.map-container')!
    expect(map.dataset.mmHide).toBe('labels')
    expect(localStorage.getItem('mindmapapp.hiddenParts')).toContain('labels')
    expect(
      document.querySelector('[data-menu-item="show-labels"]')!.getAttribute('aria-checked'),
    ).toBe('false')

    fake.emit.saveRequest('save')
    await savesReach(fake)
    expect(fake.saves[0]!.bytes).toEqual(bytes)
  })
})

describe('find and replace', () => {
  it('Ctrl+F finds a topic in a folded branch, and stepping to it unfolds the branch and selects it', async () => {
    await openWith(richSheet())
    expect(container.querySelector(`[data-nodeid="me${IDS.b1}"]`)).toBeNull()
    await ctrlKey('f')
    expect(container.querySelector('[data-hanpan="mm-find"]')).not.toBeNull()

    await typeInto('[data-find="query"]', 'beta one')
    expect(container.querySelector('[data-find="count"]')!.textContent).toBe('0/1')
    expect(container.querySelector('[data-find="folded"]')).not.toBeNull()

    await pressIn('[data-find="query"]', 'Enter')
    expect(container.querySelector('[data-find="count"]')!.textContent).toBe('1/1')
    expect(topicEl(IDS.b1)).not.toBeNull()
    expect(topicEl(IDS.b1).classList.contains('selected')).toBe(true)

    await pressIn('[data-find="query"]', 'Escape')
    expect(container.querySelector('[data-hanpan="mm-find"]')).toBeNull()
  })

  it('Ctrl+F while a title is being typed searches the title as typed', async () => {
    await openWith(plainSheet())
    await typeTitle('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Uno')
    await ctrlKey('f')
    await typeInto('[data-find="query"]', 'uno')
    expect(container.querySelector('[data-find="count"]')!.textContent).toBe('0/1')
  })

  it('Replace all changes the titles of every sheet, one step on each, and says how many', async () => {
    const { fake } = await openWith(richSheet(), plainSheet())
    await ctrlKey('h')
    expect(container.querySelector('[data-find="replace"]')).not.toBeNull()
    await typeInto('[data-find="query"]', 'one')
    await typeInto('[data-find="replace"]', 'uno')
    await click('[data-action="replace-all"]')
    await until(() => !!container.querySelector('[data-find="message"]'), 'the replace-all message')
    expect(container.querySelector('[data-find="message"]')!.textContent).toBe(
      'Replaced 3 on 2 sheet(s)',
    )
    expect(container.querySelector('[data-find="count"]')!.textContent).toBe('No results')

    fake.emit.saveRequest('save')
    await savesReach(fake)
    const saved = await openXmind(fake.saves[0]!.bytes)
    if (saved.status !== 'ok') throw new Error('did not open')
    const titles = (topic: XmindTopic): string[] => [
      topic.title ?? '',
      ...(topic.children?.attached ?? []).flatMap(titles),
    ]
    const all = saved.document.sheets.flatMap((sheet) => titles(sheet.rootTopic))
    expect(all).toContain('Alpha uno')
    expect(all).toContain('Beta uno')
    expect(all).toContain('uno')
    expect(all.some((title) => /one/i.test(title))).toBe(false)
  })
})

describe('the picture of a topic', () => {
  const PNG =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

  it('Insert puts the picked file on the selected topic, and the same button then takes it off', async () => {
    const { fake } = await openWith(plainSheet())
    let picks = 0
    fake.api.pickPicture = async () => {
      picks++
      return { status: 'ok', base64: PNG }
    }
    await selectOnMap('cccccccc-cccc-4ccc-8ccc-ccccccccccc1')
    await click('[data-ribbon-tab="insert"]')
    await click('[data-action="picture"]')
    await until(() => !!container.querySelector('[data-action="picture-remove"]'), 'the picture')
    expect(picks).toBe(1)
    expect(fake.dirty.at(-1)).toBe(true)

    await click('[data-action="picture-remove"]')
    expect(container.querySelector('[data-action="picture"]')).not.toBeNull()
    // taking it off asks the file picker nothing
    expect(picks).toBe(1)
  })

  it('a file over the size limit is refused with a message, and nothing changes', async () => {
    const { fake } = await openWith(plainSheet())
    fake.api.pickPicture = async () => ({ status: 'too-large' })
    await selectOnMap('cccccccc-cccc-4ccc-8ccc-ccccccccccc1')
    await click('[data-ribbon-tab="insert"]')
    await click('[data-action="picture"]')
    expect(container.textContent).toContain('10 MB')
    expect(container.querySelector('[data-action="picture-remove"]')).toBeNull()
    expect(fake.dirty).not.toContain(true)
  })
})

describe('the icon panel', () => {
  const ONE = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
  const TWO = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'

  const sheetWithMarkers = (): XmindSheet => {
    const sheet = plainSheet()
    const one = sheet.rootTopic.children!.attached![0]!
    one.markers = [{ markerId: 'priority-2', kept: 'by the file' }, { markerId: 'Custom' }]
    return sheet
  }

  it('Insert opens it beside the map, alone, and it is remembered', async () => {
    await openWith(plainSheet())
    await click('[data-ribbon-tab="insert"]')
    await click('[data-action="icons"]')
    expect(container.querySelector('.mm-icon-panel')).not.toBeNull()
    expect(localStorage.getItem('mindmapapp.showIcons')).toBe('1')
    // without a selection there is nothing to press
    expect(
      container.querySelector<HTMLButtonElement>('[data-icon-pick="flag-red"]')!.disabled,
    ).toBe(true)
    await click('[data-ribbon-tab="format"]')
    await click('[data-action="theme"]')
    expect(container.querySelector('.mm-icon-panel')).toBeNull()
    expect(localStorage.getItem('mindmapapp.showIcons')).toBe('0')
  })

  it('pressing an icon puts it on the topic, and the save keeps what the file wrote beside it', async () => {
    const { fake } = await openWith(sheetWithMarkers())
    await click('[data-ribbon-tab="insert"]')
    await click('[data-action="icons"]')
    await selectOnMap(ONE)
    await click('[data-icon-pick="priority-5"]')
    await click('[data-icon-pick="flag-green"]')
    expect(fake.dirty.at(-1)).toBe(true)
    expect(
      container.querySelector('[data-icon-pick="flag-green"]')!.getAttribute('aria-pressed'),
    ).toBe('true')
    expect(topicEl(ONE).querySelectorAll('.mm-marker')).toHaveLength(3)

    await click('[data-action="save"]')
    await savesReach(fake)
    const saved = await openXmind(fake.saves[0]!.bytes)
    if (saved.status !== 'ok') throw new Error('did not open')
    expect(saved.document.sheets[0]!.rootTopic.children!.attached![0]!.markers).toEqual([
      { markerId: 'priority-5' },
      { markerId: 'Custom' },
      { markerId: 'flag-green' },
    ])
  })

  it('removing a family takes it off every selected topic', async () => {
    await openWith(sheetWithMarkers())
    await click('[data-ribbon-tab="insert"]')
    await click('[data-action="icons"]')
    await selectOnMap(TWO)
    await click('[data-icon-pick="star-blue"]')
    expect(topicEl(TWO).querySelectorAll('.mm-marker')).toHaveLength(1)
    await click('[data-icon-remove="star"]')
    expect(topicEl(TWO).querySelector('.mm-marker')).toBeNull()
    expect(container.querySelector<HTMLButtonElement>('[data-icon-remove="all"]')!.disabled).toBe(
      true,
    )
  })

  it('a marker on the map opens a menu of its family, which swaps or removes it', async () => {
    await openWith(sheetWithMarkers())
    const glyph = () => topicEl(ONE).querySelector<SVGElement>('.mm-marker[data-marker-index="0"]')!
    await act(async () => {
      glyph().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    await settle()
    expect(container.ownerDocument.querySelectorAll('[data-marker-pick]')).toHaveLength(9)
    await click('[data-marker-pick="priority-7"]')
    expect(container.ownerDocument.querySelector('.mm-marker-menu')).toBeNull()
    expect(glyph().getAttribute('aria-label')).toContain('7')

    await act(async () => {
      glyph().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    await settle()
    await click('[data-marker-remove]')
    // only the marker of no family the app offers is left
    expect(topicEl(ONE).querySelectorAll('.mm-marker')).toHaveLength(1)
    expect(glyph().dataset.markerFamily).toBe('other')
  })
})
