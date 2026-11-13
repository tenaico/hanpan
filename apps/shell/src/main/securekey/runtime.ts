import { isLang, type Lang } from '@genoffice/i18n'
import { join } from 'node:path'
import type { SecureKeyUiState } from '../../shared/securekey-api'
import { createKey, type CreateTarget } from './create'
import type { DeviceProbe, UsbVolume } from './devices'
import { decideGate, type GateConfig, type GateDecision, type LockReason } from './gate'
import { addSpareUsb, moveToPc, moveToUsb, resetKey, type ManageResult } from './manage'
import {
  findRegistration,
  KEY_FILES,
  pcKeyDir,
  readRegistered,
  usbKeyDir,
  type FindResult,
  type Registration,
} from './store'
import { secureKeyStrings, tSecureKey } from './strings'
import { startPresenceWatch } from './watch'
import type { SecureKeyWindowHandlers, SecureKeyWindowResult } from './window'

/**
 * The first run and the security key at run time (spec 2026-11-12 5-2..5-4).
 * The terms are asked on every operating system before the first window; on
 * Windows with the build switch on, a key must then open. The key is opened
 * quietly before any AI settings are read. A build without the switch still
 * opens the vault of a PC registered before, so its AI keys stay readable,
 * but it never locks.
 */

export interface SecureKeyRuntimeDeps {
  config: GateConfig
  userData: string
  probe: DeviceProbe
  now(): Date
  lang(): string
  /** the terms of this build were not accepted yet (consent.ts) */
  needsConsent(): boolean
  acceptConsent(): Promise<void>
  /** open the full license and disclaimer (license-terms.ts) */
  openLicense?(): void
  /** seal and open the PC vault (Windows DPAPI) */
  sealPcVault(vault: Buffer): Buffer
  openPcVault(sealed: Buffer): Buffer | null
  showWindow(
    state: SecureKeyUiState,
    handlers: SecureKeyWindowHandlers,
  ): Promise<SecureKeyWindowResult>
  closeWindow(): void
  lockAi(): void
  unlockAi(): void
  /** after a new key: seal the AI keys again with its vault */
  onRegistered?(registration: Registration): void
  /**
   * clear the keys sealed with an earlier vault: on "make a new key", and
   * before a new key seals them again (a lost record or an interrupted reset
   * leaves such values, which would refuse every later settings write)
   */
  onReset?(): Promise<void>
  /** a lock that came after the gate (a removed stick) */
  onLocked?(reason: LockReason): void
  /** where a stick's folder is; tests point it at a temporary folder */
  usbDir?: (letter: string) => string
  /** the lock cover over every window (lock-overlay.ts) */
  overlays?: { show(state: SecureKeyUiState): void; hide(): void }
  /** the presence watch (watch.ts); tests report the changes themselves */
  startWatch?: typeof startPresenceWatch
}

export interface SecureKeyRuntime {
  openQuietly(): Promise<void>
  runGate(): Promise<'continue' | 'quit'>
  vault(): Buffer | null
  /** the start window is deciding or up: a second launch only queues its files */
  pending(): boolean
  /** the key in use, once the gate passed */
  registration(): Registration | null
  /** close the gate window once the shell window exists */
  closeWindow(): void
  /** locked after the gate: the stick was removed */
  locked(): boolean
  /** [Check again] on the shell window's cover */
  retryLock(): Promise<SecureKeyUiState | 'passed'>
  /** Settings › Security key: the key in use and the sticks plugged in, or null without one */
  info(): Promise<SecureKeyInfo | null>
  spare(letter: string): Promise<ManageResult | 'no-usb'>
  moveToUsb(letter: string): Promise<ManageResult | 'no-usb'>
  moveToPc(): Promise<ManageResult>
  /** Settings: drop the key (AI locked at once); the caller restarts the app */
  resetFromSettings(): Promise<'ok' | 'no-record'>
}

export interface SecureKeyInfo {
  where: 'usb' | 'pc'
  createdAt: string
  /** sticks on the record */
  sticks: number
  /** drive letters plugged in now */
  usbLetters: string[]
}

/** an ISO time as a month, day and time of day in `lang` */
function shownWhen(iso: string | undefined, lang: Lang): string {
  if (!iso) return ''
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso
  try {
    return new Intl.DateTimeFormat(lang, {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(at)
  } catch {
    return iso
  }
}

export function createSecureKeyRuntime(deps: SecureKeyRuntimeDeps): SecureKeyRuntime {
  const { config } = deps
  const onWindows = config.platform === 'win32'
  const keyOn = onWindows && config.requireKey
  const usbDir = deps.usbDir ?? usbKeyDir
  let lastVolumes: UsbVolume[] = []
  let current: Registration | null = null
  let showing = false
  /** from the start of the run until the gate has decided */
  let starting = true
  let lockedNow = false
  let stopWatch: (() => void) | null = null

  const lang = (): Lang => {
    const l = deps.lang()
    return isLang(l) ? l : 'en'
  }

  async function volumes(): Promise<UsbVolume[]> {
    lastVolumes = await deps.probe.listUsbVolumes()
    return lastVolumes
  }

  function look(): Promise<FindResult> {
    return findRegistration({
      userData: deps.userData,
      listVolumes: volumes,
      usbDir,
      openPcVault: deps.openPcVault,
    })
  }

  async function decide(): Promise<GateDecision> {
    const decision = decideGate({ config, found: await look() })
    // the create step lists the sticks to choose from
    if (decision.kind === 'create') await volumes()
    return decision
  }

  function open(registration: Registration): void {
    current = registration
    deps.unlockAi()
  }

  function uiState(
    mode: SecureKeyUiState['mode'],
    decision: GateDecision | null = null,
  ): SecureKeyUiState {
    const l = lang()
    const locked = decision?.kind === 'locked' ? decision : null
    return {
      mode,
      reason: locked?.reason ?? null,
      usbLetters: lastVolumes.map((v) => v.letter),
      busy: false,
      error: null,
      lang: l,
      strings: secureKeyStrings(l, { when: shownWhen(locked?.replacedAt, l) }),
    }
  }

  const stateOf = (decision: GateDecision): SecureKeyUiState =>
    uiState(decision.kind === 'create' ? 'create' : 'lock', decision)

  function lockNow(decision: GateDecision): void {
    const reason: LockReason = decision.kind === 'locked' ? decision.reason : 'usb-missing'
    const first = !lockedNow
    lockedNow = true
    if (first) {
      deps.lockAi()
      deps.onLocked?.(reason)
    }
    deps.overlays?.show(
      uiState('lock', decision.kind === 'locked' ? decision : { kind: 'locked', reason }),
    )
  }

  function unlockNow(registration: Registration): void {
    const wasLocked = lockedNow
    lockedNow = false
    if (registration.keyId !== current?.keyId || registration.letter !== current?.letter) {
      watch(registration)
    }
    open(registration)
    if (wasLocked) deps.overlays?.hide()
  }

  /** look again after a change: open when the key passes, else keep the lock */
  async function recheck(): Promise<GateDecision> {
    const decision = await decide()
    if (decision.kind === 'open') unlockNow(decision.registration)
    else if (decision.kind !== 'skip') lockNow(decision)
    return decision
  }

  /** watch the key's stick (or the PC record) while the app runs */
  function watch(registration: Registration): void {
    stopWatch?.()
    const path =
      registration.where === 'usb' && registration.letter
        ? join(usbDir(registration.letter), KEY_FILES.key)
        : join(pcKeyDir(deps.userData), KEY_FILES.registered)
    stopWatch = (deps.startWatch ?? startPresenceWatch)({
      activationPath: path,
      volumeSerial: registration.volumeSerial ?? null,
      onChange: (present) => {
        if (!present) {
          lockNow({
            kind: 'locked',
            reason: registration.where === 'usb' ? 'usb-missing' : 'damaged',
          })
          return
        }
        void recheck().catch(() => undefined)
      },
    })
  }

  /** after the terms or a retry: the key step, or 'passed' when there is none to take */
  async function keyStep(): Promise<SecureKeyUiState | 'passed'> {
    if (!keyOn) return 'passed'
    const decision = await decide()
    if (decision.kind === 'open') {
      open(decision.registration)
      return 'passed'
    }
    if (decision.kind === 'skip') return 'passed'
    return stateOf(decision)
  }

  const handlers: SecureKeyWindowHandlers = {
    async acceptTerms() {
      await deps.acceptConsent()
      return keyStep()
    },
    openLicense: () => deps.openLicense?.(),
    async create(target: CreateTarget) {
      const result = await createKey({
        userData: deps.userData,
        target,
        volumes: target.where === 'usb' ? await volumes() : lastVolumes,
        now: deps.now(),
        usbDir,
        sealPcVault: deps.sealPcVault,
      })
      if (!result.ok) {
        return tSecureKey(
          lang(),
          result.error === 'no-usb'
            ? 'skErrNoUsb'
            : result.error === 'other-key'
              ? 'skErrOtherKey'
              : 'skErrWriteFailed',
        )
      }
      open(result.registration)
      await deps.onReset?.()
      deps.onRegistered?.(result.registration)
      return null
    },
    retry: () => keyStep(),
    async reset() {
      await resetKey({ userData: deps.userData, now: deps.now() })
      current = null
      await deps.onReset?.()
      await volumes()
      return uiState('create')
    },
  }

  async function gate(): Promise<'continue' | 'quit'> {
    let first: SecureKeyUiState | null = null
    if (deps.needsConsent()) {
      first = uiState('terms')
    } else if (keyOn) {
      const decision = await decide()
      if (decision.kind === 'open') {
        open(decision.registration)
        watch(decision.registration)
        return 'continue'
      }
      if (decision.kind !== 'skip') first = stateOf(decision)
    }
    if (!first) return 'continue'
    showing = true
    let answer: SecureKeyWindowResult
    try {
      answer = await deps.showWindow(first, handlers)
    } finally {
      showing = false
    }
    if (answer === 'quit') return 'quit'
    if (current) watch(current)
    return 'continue'
  }

  return {
    async openQuietly() {
      if (!onWindows) return
      // nobody registered on this PC: no tools run, the v1 keys stay as they are
      if (!readRegistered(deps.userData)) return
      const result = await look()
      if (result.kind === 'found') {
        current = result.registration
        deps.unlockAi()
      } else if (config.requireKey) {
        deps.lockAi()
      }
    },

    async runGate() {
      try {
        return await gate()
      } finally {
        starting = false
      }
    },

    vault: () => current?.vault ?? null,
    pending: () => starting || showing,
    registration: () => current,
    closeWindow: () => deps.closeWindow(),
    locked: () => lockedNow,
    async retryLock() {
      const decision = await recheck()
      if (decision.kind === 'open' || decision.kind === 'skip') return 'passed'
      return uiState('lock', decision)
    },

    async info() {
      const record = readRegistered(deps.userData)
      if (!current || !record || record.keyId !== current.keyId) return null
      const letters = (await volumes()).map((v) => v.letter)
      return {
        where: record.where,
        createdAt: record.createdAt,
        sticks: record.devices.length,
        usbLetters: letters,
      }
    },

    async spare(letter) {
      const volume = (await volumes()).find((v) => v.letter === letter)
      if (!volume) return 'no-usb'
      if (!current) return 'no-record'
      return addSpareUsb({ userData: deps.userData, current, volume, usbDir, now: deps.now() })
    },

    async moveToUsb(letter) {
      const volume = (await volumes()).find((v) => v.letter === letter)
      if (!volume) return 'no-usb'
      if (!current) return 'no-record'
      const result = await moveToUsb({
        userData: deps.userData,
        current,
        volume,
        usbDir,
        now: deps.now(),
      })
      if (result === 'ok') {
        current = { ...current, where: 'usb', letter, volumeSerial: volume.volumeSerial }
        watch(current)
      }
      return result
    },

    async resetFromSettings() {
      if (!onWindows || !current) return 'no-record'
      // locked first: if the restart is cancelled, nothing is sealed with the
      // vault that is about to go
      stopWatch?.()
      stopWatch = null
      lockNow({ kind: 'locked', reason: 'damaged' })
      current = null
      await resetKey({ userData: deps.userData, now: deps.now() })
      await deps.onReset?.()
      return 'ok'
    },

    async moveToPc() {
      if (!current) return 'no-record'
      const result = await moveToPc({
        userData: deps.userData,
        current,
        consentAt: deps.now().toISOString(),
        sealPcVault: deps.sealPcVault,
      })
      if (result === 'ok') {
        current = { where: 'pc', keyId: current.keyId, vault: current.vault }
        watch(current)
      }
      return result
    },
  }
}
