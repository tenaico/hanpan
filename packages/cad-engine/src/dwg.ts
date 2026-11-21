/**
 * Reads an AutoCAD DWG file (R13 to 2018 formats) into the same result a DXF
 * gives. acad-ts (MIT, a TypeScript port of ACadSharp) reads the DWG and writes
 * it out as DXF text; `readDxf` then reads that text, so blocks, dimensions,
 * text and units go through the one DXF reader this engine already has.
 */
import { DwgReader, DxfWriter } from '@node-projects/acad-ts'
import { readDxf } from './dxf'
import type { DxfReadOptions, DxfReadResult } from './dxf'
import { MAX_FILE_BYTES } from './model'

/** Every DWG starts with "AC1" and two more version digits ("AC1032" for 2018). */
function looksLikeDwg(bytes: Uint8Array): boolean {
  return bytes.length > 6 && bytes[0] === 0x41 && bytes[1] === 0x43 && bytes[2] === 0x31
}

export function readDwg(bytes: Uint8Array, options: DxfReadOptions = {}): DxfReadResult {
  if (bytes.length > (options.maxBytes ?? MAX_FILE_BYTES)) return { status: 'too-large' }
  if (bytes.length === 0) return { status: 'empty' }
  if (!looksLikeDwg(bytes)) return { status: 'broken' }
  let text = ''
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
