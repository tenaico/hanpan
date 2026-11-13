// Contract between the first-run window (securekey.html) and the shell main
// process: the terms, the key creation, the wait screen before the first shell
// window, and the lock cover over every window (spec 2026-11-12 5-3, 5-4).

export const SECUREKEY_CHANNELS = {
  getState: 'securekey:get-state',
  acceptTerms: 'securekey:accept-terms',
  openLicense: 'securekey:open-license',
  createKey: 'securekey:create-key',
  retry: 'securekey:retry',
  resetKey: 'securekey:reset-key',
  quit: 'securekey:quit',
  changed: 'securekey:changed',
} as const

/** Why the app is locked; the same names as the gate's LockReason */
export type SecureKeyLockReason = 'usb-missing' | 'unregistered-usb' | 'replaced' | 'damaged'

export interface SecureKeyUiState {
  /** the terms, making a key, or waiting for the key's stick */
  mode: 'terms' | 'create' | 'lock'
  reason: SecureKeyLockReason | null
  /** drive letters of the USB sticks plugged in now */
  usbLetters: string[]
  busy: boolean
  /** an error line, already in the window's language */
  error: string | null
  /** BCP-47 tag for documentElement.lang */
  lang: string
  /** every string the window shows, in its language, with times filled in */
  strings: Record<string, string>
  /** a cover over another window: only the title line, no buttons */
  cover?: boolean
  /** false on a cover: a new key is made only in the start window */
  canRegister?: boolean
}

/** Where the window asks to make the key: a stick by letter, or this PC once its risk is accepted */
export type SecureKeyCreateRequest =
  { where: 'usb'; letter: string } | { where: 'pc'; consent: boolean }

export interface SecureKeyWindowApi {
  getState(): Promise<SecureKeyUiState | null>
  acceptTerms(): void
  /** [Read the full license] on the terms step */
  openLicense(): void
  create(request: SecureKeyCreateRequest): void
  retry(): void
  reset(): void
  quit(): void
  onState(handler: (state: SecureKeyUiState) => void): () => void
}
