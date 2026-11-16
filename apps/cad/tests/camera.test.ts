/**
 * The view buttons: where the camera looks from for top, front and side, and
 * "fit", which frames the whole model.
 */
import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import type { Box3 } from '@genoffice/cad-engine'
import { fitTo, viewDirection } from '../src/renderer/scene/camera'

describe('the camera', () => {
  it('names the directions of the view buttons', () => {
    expect(viewDirection('top').direction).toEqual([0, 0, 1])
    expect(viewDirection('front').direction).toEqual([0, -1, 0])
    expect(viewDirection('side').direction).toEqual([1, 0, 0])
    const iso = viewDirection('iso').direction
    expect(Math.hypot(...iso)).toBeCloseTo(1)
  })

  it('fit frames the whole model', () => {
    const box: Box3 = { min: [-120, -10, 0], max: [80, 30, 45] }
    for (const view of ['top', 'front', 'side', 'iso'] as const) {
      for (const aspect of [0.5, 1, 2]) {
        const pose = fitTo(box, { direction: viewDirection(view).direction, aspect, fovDeg: 45 })
        const camera = new PerspectiveCamera(45, aspect, 0.1, 100_000)
        camera.up.set(...pose.up)
        camera.position.set(...pose.position)
        camera.lookAt(new Vector3(...pose.target))
        camera.updateMatrixWorld()
        camera.updateProjectionMatrix()
        let widest = 0
        for (const x of [box.min[0], box.max[0]])
          for (const y of [box.min[1], box.max[1]])
            for (const z of [box.min[2], box.max[2]]) {
              const p = new Vector3(x, y, z).project(camera)
              expect(Math.abs(p.x), `${view} ${aspect}`).toBeLessThanOrEqual(1)
              expect(Math.abs(p.y), `${view} ${aspect}`).toBeLessThanOrEqual(1)
              widest = Math.max(widest, Math.abs(p.x), Math.abs(p.y))
            }
        // the model is not lost as a speck in the middle of the screen either
        expect(widest, `${view} ${aspect}`).toBeGreaterThan(0.4)
        expect(new Vector3(...pose.target).distanceTo(new Vector3(-20, 10, 22.5))).toBeLessThan(
          1e-6,
        )
      }
    }
  })
})
