import { describe, expect, it, vi } from 'vitest'
import { TREND_CHANNELS, type TrendApi } from '../src/shared/trend-api'

/**
 * The trend card's bridge (spec 7.11, plan Task 7): Home reads the stored
 * forecast and opens its links only through window.aiOfficeTrend, and
 * whatever crosses the bridge is checked again on this side.
 */

const electronMocks = vi.hoisted(() => ({
  exposed: new Map<string, unknown>(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (name: string, api: unknown) => electronMocks.exposed.set(name, api),
  },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    send: vi.fn(),
    on: electronMocks.on,
    removeListener: electronMocks.removeListener,
  },
  webUtils: { getPathForFile: () => '' },
}))

import '../src/preload/index'

describe('trend preload API', () => {
  const api = electronMocks.exposed.get('aiOfficeTrend') as TrendApi

  it('is exposed as window.aiOfficeTrend', () => {
    expect(api).toBeTruthy()
  })

  it('asks for the snapshot and drops a broken forecast', async () => {
    electronMocks.invoke.mockResolvedValueOnce({ available: true, forecast: { schema: 2 } })
    await expect(api.get()).resolves.toEqual({ available: true, forecast: null })
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(TREND_CHANNELS.get)
  })

  it('hands a checked snapshot to the change listener and can stop listening', () => {
    const seen: unknown[] = []
    const off = api.onChanged((s) => seen.push(s))
    const [channel, listener] = electronMocks.on.mock.calls.at(-1) as [
      string,
      (e: unknown, v: unknown) => void,
    ]
    expect(channel).toBe(TREND_CHANNELS.changed)
    listener({}, { available: 'yes', forecast: 'junk' })
    expect(seen).toEqual([{ available: false, forecast: null }])
    off()
    expect(electronMocks.removeListener).toHaveBeenCalledWith(TREND_CHANNELS.changed, listener)
  })

  it('opens a path or the front page, and nothing else', async () => {
    electronMocks.invoke.mockResolvedValue(undefined)
    await api.open('/fx')
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(TREND_CHANNELS.open, '/fx')
    await api.open(null)
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(TREND_CHANNELS.open, null)
    electronMocks.invoke.mockClear()
    await api.open(3 as never)
    expect(electronMocks.invoke).not.toHaveBeenCalled()
  })
})
