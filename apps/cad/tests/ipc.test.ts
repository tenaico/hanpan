import { describe, expect, it } from 'vitest'
import * as mindmap from '../../mindmap/src/shared/ipc'
import { AI_CHANNELS, APP_CHANNELS, CAD_CHANNELS } from '../src/shared/ipc'

describe('the cad IPC contract', () => {
  it('names every channel of this editor cad:<kebab-case>, once', () => {
    const names = Object.values(CAD_CHANNELS)
    for (const name of names) expect(name).toMatch(/^cad:[a-z-]+$/)
    expect(new Set(names).size).toBe(names.length)
  })

  it('calls the shared channels by the same names as the other editors', () => {
    expect(AI_CHANNELS).toEqual(mindmap.AI_CHANNELS)
    expect(APP_CHANNELS).toEqual(mindmap.APP_CHANNELS)
  })
})
