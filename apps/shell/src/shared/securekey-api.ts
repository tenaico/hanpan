// Contract between the security key window (securekey.html) and the shell
// main process: the register and lock screens shown before the first shell
// window (spec 7-1, 7-3) and the lock cover over every window (spec 7-4).

export const SECUREKEY_CHANNELS = {
  getState: 'securekey:get-state',
  pickKeyFile: 'securekey:pick-key-file',
  register: 'securekey:register',
  later: 'securekey:later',
  retry: 'securekey:retry',
  quit: 'securekey:quit',
  openKeyPage: 'securekey:open-key-page',
  changed: 'securekey:changed',
} as const

/** Why the app is locked; the same names as the gate's LockReason */
export type SecureKeyLockReason =
  'usb-missing' | 'other-device' | 'revoked' | 'stale' | 'clock' | 'damaged'

export interface SecureKeyUiState {
  mode: 'register' | 'lock'
  /** register mode during the grace: [Later] is offered */
  optional: boolean
  /** the grace's last day as `YYYY-MM-DD`, or null */
  until: string | null
  reason: SecureKeyLockReason | null
  /** drive letters of the USB sticks plugged in now */
  usbLetters: string[]
  keyFileName: string | null
  busy: boolean
  /** a register error, already in the window's language */
  error: string | null
  /** BCP-47 tag for documentElement.lang */
  lang: string
  /** every string the window shows, in its language, with dates filled in */
  strings: Record<string, string>
  /** a cover over another window: only the title line, no buttons */
  cover?: boolean
}

/** What the window asks to register on: a stick by letter, or this PC once the warning is accepted */
export type SecureKeyRegisterRequest =
  { where: 'usb'; letter: string } | { where: 'pc'; consent: boolean }

export interface SecureKeyWindowApi {
  getState(): Promise<SecureKeyUiState | null>
  pickKeyFile(): void
  register(request: SecureKeyRegisterRequest): void
  later(): void
  retry(): void
  quit(): void
  openKeyPage(): void
  onState(handler: (state: SecureKeyUiState) => void): () => void
}
