/**
 * The measuring tool: two clicks read a distance, a click on a DXF circle
 * reads its diameter, and the reading goes away when the drawing changes or
 * Esc is pressed, so it never points at a part that is gone.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  CadHistory,
  addPart,
  addShape,
  createDocument,
  createKernel,
  evaluateDocument,
  meshBounds,
  newId,
  type CadDocument,
  type DrawingEntity,
  type Kernel,
  type Vec3,
} from '@genoffice/cad-engine'
import {
  MeasureTool,
  bindMeasure,
  measureEntities,
  measureSnaps,
} from '../src/renderer/measure/measure-tool'

let kernel: Promise<Kernel> | null = null
const sharedKernel = (): Promise<Kernel> => (kernel ??= createKernel())

function drawingDoc(entities: DrawingEntity[], position: Vec3 = [0, 0, 0]): CadDocument {
  return addPart(createDocument(), {
    id: newId(),
    type: 'drawing',
    name: 'plan',
    role: 'solid',
    color: '#000000',
    position,
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    entities,
  })
}

async function boxTool(): Promise<{ tool: MeasureTool; min: Vec3; max: Vec3 }> {
  const doc = addShape(createDocument(), 'box', {
    name: 'Box',
    dims: { width: 80, depth: 50, height: 30 },
  }).doc
  const evaluated = evaluateDocument(doc, await sharedKernel())
  const b = meshBounds(evaluated[0]!.mesh!)
  return {
    tool: new MeasureTool(
      () => measureSnaps(doc, evaluated),
      () => measureEntities(doc),
    ),
    min: b.min as Vec3,
    max: b.max as Vec3,
  }
}

describe('MeasureTool', () => {
  it('two clicks on box corners read the edge length', async () => {
    const { tool, min, max } = await boxTool()
    // a little off each corner: the clicks stick to the corners
    expect(tool.click([min[0] + 0.4, min[1] + 0.3, max[2]], 2)).toBeNull()
    expect(tool.first()).toEqual([min[0], min[1], max[2]])
    const reading = tool.click([max[0] - 0.5, min[1], max[2] - 0.2], 2)
    expect(reading).not.toBeNull()
    expect(reading!.length).toBeCloseTo(80, 6)
    expect(reading!.label).toBe('80 mm')
    expect(reading!.a).toEqual([min[0], min[1], max[2]])
    expect(reading!.b).toEqual([max[0], min[1], max[2]])
    expect(tool.reading()).toEqual(reading)
    // the hover marker shows the corner it would stick to
    expect(tool.hover([max[0], max[1] - 1, max[2]], 2)?.at).toEqual([max[0], max[1], max[2]])
    // the next click starts a new measurement
    expect(tool.click([max[0], max[1], 0], 2)).toBeNull()
    expect(tool.reading()).toBeNull()
  })

  it('clicking a DXF circle reads its diameter with ⌀', () => {
    const doc = drawingDoc([{ kind: 'circle', center: [10, 0], radius: 25, layer: '0' }], [5, 5, 0])
    const tool = new MeasureTool(
      () => measureSnaps(doc, []),
      () => measureEntities(doc),
    )
    // on the outline, right of the placed centre (15, 5)
    const reading = tool.click([15 + 25.3, 5, 0], 1)
    expect(reading).not.toBeNull()
    expect(reading!.kind).toBe('diameter')
    expect(reading!.length).toBe(50)
    expect(reading!.label).toBe('⌀50 mm')
    // a DXF line reads its length
    const lines = drawingDoc([{ kind: 'line', a: [0, 0], b: [0, 42.5], layer: '0' }])
    const lineTool = new MeasureTool(
      () => measureSnaps(lines, []),
      () => measureEntities(lines),
    )
    expect(lineTool.click([0.2, 10, 0], 1)?.label).toBe('42.5 mm')
  })

  it('a change to the document clears the reading', async () => {
    const { tool, min, max } = await boxTool()
    const history = new CadHistory(createDocument())
    const off = bindMeasure(tool, { history, keys: window, onExit: vi.fn() })
    tool.click([min[0], min[1], max[2]], 2)
    tool.click([max[0], min[1], max[2]], 2)
    expect(tool.reading()).not.toBeNull()
    history.edit('add', (d) => addShape(d, 'box').doc)
    expect(tool.reading()).toBeNull()
    tool.click([min[0], min[1], max[2]], 2)
    expect(tool.first()).not.toBeNull()
    // an undo is a change too
    history.undo()
    expect(tool.first()).toBeNull()
    off()
  })

  it('Esc clears the reading', async () => {
    const { tool, min, max } = await boxTool()
    const history = new CadHistory(createDocument())
    const onExit = vi.fn()
    const off = bindMeasure(tool, { history, keys: window, onExit })
    const changed = vi.fn()
    tool.subscribe(changed)
    tool.click([min[0], min[1], max[2]], 2)
    tool.click([max[0], min[1], max[2]], 2)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(tool.reading()).toBeNull()
    expect(changed).toHaveBeenCalled()
    expect(onExit).not.toHaveBeenCalled()
    // with nothing left to clear, Esc leaves the tool
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onExit).toHaveBeenCalledTimes(1)
    off()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
