// @vitest-environment node
/**
 * Drawing an outline on the workplane: points snap to the grid, a shape that
 * cannot be extruded (too few points, edges that cross) is refused with a
 * reason, and a good one becomes one extruded part.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  CadEditError,
  DEFAULT_SOLID_COLOR,
  addPart,
  createDocument,
  createKernel,
  evaluateDocument,
  meshBounds,
  ringArea2,
} from '@genoffice/cad-engine'
import { SketchTool } from '../src/renderer/editing/sketch'

function addAll(tool: SketchTool, points: [number, number][]): void {
  for (const p of points) tool.addPoint(p)
}

function square(tool: SketchTool): void {
  addAll(tool, [
    [0, 0],
    [20, 0],
    [20, 20],
    [0, 20],
  ])
}

function closed(tool: SketchTool): number[] {
  const result = tool.close()
  if (!result.ok) throw new Error(`refused: ${result.reason}`)
  return result.ring
}

describe('SketchTool', () => {
  it('a square sketch makes one extrude part 10 mm high', async () => {
    const tool = new SketchTool(1)
    square(tool)
    const ring = closed(tool)
    const part = tool.toPart(ring, 10)
    expect(part).toMatchObject({
      type: 'extrude',
      name: 'sketch',
      role: 'solid',
      color: DEFAULT_SOLID_COLOR,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      hidden: false,
      locked: false,
      height: 10,
    })
    expect(part.id).toMatch(/^[0-9a-f]{12}$/)
    expect(part.rings).toEqual([ring])
    const doc = addPart(createDocument(), part)
    expect(doc.parts).toHaveLength(1)
    const kernel = await createKernel()
    const [evaluated] = evaluateDocument(doc, kernel)
    expect(evaluated!.issue).toBeNull()
    const box = meshBounds(evaluated!.mesh!)
    expect(box.min[2]).toBeCloseTo(0)
    expect(box.max[2]).toBeCloseTo(10)
    expect(box.max[0] - box.min[0]).toBeCloseTo(20)
    kernel.dispose()
  })

  it('gives a counter-clockwise ring whichever way the points went', () => {
    const tool = new SketchTool(1)
    addAll(tool, [
      [0, 0],
      [0, 20],
      [20, 20],
      [20, 0],
    ])
    const ring = closed(tool)
    expect(ring).toHaveLength(8)
    expect(ringArea2(ring)).toBeGreaterThan(0)
  })

  it('two points refuse with too-few', () => {
    const tool = new SketchTool(1)
    addAll(tool, [
      [0, 0],
      [10, 0],
    ])
    expect(tool.close()).toEqual({ ok: false, reason: 'too-few' })
  })

  it('points on one line refuse with too-few', () => {
    const tool = new SketchTool(1)
    addAll(tool, [
      [0, 0],
      [10, 0],
      [5, 0],
    ])
    expect(tool.close()).toEqual({ ok: false, reason: 'too-few' })
  })

  it('a figure eight refuses with self-crossing', () => {
    const tool = new SketchTool(1)
    addAll(tool, [
      [0, 0],
      [20, 20],
      [20, 0],
      [0, 20],
    ])
    expect(tool.close()).toEqual({ ok: false, reason: 'self-crossing' })
  })

  it('an outline that touches itself at a corner refuses with self-crossing', () => {
    const tool = new SketchTool(1)
    addAll(tool, [
      [0, 0],
      [10, 0],
      [10, 10],
      [20, 10],
      [20, 20],
      [10, 20],
      [10, 10],
      [0, 10],
    ])
    expect(tool.close()).toEqual({ ok: false, reason: 'self-crossing' })
  })

  it('an outline that doubles back on itself refuses with self-crossing', () => {
    const tool = new SketchTool(1)
    addAll(tool, [
      [0, 0],
      [20, 0],
      [20, 20],
      [20, 10],
      [0, 10],
    ])
    expect(tool.close()).toEqual({ ok: false, reason: 'self-crossing' })
  })

  it('points snap to the grid', () => {
    const tool = new SketchTool(5)
    tool.addPoint([1.2, 3.9])
    tool.addPoint([12.4, -0.2])
    expect(tool.points()).toEqual([
      [0, 5],
      [10, 0],
    ])
    expect(Object.is(tool.points()[1]![1], -0)).toBe(false)
  })

  it('ignores a point equal to the last one after snapping', () => {
    const tool = new SketchTool(1)
    tool.addPoint([3, 3])
    tool.addPoint([3.2, 2.9])
    expect(tool.points()).toEqual([[3, 3]])
  })

  it('a last point back on the first one closes the outline without doubling it', () => {
    const tool = new SketchTool(1)
    square(tool)
    tool.addPoint([0, 0])
    expect(closed(tool)).toHaveLength(8)
  })

  it('undoPoint removes the last point and cancel removes them all', () => {
    const tool = new SketchTool(1)
    square(tool)
    tool.undoPoint()
    expect(tool.points()).toEqual([
      [0, 0],
      [20, 0],
      [20, 20],
    ])
    tool.cancel()
    expect(tool.points()).toEqual([])
    tool.undoPoint()
    expect(tool.points()).toEqual([])
  })

  it('tells listeners when the points change', () => {
    const tool = new SketchTool(1)
    const listener = vi.fn()
    const stop = tool.subscribe(listener)
    tool.addPoint([1, 1])
    tool.addPoint([1, 1])
    tool.undoPoint()
    tool.cancel()
    expect(listener).toHaveBeenCalledTimes(2)
    tool.addPoint([1, 1])
    tool.cancel()
    expect(listener).toHaveBeenCalledTimes(4)
    stop()
    tool.addPoint([2, 2])
    expect(listener).toHaveBeenCalledTimes(4)
  })

  it('refuses a height that is not positive or out of range', () => {
    const tool = new SketchTool(1)
    square(tool)
    const ring = closed(tool)
    for (const h of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 1e7]) {
      let error: unknown
      try {
        tool.toPart(ring, h)
      } catch (e) {
        error = e
      }
      expect(error, String(h)).toBeInstanceOf(CadEditError)
      expect((error as CadEditError).code).toBe('bad-number')
    }
  })
})
