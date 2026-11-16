// @vitest-environment node
/**
 * Clicking in the 3D view: the nearest top-level part under the pointer wins,
 * and a click on a part inside a group selects the group.
 */
import { describe, expect, it } from 'vitest'
import {
  addPart,
  addShape,
  createDocument,
  createKernel,
  groupParts,
  newId,
  type CadDocument,
  type DrawingPart,
  type Vec3,
} from '@genoffice/cad-engine'
import { DocEvaluator } from '../src/renderer/scene/evaluator'
import { pickPart, pickPoint, rayToWorkplane } from '../src/renderer/scene/picking'
import { sceneModel } from '../src/renderer/scene/scene-model'

async function itemsOf(doc: CadDocument) {
  return sceneModel(doc, new DocEvaluator(await createKernel()).update(doc))
}

const down = (x: number, y: number): { origin: Vec3; direction: Vec3 } => ({
  origin: [x, y, 500],
  direction: [0, 0, -1],
})

describe('pickPart', () => {
  it('picking a child selects its top-level group', async () => {
    const left = addShape(createDocument(), 'box', { name: 'L', position: [-30, 0, 0] })
    const right = addShape(left.doc, 'box', { name: 'R', position: [30, 0, 0] })
    const lone = addShape(right.doc, 'sphere', { name: 'S', position: [0, 60, 0] })
    const group = groupParts(lone.doc, [left.id, right.id])
    const items = await itemsOf(group.doc)

    expect(pickPart(items, down(30, 0))).toBe(group.id)
    expect(pickPart(items, down(-30, 0))).toBe(group.id)
    expect(pickPart(items, down(0, 60))).toBe(lone.id)
    // between the two boxes there is nothing
    expect(pickPart(items, down(0, 0))).toBeNull()
  })

  it('the nearest part along the ray wins', async () => {
    const low = addShape(createDocument(), 'box', { name: 'Low' })
    const high = addShape(low.doc, 'box', { name: 'High', position: [0, 0, 40] })
    const items = await itemsOf(high.doc)
    expect(pickPart(items, down(0, 0))).toBe(high.id)
    expect(pickPart(items, { origin: [0, 0, -100], direction: [0, 0, 1] })).toBe(low.id)
  })

  it('a drawing is picked on its lines', async () => {
    const plan: DrawingPart = {
      id: newId(),
      type: 'drawing',
      name: 'plan',
      role: 'solid',
      color: '#5b9bd5',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      hidden: false,
      locked: false,
      entities: [{ kind: 'line', a: [0, 0], b: [50, 0], layer: '0' }],
    }
    const items = await itemsOf(addPart(createDocument(), plan))
    expect(pickPart(items, down(25, 0.2))).toBe(plan.id)
    expect(pickPart(items, down(25, 20))).toBeNull()
  })
})

describe('pickPoint', () => {
  it('lands on the top of a part, else on the plate', async () => {
    const box = addShape(createDocument(), 'box', { name: 'B' })
    const items = await itemsOf(box.doc)
    const top = Math.max(...items[0]!.mesh!.positions.filter((_, i) => i % 3 === 2))
    const hit = pickPoint(items, down(3, 4))!
    expect(hit[0]).toBeCloseTo(3, 6)
    expect(hit[1]).toBeCloseTo(4, 6)
    expect(hit[2]).toBeCloseTo(top, 6)
    expect(pickPoint(items, down(80, 0))).toEqual([80, 0, 0])
    expect(pickPoint(items, { origin: [0, 0, 50], direction: [1, 0, 0] })).toBeNull()
  })
})

describe('rayToWorkplane', () => {
  it('meets the plate at z = 0 in front of the camera', () => {
    expect(rayToWorkplane({ origin: [10, 20, 100], direction: [0, 0, -2] })).toEqual([10, 20])
    const p = rayToWorkplane({ origin: [0, -100, 100], direction: [0, 1, -1] })!
    expect(p[0]).toBeCloseTo(0, 9)
    expect(p[1]).toBeCloseTo(0, 9)
  })

  it('misses when the ray runs along the plate or away from it', () => {
    expect(rayToWorkplane({ origin: [0, 0, 10], direction: [1, 0, 0] })).toBeNull()
    expect(rayToWorkplane({ origin: [0, 0, 10], direction: [0, 0, 1] })).toBeNull()
  })
})
