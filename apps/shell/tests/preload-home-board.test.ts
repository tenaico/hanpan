import { describe, expect, it, vi } from 'vitest'
import { HOME_CHANNELS, type HomeApi } from '../src/shared/home-api'
import { defaultHomeBoard } from '../src/shared/home-board'

/**
 * The home board's bridge (spec 7.10): Home reads and stores the board only
 * through window.aiOffice, on the two home board channels.
 */

const electronMocks = vi.hoisted(() => ({
  exposed: new Map<string, unknown>(),
  invoke: vi.fn(),
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (name: string, api: unknown) => electronMocks.exposed.set(name, api),
  },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  webUtils: { getPathForFile: () => '' },
}))

import '../src/preload/index'

describe('home board preload API', () => {
  const api = electronMocks.exposed.get('aiOffice') as HomeApi
  const board = defaultHomeBoard({ korean: true, koreanDocs: true, trend: true })

  it('reads the board on the get channel', async () => {
    electronMocks.invoke.mockResolvedValueOnce({ board, trendAvailable: true })
    await expect(api.getHomeBoard!()).resolves.toEqual({ board, trendAvailable: true })
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(HOME_CHANNELS.getHomeBoard)
    expect(HOME_CHANNELS.getHomeBoard).toBe('home:get-home-board')
  })

  it('has no forecast when trendAvailable is not a boolean', async () => {
    electronMocks.invoke.mockResolvedValueOnce({ board, trendAvailable: 'yes' })
    await expect(api.getHomeBoard!()).resolves.toEqual({ board, trendAvailable: false })
    electronMocks.invoke.mockResolvedValueOnce(undefined)
    await expect(api.getHomeBoard!()).resolves.toEqual({ board: null, trendAvailable: false })
  })

  it('sends the board on the set channel', async () => {
    electronMocks.invoke.mockResolvedValueOnce(board)
    await api.setHomeBoard!(board)
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(HOME_CHANNELS.setHomeBoard, board)
    expect(HOME_CHANNELS.setHomeBoard).toBe('home:set-home-board')
  })
})
