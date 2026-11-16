import { describe, expect, it } from 'vitest'
import { closedOutlines, drawingPartFromDxf } from '../src/drawing-entities'
import { readDxf } from '../src/dxf'
import type { DxfReadResult } from '../src/dxf'
import { DEFAULT_SOLID_COLOR } from '../src/model'
import type { DrawingEntity } from '../src/model'
import { bytesOf, circle, dxf, insert, line, lwpolyline, text } from './dxf-helpers'
import type { Group } from './dxf-helpers'

type Ok = Extract<DxfReadResult, { status: 'ok' }>

function ok(source: string | Uint8Array): Ok {
  const result = readDxf(typeof source === 'string' ? bytesOf(source) : source)
  if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`)
  return result
}

function only<K extends DrawingEntity['kind']>(
  entities: DrawingEntity[],
  kind: K,
): Extract<DrawingEntity, { kind: K }>[] {
  return entities.filter((e): e is Extract<DrawingEntity, { kind: K }> => e.kind === kind)
}

function close(a: readonly number[], b: readonly number[], digits = 6): void {
  expect(a.length).toBe(b.length)
  a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, digits))
}

function length(e: Extract<DrawingEntity, { kind: 'line' }>): number {
  return Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1])
}

describe('readDxf: basics', () => {
  it('reads one LINE with bounds', () => {
    const result = ok(dxf({ entities: [line(0, 0, 10, 5, 'WALL')] }))
    expect(result.entities).toEqual([{ kind: 'line', a: [0, 0], b: [10, 5], layer: 'WALL' }])
    expect(result.bounds).toEqual({ min: [0, 0], max: [10, 5] })
    expect(result.unit).toBe('mm')
    expect(result.skipped).toEqual({})
  })

  it('parses CRLF line ends and padded group codes the same', () => {
    const plain = ok(dxf({ entities: [line(0, 0, 10, 5)] }))
    const crlf = ok(dxf({ entities: [line(0, 0, 10, 5)], eol: '\r\n', padCodes: true }))
    expect(crlf.entities).toEqual(plain.entities)
    expect(crlf.bounds).toEqual(plain.bounds)
  })

  it('reads inches from a CRLF file with padded codes', () => {
    const source = dxf({
      header: [
        [9, '$INSUNITS'],
        [70, 1],
      ],
      entities: [line(0, 0, 1, 0)],
      eol: '\r\n',
      padCodes: true,
    })
    const result = ok(source)
    expect(result.sourceUnit).toBe('in')
    expect(length(only(result.entities, 'line')[0]!)).toBeCloseTo(25.4, 9)
  })

  it('defaults the layer to 0', () => {
    const groups: Group[] = [
      [0, 'CIRCLE'],
      [10, 1],
      [20, 2],
      [40, 3],
    ]
    expect(ok(dxf({ entities: [groups] })).entities[0]!.layer).toBe('0')
  })

  it('a file with no ENTITIES section is ok and empty', () => {
    const result = ok(
      dxf({
        header: [
          [9, '$ACADVER'],
          [1, 'AC1015'],
        ],
      }),
    )
    expect(result.entities).toEqual([])
    expect(result.bounds).toBeNull()
  })

  it('0 bytes or only whitespace is empty', () => {
    expect(readDxf(new Uint8Array(0)).status).toBe('empty')
    expect(readDxf(bytesOf('  \r\n\n\t ')).status).toBe('empty')
  })

  it('text that is not group-code pairs is broken', () => {
    expect(readDxf(bytesOf('hello world\nthis is not a drawing\n')).status).toBe('broken')
    expect(readDxf(bytesOf('0\nSECTION\n2\nENTITIES\nLINE\n8\n')).status).toBe('broken')
  })

  it('more bytes than the limit is too-large', () => {
    const bytes = bytesOf(dxf({ entities: [line(0, 0, 1, 1)] }))
    expect(readDxf(bytes, { maxBytes: bytes.length - 1 }).status).toBe('too-large')
    expect(readDxf(bytes, { maxBytes: bytes.length }).status).toBe('ok')
  })

  it('more entities than the limit is too-large', () => {
    const entities = [line(0, 0, 1, 1), line(1, 1, 2, 2), line(2, 2, 3, 3)]
    expect(readDxf(bytesOf(dxf({ entities })), { maxEntities: 2 }).status).toBe('too-large')
    expect(readDxf(bytesOf(dxf({ entities })), { maxEntities: 3 }).status).toBe('ok')
  })

  it('reads Latin-1 text when the bytes are not UTF-8', () => {
    const source = dxf({ entities: [text(0, 0, 2, 'caf\u00e9')] })
    const bytes = Uint8Array.from(source, (c) => c.charCodeAt(0))
    expect(only(ok(bytes).entities, 'text')[0]!.value).toBe('caf\u00e9')
  })

  it('reads EUC-KR text when $DWGCODEPAGE says ANSI_949', () => {
    // "도면" in EUC-KR
    const korean = [0xb5, 0xb5, 0xb8, 0xe9]
    const source = dxf({
      header: [
        [9, '$DWGCODEPAGE'],
        [3, 'ANSI_949'],
      ],
      entities: [text(0, 0, 2, '@@')],
    })
    const at = source.indexOf('@@')
    const bytes = new Uint8Array([
      ...bytesOf(source.slice(0, at)),
      ...korean,
      ...bytesOf(source.slice(at + 2)),
    ])
    expect(only(ok(bytes).entities, 'text')[0]!.value).toBe('\ub3c4\uba74')
  })
})

describe('readDxf: units', () => {
  const header = (code: number): Group[] => [
    [9, '$INSUNITS'],
    [70, code],
  ]

  it('$INSUNITS 1 turns inches into millimetres', () => {
    const result = ok(dxf({ header: header(1), entities: [line(0, 0, 1, 0), circle(0, 0, 1)] }))
    expect(result.sourceUnit).toBe('in')
    expect(length(only(result.entities, 'line')[0]!)).toBeCloseTo(25.4, 9)
    expect(only(result.entities, 'circle')[0]!.radius).toBeCloseTo(25.4, 9)
  })

  it.each([
    [2, 'ft', 304.8],
    [4, 'mm', 1],
    [5, 'cm', 10],
    [6, 'm', 1000],
    [0, 'unitless', 1],
  ])('$INSUNITS %i is %s (x%f)', (code, name, factor) => {
    const result = ok(dxf({ header: header(code), entities: [line(0, 0, 1, 0)] }))
    expect(result.sourceUnit).toBe(name)
    expect(length(only(result.entities, 'line')[0]!)).toBeCloseTo(factor, 9)
  })

  it('a missing $INSUNITS reads as millimetres', () => {
    const result = ok(dxf({ entities: [line(0, 0, 1, 0)] }))
    expect(result.sourceUnit).toBe('unitless')
    expect(length(only(result.entities, 'line')[0]!)).toBe(1)
  })

  it('scales text heights too', () => {
    const result = ok(dxf({ header: header(5), entities: [text(1, 2, 0.25, 'A')] }))
    const t = only(result.entities, 'text')[0]!
    close(t.at, [10, 20])
    expect(t.height).toBeCloseTo(2.5, 9)
  })
})

describe('readDxf: entity kinds', () => {
  it('LWPOLYLINE flag 1 is closed', () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]
    const p = only(ok(dxf({ entities: [lwpolyline(square, true)] })).entities, 'polyline')[0]!
    expect(p.closed).toBe(true)
    expect(p.points).toEqual([0, 0, 10, 0, 10, 10, 0, 10])
    const open = only(ok(dxf({ entities: [lwpolyline(square, false)] })).entities, 'polyline')
    expect(open[0]!.closed).toBe(false)
  })

  it('a bulge of 1 flattens into a half circle of at least 8 segments', () => {
    const entity = lwpolyline(
      [
        [0, 0, 1],
        [10, 0],
      ],
      false,
    )
    const p = only(ok(dxf({ entities: [entity] })).entities, 'polyline')[0]!
    expect(p.points.length / 2 - 1).toBeGreaterThanOrEqual(8)
    close(p.points.slice(0, 2), [0, 0])
    close(p.points.slice(-2), [10, 0])
    for (let i = 0; i < p.points.length; i += 2) {
      expect(Math.hypot(p.points[i]! - 5, p.points[i + 1]!)).toBeCloseTo(5, 9)
      // a positive bulge turns counter-clockwise: from (0,0) to (10,0) it passes below
      expect(p.points[i + 1]!).toBeLessThanOrEqual(1e-9)
    }
  })

  it('a closed LWPOLYLINE flattens the bulge on its closing segment', () => {
    const entity = lwpolyline(
      [
        [0, 0],
        [10, 0, 1],
        [10, 10, 1],
      ],
      true,
    )
    const p = only(ok(dxf({ entities: [entity] })).entities, 'polyline')[0]!
    expect(p.closed).toBe(true)
    // the closing segment (10,10)->(0,0) is not repeated at the end
    expect(p.points.slice(-2)).not.toEqual([0, 0])
    expect(p.points.length / 2).toBeGreaterThan(17)
  })

  it('reads POLYLINE with VERTEX and SEQEND', () => {
    const entity: Group[] = [
      [0, 'POLYLINE'],
      [8, 'P'],
      [66, 1],
      [70, 1],
      [0, 'VERTEX'],
      [8, 'P'],
      [10, 0],
      [20, 0],
      [0, 'VERTEX'],
      [8, 'P'],
      [10, 4],
      [20, 0],
      [0, 'VERTEX'],
      [8, 'P'],
      [10, 4],
      [20, 3],
      [0, 'SEQEND'],
      [8, 'P'],
    ]
    const result = ok(dxf({ entities: [entity, line(0, 0, 1, 1)] }))
    expect(result.entities).toHaveLength(2)
    expect(result.entities[0]).toEqual({
      kind: 'polyline',
      points: [0, 0, 4, 0, 4, 3],
      closed: true,
      layer: 'P',
    })
    expect(result.skipped).toEqual({})
  })

  it('keeps CIRCLE and ARC, with arc angles in degrees', () => {
    const arc: Group[] = [
      [0, 'ARC'],
      [8, '0'],
      [10, 5],
      [20, 5],
      [40, 2],
      [50, 30],
      [51, 120],
    ]
    const result = ok(dxf({ entities: [circle(1, 2, 3), arc] }))
    expect(result.entities).toEqual([
      { kind: 'circle', center: [1, 2], radius: 3, layer: '0' },
      { kind: 'arc', center: [5, 5], radius: 2, startDeg: 30, endDeg: 120, layer: '0' },
    ])
    expect(result.bounds).toEqual({ min: [-2, -1], max: [7, 7] })
  })

  it('ELLIPSE becomes a closed polyline of 64 segments', () => {
    const ellipse: Group[] = [
      [0, 'ELLIPSE'],
      [8, '0'],
      [10, 0],
      [20, 0],
      [11, 10],
      [21, 0],
      [40, 0.5],
      [41, 0],
      [42, 2 * Math.PI],
    ]
    const p = only(ok(dxf({ entities: [ellipse] })).entities, 'polyline')[0]!
    expect(p.closed).toBe(true)
    expect(p.points.length / 2).toBe(64)
    close(p.points.slice(0, 2), [10, 0])
    close(p.points.slice(32, 34), [0, 5])
  })

  it('SPLINE joins its control points, or fit points when it has none', () => {
    const spline: Group[] = [
      [0, 'SPLINE'],
      [8, '0'],
      [70, 0],
      [10, 0],
      [20, 0],
      [10, 5],
      [20, 5],
      [10, 10],
      [20, 0],
    ]
    const fit: Group[] = [
      [0, 'SPLINE'],
      [8, '0'],
      [70, 0],
      [11, 1],
      [21, 1],
      [11, 2],
      [21, 3],
    ]
    const [a, b] = only(ok(dxf({ entities: [spline, fit] })).entities, 'polyline')
    expect(a!.points).toEqual([0, 0, 5, 5, 10, 0])
    expect(b!.points).toEqual([1, 1, 2, 3])
  })

  it('reads TEXT with height and rotation', () => {
    const t: Group[] = [...text(3, 4, 2.5, 'ROOM 101'), [50, 90]]
    expect(ok(dxf({ entities: [t] })).entities).toEqual([
      { kind: 'text', at: [3, 4], height: 2.5, rotationDeg: 90, value: 'ROOM 101', layer: '0' },
    ])
  })

  it('turns %%c, %%d and %%p into symbols', () => {
    const result = ok(dxf({ entities: [text(0, 0, 1, '%%c50 %%p0.1 45%%d')] }))
    expect(only(result.entities, 'text')[0]!.value).toBe('\u00d850 \u00b10.1 45\u00b0')
  })

  it('strips MTEXT formatting', () => {
    const mtext = (value: string): Group[] => [
      [0, 'MTEXT'],
      [8, 'NOTE'],
      [10, 1],
      [20, 2],
      [40, 3],
      [1, value],
    ]
    const result = ok(
      dxf({
        entities: [
          mtext('{\\fArial;Hello}\\PWorld'),
          mtext('\\H2.5x;\\C1;Red\\~text \\A1;x{\\Lunder}'),
          mtext('A \\\\ B \\{C\\}'),
          mtext('\\U+B3C4\\U+BA74'),
          mtext('\\S1/2;"'),
        ],
      }),
    )
    const values = only(result.entities, 'text').map((t) => t.value)
    expect(values).toEqual([
      'Hello\nWorld',
      'Red text xunder',
      'A \\ B {C}',
      '\ub3c4\uba74',
      '1/2"',
    ])
    expect(result.entities[0]).toMatchObject({ at: [1, 2], height: 3, layer: 'NOTE' })
  })

  it('joins MTEXT chunks in group 3 before group 1', () => {
    const mtext: Group[] = [
      [0, 'MTEXT'],
      [10, 0],
      [20, 0],
      [40, 1],
      [3, 'first part '],
      [1, 'last part'],
    ]
    expect(only(ok(dxf({ entities: [mtext] })).entities, 'text')[0]!.value).toBe(
      'first part last part',
    )
  })

  it('counts unread kinds in skipped', () => {
    const face: Group[] = [
      [0, '3DFACE'],
      [8, '0'],
      [10, 0],
      [20, 0],
    ]
    const hatch: Group[] = [
      [0, 'HATCH'],
      [8, '0'],
      [2, 'SOLID'],
    ]
    const result = ok(dxf({ entities: [face, hatch, line(0, 0, 1, 1)] }))
    expect(result.skipped).toEqual({ '3DFACE': 1, HATCH: 1 })
    expect(result.entities).toHaveLength(1)
  })
})

describe('readDxf: blocks', () => {
  it('INSERT places a block scaled, rotated and moved', () => {
    const result = ok(
      dxf({
        blocks: [{ name: 'PART', entities: [line(0, 0, 1, 0)] }],
        entities: [
          insert('PART', 10, 0, [
            [41, 2],
            [42, 2],
            [50, 90],
          ]),
        ],
      }),
    )
    const l = only(result.entities, 'line')[0]!
    close(l.a, [10, 0])
    close(l.b, [10, 2])
  })

  it('INSERT applies the block base point', () => {
    const result = ok(
      dxf({
        blocks: [{ name: 'B', base: [5, 5], entities: [line(5, 5, 6, 5)] }],
        entities: [insert('B', 100, 100)],
      }),
    )
    const l = only(result.entities, 'line')[0]!
    close(l.a, [100, 100])
    close(l.b, [101, 100])
  })

  it('INSERT turns block circles, arcs and text with it', () => {
    const arc: Group[] = [
      [0, 'ARC'],
      [10, 1],
      [20, 0],
      [40, 1],
      [50, 0],
      [51, 90],
    ]
    const result = ok(
      dxf({
        blocks: [{ name: 'B', entities: [circle(1, 0, 1), arc, text(1, 0, 1, 'T')] }],
        entities: [
          insert('B', 0, 0, [
            [41, 3],
            [42, 3],
            [50, 90],
          ]),
        ],
      }),
    )
    const c = only(result.entities, 'circle')[0]!
    close(c.center, [0, 3])
    expect(c.radius).toBeCloseTo(3, 9)
    const a = only(result.entities, 'arc')[0]!
    close([a.startDeg, a.endDeg], [90, 180])
    const t = only(result.entities, 'text')[0]!
    close(t.at, [0, 3])
    expect(t.height).toBeCloseTo(3, 9)
    expect(t.rotationDeg).toBeCloseTo(90, 9)
  })

  it('INSERT with uneven scale turns circles into polylines', () => {
    const result = ok(
      dxf({
        blocks: [{ name: 'B', entities: [circle(0, 0, 1)] }],
        entities: [
          insert('B', 0, 0, [
            [41, 2],
            [42, 1],
          ]),
        ],
      }),
    )
    const p = only(result.entities, 'polyline')[0]!
    expect(p.closed).toBe(true)
    close(p.points.slice(0, 2), [2, 0])
  })

  it('applies the unit factor to inserted blocks once', () => {
    const result = ok(
      dxf({
        header: [
          [9, '$INSUNITS'],
          [70, 6],
        ],
        blocks: [{ name: 'B', entities: [line(0, 0, 1, 0)] }],
        entities: [insert('B', 2, 0)],
      }),
    )
    const l = only(result.entities, 'line')[0]!
    close(l.a, [2000, 0])
    close(l.b, [3000, 0])
  })

  it('block entities on layer 0 take the layer of the INSERT', () => {
    const result = ok(
      dxf({
        blocks: [{ name: 'B', entities: [line(0, 0, 1, 0), line(0, 0, 0, 1, 'OWN')] }],
        entities: [
          [
            [0, 'INSERT'],
            [8, 'DOORS'],
            [2, 'B'],
            [10, 0],
            [20, 0],
          ],
        ],
      }),
    )
    expect(result.entities.map((e) => e.layer)).toEqual(['DOORS', 'OWN'])
  })

  it('DIMENSION expands its *D block, so the line and the text "25" appear', () => {
    const dim: Group[] = [
      [0, 'DIMENSION'],
      [8, 'DIM'],
      [2, '*D1'],
      [10, 25],
      [20, 5],
      [70, 32],
      [1, ''],
    ]
    const result = ok(
      dxf({
        blocks: [{ name: '*D1', entities: [line(0, 5, 25, 5), text(12.5, 6, 2.5, '25')] }],
        entities: [dim],
      }),
    )
    expect(only(result.entities, 'line')).toEqual([
      { kind: 'line', a: [0, 5], b: [25, 5], layer: 'DIM' },
    ])
    expect(only(result.entities, 'text').map((t) => t.value)).toEqual(['25'])
    expect(result.skipped).toEqual({})
  })

  it('a block that inserts itself stops at depth 8 and does not hang', () => {
    const result = ok(
      dxf({
        blocks: [{ name: 'LOOP', entities: [line(0, 0, 1, 0), insert('LOOP', 1, 0)] }],
        entities: [insert('LOOP', 0, 0)],
      }),
    )
    const lines = only(result.entities, 'line')
    expect(lines.length).toBeGreaterThanOrEqual(8)
    expect(lines.length).toBeLessThanOrEqual(9)
  })

  it('a block that inserts itself many times ends as too-large rather than hanging', () => {
    const inserts = Array.from({ length: 20 }, () => insert('FAN', 0, 0))
    const source = dxf({
      blocks: [{ name: 'FAN', entities: inserts }],
      entities: [insert('FAN', 0, 0)],
    })
    expect(readDxf(bytesOf(source)).status).toBe('too-large')
  })
})

describe('drawingPartFromDxf and closedOutlines', () => {
  // clockwise on purpose
  const square = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ]

  it('makes a drawing part', () => {
    const result = ok(dxf({ entities: [line(0, 0, 1, 1)] }))
    const part = drawingPartFromDxf(result, 'plan.dxf')
    expect(part).toMatchObject({
      type: 'drawing',
      name: 'plan.dxf',
      role: 'solid',
      color: DEFAULT_SOLID_COLOR,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      hidden: false,
      locked: false,
      entities: result.entities,
    })
    expect(part.id).toMatch(/^[0-9a-f]{12}$/)
  })

  it('a closed polyline and a circle give two counter-clockwise rings; open ones give none', () => {
    const result = ok(
      dxf({
        entities: [
          lwpolyline(square, true),
          circle(50, 50, 5),
          lwpolyline(square, false),
          line(0, 0, 1, 1),
          text(0, 0, 1, 'x'),
        ],
      }),
    )
    const rings = closedOutlines(drawingPartFromDxf(result, 'x'))
    expect(rings).toHaveLength(2)
    const area = (ring: number[]): number => {
      let sum = 0
      for (let i = 0; i < ring.length; i += 2) {
        const j = (i + 2) % ring.length
        sum += ring[i]! * ring[j + 1]! - ring[j]! * ring[i + 1]!
      }
      return sum / 2
    }
    expect(area(rings[0]!)).toBeCloseTo(100, 9)
    expect(rings[1]!.length / 2).toBe(64)
    expect(area(rings[1]!)).toBeGreaterThan(0)
    expect(Math.hypot(rings[1]![0]! - 50, rings[1]![1]! - 50)).toBeCloseTo(5, 9)
  })
})
