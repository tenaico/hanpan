// @vitest-environment node
import { join, sep } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Saving a design (0.17 item 10): Ctrl+S writes over the file the board came
 * from or was last saved to; only a design that was never saved asks where.
 * "Save as" always asks. The path stays in the main process.
 */

type Handler = (event: { sender: unknown }, ...args: unknown[]) => unknown
const handlers = new Map<string, Handler>()
const webContents = { id: 7, setWindowOpenHandler: vi.fn() }

const showSaveDialog = vi.fn()
const showOpenDialog = vi.fn()
vi.mock('electron', () => ({
  app: { getPath: () => '/home/me/Documents' },
  screen: { getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }) },
  BrowserWindow: class {
    webContents = webContents
    isDestroyed = () => false
    removeMenu() {}
    setTitle() {}
    once() {}
    on() {}
    loadFile() {}
    loadURL() {}
  },
  clipboard: {},
  dialog: {
    showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
    showOpenDialog: (...args: unknown[]) => showOpenDialog(...args),
  },
  shell: {},
  ipcMain: { handle: (channel: string, fn: Handler) => handlers.set(channel, fn) },
  nativeImage: {},
}))

const writeFile = vi.fn(async () => undefined)
const DESIGN = '{"version":1,"width":1080,"height":1080,"pages":[]}'
const readFile = vi.fn(async () => DESIGN)
vi.mock('node:fs/promises', () => ({
  writeFile: (...args: unknown[]) => writeFile(...(args as [])),
  readFile: (...args: unknown[]) => readFile(...(args as [])),
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
  title: () => 'Design',
  gonguKey: () => '',
})
openDesignWindow()

const call = (channel: string, ...args: unknown[]) =>
  handlers.get(channel)!({ sender: webContents }, ...args)

beforeEach(async () => {
  showSaveDialog.mockReset()
  showOpenDialog.mockReset()
  writeFile.mockClear()
  await call(DESIGN_CHANNELS.newDesign)
})

describe('design window save', () => {
  it('asks where only the first time, then writes over the same file', async () => {
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: 'C:\\d\\poster.hpdesign' })
    expect(await call(DESIGN_CHANNELS.saveDesign, 'one', 'poster')).toBe('C:\\d\\poster.hpdesign')
    expect(showSaveDialog).toHaveBeenCalledTimes(1)
    expect(await call(DESIGN_CHANNELS.saveDesign, 'two', 'poster')).toBe('C:\\d\\poster.hpdesign')
    expect(showSaveDialog).toHaveBeenCalledTimes(1)
    expect(writeFile).toHaveBeenLastCalledWith('C:\\d\\poster.hpdesign', 'two')
  })

  it('save as always asks, and the new file is the one later saves go to', async () => {
    showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: 'C:\\d\\a.hpdesign' })
    await call(DESIGN_CHANNELS.saveDesign, 'one', 'a')
    showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: 'C:\\d\\b.hpdesign' })
    expect(await call(DESIGN_CHANNELS.saveDesign, 'two', 'a', 'saveAs')).toBe('C:\\d\\b.hpdesign')
    expect(showSaveDialog).toHaveBeenCalledTimes(2)
    expect(await call(DESIGN_CHANNELS.saveDesign, 'three', 'a')).toBe('C:\\d\\b.hpdesign')
    expect(showSaveDialog).toHaveBeenCalledTimes(2)
  })

  it('a cancelled first save leaves the design unsaved', async () => {
    showSaveDialog.mockResolvedValue({ canceled: true })
    expect(await call(DESIGN_CHANNELS.saveDesign, 'one', 'a')).toBeNull()
    expect(writeFile).not.toHaveBeenCalled()
    await call(DESIGN_CHANNELS.saveDesign, 'one', 'a')
    expect(showSaveDialog).toHaveBeenCalledTimes(2)
  })

  it('an opened design saves back to its own file', async () => {
    // a path in this OS's own form, so the name is its basename on Windows and POSIX alike
    const opened = join(sep === '\\' ? 'C:\\d' : '/d', 'notice.hpdesign')
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [opened] })
    expect(await call(DESIGN_CHANNELS.openDesign)).toEqual({ name: 'notice', text: DESIGN })
    expect(await call(DESIGN_CHANNELS.saveDesign, 'edited', 'notice')).toBe(opened)
    expect(showSaveDialog).not.toHaveBeenCalled()
  })

  it('a file that is not a design never becomes the one Ctrl+S writes over', async () => {
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:\\d\\notes.hpdesign'] })
    readFile.mockResolvedValueOnce('not a design')
    await call(DESIGN_CHANNELS.openDesign)
    showSaveDialog.mockResolvedValue({ canceled: true })
    expect(await call(DESIGN_CHANNELS.saveDesign, 'x', 'a')).toBeNull()
    expect(showSaveDialog).toHaveBeenCalledTimes(1)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('a new design forgets the file: its first save asks again', async () => {
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: 'C:\\d\\a.hpdesign' })
    await call(DESIGN_CHANNELS.saveDesign, 'one', 'a')
    await call(DESIGN_CHANNELS.newDesign)
    await call(DESIGN_CHANNELS.saveDesign, 'two', 'b')
    expect(showSaveDialog).toHaveBeenCalledTimes(2)
  })

  it('answers nothing to another window', async () => {
    const other = handlers.get(DESIGN_CHANNELS.saveDesign)!({ sender: {} }, 'x', 'a')
    expect(await other).toBeNull()
    expect(writeFile).not.toHaveBeenCalled()
  })
})
