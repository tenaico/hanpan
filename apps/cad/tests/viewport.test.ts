/**
 * The 3D view on a PC that cannot make a WebGL context, and the colour table
 * the view reads per theme.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createViewport } from '../src/renderer/scene/viewport'
import { CANVAS_COLORS } from '../src/renderer/scene/canvas-colors'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the 3D view', () => {
  it('returns null when WebGL cannot be created', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    // three reports the failure on the console before it throws
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const host = document.createElement('div')
    document.body.append(host)
    expect(createViewport(host, 'light')).toBeNull()
    // nothing is left behind in the host: the screen shows the explanation instead
    expect(host.querySelector('canvas')).toBeNull()
    host.remove()
  })

  it('canvas colours have both themes and only #rrggbb values', () => {
    expect(Object.keys(CANVAS_COLORS).sort()).toEqual(['dark', 'light'])
    for (const theme of ['light', 'dark'] as const) {
      const colors = CANVAS_COLORS[theme]
      expect(Object.keys(colors).sort()).toEqual(['background', 'grid', 'gridMajor', 'plane'])
      for (const [name, value] of Object.entries(colors)) {
        expect(value, `${theme}.${name}`).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
    // the two themes differ, or there would be no reason for the table
    expect(CANVAS_COLORS.dark.background).not.toBe(CANVAS_COLORS.light.background)
  })
})
