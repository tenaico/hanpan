/**
 * What the 3D view draws for a document, as plain data: colours, see-through
 * holes, hidden parts left out, drawing lines, and groups that could not be
 * computed shown with their reason.
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HOLE_COLOR,
  addPart,
  addShape,
  createDocument,
  groupParts,
  makeMesh,
  newId,
  updatePart,
  type CadDocument,
  type DrawingPart,
  type Kernel,
  type MeshPart,
} from '@genoffice/cad-engine'
import { CANVAS_COLORS } from '../src/renderer/scene/canvas-colors'
import { drawingLines, lineColor } from '../src/renderer/scene/drawing-lines'
import { DocEvaluator } from '../src/renderer/scene/evaluator'
import { HOLE_OPACITY, sceneModel } from '../src/renderer/scene/scene-model'

/** Shapes and lone meshes never reach the kernel, nor does a group holding an open mesh. */
const noKernel: Kernel = {
  union: () => {
    throw new Error('the kernel was not expected here')
  },
  subtract: () => {
    throw new Error('the kernel was not expected here')
  },
  dispose: () => {},
}

function items(doc: CadDocument) {
  return sceneModel(doc, new DocEvaluator(noKernel).update(doc))
}

/** One open triangle: not a closed solid. */
function openMesh(): MeshPart {
  return {
    id: newId(),
    type: 'mesh',
    name: 'scan',
    role: 'solid',
    color: '#888888',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    mesh: makeMesh([0, 0, 0, 10, 0, 0, 0, 10, 0], [0, 1, 2]),
    closed: false,
  }
}

function drawing(entities: DrawingPart['entities']): DrawingPart {
  return {
    id: newId(),
    type: 'drawing',
    name: 'plan',
    role: 'solid',
    color: '#5b9bd5',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    entities,
  }
}

describe('sceneModel', () => {
  it('holes are translucent and hidden parts are absent', () => {
    const solid = addShape(createDocument(), 'box', { name: 'Solid', color: '#ff0000' })
    const hole = addShape(solid.doc, 'cylinder', { name: 'Hole', role: 'hole', color: '#00ff00' })
    const ghost = addShape(hole.doc, 'sphere', { name: 'Ghost' })
    const doc = updatePart(ghost.doc, ghost.id, { hidden: true })

    const out = items(doc)
    expect(out.map((i) => i.id)).toEqual([solid.id, hole.id])
    const [s, h] = out
    expect(s!.color).toBe('#ff0000')
    expect(s!.opacity).toBe(1)
    expect(s!.mesh).not.toBeNull()
    // a hole is grey and see-through whatever its own colour
    expect(h!.color).toBe(DEFAULT_HOLE_COLOR)
    expect(h!.opacity).toBe(HOLE_OPACITY)
    expect(HOLE_OPACITY).toBe(0.35)
    expect(out.every((i) => i.selectable)).toBe(true)
  })

  it('a group with an open mesh shows its issue and the rest still draws', () => {
    const box = addShape(createDocument(), 'box', { name: 'Box', position: [60, 0, 0] })
    const scan = openMesh()
    const withScan = addPart(box.doc, scan)
    const inner = addShape(withScan, 'box', { name: 'Inner' })
    const group = groupParts(inner.doc, [scan.id, inner.id])
    const other = addShape(group.doc, 'cone', { name: 'Other', position: [-60, 0, 0] })

    const out = items(other.doc)
    const byId = new Map(out.map((i) => [i.id, i]))
    const bad = byId.get(group.id)!
    expect(bad.issue).toBe('open-mesh')
    expect(bad.mesh).toBeNull()
    // the outline goes around where the group is
    expect(bad.box.max[0]).toBeGreaterThan(bad.box.min[0])
    expect(bad.selectable).toBe(true)
    for (const id of [box.id, other.id]) {
      expect(byId.get(id)!.issue).toBeNull()
      expect(byId.get(id)!.mesh).not.toBeNull()
    }
  })

  it('a drawing becomes lines in its entity colours, placed where the part is', () => {
    const plan: DrawingPart = {
      ...drawing([
        { kind: 'line', a: [0, 0], b: [10, 0], layer: '0', color: '#ff0000' },
        { kind: 'circle', center: [0, 0], radius: 5, layer: '0' },
      ]),
      position: [100, 0, 0],
    }
    const out = items(addPart(createDocument(), plan))
    expect(out).toHaveLength(1)
    const item = out[0]!
    expect(item.mesh).toBeNull()
    expect(item.lines).not.toBeNull()
    expect(item.lines!).toHaveLength(2)
    expect(item.lines![0]!.color).toBe('#ff0000')
    // the line starts at the part's position
    expect(item.lines![0]!.points.slice(0, 3)).toEqual([100, 0, 0])
    // the circle closes on itself
    const ring = item.lines![1]!.points
    expect(ring.slice(-3)).toEqual(ring.slice(0, 3))
    expect(item.lines![1]!.color).toBeNull()
  })

  it('white and uncoloured drawing lines are drawn in the theme ink', () => {
    expect(lineColor('#ffffff', CANVAS_COLORS.light)).toBe(CANVAS_COLORS.light.ink)
    expect(lineColor('#FFFFFF', CANVAS_COLORS.dark)).toBe(CANVAS_COLORS.dark.ink)
    expect(lineColor(null, CANVAS_COLORS.dark)).toBe(CANVAS_COLORS.dark.ink)
    expect(lineColor('#ff0000', CANVAS_COLORS.dark)).toBe('#ff0000')
    expect(CANVAS_COLORS.light.ink).not.toBe(CANVAS_COLORS.dark.ink)
  })

  it('arcs and text become polylines too', () => {
    const lines = drawingLines(
      drawing([
        { kind: 'arc', center: [0, 0], radius: 10, startDeg: 0, endDeg: 90, layer: '0' },
        { kind: 'text', at: [0, 0], height: 5, rotationDeg: 0, value: 'AB', layer: '0' },
      ]),
    )
    expect(lines).toHaveLength(2)
    const arc = lines[0]!.points
    // from (10, 0) to (0, 10)
    expect(arc[0]).toBeCloseTo(10)
    expect(arc[1]).toBeCloseTo(0)
    expect(arc.at(-3)).toBeCloseTo(0)
    expect(arc.at(-2)).toBeCloseTo(10)
  })
})
