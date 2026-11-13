import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SecureKeyUiState } from '../../src/shared/securekey-api'
import { createKey } from '../../src/main/securekey/create'
import type { UsbVolume } from '../../src/main/securekey/devices'
import type { GateConfig } from '../../src/main/securekey/gate'
import { resetKey } from '../../src/main/securekey/manage'
import { createSecureKeyRuntime } from '../../src/main/securekey/runtime'
import type {
  SecureKeyWindowHandlers,
  SecureKeyWindowResult,
} from '../../src/main/securekey/window'

const E: UsbVolume = { letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' }
const F: UsbVolume = { letter: 'F', diskSerial: 'BB22', volumeSerial: '0000beef' }

let root: string
let userData: string
let volumes: UsbVolume[]
let consented: boolean
let windowCalls: Array<{ state: SecureKeyUiState; handlers: SecureKeyWindowHandlers }>
let windowAnswer: (handlers: SecureKeyWindowHandlers) => Promise<SecureKeyWindowResult>
let lockAi: ReturnType<typeof vi.fn>
let unlockAi: ReturnType<typeof vi.fn>
let closeWindow: ReturnType<typeof vi.fn>
let onRegistered: ReturnType<typeof vi.fn>
let onReset: ReturnType<typeof vi.fn>

const usbDir = (letter: string) => join(root, `usb-${letter}`, 'Hanpan')
const seal = (vault: Buffer) => Buffer.concat([Buffer.from('S'), vault])
const open = (sealed: Buffer) => (sealed[0] === 0x53 ? sealed.subarray(1) : null)
const NOW = new Date('2026-11-25T09:00:00.000Z')

function runtime(
  config: Partial<GateConfig> = {},
  extra: Partial<Parameters<typeof createSecureKeyRuntime>[0]> = {},
) {
  return createSecureKeyRuntime({
    config: { platform: 'win32', requireKey: true, ...config },
    userData,
    probe: { listUsbVolumes: async () => volumes, machineGuid: async () => 'guid-1' },
    now: () => NOW,
    lang: () => 'ko',
    needsConsent: () => !consented,
    acceptConsent: async () => {
      consented = true
    },
    sealPcVault: seal,
    openPcVault: open,
    showWindow: async (state, handlers) => {
      windowCalls.push({ state, handlers })
      return windowAnswer(handlers)
    },
    closeWindow,
    lockAi,
    unlockAi,
    onRegistered,
    onReset,
    usbDir,
    ...extra,
  })
}

async function keyOnE() {
  const made = await createKey({
    userData,
    target: { where: 'usb', letter: 'E' },
    volumes: [E],
    now: NOW,
    usbDir,
    sealPcVault: seal,
  })
  if (!made.ok) throw new Error('key')
  return made.registration
}

const flush = () => new Promise((r) => setTimeout(r, 20))

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'securekey-runtime-'))
  userData = join(root, 'userData')
  volumes = []
  consented = true
  windowCalls = []
  windowAnswer = async () => 'quit'
  lockAi = vi.fn()
  unlockAi = vi.fn()
  closeWindow = vi.fn()
  onRegistered = vi.fn()
  onReset = vi.fn(async () => undefined)
})

describe('openQuietly', () => {
  it('opens quietly and unlocks AI when the registered stick is there', async () => {
    const reg = await keyOnE()
    volumes = [E]
    const rt = runtime()
    await rt.openQuietly()
    expect(rt.vault()?.equals(reg.vault)).toBe(true)
    expect(unlockAi).toHaveBeenCalledTimes(1)
    expect(lockAi).not.toHaveBeenCalled()
  })

  it('locks AI at startup when a key is known but the stick is missing', async () => {
    await keyOnE()
    const rt = runtime()
    await rt.openQuietly()
    expect(rt.vault()).toBeNull()
    expect(lockAi).toHaveBeenCalledTimes(1)
  })

  it('leaves an unregistered PC alone', async () => {
    const listed = vi.fn(async () => volumes)
    const rt = runtime({}, { probe: { listUsbVolumes: listed, machineGuid: async () => null } })
    await rt.openQuietly()
    expect(listed).not.toHaveBeenCalled()
    expect(lockAi).not.toHaveBeenCalled()
  })

  it('does nothing outside Windows', async () => {
    await keyOnE()
    volumes = [E]
    const rt = runtime({ platform: 'darwin' })
    await rt.openQuietly()
    expect(rt.vault()).toBeNull()
  })

  it('still opens the vault in a build without the key but never locks there', async () => {
    await keyOnE()
    const rt = runtime({ requireKey: false })
    await rt.openQuietly()
    expect(lockAi).not.toHaveBeenCalled()
    volumes = [E]
    await rt.openQuietly()
    expect(rt.vault()).toHaveLength(32)
  })
})

describe('runGate', () => {
  it('asks for the terms first, then for a key', async () => {
    consented = false
    let next: SecureKeyUiState | 'passed' | null = null
    windowAnswer = async (h) => {
      next = await h.acceptTerms()
      return 'quit'
    }
    const rt = runtime()
    expect(await rt.runGate()).toBe('quit')
    expect(windowCalls[0]!.state.mode).toBe('terms')
    expect(consented).toBe(true)
    expect(next).toMatchObject({ mode: 'create' })
  })

  it('asks only for the terms outside Windows', async () => {
    consented = false
    let next: SecureKeyUiState | 'passed' | null = null
    windowAnswer = async (h) => {
      next = await h.acceptTerms()
      return 'passed'
    }
    const rt = runtime({ platform: 'linux' })
    expect(await rt.runGate()).toBe('continue')
    expect(windowCalls[0]!.state.mode).toBe('terms')
    expect(next).toBe('passed')
  })

  it('passes a registered stick without a window', async () => {
    await keyOnE()
    volumes = [E]
    const rt = runtime()
    await rt.openQuietly()
    expect(await rt.runGate()).toBe('continue')
    expect(windowCalls).toHaveLength(0)
    expect(rt.registration()?.where).toBe('usb')
  })

  it('shows the create step with the sticks plugged in when nothing is registered', async () => {
    volumes = [E, F]
    const rt = runtime()
    expect(await rt.runGate()).toBe('quit')
    expect(windowCalls[0]!.state).toMatchObject({ mode: 'create', usbLetters: ['E', 'F'] })
  })

  it('makes a key through the window and keeps its vault', async () => {
    volumes = [E]
    let error: string | null = 'x'
    windowAnswer = async (h) => {
      error = await h.create({ where: 'usb', letter: 'E' })
      return 'registered'
    }
    const rt = runtime()
    expect(await rt.runGate()).toBe('continue')
    expect(error).toBeNull()
    expect(rt.vault()).toHaveLength(32)
    expect(onRegistered).toHaveBeenCalledTimes(1)
    expect(unlockAi).toHaveBeenCalled()
  })

  it('turns a create error into a line in the window language', async () => {
    volumes = [E]
    let error: string | null = null
    windowAnswer = async (h) => {
      error = await h.create({ where: 'usb', letter: 'G' })
      return 'quit'
    }
    await runtime().runGate()
    expect(error).toBe('고른 USB를 찾을 수 없습니다. USB를 다시 꽂아 주세요.')
  })

  it('shows the wait screen when the registered stick is missing', async () => {
    await keyOnE()
    const rt = runtime()
    await rt.runGate()
    expect(windowCalls[0]!.state).toMatchObject({ mode: 'lock', reason: 'usb-missing' })
  })

  it('names the day a key was made again when an old stick is in', async () => {
    await keyOnE()
    await resetKey({ userData, now: new Date('2026-11-21T06:32:00.000Z') })
    const made = await createKey({
      userData,
      target: { where: 'usb', letter: 'F' },
      volumes: [F],
      now: NOW,
      usbDir,
      sealPcVault: seal,
    })
    expect(made.ok).toBe(true)
    volumes = [E]
    await runtime().runGate()
    const state = windowCalls[0]!.state
    expect(state).toMatchObject({ mode: 'lock', reason: 'replaced' })
    expect(state.strings.skReplaced).toContain('11월 21일')
  })

  it('a retry that finds the stick opens the vault and unlocks AI', async () => {
    await keyOnE()
    let retried: SecureKeyUiState | 'passed' | null = null
    windowAnswer = async (h) => {
      volumes = [E]
      retried = await h.retry()
      return 'passed'
    }
    const rt = runtime()
    expect(await rt.runGate()).toBe('continue')
    expect(retried).toBe('passed')
    expect(rt.vault()).toHaveLength(32)
  })

  it('a new key from the wait screen clears the old AI keys and asks for a key again', async () => {
    await keyOnE()
    volumes = [F]
    let next: SecureKeyUiState | null = null
    windowAnswer = async (h) => {
      next = await h.reset()
      return 'quit'
    }
    await runtime().runGate()
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(next).toMatchObject({ mode: 'create', usbLetters: ['F'] })
  })

  it('is pending while the window is up and closes it on request', async () => {
    let pendingInside = false
    const holder: { rt: ReturnType<typeof runtime> | null } = { rt: null }
    windowAnswer = async () => {
      pendingInside = holder.rt!.pending()
      return 'quit'
    }
    holder.rt = runtime()
    await holder.rt.runGate()
    expect(pendingInside).toBe(true)
    expect(holder.rt.pending()).toBe(false)
    holder.rt.closeWindow()
    expect(closeWindow).toHaveBeenCalledTimes(1)
  })
})

describe('while running', () => {
  function watched() {
    let report: (present: boolean) => void = () => {}
    const watchOpts: Array<{ activationPath: string; volumeSerial: string | null }> = []
    const overlays = { show: vi.fn(), hide: vi.fn() }
    const locked = vi.fn()
    const rt = runtime(
      {},
      {
        overlays,
        onLocked: locked,
        startWatch: (opts) => {
          watchOpts.push(opts)
          report = opts.onChange
          return vi.fn()
        },
      },
    )
    return { rt, overlays, locked, watchOpts, report: (p: boolean) => report(p) }
  }

  it('locks every window when the stick is removed and opens again when it comes back', async () => {
    await keyOnE()
    volumes = [E]
    const w = watched()
    await w.rt.openQuietly()
    expect(await w.rt.runGate()).toBe('continue')
    expect(w.watchOpts[0]).toEqual(
      expect.objectContaining({
        activationPath: join(usbDir('E'), 'hanpan.key'),
        volumeSerial: '1a2b3c4d',
      }),
    )
    lockAi.mockClear()
    unlockAi.mockClear()
    volumes = []
    w.report(false)
    await flush()
    expect(lockAi).toHaveBeenCalledTimes(1)
    expect(w.overlays.show).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'lock', reason: 'usb-missing' }),
    )
    expect(w.locked).toHaveBeenCalledWith('usb-missing')
    volumes = [E]
    w.report(true)
    await flush()
    expect(unlockAi).toHaveBeenCalledTimes(1)
    expect(w.overlays.hide).toHaveBeenCalledTimes(1)
    expect(w.rt.locked()).toBe(false)
  })

  it('stays locked when a copied stick comes back on the letter', async () => {
    await keyOnE()
    volumes = [E]
    const w = watched()
    await w.rt.openQuietly()
    await w.rt.runGate()
    volumes = []
    w.report(false)
    await flush()
    unlockAi.mockClear()
    volumes = [{ ...E, diskSerial: 'ZZ99' }]
    w.report(true)
    await flush()
    expect(unlockAi).not.toHaveBeenCalled()
    expect(w.overlays.show).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: 'unregistered-usb' }),
    )
  })

  it('retries from the cover', async () => {
    await keyOnE()
    volumes = [E]
    const w = watched()
    await w.rt.openQuietly()
    await w.rt.runGate()
    volumes = []
    w.report(false)
    await flush()
    expect(await w.rt.retryLock()).toMatchObject({ reason: 'usb-missing' })
    volumes = [E]
    expect(await w.rt.retryLock()).toBe('passed')
    expect(w.rt.locked()).toBe(false)
  })
})

describe('the key in Settings', () => {
  it('reports the key in use and the sticks to pick from', async () => {
    await keyOnE()
    volumes = [E, F]
    const rt = runtime()
    await rt.openQuietly()
    await rt.runGate()
    expect(await rt.info()).toEqual({
      where: 'usb',
      createdAt: NOW.toISOString(),
      sticks: 1,
      usbLetters: ['E', 'F'],
    })
  })

  it('has nothing to report without a key', async () => {
    expect(await runtime().info()).toBeNull()
  })

  it('adds a spare stick that opens the key too', async () => {
    await keyOnE()
    volumes = [E, F]
    const rt = runtime()
    await rt.openQuietly()
    await rt.runGate()
    expect(await rt.spare('F')).toBe('ok')
    expect(await rt.spare('G')).toBe('no-usb')
    volumes = [F]
    const again = runtime()
    await again.openQuietly()
    expect(again.vault()?.equals(rt.vault()!)).toBe(true)
  })

  it('moves to this PC and no longer needs the stick', async () => {
    await keyOnE()
    volumes = [E]
    const rt = runtime()
    await rt.openQuietly()
    await rt.runGate()
    expect(await rt.moveToPc()).toBe('ok')
    expect(rt.registration()?.where).toBe('pc')
    volumes = []
    const again = runtime()
    await again.openQuietly()
    expect(again.vault()?.equals(rt.vault()!)).toBe(true)
  })
})
