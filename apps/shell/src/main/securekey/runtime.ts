import { isLang, type Lang } from '@genoffice/i18n'
import type { SecureKeyUiState } from '../../shared/securekey-api'
import { join } from 'node:path'
import type { DeviceProbe, UsbVolume } from './devices'
import { isStatusPayload, verifySigned } from './format'
import { decideGate, type GateConfig, type GateDecision, type LockReason } from './gate'
import { registerKey, type RegisterError } from './register'
import { findRegistration, KEY_FILES, type FindResult, type Registration } from './store'
import {
  fetchStatus,
  judgeStatus,
  readState,
  statePath,
  statusDue,
  writeState,
  type SecureKeyState,
  type StatusVerdict,
} from './status'
import { secureKeyStrings, tSecureKey, type SecureKeyStringKey } from './strings'
import { startPresenceWatch } from './watch'
import type {
  SecureKeyRegisterTarget,
  SecureKeyWindowHandlers,
  SecureKeyWindowResult,
} from './window'

/**
 * The security key at run time (spec 7-3): open the key quietly before any
 * AI settings are read, then run the startup gate before the first window.
 * Everything here is skipped outside Windows (spec 2). A build without the
 * key requirement still opens the vault of a PC registered under an earlier
 * build, so its AI keys stay readable, but it never locks.
 */

export interface SecureKeyRuntimeDeps {
  config: GateConfig
  userData: string
  probe: DeviceProbe
  fetch: typeof fetch
  now(): Date
  lang(): string
  showWindow(
    state: SecureKeyUiState,
    handlers: SecureKeyWindowHandlers,
  ): Promise<SecureKeyWindowResult>
  closeWindow(): void
  lockAi(): void
  unlockAi(): void
  /** after a new registration: seal the AI keys again with its vault (spec 7-5) */
  onRegistered?(registration: Registration): void
  /** a lock that came after the gate (a revoked answer, a removed stick) */
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
  graceUntil(): string | null
  pending(): boolean
  /** the registration in use, once the gate passed */
  registration(): Registration | null
  /** close the gate window once the shell window exists */
  closeWindow(): void
  /** locked after the gate: the stick was removed, or the key was revoked */
  locked(): boolean
  /** [Check again] on the shell window's cover */
  retryLock(): Promise<SecureKeyUiState | 'passed'>
}

const REGISTER_ERROR_TEXT: Record<RegisterError, SecureKeyStringKey> = {
  'bad-key': 'skErrBadKey',
  'no-usb': 'skErrNoUsb',
  limit: 'skErrLimit',
  used: 'skErrUsed',
  refused: 'skErrRefused',
  network: 'skErrNetwork',
  'bad-answer': 'skErrBadAnswer',
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` plus `days`, shown as a month and day in `lang` */
function shownDate(date: string | null, lang: Lang, days = 0): string {
  const match = date ? DATE_PATTERN.exec(date) : null
  if (!match) return ''
  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days)
  try {
    return new Intl.DateTimeFormat(lang, { month: 'long', day: 'numeric' }).format(day)
  } catch {
    return date ?? ''
  }
}

/** The home banner while the grace runs (spec 7-9), in `lang` */
export function secureKeyGraceLine(lang: string, until: string): string {
  const l: Lang = isLang(lang) ? lang : 'en'
  return tSecureKey(l, 'skGraceBanner', { date: shownDate(until, l) })
}

export function createSecureKeyRuntime(deps: SecureKeyRuntimeDeps): SecureKeyRuntime {
  const { config } = deps
  const onWindows = config.platform === 'win32'
  const path = statePath(deps.userData)
  let found: FindResult | null = null
  let lastVolumes: UsbVolume[] = []
  let current: Registration | null = null
  let grace: string | null = null
  let showing = false
  /** from the start of the run until the gate has decided: a second launch only queues its files */
  let starting = true
  let lockedNow = false
  let stopWatch: (() => void) | null = null

  const lang = (): Lang => {
    const l = deps.lang()
    return isLang(l) ? l : 'en'
  }

  /** one PowerShell run per look: the volumes are kept for the window's list */
  async function look(): Promise<FindResult> {
    const probe: DeviceProbe = {
      listUsbVolumes: async () => {
        lastVolumes = await deps.probe.listUsbVolumes()
        return lastVolumes
      },
      machineGuid: () => deps.probe.machineGuid(),
    }
    found = await findRegistration({
      userData: deps.userData,
      probe,
      keys: config.keys,
      ...(deps.usbDir ? { usbDir: deps.usbDir } : {}),
    })
    return found
  }

  function open(registration: Registration): void {
    current = registration
    deps.unlockAi()
  }

  /** the state record of this key, or null when it names another key */
  function stateOf(registration: Registration): SecureKeyState | null {
    const state = readState(path)
    return state && state.keyId === registration.key.keyId ? state : null
  }

  function verdictOf(registration: Registration, state: SecureKeyState | null): StatusVerdict {
    const last = state?.status ? verifySigned(state.status, config.keys, isStatusPayload) : null
    return judgeStatus({
      now: deps.now(),
      activatedAt: registration.activation.activatedAt,
      last: last && last.keyId === registration.key.keyId ? last : null,
    })
  }

  /** ask tenai.kr, keep a good answer, and return the verdict it gives */
  async function checkStatus(registration: Registration): Promise<StatusVerdict | null> {
    const signed = await fetchStatus({
      server: config.server,
      keyId: registration.key.keyId,
      keys: config.keys,
      fetch: deps.fetch,
    })
    if (!signed) return null
    const state: SecureKeyState = {
      keyId: registration.key.keyId,
      where: registration.where,
      status: signed,
      checkedAt: deps.now().toISOString(),
    }
    await writeState(path, state).catch(() => undefined)
    return verdictOf(registration, state)
  }

  async function decide(): Promise<GateDecision> {
    const result = await look()
    let state = readState(path)
    let status: StatusVerdict | null = null
    if (result.kind === 'found') {
      const own = stateOf(result.registration)
      status = verdictOf(result.registration, own)
      // a key past its 30 days gets one try at the server before the lock screen
      if (!status.ok && status.reason === 'stale') {
        status = (await checkStatus(result.registration)) ?? status
      }
      state = own ?? state
    }
    return decideGate({ config, now: deps.now(), found: result, state, status })
  }

  function uiState(decision: GateDecision): SecureKeyUiState {
    const l = lang()
    const until = decision.kind === 'register' ? decision.until : null
    const strings = secureKeyStrings(l, { date: shownDate(config.requiredFrom, l) })
    // [Later] names the last day the app opens without a key (spec 7-9)
    strings.skLater = tSecureKey(l, 'skLater', { date: shownDate(config.requiredFrom, l, -1) })
    return {
      mode: decision.kind === 'register' ? 'register' : 'lock',
      optional: decision.kind === 'register' && decision.optional,
      until,
      reason: decision.kind === 'locked' ? decision.reason : null,
      usbLetters: lastVolumes.map((v) => v.letter),
      keyFileName: null,
      busy: false,
      error: null,
      lang: l,
      strings,
    }
  }

  function lockNow(decision: GateDecision): void {
    const reason: LockReason = decision.kind === 'locked' ? decision.reason : 'usb-missing'
    const first = !lockedNow
    lockedNow = true
    if (first) {
      deps.lockAi()
      deps.onLocked?.(reason)
    }
    deps.overlays?.show(uiState(decision.kind === 'locked' ? decision : { kind: 'locked', reason }))
  }

  function unlockNow(registration: Registration): void {
    const wasLocked = lockedNow
    lockedNow = false
    if (registration !== current) watch(registration)
    open(registration)
    if (wasLocked) deps.overlays?.hide()
  }

  /** look again after a change: open when the key passes, else keep the lock with the new reason */
  async function recheck(): Promise<GateDecision> {
    const decision = await decide()
    if (decision.kind === 'open') unlockNow(decision.registration)
    else if (decision.kind !== 'skip') lockNow(decision)
    return decision
  }

  /** watch the registration's stick (or PC folder) while the app runs (spec 7-4) */
  function watch(registration: Registration): void {
    stopWatch?.()
    stopWatch = (deps.startWatch ?? startPresenceWatch)({
      activationPath: join(registration.dir, KEY_FILES.activation),
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

  function backgroundCheck(registration: Registration): void {
    if (!statusDue(stateOf(registration), deps.now())) return
    void checkStatus(registration).then((verdict) => {
      if (!verdict || verdict.ok || current !== registration) return
      lockNow({ kind: 'locked', reason: verdict.reason })
    })
  }

  const handlers: SecureKeyWindowHandlers = {
    async register(keyFile: string, target: SecureKeyRegisterTarget) {
      const result = await registerKey({
        userData: deps.userData,
        keyFile,
        target,
        probe: deps.probe,
        config,
        fetch: deps.fetch,
        ...(deps.usbDir ? { usbDir: deps.usbDir } : {}),
        // the AI keys stay sealed with the vault of the registration being replaced
        vault: current?.vault ?? null,
      })
      if (!result.ok) return tSecureKey(lang(), REGISTER_ERROR_TEXT[result.error])
      open(result.registration)
      deps.onRegistered?.(result.registration)
      return null
    },
    async retry() {
      const decision = await decide()
      if (decision.kind === 'open') {
        open(decision.registration)
        return 'passed'
      }
      if (decision.kind === 'skip') return 'passed'
      return uiState(decision)
    },
  }

  return {
    async openQuietly() {
      if (!onWindows) return
      // nobody registered on this PC: no tools run, the v1 keys stay as they are
      const state = readState(path)
      if (!state) return
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
    graceUntil: () => grace,
    pending: () => starting || showing,
    registration: () => current,
    closeWindow: () => deps.closeWindow(),
    locked: () => lockedNow,
    async retryLock() {
      const decision = await recheck()
      if (decision.kind === 'open' || decision.kind === 'skip') return 'passed'
      return uiState(decision)
    },
  }

  async function gate(): Promise<'continue' | 'quit'> {
    if (!onWindows || !config.requireKey) return 'continue'
    let decision: GateDecision
    if (found?.kind === 'found') {
      const registration = found.registration
      const status = verdictOf(registration, stateOf(registration))
      decision =
        status.ok || status.reason !== 'stale'
          ? decideGate({ config, now: deps.now(), found, state: readState(path), status })
          : await decide()
    } else {
      decision = await decide()
    }
    if (decision.kind === 'skip') return 'continue'
    if (decision.kind === 'open') {
      open(decision.registration)
      watch(decision.registration)
      backgroundCheck(decision.registration)
      return 'continue'
    }
    showing = true
    let answer: SecureKeyWindowResult
    try {
      answer = await deps.showWindow(uiState(decision), handlers)
    } finally {
      showing = false
    }
    if (answer === 'quit') return 'quit'
    if (answer === 'later') {
      grace = config.requiredFrom
      return 'continue'
    }
    if (current) {
      watch(current)
      backgroundCheck(current)
    }
    return 'continue'
  }
}
