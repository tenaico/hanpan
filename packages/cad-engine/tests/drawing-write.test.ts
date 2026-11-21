import { describe, expect, it } from 'vitest'
import { readDwg, writeDrawingFile } from '../src/dwg'
import { readDxf } from '../src/dxf'
import type { DrawingEntity } from '../src/model'

/** What AI Drawing exports: lines, polylines, circles, arcs and text on layers, in mm. */
const ENTITIES: DrawingEntity[] = [
  { kind: 'line', a: [0, 0], b: [5000, 0], layer: 'WALL', color: '#ff0000' },
  { kind: 'polyline', points: [0, 0, 100, 0, 100, 50, 0, 50], closed: true, layer: 'WALL' },
  { kind: 'circle', center: [1000, 500], radius: 450, layer: 'DOOR' },
  { kind: 'arc', center: [0, 0], radius: 100, startDeg: 0, endDeg: 90, layer: 'DOOR' },
  { kind: 'text', at: [200, 200], height: 250, rotationDeg: 0, value: '회의실', layer: 'TEXT' },
]

function readBack(format: 'dxf' | 'dwg', entities: DrawingEntity[] = ENTITIES): DrawingEntity[] {
  const bytes = writeDrawingFile(entities, format)
  const read = format === 'dwg' ? readDwg(bytes) : readDxf(bytes)
  if (read.status !== 'ok') throw new Error(`read back: ${read.status}`)
  return read.entities
}

const close = (a: number, b: number): void => expect(a).toBeCloseTo(b, 3)

describe('writeDrawingFile', () => {
  for (const format of ['dxf', 'dwg'] as const) {
    it(`a ${format.toUpperCase()} reads back with the same lines, circles, arcs, text and layers`, () => {
      const back = readBack(format)
      expect(back.map((e) => e.kind).sort()).toEqual(['arc', 'circle', 'line', 'polyline', 'text'])
      const line = back.find((e) => e.kind === 'line')!
      expect(line).toMatchObject({ a: [0, 0], b: [5000, 0], layer: 'WALL', color: '#ff0000' })
      const poly = back.find((e) => e.kind === 'polyline')!
      expect(poly).toMatchObject({ points: [0, 0, 100, 0, 100, 50, 0, 50], closed: true })
      expect(back.find((e) => e.kind === 'circle')).toMatchObject({
        center: [1000, 500],
        radius: 450,
        layer: 'DOOR',
      })
      const arc = back.find((e) => e.kind === 'arc')
      if (arc?.kind !== 'arc') throw new Error('no arc')
      close(arc.startDeg, 0)
      close(arc.endDeg, 90)
      const text = back.find((e) => e.kind === 'text')
      if (text?.kind !== 'text') throw new Error('no text')
      expect(text.value).toBe('회의실')
      close(text.height, 250)
      expect(text.at).toEqual([200, 200])
    })
  }

  it('a text of two lines becomes two texts, one under the other', () => {
    const back = readBack('dxf', [
      { kind: 'text', at: [0, 0], height: 10, rotationDeg: 0, value: 'A\nB', layer: '0' },
    ])
    const texts = back.filter(
      (e): e is Extract<DrawingEntity, { kind: 'text' }> => e.kind === 'text',
    )
    expect(texts.map((t) => t.value)).toEqual(['A', 'B'])
    expect(texts[1]!.at[1]).toBeLessThan(texts[0]!.at[1])
  })

  it('an empty drawing still makes a file that reads back as empty', () => {
    for (const format of ['dxf', 'dwg'] as const) {
      const bytes = writeDrawingFile([], format)
      expect(bytes.length).toBeGreaterThan(0)
      const read = format === 'dwg' ? readDwg(bytes) : readDxf(bytes)
      expect(read.status === 'ok' ? read.entities : []).toEqual([])
    }
  })
})
