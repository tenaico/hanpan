import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { isLang } from '@genoffice/i18n'
import { subscriptionApi } from './subscription-bridge'

// Hanpan design board window: save and open through main's dialogs, copy a
// picture to the clipboard, bind pages into a PDF. Paths never reach the page.
// Channel names repeat src/main/hanpan/design-window.ts (DESIGN_CHANNELS).

type Theme = 'light' | 'dark' | 'system'
const themeOf = (value: unknown): Theme =>
  value === 'light' || value === 'dark' ? value : 'system'

contextBridge.exposeInMainWorld('hanpanDesign', {
  async getInit() {
    const init = (await ipcRenderer.invoke('hanpan-design:get-init')) as {
      lang?: string
      theme?: string
      outline?: string
    } | null
    return {
      lang: init?.lang ?? 'ko',
      theme: themeOf(init?.theme),
      outline: typeof init?.outline === 'string' ? init.outline : undefined,
    }
  },
  // the UI language changed in Settings: the board redraws in it without reopening
  onLanguageChanged(handler: (lang: string) => void) {
    const listener = (_event: IpcRendererEvent, lang: unknown) => {
      if (isLang(lang)) handler(lang)
    }
    ipcRenderer.on('app:language-changed', listener)
    return () => ipcRenderer.removeListener('app:language-changed', listener)
  },
  onThemeChanged(handler: (theme: Theme) => void) {
    const listener = (_event: IpcRendererEvent, theme: unknown) => handler(themeOf(theme))
    ipcRenderer.on('app:theme-changed', listener)
    return () => ipcRenderer.removeListener('app:theme-changed', listener)
  },
  savePng: (bytes: Uint8Array, name: string, format?: 'png' | 'jpg') =>
    ipcRenderer.invoke('hanpan-design:save-png', bytes, name, format),
  savePdf: (pages: Uint8Array[], size: { width: number; height: number }, name: string) =>
    ipcRenderer.invoke('hanpan-design:save-pdf', pages, size, name),
  copyImage: (bytes: Uint8Array) => ipcRenderer.invoke('hanpan-design:copy-image', bytes),
  // pages as the PNG export draws them; main builds the print page from them
  print: (pages: Uint8Array[], sheet: { widthMm: number; heightMm: number; marginMm: number }) =>
    ipcRenderer.invoke('hanpan-design:print', pages, sheet),
  // 'save' writes over the design's own file (main keeps the path); 'saveAs' always asks
  saveDesign: (text: string, name: string, mode?: 'save' | 'saveAs') =>
    ipcRenderer.invoke('hanpan-design:save', text, name, mode),
  newDesign: () => ipcRenderer.invoke('hanpan-design:new'),
  // unsaved work: main asks 저장 / 저장 안 함 / 취소 before the window closes or a design is replaced
  setDirty: (dirty: boolean) => void ipcRenderer.invoke('hanpan-design:set-dirty', dirty === true),
  askUnsaved: () => ipcRenderer.invoke('hanpan-design:ask-unsaved'),
  onSaveThenClose(handler: () => void) {
    const listener = () => handler()
    ipcRenderer.on('hanpan-design:save-then-close', listener)
    return () => ipcRenderer.removeListener('hanpan-design:save-then-close', listener)
  },
  closeAfterSave: () => void ipcRenderer.invoke('hanpan-design:close-after-save'),
  // Settings → Integrations, where the Gongu key goes
  openGonguSettings: () => void ipcRenderer.invoke('hanpan-design:open-gongu-settings'),
  // Korean names of installed fonts, read from the files (registered by the docs main)
  fontFamilyInfo: (families: string[]) => ipcRenderer.invoke('app:font-family-info', families),
  openDesign: () => ipcRenderer.invoke('hanpan-design:open'),
  pickImage: () => ipcRenderer.invoke('hanpan-design:pick-image'),
  // Gongu pictures: main searches with the key from Settings and fetches the pictures
  gonguSearch: (query: string, page: number) =>
    ipcRenderer.invoke('hanpan-design:gongu-search', query, page),
  gonguPicture: (workId: string) => ipcRenderer.invoke('hanpan-design:gongu-picture', workId),
  // the AI the person chose in Settings, through the same channels every editor
  // uses (registered by the docs main): a provider that cannot run is refused there
  getAiSettings: () => ipcRenderer.invoke('ai:get-settings'),
  setAiSettings: (settings: unknown) => ipcRenderer.invoke('ai:set-settings', settings),
  onAiSettingsChanged(handler: (settings: unknown) => void) {
    const listener = (_event: IpcRendererEvent, settings: unknown) => handler(settings)
    ipcRenderer.on('ai:settings-changed', listener)
    return () => ipcRenderer.removeListener('ai:settings-changed', listener)
  },
  openAiModelSettings: () => ipcRenderer.invoke('ai:open-model-settings'),
  aiStream: (request: unknown) => ipcRenderer.invoke('ai:stream', request),
  aiStreamCancel: (requestId: string) => ipcRenderer.invoke('ai:stream-cancel', requestId),
  onAiStream(handler: (chunk: unknown) => void) {
    const listener = (_event: IpcRendererEvent, chunk: unknown) => handler(chunk)
    ipcRenderer.on('ai:stream-chunk', listener)
    return () => ipcRenderer.removeListener('ai:stream-chunk', listener)
  },
})

// the connect cards' statuses and actions, the same bridge the main window has
contextBridge.exposeInMainWorld('aiOfficeSubscription', subscriptionApi)
