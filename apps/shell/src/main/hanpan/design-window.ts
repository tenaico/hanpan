/**
 * Hanpan: the design board window (posters, card news, notices, thumbnails).
 * The page draws and edits; this side does what a page may not: save and open
 * files through the system dialogs, put a picture on the clipboard (to paste
 * into a HWP, Word or PowerPoint tab), and bind page pictures into a PDF.
 * Every handler answers only the design window itself.
 */
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  nativeImage,
  screen,
  shell,
  type IpcMainInvokeEvent,
  type Rectangle,
} from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import {
  fetchGonguPicture,
  searchGonguPictures,
  type GonguPictureAnswer,
  type GonguSearchAnswer,
} from './gongu-pictures'

import {
  printHtmlDocument,
  withPrintOptions,
  type PrintDialogOutcome,
} from '@genoffice/electron-utils/print-window'
import {
  buildImagePrintHtml,
  isPrintSheet,
  pngSize,
  printPageOptions,
  type PrintSheet,
} from '@genoffice/ui/image-print'

export type { GonguHit, GonguPictureAnswer, GonguSearchAnswer } from './gongu-pictures'

export const DESIGN_CHANNELS = {
  getInit: 'hanpan-design:get-init',
  savePng: 'hanpan-design:save-png',
  savePdf: 'hanpan-design:save-pdf',
  copyImage: 'hanpan-design:copy-image',
  saveDesign: 'hanpan-design:save',
  openDesign: 'hanpan-design:open',
  /** the board started a new design: the next save asks where again */
  newDesign: 'hanpan-design:new',
  pickImage: 'hanpan-design:pick-image',
  /** pages as the PNG export draws them, printed through the system dialog */
  print: 'hanpan-design:print',
  gonguSearch: 'hanpan-design:gongu-search',
  gonguPicture: 'hanpan-design:gongu-picture',
  open: 'hanpan:open-design',
  /** the board has (or no longer has) unsaved work: closing asks first */
  setDirty: 'hanpan-design:set-dirty',
  /** 저장 / 저장 안 함 / 취소 before the board replaces unsaved work */
  askUnsaved: 'hanpan-design:ask-unsaved',
  /** to the board: the person chose 저장 while closing; save, then closeAfterSave */
  saveThenClose: 'hanpan-design:save-then-close',
  closeAfterSave: 'hanpan-design:close-after-save',
  /** Settings → Integrations (the Gongu key), from the board's picture search */
  openGonguSettings: 'hanpan-design:open-gongu-settings',
} as const

export interface DesignWindowDeps {
  parentWindow(): BrowserWindow | null
  lang(): string
  theme(): string
  title(lang: string): string
  /** the Gongu key from Settings → Integrations (opened from its seal), '' when none */
  gonguKey(): string
  /** where a first save starts; left out: Documents\Hanpan */
  saveDir?: () => string
  /** opens Settings at a section in the shell window; left out: the Home settings request */
  openSettings?: (section: 'integrations') => void
  /** prints a finished page through the system dialog; left out: a hidden window here */
  printHtml?: (html: string, sheet: PrintSheet) => Promise<PrintDialogOutcome>
}

let deps: DesignWindowDeps | null = null
let win: BrowserWindow | null = null
/** what a window opened from a map starts with: the map as indented text, taken once */
let pendingOutline: string | null = null
/** the file the open design came from or was last saved to; Ctrl+S writes over it */
let designPath: string | null = null
/** the board has changes not yet saved (it says so on every change) */
let dirty = false
/** the person already answered the close question: the next close goes through */
let closing = false
const MAX_BYTES = 64 * 1024 * 1024

function fromWindow(event: IpcMainInvokeEvent): boolean {
  return !!win && !win.isDestroyed() && event.sender === win.webContents
}

function bytesOf(value: unknown): Uint8Array | null {
  return value instanceof Uint8Array && value.length > 0 && value.length <= MAX_BYTES ? value : null
}

function safeName(name: unknown, fallback: string): string {
  const text = typeof name === 'string' ? name : ''
  return (
    text
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
      .trim()
      .slice(0, 80) || fallback
  )
}

/** The board's own check (parseDesign) in short: a design file it will open. */
function looksLikeDesign(text: string): boolean {
  try {
    const value = JSON.parse(text) as { version?: unknown; pages?: unknown } | null
    return value?.version === 1 && Array.isArray(value.pages)
  } catch {
    return false
  }
}

/** The dialog words in the UI language (Korean, English, Vietnamese; English elsewhere). */
const DIALOG_WORDS = {
  ko: {
    buttons: ['저장', '저장 안 함', '취소'],
    message: '디자인을 저장할까요?',
    detail: '저장하지 않으면 이 디자인에서 바꾼 내용이 사라집니다.',
    saveTitle: '디자인 저장',
    exportTitle: '디자인 내보내기',
    openTitle: '디자인 열기',
    filter: '한판 디자인',
  },
  en: {
    buttons: ['Save', "Don't save", 'Cancel'],
    message: 'Save the design?',
    detail: 'Changes to this design are lost if you do not save them.',
    saveTitle: 'Save design',
    exportTitle: 'Export design',
    openTitle: 'Open design',
    filter: 'Hanpan design',
  },
  vi: {
    buttons: ['Lưu', 'Không lưu', 'Hủy'],
    message: 'Lưu thiết kế?',
    detail: 'Nếu không lưu, những thay đổi trong thiết kế này sẽ mất.',
    saveTitle: 'Lưu thiết kế',
    exportTitle: 'Xuất thiết kế',
    openTitle: 'Mở thiết kế',
    filter: 'Thiết kế Hanpan',
  },
} as const
function dialogWords(): (typeof DIALOG_WORDS)[keyof typeof DIALOG_WORDS] {
  const lang = deps?.lang() ?? 'ko'
  return lang === 'ko' || lang === 'vi' ? DIALOG_WORDS[lang] : DIALOG_WORDS.en
}

/** 저장 / 저장 안 함 / 취소, over the design window. */
async function askUnsaved(): Promise<'save' | 'discard' | 'cancel'> {
  const words = dialogWords()
  const options = {
    type: 'warning' as const,
    buttons: [...words.buttons],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
    title: deps?.title(deps.lang()) ?? '',
    message: words.message,
    detail: words.detail,
  }
  const parent = win && !win.isDestroyed() ? win : undefined
  const { response } = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options)
  return response === 0 ? 'save' : response === 1 ? 'discard' : 'cancel'
}

/** The window title: the design's file name in front once it has one. */
function showTitle(): void {
  if (!win || win.isDestroyed() || !deps) return
  const base = deps.title(deps.lang())
  win.setTitle(designPath ? `${basename(designPath, extname(designPath))} - ${base}` : base)
}

/** Where a first save or an export starts: the app's save folder (Documents\Hanpan). */
function saveDir(): string {
  if (deps?.saveDir) return deps.saveDir()
  return join(app.getPath('documents'), 'Hanpan')
}

async function saveAs(
  name: string,
  extension: string,
  label: string,
  bytes: Uint8Array | string,
): Promise<string | null> {
  const parent = win && !win.isDestroyed() ? win : undefined
  const words = dialogWords()
  const options = {
    title: extension === 'hpdesign' ? words.saveTitle : words.exportTitle,
    defaultPath:
      designPath && extension === 'hpdesign' ? designPath : join(saveDir(), `${name}.${extension}`),
    filters: [{ name: label, extensions: [extension] }],
  }
  const result = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, typeof bytes === 'string' ? bytes : Buffer.from(bytes))
  return result.filePath
}

/** The page in a hidden window of its own, handed to the system print dialog. */
function printInWindow(html: string, sheet: PrintSheet): Promise<PrintDialogOutcome> {
  const parent = win && !win.isDestroyed() ? win : undefined
  const printer = new BrowserWindow({
    show: false,
    ...(parent ? { parent } : {}),
    ...(process.platform === 'win32'
      ? { width: 900, height: 700, autoHideMenuBar: true, closable: false, skipTaskbar: true }
      : {}),
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  })
  printer.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  return printHtmlDocument({
    html,
    fileName: 'design.html',
    dirPrefix: 'hanpan-design-print-',
    window: withPrintOptions(printer, printPageOptions(sheet)),
  })
}

function registerIpc(): void {
  ipcMain.handle(DESIGN_CHANNELS.getInit, (event) => {
    if (!fromWindow(event) || !deps) return null
    const outline = pendingOutline
    pendingOutline = null
    return { lang: deps.lang(), theme: deps.theme(), ...(outline ? { outline } : {}) }
  })
  ipcMain.handle(
    DESIGN_CHANNELS.savePng,
    async (event, bytes: unknown, name: unknown, format: unknown) => {
      const picture = bytesOf(bytes)
      if (!fromWindow(event) || !picture) return null
      // a JPEG (smaller, no transparency) when asked; PNG otherwise
      return format === 'jpg'
        ? saveAs(safeName(name, 'design'), 'jpg', 'JPEG', picture)
        : saveAs(safeName(name, 'design'), 'png', 'PNG', picture)
    },
  )
  ipcMain.handle(
    DESIGN_CHANNELS.savePdf,
    async (event, pages: unknown, size: unknown, name: unknown) => {
      if (!fromWindow(event) || !Array.isArray(pages) || !pages.length) return null
      const { width, height } = (size ?? {}) as { width?: number; height?: number }
      if (!(Number(width) > 0) || !(Number(height) > 0)) return null
      const pdf = await PDFDocument.create()
      for (const page of pages) {
        const png = bytesOf(page)
        if (!png) return null
        const image = await pdf.embedPng(png)
        // 150 dpi pixels to points
        const w = (Number(width) * 72) / 150
        const h = (Number(height) * 72) / 150
        pdf.addPage([w, h]).drawImage(image, { x: 0, y: 0, width: w, height: h })
      }
      const path = await saveAs(safeName(name, 'design'), 'pdf', 'PDF', await pdf.save())
      if (path) void shell.openPath(path)
      return path
    },
  )
  ipcMain.handle(
    DESIGN_CHANNELS.print,
    async (event, pages: unknown, sheet: unknown): Promise<PrintDialogOutcome> => {
      if (!fromWindow(event)) return { ok: false, error: 'design: not the board' }
      if (!Array.isArray(pages) || !pages.length || pages.length > 200 || !isPrintSheet(sheet))
        return { ok: false, error: 'design: bad print request' }
      const pictures = []
      for (const page of pages) {
        const png = bytesOf(page)
        // the size comes from the PNG itself
        const size = png ? pngSize(png) : null
        if (!png || !size) return { ok: false, error: 'design: bad print request' }
        pictures.push({
          src: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
          ...size,
        })
      }
      const html = buildImagePrintHtml(pictures, sheet)
      try {
        return await (deps?.printHtml ?? printInWindow)(html, sheet)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    },
  )
  ipcMain.handle(DESIGN_CHANNELS.copyImage, (event, bytes: unknown) => {
    const png = bytesOf(bytes)
    if (!fromWindow(event) || !png) return false
    clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(png)))
    return true
  })
  ipcMain.handle(
    DESIGN_CHANNELS.saveDesign,
    async (event, text: unknown, name: unknown, mode: unknown) => {
      if (!fromWindow(event) || typeof text !== 'string' || text.length > MAX_BYTES) return null
      // Ctrl+S: over the design's own file; only a design never saved (or "save as") asks
      if (mode !== 'saveAs' && designPath) {
        await writeFile(designPath, text)
        return designPath
      }
      const path = await saveAs(safeName(name, 'design'), 'hpdesign', dialogWords().filter, text)
      if (path) designPath = path
      showTitle()
      return path
    },
  )
  ipcMain.handle(DESIGN_CHANNELS.newDesign, (event) => {
    if (!fromWindow(event)) return
    designPath = null
    showTitle()
  })
  ipcMain.handle(DESIGN_CHANNELS.setDirty, (event, value: unknown) => {
    if (fromWindow(event)) dirty = value === true
  })
  ipcMain.handle(DESIGN_CHANNELS.askUnsaved, (event) =>
    fromWindow(event) ? askUnsaved() : 'cancel',
  )
  ipcMain.handle(DESIGN_CHANNELS.closeAfterSave, (event) => {
    if (!fromWindow(event)) return
    closing = true
    win!.close()
  })
  ipcMain.handle(DESIGN_CHANNELS.openGonguSettings, (event) => {
    if (!fromWindow(event) || !deps) return
    if (deps.openSettings) return deps.openSettings('integrations')
    const parent = deps.parentWindow()
    if (!parent || parent.isDestroyed()) return
    if (parent.isMinimized()) parent.restore()
    parent.show()
    parent.focus()
    parent.webContents.send('home:open-settings', { section: 'integrations' })
  })
  ipcMain.handle(DESIGN_CHANNELS.openDesign, async (event) => {
    if (!fromWindow(event)) return null
    const result = await dialog.showOpenDialog(win!, {
      title: dialogWords().openTitle,
      properties: ['openFile'],
      filters: [{ name: dialogWords().filter, extensions: ['hpdesign'] }],
    })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    const text = await readFile(path, 'utf8')
    if (text.length > MAX_BYTES) return null
    // the board drops a file it cannot read; such a file must never be written over
    if (looksLikeDesign(text)) designPath = path
    showTitle()
    return { name: basename(path, extname(path)), text }
  })
  ipcMain.handle(DESIGN_CHANNELS.pickImage, async (event) => {
    if (!fromWindow(event)) return null
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    const image = nativeImage.createFromPath(path)
    if (image.isEmpty()) return null
    const { width, height } = image.getSize()
    return { dataUrl: image.toDataURL(), width, height }
  })
  // Gongu pictures (docs/plans/gongu-images.md 4.5): the page sends only a
  // search word, a page number or a work number; addresses come from the
  // service's own answer, and every picture is fetched here.
  ipcMain.handle(
    DESIGN_CHANNELS.gonguSearch,
    async (event, query: unknown, page: unknown): Promise<GonguSearchAnswer | null> => {
      if (!fromWindow(event) || !deps) return null
      return searchGonguPictures(query, page, deps.gonguKey())
    },
  )
  ipcMain.handle(
    DESIGN_CHANNELS.gonguPicture,
    async (event, workId: unknown): Promise<GonguPictureAnswer | null> => {
      if (!fromWindow(event) || !deps) return null
      return fetchGonguPicture(workId, deps.gonguKey())
    },
  )
  ipcMain.handle(DESIGN_CHANNELS.open, (event) => {
    const parent = deps?.parentWindow()
    if (!parent || parent.isDestroyed() || event.sender !== parent.webContents) return
    openDesignWindow()
  })
}

export function configureDesignWindow(next: DesignWindowDeps): void {
  deps = next
  registerIpc()
}

/** Opens the board with card news made from a map (its outline as indented text). */
export function openDesignWithOutline(outline: string): void {
  if (win && !win.isDestroyed()) win.close()
  pendingOutline = outline.slice(0, 200_000)
  openDesignWindow()
}

/** 보통 크기와 가장 작은 크기: 작업 영역이 더 작으면 그 안에 맞춘다 */
const DESIGN_SIZE = { width: 1360, height: 880, minWidth: 960, minHeight: 600 }

/**
 * The board's window inside a screen's work area (0.17 리뷰 #8): its usual
 * 1360×880 where that fits, otherwise the work area itself, centered.
 */
export function designWindowBounds(area: Rectangle): Rectangle & {
  minWidth: number
  minHeight: number
} {
  const width = Math.min(DESIGN_SIZE.width, area.width)
  const height = Math.min(DESIGN_SIZE.height, area.height)
  return {
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
    width,
    height,
    minWidth: Math.min(DESIGN_SIZE.minWidth, width),
    minHeight: Math.min(DESIGN_SIZE.minHeight, height),
  }
}

export function openDesignWindow(): void {
  const d = deps
  if (!d) throw new Error('the design window is not configured')
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore()
    win.focus()
    return
  }
  const lang = d.lang()
  // the screen the shell window is on (the primary one when there is none)
  const parent = d.parentWindow()
  const display =
    parent && !parent.isDestroyed()
      ? screen.getDisplayMatching(parent.getBounds())
      : screen.getPrimaryDisplay()
  const next = new BrowserWindow({
    ...designWindowBounds(display.workArea),
    show: false,
    autoHideMenuBar: true,
    title: d.title(lang),
    webPreferences: {
      preload: join(__dirname, '../preload/design.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win = next
  next.removeMenu()
  next.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  next.once('ready-to-show', () => next.show())
  // the window keeps the title in the UI language, not the page's own <title>
  next.on('page-title-updated', (event) => event.preventDefault())
  // unsaved work: 저장 / 저장 안 함 / 취소 first, as the other editors ask (점검 v2 hwp-design #2)
  dirty = false
  closing = false
  next.on('close', (event) => {
    if (closing || !dirty) return
    event.preventDefault()
    void askUnsaved().then((answer) => {
      if (next.isDestroyed()) return
      if (answer === 'discard') {
        closing = true
        next.close()
      } else if (answer === 'save') next.webContents.send(DESIGN_CHANNELS.saveThenClose)
    })
  })
  next.on('closed', () => {
    if (win === next) win = null
    designPath = null
    dirty = false
    closing = false
  })
  if (process.env.ELECTRON_RENDERER_URL)
    void next.loadURL(`${process.env.ELECTRON_RENDERER_URL}/design.html`)
  else void next.loadFile(join(__dirname, '../renderer/design.html'))
}
