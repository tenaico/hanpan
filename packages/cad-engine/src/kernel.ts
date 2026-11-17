import Module from 'manifold-3d'
import type { Manifold } from 'manifold-3d'
import type { Mesh } from './model'

/** Boolean operations on closed meshes. The only place that talks to manifold-3d. */
export interface Kernel {
  union(meshes: Mesh[]): Mesh
  /** The base minus the union of the cutters. */
  subtract(base: Mesh, cutters: Mesh[]): Mesh
  dispose(): void
}

export interface KernelWasm {
  /** Where to fetch manifold.wasm from (a browser bundle passes this). */
  locateFile?: (name: string) => string
  /** The wasm bytes, when the caller has already loaded them. */
  wasmBinary?: Uint8Array
}

const EMPTY: Mesh = { positions: new Float32Array(0), indices: new Uint32Array(0) }

function emptyMesh(): Mesh {
  return { positions: EMPTY.positions.slice(), indices: EMPTY.indices.slice() }
}

/** Starts manifold-3d. In Node it finds its own wasm file; a browser passes locateFile or wasmBinary. */
export async function createKernel(wasm?: KernelWasm): Promise<Kernel> {
  const options: Record<string, unknown> = {}
  if (wasm?.locateFile) options.locateFile = wasm.locateFile
  if (wasm?.wasmBinary) options.wasmBinary = wasm.wasmBinary
  // the published type only names locateFile; Emscripten takes the other module options too
  const mod = await Module(options as unknown as Parameters<typeof Module>[0])
  mod.setup()
  let disposed = false

  const live = (): void => {
    if (disposed) throw new Error('kernel disposed')
  }

  const toManifold = (mesh: Mesh): Manifold => {
    const m = new mod.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.indices })
    m.merge()
    return new mod.Manifold(m)
  }

  const fromManifold = (man: Manifold): Mesh => {
    const out = man.getMesh()
    const np = out.numProp
    const count = out.vertProperties.length / np
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = out.vertProperties[i * np]!
      positions[i * 3 + 1] = out.vertProperties[i * np + 1]!
      positions[i * 3 + 2] = out.vertProperties[i * np + 2]!
    }
    return { positions, indices: Uint32Array.from(out.triVerts) }
  }

  /** Runs `work` and frees every Manifold it handed to `keep`, even when it throws. */
  const withScope = <T>(work: (keep: (m: Manifold) => Manifold) => T): T => {
    const made: Manifold[] = []
    try {
      return work((m) => {
        made.push(m)
        return m
      })
    } finally {
      for (const m of made) m.delete()
    }
  }

  return {
    union(meshes) {
      live()
      if (meshes.length === 0) return emptyMesh()
      return withScope((keep) => {
        const parts = meshes.map((m) => keep(toManifold(m)))
        const result = parts.length === 1 ? parts[0]! : keep(mod.Manifold.union(parts))
        return fromManifold(result)
      })
    },
    subtract(base, cutters) {
      live()
      return withScope((keep) => {
        const b = keep(toManifold(base))
        if (cutters.length === 0) return fromManifold(b)
        const cs = cutters.map((m) => keep(toManifold(m)))
        const c = cs.length === 1 ? cs[0]! : keep(mod.Manifold.union(cs))
        return fromManifold(keep(b.subtract(c)))
      })
    },
    dispose() {
      disposed = true
    },
  }
}
