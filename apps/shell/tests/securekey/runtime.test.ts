import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SecureKeyUiState } from '../../src/shared/securekey-api'
import { deviceIdHash, usbDeviceId, type UsbVolume } from '../../src/main/securekey/devices'
import type { ActivationPayload, StatusPayload } from '../../src/main/securekey/format'
import type { GateConfig } from '../../src/main/securekey/gate'
import { createSecureKeyRuntime } from '../../src/main/securekey/runtime'
import { newVaultKey, writeRegistration } from '../../src/main/securekey/store'
import { readState, statePath, writeState } from '../../src/main/securekey/status'
import type {
  SecureKeyWindowHandlers,
  SecureKeyWindowResult,
} from '../../src/main/securekey/window'
import { makeTestSigner } from './test-signer'

const signer = makeTestSigner()
const E: UsbVolume = { letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' }

let root: string
let userData: string
let volumes: UsbVolume[]
let now: Date
let windowCalls: Array<{ state: SecureKeyUiState; handlers: SecureKeyWindowHandlers }>
let windowAnswer: SecureKeyWindowResult
let statusAnswer: StatusPayload | null
let lockAi: ReturnType<typeof vi.fn>
let unlockAi: ReturnType<typeof vi.fn>
let closeWindow: ReturnType<typeof vi.fn>

const config = (patch: Partial<GateConfig> = {}): GateConfig => ({
  platform: 'win32',
  requireKey: true,
  requiredFrom: '2026-12-04',
  server: 'https://keys.test',
  keys: signer.keys,
  ...patch,
})
const usbDir = (letter: string) => join(root, `usb-${letter}`, 'Hanpan')

const fakeFetch = (async (url: string | URL | Request) => {
  if (String(url).includes('/keys/status') && statusAnswer) {
    return new Response(JSON.stringify(signer.sign(statusAnswer)))
  }
  return new Response('{}', { status: 503 })
}) as typeof fetch

function runtime(patch: Partial<GateConfig> = {}) {
  return createSecureKeyRuntime({
    config: config(patch),
    userData,
    probe: { listUsbVolumes: async () => volumes, machineGuid: async () => 'guid-1' },
    fetch: fakeFetch,
    now: () => now,
    lang: () => 'ko',
    showWindow: async (state, handlers) => {
      windowCalls.push({ state, handlers })
      return windowAnswer
    },
    closeWindow,
    lockAi,
    unlockAi,
    usbDir,
  })
}

const activation = (): ActivationPayload => ({
  v: 1,
  keyId: 'k1',
  memberId: 'm1',
  deviceType: 'usb',
  deviceId: deviceIdHash(usbDeviceId(E)),
  activatedAt: '2026-11-20T00:00:00Z',
})

async function registerOnE() {
  const vault = newVaultKey()
  await writeRegistration(usbDir('E'), {
    key: signer.sign({
      v: 1,
      kid: 'test1',
      memberId: 'm1',
      keyId: 'k1',
      issuedAt: '2026-11-20T00:00:00Z',
    }),
    activation: signer.sign(activation()),
    vault,
  })
  await writeState(statePath(userData), { keyId: 'k1', where: 'usb' })
  return vault
}

const flush = () => new Promise((r) => setTimeout(r, 20))

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'securekey-runtime-'))
  userData = join(root, 'userData')
  volumes = []
  now = new Date('2026-11-25T09:00:00Z')
  windowCalls = []
  windowAnswer = 'quit'
  statusAnswer = null
  lockAi = vi.fn()
  unlockAi = vi.fn()
  closeWindow = vi.fn()
})

describe('openQuietly', () => {
  it('opens quietly and unlocks AI when the registered stick is there', async () => {
    const vault = await registerOnE()
    volumes = [E]
    const rt = runtime()
    await rt.openQuietly()
    expect(rt.vault()?.equals(vault)).toBe(true)
    expect(unlockAi).toHaveBeenCalledTimes(1)
    expect(lockAi).not.toHaveBeenCalled()
  })

  it('locks AI at startup when a registration is known but the stick is missing', async () => {
    await registerOnE()
    const rt = runtime()
    await rt.openQuietly()
    expect(rt.vault()).toBeNull()
    expect(lockAi).toHaveBeenCalledTimes(1)
  })

  it('leaves an unregistered PC alone', async () => {
    const listUsb = vi.fn(async () => [E])
    const rt = createSecureKeyRuntime({
      config: config(),
      userData,
      probe: { listUsbVolumes: listUsb, machineGuid: async () => null },
      fetch: fakeFetch,
      now: () => now,
      lang: () => 'ko',
      showWindow: async () => 'quit',
      closeWindow,
      lockAi,
      unlockAi,
      usbDir,
    })
    await rt.openQuietly()
    expect(lockAi).not.toHaveBeenCalled()
    expect(unlockAi).not.toHaveBeenCalled()
    // nobody registered here: no PowerShell run at all
    expect(listUsb).not.toHaveBeenCalled()
  })

  it('does nothing outside Windows', async () => {
    await registerOnE()
    const rt = runtime({ platform: 'darwin' })
    await rt.openQuietly()
    expect(lockAi).not.toHaveBeenCalled()
    expect(await rt.runGate()).toBe('continue')
    expect(windowCalls).toHaveLength(0)
  })

  it('still opens the vault in a build without the key but never locks there', async () => {
    const vault = await registerOnE()
    volumes = [E]
    const rt = runtime({ requireKey: false })
    await rt.openQuietly()
    expect(rt.vault()?.equals(vault)).toBe(true)
    volumes = []
    const rt2 = runtime({ requireKey: false })
    await rt2.openQuietly()
    expect(lockAi).not.toHaveBeenCalled()
    expect(await rt2.runGate()).toBe('continue')
  })
})

describe('runGate', () => {
  it('passes a registered stick without a window', async () => {
    await registerOnE()
    volumes = [E]
    const rt = runtime()
    await rt.openQuietly()
    expect(await rt.runGate()).toBe('continue')
    expect(windowCalls).toHaveLength(0)
    expect(rt.graceUntil()).toBeNull()
  })

  it('shows the register window with later during the grace', async () => {
    volumes = [E]
    windowAnswer = 'later'
    const rt = runtime()
    await rt.openQuietly()
    expect(await rt.runGate()).toBe('continue')
    const shown = windowCalls[0]!.state
    expect(shown).toMatchObject({ mode: 'register', optional: true, until: '2026-12-04' })
    expect(shown.usbLetters).toEqual(['E'])
    expect(shown.strings.skLater).toBe('나중에 하기 (12월 3일까지)')
    expect(rt.graceUntil()).toBe('2026-12-04')
  })

  it('quits when the register window is closed after the grace', async () => {
    now = new Date(2026, 11, 4, 9, 0)
    windowAnswer = 'quit'
    const rt = runtime()
    expect(await rt.runGate()).toBe('quit')
    expect(windowCalls[0]!.state.optional).toBe(false)
  })

  it('is pending from the start until the gate has decided', async () => {
    await registerOnE()
    volumes = [E]
    const rt = runtime()
    // a second launch during the quiet open or the gate's lookup must only queue its files
    expect(rt.pending()).toBe(true)
    await rt.openQuietly()
    expect(rt.pending()).toBe(true)
    expect(await rt.runGate()).toBe('continue')
    expect(rt.pending()).toBe(false)
    // outside Windows the gate decides at once
    const mac = runtime({ platform: 'darwin' })
    expect(await mac.runGate()).toBe('continue')
    expect(mac.pending()).toBe(false)
  })

  it('is no longer pending once the gate fails', async () => {
    const rt = createSecureKeyRuntime({
      config: config(),
      userData,
      probe: { listUsbVolumes: async () => [], machineGuid: async () => null },
      fetch: fakeFetch,
      now: () => now,
      lang: () => 'ko',
      showWindow: async () => {
        throw new Error('window failed')
      },
      closeWindow,
      lockAi,
      unlockAi,
      usbDir,
    })
    await expect(rt.runGate()).rejects.toThrow('window failed')
    expect(rt.pending()).toBe(false)
  })

  it('is pending while the window is up and closes it on request', async () => {
    let release: (r: SecureKeyWindowResult) => void = () => {}
    const rt = createSecureKeyRuntime({
      config: config(),
      userData,
      probe: { listUsbVolumes: async () => [], machineGuid: async () => null },
      fetch: fakeFetch,
      now: () => now,
      lang: () => 'ko',
      showWindow: () => new Promise((r) => (release = r)),
      closeWindow,
      lockAi,
      unlockAi,
      usbDir,
    })
    const gate = rt.runGate()
    await flush()
    expect(rt.pending()).toBe(true)
    release('later')
    expect(await gate).toBe('continue')
    expect(rt.pending()).toBe(false)
    rt.closeWindow()
    expect(closeWindow).toHaveBeenCalledTimes(1)
  })

  it('shows the lock window when the registered stick is missing', async () => {
    await registerOnE()
    windowAnswer = 'quit'
    const rt = runtime()
    await rt.openQuietly()
    expect(await rt.runGate()).toBe('quit')
    expect(windowCalls[0]!.state).toMatchObject({ mode: 'lock', reason: 'usb-missing' })
  })

  it('a retry that finds the stick opens the vault and unlocks AI', async () => {
    const vault = await registerOnE()
    const rt = createSecureKeyRuntime({
      config: config(),
      userData,
      probe: { listUsbVolumes: async () => volumes, machineGuid: async () => null },
      fetch: fakeFetch,
      now: () => now,
      lang: () => 'ko',
      showWindow: async (_state, handlers) => {
        expect(await handlers.retry()).toMatchObject({ mode: 'lock', reason: 'usb-missing' })
        volumes = [E]
        expect(await handlers.retry()).toBe('passed')
        return 'passed'
      },
      closeWindow,
      lockAi,
      unlockAi,
      usbDir,
    })
    await rt.openQuietly()
    expect(await rt.runGate()).toBe('continue')
    expect(rt.vault()?.equals(vault)).toBe(true)
    expect(unlockAi).toHaveBeenCalled()
  })

  it('registers through the window and keeps the vault', async () => {
    volumes = [E]
    const keyFile = join(root, 'hanpan.key')
    const { writeFileSync } = await import('node:fs')
    writeFileSync(
      keyFile,
      JSON.stringify(
        signer.sign({
          v: 1,
          kid: 'test1',
          memberId: 'm1',
          keyId: 'k1',
          issuedAt: '2026-11-20T00:00:00Z',
        }),
      ),
    )
    const activate = (async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { deviceId: string }
      return new Response(JSON.stringify(signer.sign({ ...activation(), deviceId: body.deviceId })))
    }) as typeof fetch
    const registered = vi.fn()
    const rt = createSecureKeyRuntime({
      config: config(),
      userData,
      probe: { listUsbVolumes: async () => volumes, machineGuid: async () => null },
      fetch: activate,
      now: () => now,
      lang: () => 'ko',
      showWindow: async (_state, handlers) => {
        expect(await handlers.register(keyFile, { where: 'usb', letter: 'E' })).toBeNull()
        return 'registered'
      },
      closeWindow,
      lockAi,
      unlockAi,
      usbDir,
      onRegistered: registered,
    })
    expect(await rt.runGate()).toBe('continue')
    expect(rt.vault()).toHaveLength(32)
    expect(unlockAi).toHaveBeenCalled()
    expect(registered).toHaveBeenCalledTimes(1)
    expect(rt.graceUntil()).toBeNull()
  })

  it('a new key registered over a revoked one, on the PC this time, keeps its vault', async () => {
    const vault = await registerOnE()
    volumes = [E]
    const { writeFileSync } = await import('node:fs')
    // the last answer said revoked: the gate shows the lock screen and the person registers anew
    await writeState(statePath(userData), {
      keyId: 'k1',
      where: 'usb',
      status: signer.sign({ v: 1, keyId: 'k1', status: 'revoked', serverTime: now.toISOString() }),
      checkedAt: now.toISOString(),
    })
    const newKey = join(root, 'new.key')
    writeFileSync(
      newKey,
      JSON.stringify(
        signer.sign({
          v: 1,
          kid: 'test1',
          memberId: 'm1',
          keyId: 'k2',
          issuedAt: '2026-11-25T00:00:00Z',
        }),
      ),
    )
    const activate = (async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        deviceId: string
        deviceType: 'usb' | 'pc'
        pcConsentAt?: string
      }
      return new Response(
        JSON.stringify(
          signer.sign({
            ...activation(),
            keyId: 'k2',
            deviceType: body.deviceType,
            deviceId: body.deviceId,
            pcConsentAt: body.pcConsentAt,
          }),
        ),
      )
    }) as typeof fetch
    const rt = createSecureKeyRuntime({
      config: config(),
      userData,
      probe: { listUsbVolumes: async () => volumes, machineGuid: async () => 'guid-1' },
      fetch: activate,
      now: () => now,
      lang: () => 'ko',
      showWindow: async (state, handlers) => {
        expect(state).toMatchObject({ mode: 'lock', reason: 'revoked' })
        expect(
          await handlers.register(newKey, { where: 'pc', consentAt: '2026-11-25T09:00:00Z' }),
        ).toBeNull()
        return 'registered'
      },
      closeWindow,
      lockAi,
      unlockAi,
      usbDir,
    })
    await rt.openQuietly()
    expect(await rt.runGate()).toBe('continue')
    expect(rt.registration()?.key.keyId).toBe('k2')
    expect(rt.vault()?.equals(vault)).toBe(true)
  })

  it('turns a register error into a line in the window language', async () => {
    volumes = [E]
    const rt = createSecureKeyRuntime({
      config: config(),
      userData,
      probe: { listUsbVolumes: async () => volumes, machineGuid: async () => null },
      fetch: fakeFetch,
      now: () => now,
      lang: () => 'ko',
      showWindow: async (_state, handlers) => {
        expect(
          await handlers.register(join(root, 'missing.key'), { where: 'usb', letter: 'E' }),
        ).toBe('보안키 파일을 확인할 수 없습니다. tenai.kr에서 받은 hanpan.key인지 확인하세요.')
        return 'quit'
      },
      closeWindow,
      lockAi,
      unlockAi,
      usbDir,
    })
    expect(await rt.runGate()).toBe('quit')
  })

  it('locks right away when the background check says revoked', async () => {
    await registerOnE()
    volumes = [E]
    statusAnswer = { v: 1, keyId: 'k1', status: 'revoked', serverTime: '2026-11-25T08:00:00Z' }
    const locked = vi.fn()
    const rt = createSecureKeyRuntime({
      config: config(),
      userData,
      probe: { listUsbVolumes: async () => volumes, machineGuid: async () => null },
      fetch: fakeFetch,
      now: () => now,
      lang: () => 'ko',
      showWindow: async () => 'quit',
      closeWindow,
      lockAi,
      unlockAi,
      usbDir,
      onLocked: locked,
    })
    await rt.openQuietly()
    expect(await rt.runGate()).toBe('continue')
    await flush()
    expect(lockAi).toHaveBeenCalledTimes(1)
    expect(locked).toHaveBeenCalledWith('revoked')
    expect(readState(statePath(userData))?.status?.payload.status).toBe('revoked')
  })

  it('keeps the last good answer and does not ask again the same day', async () => {
    await registerOnE()
    volumes = [E]
    statusAnswer = { v: 1, keyId: 'k1', status: 'active', serverTime: '2026-11-25T08:59:00Z' }
    const rt = runtime()
    await rt.openQuietly()
    await rt.runGate()
    await flush()
    const state = readState(statePath(userData))
    expect(state?.status?.payload.serverTime).toBe('2026-11-25T08:59:00Z')
    expect(state?.checkedAt).toBe(now.toISOString())
    expect(lockAi).not.toHaveBeenCalled()
  })

  it('locks at the gate when the last answer is more than 30 days old', async () => {
    await registerOnE()
    volumes = [E]
    now = new Date('2026-12-25T09:00:00Z')
    windowAnswer = 'quit'
    const rt = runtime()
    await rt.openQuietly()
    expect(await rt.runGate()).toBe('quit')
    expect(windowCalls[0]!.state).toMatchObject({ mode: 'lock', reason: 'stale' })
  })
})

describe('while running', () => {
  function watched() {
    let report: (present: boolean) => void = () => {}
    const watchOpts: Array<{ activationPath: string; volumeSerial: string | null }> = []
    const stopWatch = vi.fn()
    const overlays = { show: vi.fn(), hide: vi.fn() }
    const locked = vi.fn()
    const rt = createSecureKeyRuntime({
      config: config(),
      userData,
      probe: { listUsbVolumes: async () => volumes, machineGuid: async () => null },
      fetch: fakeFetch,
      now: () => now,
      lang: () => 'ko',
      showWindow: async () => 'quit',
      closeWindow,
      lockAi,
      unlockAi,
      usbDir,
      overlays,
      onLocked: locked,
      startWatch: (opts) => {
        watchOpts.push(opts)
        report = opts.onChange
        return stopWatch
      },
    })
    return { rt, overlays, locked, watchOpts, stopWatch, report: (p: boolean) => report(p) }
  }

  it('locks every window when the stick is removed and opens again when it comes back', async () => {
    await registerOnE()
    volumes = [E]
    statusAnswer = { v: 1, keyId: 'k1', status: 'active', serverTime: '2026-11-25T08:00:00Z' }
    const w = watched()
    await w.rt.openQuietly()
    expect(await w.rt.runGate()).toBe('continue')
    expect(w.watchOpts[0]).toEqual(
      expect.objectContaining({
        activationPath: join(usbDir('E'), 'activation.json'),
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
    expect(w.rt.locked()).toBe(true)

    volumes = [E]
    w.report(true)
    await flush()
    expect(unlockAi).toHaveBeenCalledTimes(1)
    expect(w.overlays.hide).toHaveBeenCalledTimes(1)
    expect(w.rt.locked()).toBe(false)
    expect(w.rt.vault()).toHaveLength(32)
  })

  it('stays locked when another stick comes back on the letter', async () => {
    await registerOnE()
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
    expect(w.overlays.hide).not.toHaveBeenCalled()
    expect(w.overlays.show).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: 'other-device' }),
    )
  })

  it('covers the windows when the background check says revoked', async () => {
    await registerOnE()
    volumes = [E]
    statusAnswer = { v: 1, keyId: 'k1', status: 'revoked', serverTime: '2026-11-25T08:00:00Z' }
    const w = watched()
    await w.rt.openQuietly()
    await w.rt.runGate()
    await flush()
    expect(w.overlays.show).toHaveBeenCalledWith(expect.objectContaining({ reason: 'revoked' }))
    // a revoked key does not open again when the stick is pulled and put back
    w.report(false)
    await flush()
    w.report(true)
    await flush()
    expect(w.overlays.hide).not.toHaveBeenCalled()
  })

  it('retries from the cover', async () => {
    await registerOnE()
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
    expect(w.overlays.hide).toHaveBeenCalledTimes(1)
    expect(w.rt.locked()).toBe(false)
  })
})
