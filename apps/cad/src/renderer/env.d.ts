/// <reference types="vite/client" />

import type { CadApi } from '../shared/ipc'

declare global {
  interface Window {
    cadApi: CadApi
  }
}

export {}
