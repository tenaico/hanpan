import { describe, expect, it } from 'vitest'
import { decodeBase64, encodeBase64 } from '../src/base64'
import { openCadFile, saveCadFile } from '../src/file'
import { createDocument } from '../src/model'
import type { CadDocument, Part } from '../src/model'
import { cube } from './helpers'

const base = {
  role: 'solid' as const,
  color: '#5b9bd5',
  position: [0, 0, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  hidden: false,
  locked: false,
}

function sample(): CadDocument {
  const parts: Part[] = [
    {
      ...base,
      id: 'a1',
      name: 'box',
      type: 'shape',
      shape: 'box',
      dims: { width: 10, depth: 20, height: 30 },
    },
    {
      ...base,
      id: 'a2',
      name: 'label',
      type: 'shape',
      shape: 'text',
      dims: { size: 10, height: 3 },
      text: { value: 'Hi', outlines: [[0, 0, 1, 0, 1, 1]] },
    },
    {
      ...base,
      id: 'a3',
      name: 'plate',
      type: 'extrude',
      rings: [
        [0, 0, 10, 0, 10, 10, 0, 10],
        [2, 2, 2, 4, 4, 4],
      ],
      height: 2.5,
      role: 'hole',
    },
    {
      ...base,
      id: 'a4',
      name: 'imported',
      type: 'mesh',
      mesh: cube([0, 0, 0], [1.5, 2.25, 3.125]),
      closed: true,
      position: [1, -2, 3.5],
      rotation: [10, 20, 30],
    },
    {
      ...base,
      id: 'a5',
      name: 'sketch',
      type: 'drawing',
      entities: [
        { kind: 'line', a: [0, 0], b: [10, 0], layer: '0' },
        { kind: 'polyline', points: [0, 0, 1, 1, 2, 0], closed: true, layer: 'L1' },
        { kind: 'circle', center: [5, 5], radius: 2, layer: '0' },
        { kind: 'arc', center: [5, 5], radius: 3, startDeg: 0, endDeg: 90, layer: '0' },
        { kind: 'text', at: [1, 1], height: 2.5, rotationDeg: 0, value: '도면', layer: '0' },
      ],
    },
    {
      ...base,
      id: 'g1',
      name: 'group',
      type: 'group',
      hidden: true,
      locked: true,
      children: [
        {
          ...base,
          id: 'c1',
          name: 'cyl',
          type: 'shape',
          shape: 'cylinder',
          dims: { diameter: 4, height: 8 },
        },
        {
          ...base,
          id: 'g2',
          name: 'inner',
          type: 'group',
          children: [
            { ...base, id: 'c2', name: 's', type: 'shape', shape: 'sphere', dims: { diameter: 3 } },
          ],
        },
      ],
    },
  ]
  return {
    ...createDocument(),
    workplane: { width: 250, depth: 180, grid: 5 },
    title: { name: '받침대', date: '2026-11-16', scale: '1:2' },
    parts,
  }
}

const enc = (text: string): Uint8Array => new TextEncoder().encode(text)
const dec = (bytes: Uint8Array): string => new TextDecoder().decode(bytes)

type SavedJson = { document: { parts: Record<string, unknown>[] } & Record<string, unknown> }

function savedJson(doc: CadDocument): SavedJson {
  return JSON.parse(dec(saveCadFile(doc)))
}

describe('base64', () => {
  it('round-trips every length and matches the standard alphabet', () => {
    for (let n = 0; n < 20; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 251) & 255)
      expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes)
    }
    expect(encodeBase64(enc('Man'))).toBe('TWFu')
    expect(encodeBase64(enc('Ma'))).toBe('TWE=')
    expect(encodeBase64(Uint8Array.of(0xfb, 0xff))).toBe('+/8=')
  })

  it('rejects text that is not base64', () => {
    expect(() => decodeBase64('abc')).toThrow()
    expect(() => decodeBase64('ab!d')).toThrow()
    expect(() => decodeBase64('a===')).toThrow()
    expect(() => decodeBase64('ab=d')).toThrow()
  })
})

describe('saveCadFile / openCadFile', () => {
  it('round-trips a document with every part type', () => {
    const doc = sample()
    const result = openCadFile(saveCadFile(doc))
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.document).toEqual(doc)
    const mesh = result.document.parts[3]
    expect(mesh?.type === 'mesh' && mesh.mesh.positions).toBeInstanceOf(Float32Array)
    expect(mesh?.type === 'mesh' && mesh.mesh.indices).toBeInstanceOf(Uint32Array)
  })

  it('writes the agreed layout', () => {
    const text = dec(saveCadFile(sample()))
    const json = JSON.parse(text)
    expect(Object.keys(json)).toEqual(['format', 'version', 'document'])
    expect(json.format).toBe('hanpan-cad')
    expect(json.version).toBe(1)
    expect(Object.keys(json.document)).toEqual(['workplane', 'title', 'parts'])
    expect(text.startsWith('{\n  "format": "hanpan-cad",')).toBe(true)
    expect(text.endsWith('}\n')).toBe(true)
    const mesh = json.document.parts[3].mesh
    expect(Object.keys(mesh)).toEqual(['positions', 'indices'])
    // little-endian Float32: vertex 1 is (1.5, 0, 0) and 1.5 is 0x3fc00000
    const pos = decodeBase64(mesh.positions)
    expect(Array.from(pos.slice(12, 16))).toEqual([0x00, 0x00, 0xc0, 0x3f])
    const idx = decodeBase64(mesh.indices)
    expect(idx.length).toBe(36 * 4)
  })

  it('saves byte for byte the same after a reopen', () => {
    const first = saveCadFile(sample())
    const reopened = openCadFile(first)
    if (reopened.status !== 'ok') throw new Error(reopened.status)
    expect(saveCadFile(reopened.document)).toEqual(first)
  })

  it('writes keys in a fixed order whatever order the object has', () => {
    const doc = sample()
    const shuffled: CadDocument = {
      extra: doc.extra,
      parts: doc.parts.map((p) => Object.fromEntries(Object.entries(p).reverse()) as Part),
      title: doc.title,
      workplane: doc.workplane,
    }
    expect(saveCadFile(shuffled)).toEqual(saveCadFile(doc))
  })

  it('keeps unknown document and part fields', () => {
    const json = savedJson(sample())
    json.document.layers = [{ name: 'A' }]
    json.document.parts[0]!.material = { kind: 'PLA' }
    const opened = openCadFile(enc(JSON.stringify(json)))
    if (opened.status !== 'ok') throw new Error(opened.status)
    expect(opened.document.extra).toEqual({ layers: [{ name: 'A' }] })
    expect(opened.document.parts[0]!.extra).toEqual({ material: { kind: 'PLA' } })
    const again = JSON.parse(dec(saveCadFile(opened.document)))
    expect(again.document.layers).toEqual([{ name: 'A' }])
    expect(again.document.parts[0].material).toEqual({ kind: 'PLA' })
    expect(Object.keys(again.document).slice(0, 3)).toEqual(['workplane', 'title', 'parts'])
    const reopened = openCadFile(saveCadFile(opened.document))
    if (reopened.status !== 'ok') throw new Error(reopened.status)
    expect(saveCadFile(reopened.document)).toEqual(saveCadFile(opened.document))
  })

  it('does not let an extra field overwrite a known one', () => {
    const doc = sample()
    const part = { ...doc.parts[0]!, extra: { id: 'zz', name: 'evil', note: 1 } }
    const json = savedJson({ ...doc, parts: [part], extra: { parts: [], note: 2 } })
    expect(json.document.parts[0]!.id).toBe('a1')
    expect(json.document.parts[0]!.note).toBe(1)
    expect(json.document.parts).toHaveLength(1)
    expect(json.document.note).toBe(2)
  })

  it('accepts a UTF-8 byte order mark', () => {
    const bytes = saveCadFile(sample())
    const withBom = new Uint8Array(bytes.length + 3)
    withBom.set([0xef, 0xbb, 0xbf])
    withBom.set(bytes, 3)
    expect(openCadFile(withBom).status).toBe('ok')
  })
})

describe('openCadFile refusals', () => {
  it('0 bytes is empty', () => {
    expect(openCadFile(new Uint8Array(0))).toEqual({ status: 'empty', reason: 'empty' })
  })

  it('a file with no format, or another format, is a standalone file', () => {
    expect(openCadFile(enc('{"parts":[]}'))).toEqual({
      status: 'unsupported',
      reason: 'standalone-file',
    })
    expect(openCadFile(enc('{"format":"other","version":1,"document":{}}'))).toEqual({
      status: 'unsupported',
      reason: 'standalone-file',
    })
  })

  it('a newer version is not opened', () => {
    expect(openCadFile(enc('{"format":"hanpan-cad","version":2,"document":{}}'))).toEqual({
      status: 'unsupported',
      reason: 'newer-version',
    })
  })

  it('text that is not JSON, or not UTF-8, is broken', () => {
    expect(openCadFile(enc('not json'))).toEqual({ status: 'broken', reason: 'not-json' })
    expect(openCadFile(Uint8Array.of(0x7b, 0xff, 0xfe, 0x7d))).toEqual({
      status: 'broken',
      reason: 'not-json',
    })
  })

  it('a file over the size limit is refused before parsing', () => {
    const bytes = enc('not json at all, but too big')
    expect(openCadFile(bytes, { maxBytes: 10 })).toEqual({ status: 'too-large', reason: 'size' })
  })

  it('too many triangles is too large', () => {
    expect(openCadFile(saveCadFile(sample()), { maxTriangles: 11 })).toEqual({
      status: 'too-large',
      reason: 'triangles',
    })
    expect(openCadFile(saveCadFile(sample()), { maxTriangles: 12 }).status).toBe('ok')
  })

  const broken = { status: 'broken', reason: 'bad-shape' }

  function mutated(change: (json: SavedJson) => void): Uint8Array {
    const json = savedJson(sample())
    change(json)
    return enc(JSON.stringify(json))
  }

  const dims = (j: SavedJson) => j.document.parts[0]!.dims as Record<string, unknown>
  const meshOf = (j: SavedJson) => j.document.parts[3]!.mesh as Record<string, string>

  it.each<[string, (json: SavedJson) => void]>([
    ['a text width', (j) => void (dims(j).width = 'x')],
    ['a zero width', (j) => void (dims(j).width = 0)],
    ['a missing dim', (j) => void delete dims(j).depth],
    ['an unknown part type', (j) => void (j.document.parts[0]!.type = 'blob')],
    ['an unknown shape', (j) => void (j.document.parts[0]!.shape = 'blob')],
    ['a duplicate id', (j) => void (j.document.parts[1]!.id = 'a1')],
    [
      'a duplicate id inside a group',
      (j) => {
        const g = j.document.parts[5] as { children: { children: { id: string }[] }[] }
        g.children[1]!.children[0]!.id = 'a1'
      },
    ],
    ['a bad role', (j) => void (j.document.parts[0]!.role = 'ghost')],
    ['a position of two numbers', (j) => void (j.document.parts[0]!.position = [0, 0])],
    ['an infinite number', (j) => void (j.document.parts[0]!.position = [0, 0, '1e400'])],
    ['a non-boolean hidden', (j) => void (j.document.parts[0]!.hidden = 1)],
    ['an odd ring', (j) => void ((j.document.parts[2]!.rings as number[][])[0] = [0, 0, 1])],
    ['a zero height extrude', (j) => void (j.document.parts[2]!.height = 0)],
    [
      'indices past the positions',
      (j) => {
        const idx = decodeBase64(meshOf(j).indices!)
        new DataView(idx.buffer).setUint32(0, 8, true)
        meshOf(j).indices = encodeBase64(idx)
      },
    ],
    [
      'positions not a multiple of 3',
      (j) => {
        meshOf(j).positions = encodeBase64(decodeBase64(meshOf(j).positions!).slice(0, 4 * 23))
      },
    ],
    ['mesh text that is not base64', (j) => void (meshOf(j).indices = '@@@@')],
    [
      'an unknown drawing entity',
      (j) => void ((j.document.parts[4]!.entities as unknown[])[0] = { kind: 'blob' }),
    ],
    ['a group without children', (j) => void delete j.document.parts[5]!.children],
    ['a missing workplane', (j) => void delete j.document.workplane],
    ['parts that are not a list', (j) => void (j.document.parts = {} as never)],
  ])('%s is broken', (_name, change) => {
    expect(openCadFile(mutated(change))).toEqual(broken)
  })

  it('a number too big for a double is broken', () => {
    const text = dec(saveCadFile(sample())).replace('"width": 250', '"width": 1e400')
    expect(text).toContain('1e400')
    expect(openCadFile(enc(text))).toEqual(broken)
  })

  it('JSON that is not an object, or has no document, is broken', () => {
    expect(openCadFile(enc('[1,2]'))).toEqual(broken)
    expect(openCadFile(enc('{"format":"hanpan-cad","version":1}'))).toEqual(broken)
    expect(openCadFile(enc('{"format":"hanpan-cad","version":"1","document":{}}'))).toEqual(broken)
  })
})
