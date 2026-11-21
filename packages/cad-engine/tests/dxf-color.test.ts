import { describe, expect, it } from 'vitest'
import { aciToHex, readDxf } from '../src/dxf'
import { drawingPartFromDxf } from '../src/drawing-entities'
import { openCadFile, saveCadFile } from '../src/file'
import { addPart, findPart } from '../src/ops'
import { createDocument } from '../src/model'
import type { DrawingEntity, DrawingPart } from '../src/model'
import { bytesOf, insert, line, type Group } from './dxf-helpers'

/** A DXF with a LAYER table, written group by group (no files from other programs). */
function withLayers(
  layers: [string, number][],
  entities: Group[][],
  blocks: Group[] = [],
): Uint8Array {
  const groups: Group[] = [
    [0, 'SECTION'],
    [2, 'TABLES'],
    [0, 'TABLE'],
    [2, 'LAYER'],
  ]
  for (const [name, colour] of layers) groups.push([0, 'LAYER'], [2, name], [70, 0], [62, colour])
  groups.push([0, 'ENDTAB'], [0, 'ENDSEC'])
  if (blocks.length > 0) groups.push([0, 'SECTION'], [2, 'BLOCKS'], ...blocks, [0, 'ENDSEC'])
  groups.push([0, 'SECTION'], [2, 'ENTITIES'], ...entities.flat(), [0, 'ENDSEC'], [0, 'EOF'])
  return bytesOf(groups.map(([c, v]) => `${c}\n${v}`).join('\n') + '\n')
}

function entitiesOf(bytes: Uint8Array): DrawingEntity[] {
  const result = readDxf(bytes)
  if (result.status !== 'ok') throw new Error(result.status)
  return result.entities
}

describe('DXF colours', () => {
  // AutoCAD 2004 and later keep an exact colour in group 420 beside the nearest
  // numbered colour in 62; the exact one wins (0.22.3)
  it('reads a true colour (420) before the numbered colour (62)', () => {
    const exact = [...line(0, 0, 1, 0, 'L'), [62, 7], [420, 0xff8000]] as Group[]
    const numbered = [...line(0, 1, 1, 1, 'L'), [62, 1]] as Group[]
    const [a, b] = entitiesOf(withLayers([['L', 3]], [exact, numbered]))
    expect(a!.color).toBe('#ff8000')
    expect(b!.color).toBe('#ff0000')
  })

  it('maps the standard colour numbers', () => {
    expect(aciToHex(1)).toBe('#ff0000')
    expect(aciToHex(3)).toBe('#00ff00')
    expect(aciToHex(5)).toBe('#0000ff')
    expect(aciToHex(7)).toBe('#ffffff')
    expect(aciToHex(0)).toBeNull()
    expect(aciToHex(256)).toBeNull()
    for (let i = 1; i <= 255; i++) expect(aciToHex(i)).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('reads entity colour 1 as #ff0000', () => {
    const [e] = entitiesOf(withLayers([['WALL', 5]], [[...line(0, 0, 10, 0, 'WALL'), [62, 1]]]))
    expect(e!.color).toBe('#ff0000')
  })

  it('falls back to the layer colour', () => {
    const [e] = entitiesOf(withLayers([['WALL', 5]], [line(0, 0, 10, 0, 'WALL')]))
    expect(e!.color).toBe('#0000ff')
  })

  it('BYLAYER 256 uses the layer colour, and a switched-off layer keeps its colour', () => {
    const [a, b] = entitiesOf(
      withLayers(
        [
          ['WALL', 5],
          ['OFF', -3],
        ],
        [[...line(0, 0, 10, 0, 'WALL'), [62, 256]], [...line(0, 0, 10, 0, 'OFF')]],
      ),
    )
    expect(a!.color).toBe('#0000ff')
    expect(b!.color).toBe('#00ff00')
  })

  it('BYBLOCK 0 takes the colour of the insert', () => {
    const block: Group[] = [
      [0, 'BLOCK'],
      [8, '0'],
      [2, 'B'],
      [70, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [3, 'B'],
      ...line(0, 0, 1, 0, '0'),
      [62, 0],
      [0, 'ENDBLK'],
      [8, '0'],
    ]
    const [e] = entitiesOf(withLayers([], [insert('B', 0, 0, [[62, 1]])], block))
    expect(e!.color).toBe('#ff0000')
  })

  it('an entity with no colour and no layer table has no colour', () => {
    const [e] = entitiesOf(withLayers([], [line(0, 0, 10, 0, 'X')]))
    expect(e!.color).toBeUndefined()
  })

  it('a drawing with colours saves and reopens with them', () => {
    const bytes = withLayers([['WALL', 1]], [line(0, 0, 10, 0, 'WALL')])
    const result = readDxf(bytes)
    if (result.status !== 'ok') throw new Error(result.status)
    const part = drawingPartFromDxf(result, 'plan')
    const doc = addPart(createDocument(), part)
    const reopened = openCadFile(saveCadFile(doc))
    if (reopened.status !== 'ok') throw new Error(reopened.status)
    const back = findPart(reopened.document, part.id) as DrawingPart
    expect(back.entities[0]!.color).toBe('#ff0000')
  })

  it('drops a colour that is not #rrggbb when opening a file', () => {
    const bytes = withLayers([['WALL', 1]], [line(0, 0, 10, 0, 'WALL')])
    const result = readDxf(bytes)
    if (result.status !== 'ok') throw new Error(result.status)
    const part = drawingPartFromDxf(result, 'plan')
    const doc = addPart(createDocument(), part)
    const text = new TextDecoder().decode(saveCadFile(doc)).replace('"#ff0000"', '"red"')
    const reopened = openCadFile(new TextEncoder().encode(text))
    if (reopened.status !== 'ok') throw new Error(reopened.status)
    const back = findPart(reopened.document, part.id) as DrawingPart
    expect(back.entities[0]!.color).toBeUndefined()
  })
})
