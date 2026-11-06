import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { SecureKeyUiState, SecureKeyWindowApi } from '../shared/securekey-api'
import { SECUREKEY_CHANNELS } from '../shared/securekey-api'

const api: SecureKeyWindowApi = {
  async getState() {
    const result: unknown = await ipcRenderer.invoke(SECUREKEY_CHANNELS.getState)
    return (result ?? null) as SecureKeyUiState | null
  },
  pickKeyFile() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.pickKeyFile)
  },
  register(request) {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.register, request)
  },
  later() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.later)
  },
  retry() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.retry)
  },
  quit() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.quit)
  },
  openKeyPage() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.openKeyPage)
  },
  onState(handler) {
    const listener = (_event: IpcRendererEvent, state: SecureKeyUiState) => handler(state)
    ipcRenderer.on(SECUREKEY_CHANNELS.changed, listener)
    return () => ipcRenderer.removeListener(SECUREKEY_CHANNELS.changed, listener)
  },
}

contextBridge.exposeInMainWorld('hanpanSecureKey', api)
