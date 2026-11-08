// @vitest-environment node
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 0.17 UI/UX 점검 v2 hwp-design #2·#19·#33: closing the design window with unsaved
 * work asks 저장 / 저장 안 함 / 취소 as the other editors do; the board asks the same
 * before a new design replaces it; a save starts in Documents Hanpan under a titled
 * dialog, and the window title then names the file.
 */

type Handler = (event: { sender: unknown }, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
const send = vi.fn()
const webContents = { id: 7, setWindowOpenHandler: vi.fn(), send }
const listeners = new Map<string, (event: { preventDefault(): void }) => void>()
const close = vi.fn()
const setTitle = vi.fn()

const showSaveDialog = vi.fn()
const showOpenDialog = vi.fn()
const showMessageBox = vi.fn()
vi.mock('electron', () => ({
  app: { getPath: () => '/home/me/Documents' },
  screen: { getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }) },
  BrowserWindow: class {
    webContents = webContents
    isDestroyed = () => false
    removeMenu() {}
    once() {}
    on(name: string, fn: (event: { preventDefault(): void }) => void) {
      listeners.set(name, fn)
    }
    close = close
    setTitle = setTitle
    loadFile() {}
    loadURL() {}
  },
  clipboard: {},
  dialog: {
    showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
    showOpenDialog: (...args: unknown[]) => showOpenDialog(...args),
    showMessageBox: (...args: unknown[]) => showMessageBox(...args),
  },
  shell: {},
  ipcMain: { handle: (channel: string, fn: Handler) => handlers.set(channel, fn) },
  nativeImage: {},
}))

const writeFile = vi.fn(async () => undefined)
vi.mock('node:fs/promises', () => ({
  writeFile: (...args: unknown[]) => writeFile(...(args as [])),
  readFile: vi.fn(async () => '{"version":1,"pages":[]}'),
}))
vi.mock('@genoffice/ai-search', () => ({}))
vi.mock('@genoffice/electron-utils/fetch-image-bytes', () => ({}))

import {
  DESIGN_CHANNELS,
  configureDesignWindow,
  openDesignWindow,
} from '../src/main/hanpan/design-window'

configureDesignWindow({
  parentWindow: () => null,
  lang: () => 'ko',
  theme: () => 'light',
  title: () => '디자인 - 한판',
  gonguKey: () => '',
})
openDesignWindow()

const call = (channel: string, ...args: unknown[]) =>
  handlers.get(channel)!({ sender: webContents }, ...args)
const closeEvent = () => {
  const event = { preventDefault: vi.fn() }
  listeners.get('close')!(event)
  return event
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(async () => {
  showSaveDialog.mockReset()
  showMessageBox.mockReset()
  send.mockClear()
  close.mockClear()
  setTitle.mockClear()
  await call(DESIGN_CHANNELS.newDesign)
  await call(DESIGN_CHANNELS.setDirty, false)
})

describe('closing the design window', () => {
  it('closes at once with nothing unsaved', () => {
    expect(closeEvent().preventDefault).not.toHaveBeenCalled()
    expect(showMessageBox).not.toHaveBeenCalled()
  })

  it('asks 저장 / 저장 안 함 / 취소 with unsaved work; 취소 keeps the window', async () => {
    await call(DESIGN_CHANNELS.setDirty, true)
    showMessageBox.mockResolvedValue({ response: 2 })
    expect(closeEvent().preventDefault).toHaveBeenCalled()
    await flush()
    const options = showMessageBox.mock.calls[0]!.at(-1) as { buttons: string[] }
    expect(options.buttons).toEqual(['저장', '저장 안 함', '취소'])
    expect(close).not.toHaveBeenCalled()
  })

  it('저장 안 함 closes without asking again', async () => {
    await call(DESIGN_CHANNELS.setDirty, true)
    showMessageBox.mockResolvedValue({ response: 1 })
    closeEvent()
    await flush()
    expect(close).toHaveBeenCalledTimes(1)
    expect(closeEvent().preventDefault).not.toHaveBeenCalled()
    // the window is gone; the next tests use a new one
    ;(listeners.get('closed') as unknown as () => void)()
    openDesignWindow()
  })

  it('저장 has the board save first; the window closes once it says so', async () => {
    await call(DESIGN_CHANNELS.setDirty, true)
    showMessageBox.mockResolvedValue({ response: 0 })
    closeEvent()
    await flush()
    expect(send).toHaveBeenCalledWith(DESIGN_CHANNELS.saveThenClose)
    expect(close).not.toHaveBeenCalled()
    await call(DESIGN_CHANNELS.closeAfterSave)
    expect(close).toHaveBeenCalledTimes(1)
    ;(listeners.get('closed') as unknown as () => void)()
    openDesignWindow()
  })

  it('the board asks the same question before replacing unsaved work', async () => {
    showMessageBox.mockResolvedValue({ response: 1 })
    expect(await call(DESIGN_CHANNELS.askUnsaved)).toBe('discard')
    showMessageBox.mockResolvedValue({ response: 0 })
    expect(await call(DESIGN_CHANNELS.askUnsaved)).toBe('save')
    showMessageBox.mockResolvedValue({ response: 2 })
    expect(await call(DESIGN_CHANNELS.askUnsaved)).toBe('cancel')
  })
})

describe('saving a design', () => {
  it('starts in the app save folder under a titled dialog, then names the file in the title', async () => {
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join('/d', '포스터.hpdesign') })
    await call(DESIGN_CHANNELS.saveDesign, '{}', '포스터')
    const options = showSaveDialog.mock.calls[0]!.at(-1) as { title: string; defaultPath: string }
    expect(options.title).toBe('디자인 저장')
    expect(options.defaultPath).toBe(join('/home/me/Documents', 'Hanpan', '포스터.hpdesign'))
    expect(setTitle).toHaveBeenLastCalledWith('포스터 - 디자인 - 한판')
  })

  it('a new design takes the file name out of the title again', async () => {
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: join('/d', 'a.hpdesign') })
    await call(DESIGN_CHANNELS.saveDesign, '{}', 'a')
    await call(DESIGN_CHANNELS.newDesign)
    expect(setTitle).toHaveBeenLastCalledWith('디자인 - 한판')
  })
})
