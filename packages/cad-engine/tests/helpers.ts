import { createKernel } from '../src/kernel'
import type { Kernel } from '../src/kernel'
import { makeMesh } from '../src/mesh'
import type { Mesh } from '../src/model'

/** An axis-aligned box from min to max, wound counter-clockwise from outside. */
export function cube(min: [number, number, number], max: [number, number, number]): Mesh {
  const [x0, y0, z0] = min
  const [x1, y1, z1] = max
  const p = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ]
  const quads = [
    [0, 3, 2, 1], // bottom, facing -z
    [4, 5, 6, 7], // top
    [0, 1, 5, 4], // front, -y
    [2, 3, 7, 6], // back
    [1, 2, 6, 5], // right
    [3, 0, 4, 7], // left
  ]
  const indices: number[] = []
  for (const [a, b, c, d] of quads) indices.push(a!, b!, c!, a!, c!, d!)
  return makeMesh(p.flat(), indices)
}

let kernel: Promise<Kernel> | undefined

/** One kernel for the whole test run; the wasm module is slow to start. */
export function sharedKernel(): Promise<Kernel> {
  kernel ??= createKernel()
  return kernel
}
