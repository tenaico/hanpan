import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { SecureKeyUiState, SecureKeyWindowApi } from '../shared/securekey-api'
import { SECUREKEY_CHANNELS } from '../shared/securekey-api'

const api: SecureKeyWindowApi = {
  async getState() {
    const result: unknown = await ipcRenderer.invoke(SECUREKEY_CHANNELS.getState)
    return (result ?? null) as SecureKeyUiState | null
  },
  acceptTerms() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.acceptTerms)
  },
  openLicense() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.openLicense)
  },
  create(request) {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.createKey, request)
  },
  retry() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.retry)
  },
  reset() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.resetKey)
  },
  quit() {
    void ipcRenderer.invoke(SECUREKEY_CHANNELS.quit)
  },
  onState(handler) {
    const listener = (_event: IpcRendererEvent, state: SecureKeyUiState) => handler(state)
    ipcRenderer.on(SECUREKEY_CHANNELS.changed, listener)
    return () => ipcRenderer.removeListener(SECUREKEY_CHANNELS.changed, listener)
  },
}

contextBridge.exposeInMainWorld('hanpanSecureKey', api)
