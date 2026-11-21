/**
 * Reads an AutoCAD DWG file (R13 to 2018 formats) into the same result a DXF
 * gives. acad-ts (MIT, a TypeScript port of ACadSharp) reads the DWG and writes
 * it out as DXF text; `readDxf` then reads that text, so blocks, dimensions,
 * text and units go through the one DXF reader this engine already has.
 */
import {
  ACadVersion,
  Arc,
  CadDocument as AcadDocument,
  Circle,
  Color,
  DwgReader,
  DwgWriter,
  DxfWriter,
  Layer,
  Line,
  LwPolyline,
  TextEntity,
  UnitsType,
  XY,
  XYZ,
} from '@node-projects/acad-ts'
import type { Entity } from '@node-projects/acad-ts'
import { readDxf } from './dxf'
import type { DxfReadOptions, DxfReadResult } from './dxf'
import { MAX_FILE_BYTES } from './model'
import type { DrawingEntity } from './model'

/** Every DWG starts with "AC1" and two more version digits ("AC1032" for 2018). */
function looksLikeDwg(bytes: Uint8Array): boolean {
  return bytes.length > 6 && bytes[0] === 0x41 && bytes[1] === 0x43 && bytes[2] === 0x31
}

export function readDwg(bytes: Uint8Array, options: DxfReadOptions = {}): DxfReadResult {
  if (bytes.length > (options.maxBytes ?? MAX_FILE_BYTES)) return { status: 'too-large' }
  if (bytes.length === 0) return { status: 'empty' }
  if (!looksLikeDwg(bytes)) return { status: 'broken' }
  let text: string
  try {
    // the reader wants an ArrayBuffer of exactly these bytes
    const buffer = bytes.slice().buffer
    const doc = DwgReader.readFromStream(buffer, null)
    const chunks: string[] = []
    DxfWriter.writeToStream({ write: (value: string) => void chunks.push(value) }, doc, false)
    text = chunks.join('')
  } catch {
    return { status: 'broken' }
  }
  // UTF-8 is what `readDxf` tries first, so text in any language reads as written
  return readDxf(new TextEncoder().encode(text), { ...options, maxBytes: Number.POSITIVE_INFINITY })
}

/** Lines of a text are this many text heights apart (AutoCAD's MTEXT default). */
const LINE_SPACING = 1.667

const RAD = Math.PI / 180

/** A 2018-format document in millimetres holding the entities, on their layers and colours. */
function documentOf(entities: readonly DrawingEntity[]): AcadDocument {
  const doc = new AcadDocument()
  doc.header!.version = ACadVersion.AC1032
  doc.header!.insUnits = UnitsType.Millimeters
  const layers = new Map<string, Layer>()
  const layerOf = (name: string): Layer => {
    const key = name || '0'
    let layer = layers.get(key)
    if (!layer) {
      const table = doc.layers!
      if (table.contains(key)) layer = table.get(key)
      else {
        layer = new Layer(key)
        table.add(layer)
      }
      layers.set(key, layer)
    }
    return layer
  }
  const add = (entity: Entity, source: DrawingEntity): void => {
    entity.layer = layerOf(source.layer)
    if (source.color && /^#[0-9a-f]{6}$/i.test(source.color)) {
      const rgb = parseInt(source.color.slice(1), 16)
      entity.color = new Color((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255)
    }
    doc.modelSpace!.entities.add(entity)
  }
  for (const e of entities) {
    switch (e.kind) {
      case 'line': {
        const line = new Line()
        line.startPoint = new XYZ(e.a[0], e.a[1], 0)
        line.endPoint = new XYZ(e.b[0], e.b[1], 0)
        add(line, e)
        break
      }
      case 'polyline': {
        const points: XY[] = []
        for (let i = 0; i + 1 < e.points.length; i += 2)
          points.push(new XY(e.points[i]!, e.points[i + 1]!))
        if (points.length < 2) break
        const poly = new LwPolyline(points)
        poly.isClosed = e.closed
        add(poly, e)
        break
      }
      case 'circle': {
        const circle = new Circle()
        circle.center = new XYZ(e.center[0], e.center[1], 0)
        circle.radius = e.radius
        add(circle, e)
        break
      }
      case 'arc': {
        const arc = new Arc()
        arc.center = new XYZ(e.center[0], e.center[1], 0)
        arc.radius = e.radius
        arc.startAngle = e.startDeg * RAD
        arc.endAngle = e.endDeg * RAD
        add(arc, e)
        break
      }
      case 'text': {
        // TEXT holds one line: each further line goes below, along the text's own up
        const r = e.rotationDeg * RAD
        e.value.split('\n').forEach((row, i) => {
          if (row === '') return
          const down = i * LINE_SPACING * e.height
          const text = new TextEntity()
          text.insertPoint = new XYZ(e.at[0] + down * Math.sin(r), e.at[1] - down * Math.cos(r), 0)
          text.height = e.height
          text.rotation = r
          text.value = row
          add(text, e)
        })
        break
      }
    }
  }
  return doc
}

/**
 * A DXF or DWG file (AutoCAD 2018 format, millimetres) holding the entities:
 * what AI Drawing writes for File › Export DXF and Export DWG. It is always a
 * new file; the file a drawing came from is never written.
 */
export function writeDrawingFile(
  entities: readonly DrawingEntity[],
  format: 'dxf' | 'dwg',
): Uint8Array {
  const doc = documentOf(entities)
  if (format === 'dxf') {
    const chunks: string[] = []
    DxfWriter.writeToStream({ write: (value: string) => void chunks.push(value) }, doc, false)
    return new TextEncoder().encode(chunks.join(''))
  }
  // the writer needs a buffer big enough up front: start generous and grow when it runs out
  let size = Math.max(1 << 20, entities.length * 512)
  for (;;) {
    const target = new Uint8Array(size)
    try {
      return target.slice(0, DwgWriter.writeToStream(target, doc))
    } catch (err) {
      if (size >= 1 << 30) throw err
      size *= 4
    }
  }
}
