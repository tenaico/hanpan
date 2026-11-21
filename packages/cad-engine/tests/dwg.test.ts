import {
  ACadVersion,
  CadDocument as AcadDocument,
  Circle,
  DwgWriter,
  Line,
  TextEntity,
  XYZ,
} from '@node-projects/acad-ts'
import { describe, expect, it } from 'vitest'
import { readDwg } from '../src/dwg'

/** A DWG made here (the repo keeps no other program's files): a wall line, a door circle, a label. */
function makeDwg(version: ACadVersion, labelText: string): Uint8Array {
  const doc = new AcadDocument()
  doc.header!.version = version
  const line = new Line()
  line.startPoint = new XYZ(0, 0, 0)
  line.endPoint = new XYZ(5000, 0, 0)
  doc.modelSpace!.entities.add(line)
  const circle = new Circle()
  circle.center = new XYZ(1000, 500, 0)
  circle.radius = 450
  doc.modelSpace!.entities.add(circle)
  const label = new TextEntity()
  label.insertPoint = new XYZ(100, 100, 0)
  label.height = 250
  label.value = labelText
  doc.modelSpace!.entities.add(label)
  const target = new Uint8Array(4 * 1024 * 1024)
  const written = DwgWriter.writeToStream(target, doc)
  return target.slice(0, written)
}

describe('readDwg', () => {
  // 2007 and later keep text as UTF-16, so Korean is checked there; acad-ts writes
  // older test files in the Western code page only, so the 2004 file has a Latin label
  for (const [version, label] of [
    [ACadVersion.AC1018, 'ROOM-1'],
    [ACadVersion.AC1032, '회의실'],
  ] as const) {
    it(`reads lines, circles and text of a ${ACadVersion[version]} DWG`, () => {
      const result = readDwg(makeDwg(version, label))
      expect(result.status).toBe('ok')
      if (result.status !== 'ok') return
      const kinds = result.entities.map((e) => e.kind).sort()
      expect(kinds).toEqual(['circle', 'line', 'text'])
      const line = result.entities.find((e) => e.kind === 'line')
      expect(line).toMatchObject({ a: [0, 0], b: [5000, 0] })
      const circle = result.entities.find((e) => e.kind === 'circle')
      expect(circle).toMatchObject({ center: [1000, 500], radius: 450 })
      const text = result.entities.find((e) => e.kind === 'text')
      expect(text).toMatchObject({ value: label })
    })
  }

  it('says broken for bytes that are not a DWG, and too-large over the limit', () => {
    expect(readDwg(new TextEncoder().encode('not a drawing at all')).status).toBe('broken')
    expect(readDwg(new Uint8Array(10), { maxBytes: 5 }).status).toBe('too-large')
  })
})
