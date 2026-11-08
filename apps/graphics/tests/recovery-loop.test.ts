/**
 * 복구 사본 주기(화면 쪽): 바뀐 문서만, 저장이나 AI 실행 중이 아닐 때, 문서를 건드리지 않고
 * 받은 바이트를 main에 넘긴다. 사본에서 연 문서는 "바뀜"으로 표시한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startRecoveryLoop, RECOVERY_INTERVAL_MS } from '../src/renderer/doc/recovery-loop'
import type { RecoveryLoopOptions } from '../src/renderer/doc/recovery-loop'

function setup(over: { restored?: boolean; ext?: string } = {}) {
  let dirty = false
  let busy = false
  let revision = 1
  const copyNow: Array<() => void> = []
  const resets: Array<() => void> = []
  const adapter = {
    recoveryBytes: vi.fn(async () => ({
      bytes: new Uint8Array([revision]),
      ext: over.ext ?? 'psd',
    })),
    revision: vi.fn(async () => revision),
  }
  const dirtyState = {
    current: () => dirty,
    saveFailed: vi.fn(() => {
      dirty = true
    }),
  }
  const api = {
    writeRecoveryCopy: vi.fn(async () => 'written' as const),
    recoveryRestored: vi.fn(async () => over.restored === true),
    onRecoveryCopyNow: (handler: () => void) => {
      copyNow.push(handler)
      return () => copyNow.splice(copyNow.indexOf(handler), 1)
    },
    recoveryCopyNowDone: vi.fn(),
    onRecoveryReset: (handler: () => void) => {
      resets.push(handler)
      return () => resets.splice(resets.indexOf(handler), 1)
    },
  }
  const options: RecoveryLoopOptions = {
    adapter,
    dirty: dirtyState,
    busy: () => busy,
    api,
  }
  const stop = startRecoveryLoop(options)
  return {
    adapter,
    api,
    dirtyState,
    stop,
    copyNow,
    resets,
    setDirty: (value: boolean) => (dirty = value),
    setBusy: (value: boolean) => (busy = value),
    edit: () => (revision += 1),
  }
}

const tick = () => vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS)

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('startRecoveryLoop', () => {
  it('runs every 30 to 60 seconds', () => {
    expect(RECOVERY_INTERVAL_MS).toBeGreaterThanOrEqual(30_000)
    expect(RECOVERY_INTERVAL_MS).toBeLessThanOrEqual(60_000)
  })

  it('writes a copy of a changed document', async () => {
    const loop = setup()
    loop.setDirty(true)
    await tick()
    expect(loop.api.writeRecoveryCopy).toHaveBeenCalledTimes(1)
    expect(loop.api.writeRecoveryCopy).toHaveBeenCalledWith({
      bytes: new Uint8Array([1]),
      ext: 'psd',
    })
    loop.stop()
  })

  it('writes nothing for a clean document', async () => {
    const loop = setup()
    await tick()
    await tick()
    expect(loop.adapter.recoveryBytes).not.toHaveBeenCalled()
    expect(loop.api.writeRecoveryCopy).not.toHaveBeenCalled()
    loop.stop()
  })

  it('skips the round while a save or an AI run holds the document', async () => {
    const loop = setup()
    loop.setDirty(true)
    loop.setBusy(true)
    await tick()
    expect(loop.adapter.recoveryBytes).not.toHaveBeenCalled()
    loop.setBusy(false)
    await tick()
    expect(loop.api.writeRecoveryCopy).toHaveBeenCalledTimes(1)
    loop.stop()
  })

  it('drops bytes taken while a save started meanwhile', async () => {
    const loop = setup()
    loop.setDirty(true)
    loop.adapter.recoveryBytes.mockImplementationOnce(async () => {
      loop.setBusy(true)
      return { bytes: new Uint8Array([9]), ext: 'psd' }
    })
    await tick()
    expect(loop.api.writeRecoveryCopy).not.toHaveBeenCalled()
    loop.stop()
  })

  it('does not write the same revision twice, until main says the copy went (save)', async () => {
    const loop = setup()
    loop.setDirty(true)
    await tick()
    await tick()
    expect(loop.api.writeRecoveryCopy).toHaveBeenCalledTimes(1)
    loop.edit()
    await tick()
    expect(loop.api.writeRecoveryCopy).toHaveBeenCalledTimes(2)
    // a save deleted the copy; the document is still changed
    for (const reset of loop.resets) reset()
    await tick()
    expect(loop.api.writeRecoveryCopy).toHaveBeenCalledTimes(3)
    loop.stop()
  })

  it('stops for good', async () => {
    const loop = setup()
    loop.setDirty(true)
    loop.stop()
    await tick()
    expect(loop.api.writeRecoveryCopy).not.toHaveBeenCalled()
    expect(loop.copyNow).toHaveLength(0)
    expect(loop.resets).toHaveLength(0)
  })

  it('marks a document opened from a copy as changed', async () => {
    const loop = setup({ restored: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(loop.dirtyState.saveFailed).toHaveBeenCalledTimes(1)
    loop.stop()
  })

  it('leaves a plain document alone', async () => {
    const loop = setup()
    await vi.advanceTimersByTimeAsync(0)
    expect(loop.dirtyState.saveFailed).not.toHaveBeenCalled()
    loop.stop()
  })

  it('writes at once when the OS is ending the session, then answers', async () => {
    const loop = setup()
    loop.setDirty(true)
    loop.setBusy(true)
    loop.copyNow[0]!()
    await vi.advanceTimersByTimeAsync(0)
    expect(loop.api.writeRecoveryCopy).toHaveBeenCalledTimes(1)
    expect(loop.api.recoveryCopyNowDone).toHaveBeenCalledTimes(1)
    loop.stop()
  })

  it('a failed copy does not stop the loop', async () => {
    const loop = setup()
    loop.setDirty(true)
    loop.api.writeRecoveryCopy.mockRejectedValueOnce(new Error('disk full'))
    await tick()
    await tick()
    expect(loop.api.writeRecoveryCopy).toHaveBeenCalledTimes(2)
    loop.stop()
  })
})
