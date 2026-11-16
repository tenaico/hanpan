import { describe, expect, it } from 'vitest'
import * as engine from '../src/index'

describe('package entry', () => {
  it('exposes the public API of every module', () => {
    for (const name of [
      'createDocument',
      'CadHistory',
      'addShape',
      'shapeMesh',
      'extrudeMesh',
      'createKernel',
      'evaluateDocument',
      'openCadFile',
      'saveCadFile',
      'readStl',
      'writeStl',
      'readObj',
      'writeObj',
      'weldMesh',
      'readDxf',
      'drawingPartFromDxf',
      'closedOutlines',
      'formatMm',
      'viewOutline',
      'makeSheet',
    ]) {
      expect(typeof (engine as Record<string, unknown>)[name], name).toBe('function')
    }
  })
})
