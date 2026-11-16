/**
 * The 3D view's picture for File › Export › PNG: always on the light colours,
 * without the selection and the handles, and the screen comes back as it was.
 */
import { describe, expect, it } from 'vitest'
import { CANVAS_COLORS, type CanvasColors } from '../src/renderer/scene/canvas-colors'
import { snapshotPng, type SnapshotTarget } from '../src/renderer/scene/snapshot'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

function target(blob: Blob | null) {
  const log: string[] = []
  let colors: CanvasColors = CANVAS_COLORS.dark
  const canvas = document.createElement('canvas')
  canvas.toBlob = (done: BlobCallback, type?: string) => {
    log.push(`toBlob ${type} on ${colors === CANVAS_COLORS.light ? 'light' : 'dark'}`)
    // the browser copies the picture now and hands it over later
    setTimeout(() => done(blob), 0)
  }
  const t: SnapshotTarget = {
    canvas,
    colors: () => colors,
    paint: (next) => {
      colors = next
      log.push(`paint ${next === CANVAS_COLORS.light ? 'light' : 'dark'}`)
    },
    draw: () => void log.push('draw'),
    overlays: (visible) => void log.push(`overlays ${visible}`),
  }
  return { t, log, colors: () => colors }
}

describe('the PNG snapshot', () => {
  it('draws one frame on the light colours and puts the dark theme back', async () => {
    const { t, log, colors } = target(new Blob([PNG], { type: 'image/png' }))
    const bytes = await snapshotPng(t)
    expect([...bytes]).toEqual([...PNG])
    expect(log).toEqual([
      'overlays false',
      'paint light',
      'draw',
      'toBlob image/png on light',
      'paint dark',
      'overlays true',
      'draw',
    ])
    expect(colors()).toBe(CANVAS_COLORS.dark)
  })

  it('fails when the browser gives no picture, and the screen is still restored', async () => {
    const { t, log, colors } = target(null)
    await expect(snapshotPng(t)).rejects.toThrow(/png/i)
    expect(colors()).toBe(CANVAS_COLORS.dark)
    expect(log.at(-1)).toBe('draw')
  })

  it('a light screen is drawn on the light colours without a change of theme', async () => {
    const { t, log } = target(new Blob([PNG]))
    t.paint(CANVAS_COLORS.light)
    log.length = 0
    await snapshotPng(t)
    expect(log.filter((l) => l.startsWith('toBlob'))).toEqual(['toBlob image/png on light'])
  })
})
