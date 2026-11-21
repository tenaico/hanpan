import { decodeDxf, tokenizeDxf } from './dxf-tokens'
import type { DxfGroup } from './dxf-tokens'
import { MAX_FILE_BYTES } from './model'
import type { DrawingEntity } from './model'

export type DxfReadResult =
  | {
      status: 'ok'
      entities: DrawingEntity[]
      /** Entity types that were not read, with how many of each. */
      skipped: Record<string, number>
      unit: 'mm'
      /** The unit the file was drawn in ('in', 'ft', 'mm', 'cm', 'm', 'unitless', ...). */
      sourceUnit: string
      bounds: { min: [number, number]; max: [number, number] } | null
    }
  | { status: 'empty' | 'too-large' | 'broken' }

export interface DxfReadOptions {
  maxBytes?: number
  maxEntities?: number
}

/** Over this many entities (after blocks are expanded) a DXF file is not opened. */
export const MAX_DXF_ENTITIES = 200_000

/** How deep blocks inside blocks are expanded. */
const MAX_BLOCK_DEPTH = 8

/** Segments in a full circle or ellipse when it has to become a polyline. */
const CIRCLE_SEGMENTS = 64

/** Segments per half circle when a polyline bulge is flattened. */
const BULGE_SEGMENTS_PER_HALF_TURN = 16

/** $INSUNITS code -> [short name, millimetres per unit]. Unknown codes read as unitless. */
const UNITS: Record<number, [string, number]> = {
  0: ['unitless', 1],
  1: ['in', 25.4],
  2: ['ft', 304.8],
  3: ['mi', 1_609_344],
  4: ['mm', 1],
  5: ['cm', 10],
  6: ['m', 1000],
  7: ['km', 1_000_000],
  8: ['uin', 0.0000254],
  9: ['mil', 0.0254],
  10: ['yd', 914.4],
  13: ['um', 0.001],
  14: ['dm', 100],
}

/** \M+n code page digits used in MTEXT/TEXT for double-byte characters. */
const MBCS_PAGES: Record<string, string> = {
  '1': 'shift_jis',
  '2': 'big5',
  '3': 'euc-kr',
  '5': 'gbk',
}

/** Entity types whose coordinates are in the object coordinate system (mirrored when 230 < 0). */
const OCS_TYPES = new Set(['CIRCLE', 'ARC', 'LWPOLYLINE', 'POLYLINE', 'INSERT', 'TEXT', 'ATTRIB'])

interface RawEntity {
  type: string
  groups: DxfGroup[]
  /** VERTEX entities of a POLYLINE, ATTRIB entities of an INSERT. */
  children: RawEntity[]
}

interface Block {
  base: [number, number]
  entities: RawEntity[]
}

/** Affine 2D map: x' = a x + c y + e, y' = b x + d y + f. */
type Matrix = [number, number, number, number, number, number]

class TooLarge extends Error {}

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

function translate(x: number, y: number): Matrix {
  return [1, 0, 0, 1, x, y]
}

function rotate(deg: number): Matrix {
  if (deg % 360 === 0) return [1, 0, 0, 1, 0, 0]
  const r = (deg * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  return [cos, sin, -sin, cos, 0, 0]
}

function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

/** Rotation in degrees and scale when the map keeps circles round, else null. */
function conformal(m: Matrix): { scale: number; turnDeg: number; mirrored: boolean } | null {
  const s1 = Math.hypot(m[0], m[1])
  const s2 = Math.hypot(m[2], m[3])
  if (s1 === 0 || s2 === 0) return null
  if (Math.abs(s1 - s2) > 1e-9 * Math.max(s1, s2)) return null
  if (Math.abs(m[0] * m[2] + m[1] * m[3]) > 1e-9 * s1 * s2) return null
  const turnDeg = m[1] === 0 && m[0] > 0 ? 0 : (Math.atan2(m[1], m[0]) * 180) / Math.PI
  return { scale: s1, turnDeg, mirrored: m[0] * m[3] - m[1] * m[2] < 0 }
}

function normalizeDeg(deg: number): number {
  const out = deg % 360
  return out < 0 ? out + 360 : out
}

/** An angle after the map: kept as written when the map does not turn or mirror. */
function mapAngle(turn: { turnDeg: number; mirrored: boolean }, deg: number): number {
  if (turn.mirrored) return normalizeDeg(turn.turnDeg - deg)
  return turn.turnDeg === 0 ? deg : normalizeDeg(deg + turn.turnDeg)
}

function groupValue(entity: RawEntity, code: number): string | undefined {
  for (const g of entity.groups) if (g.code === code) return g.value
  return undefined
}

/**
 * A group value as a number. Text that is not a number reads as the fallback; a number too
 * large for a double stays ±Infinity, so the entity holding it is dropped when it is emitted.
 */
function parseNumber(value: string, fallback: number): number {
  const n = Number(value)
  return Number.isNaN(n) || value === '' ? fallback : n
}

function groupNumber(entity: RawEntity, code: number, fallback: number): number {
  const value = groupValue(entity, code)
  return value === undefined ? fallback : parseNumber(value, fallback)
}

/** Pairs of (xCode, yCode) values in file order, e.g. LWPOLYLINE vertices or SPLINE points. */
function pointList(entity: RawEntity, xCode: number, yCode: number): number[] {
  const points: number[] = []
  for (const g of entity.groups) {
    if (g.code === xCode) points.push(parseNumber(g.value, 0), 0)
    else if (g.code === yCode && points.length > 0)
      points[points.length - 1] = parseNumber(g.value, 0)
  }
  return points
}

// ---------------------------------------------------------------- text

function decodeMbcs(page: string, hex: string): string | null {
  const label = MBCS_PAGES[page]
  if (!label) return null
  try {
    const bytes = new Uint8Array([parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16)])
    return new TextDecoder(label, { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/** %%c, %%d, %%p, %%nnn and \U+XXXX / \M+nXXXX escapes, shared by TEXT and MTEXT. */
function decodeSpecials(value: string): string {
  return value
    .replace(/\\U\+([0-9a-fA-F]{4})/g, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\M\+([1-5])([0-9a-fA-F]{4})/g, (m, page: string, hex: string) => {
      return decodeMbcs(page, hex) ?? m
    })
    .replace(/%%(\d{3}|[cdpouCDPOU%])/g, (_m, code: string) => {
      switch (code.toLowerCase()) {
        case 'c':
          return 'Ø'
        case 'd':
          return '°'
        case 'p':
          return '±'
        case '%':
          return '%'
        case 'o':
        case 'u':
          return ''
        default:
          return String.fromCharCode(Number(code))
      }
    })
}

/** Formatting codes that carry a value up to a ';' (font, height, colour, alignment, ...). */
const MTEXT_VALUE_CODES = new Set(['f', 'F', 'H', 'C', 'c', 'A', 'T', 'Q', 'W', 'p'])
/** Formatting codes that are on/off switches (underline, overline, strike-through). */
const MTEXT_TOGGLE_CODES = new Set(['L', 'l', 'O', 'o', 'K', 'k'])

/** Plain text of an MTEXT value: paragraphs become newlines, formatting is dropped. */
export function stripMtext(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!
    if (ch === '{' || ch === '}') continue
    if (ch !== '\\') {
      out += ch
      continue
    }
    const code = value[i + 1]
    if (code === undefined) break
    i++
    if (code === '\\' || code === '{' || code === '}') out += code
    else if (code === 'P' || code === 'X' || code === 'N') out += '\n'
    else if (code === '~') out += ' '
    else if (code === 'U' || code === 'M') out += '\\' + code
    else if (code === 'S') {
      const end = value.indexOf(';', i + 1)
      const stacked = value.slice(i + 1, end < 0 ? value.length : end)
      out += stacked.replace(/\\;/g, ';').replace(/[\^#]/g, '/')
      i = end < 0 ? value.length : end
    } else if (MTEXT_VALUE_CODES.has(code)) {
      const end = value.indexOf(';', i + 1)
      i = end < 0 ? value.length : end
    } else if (!MTEXT_TOGGLE_CODES.has(code)) out += code
  }
  return out
}

// ---------------------------------------------------------------- structure

function splitEntities(groups: DxfGroup[]): RawEntity[] {
  const flat: RawEntity[] = []
  let current: RawEntity | null = null
  for (const g of groups) {
    if (g.code === 0) {
      current = { type: g.value.toUpperCase(), groups: [], children: [] }
      flat.push(current)
    } else if (current) current.groups.push(g)
  }
  // Fold VERTEX/ATTRIB ... SEQEND into the POLYLINE or INSERT before them.
  const out: RawEntity[] = []
  for (let i = 0; i < flat.length; i++) {
    const entity = flat[i]!
    out.push(entity)
    const owner =
      entity.type === 'POLYLINE' ||
      (entity.type === 'INSERT' && groupValue(entity, 66) !== undefined)
    if (!owner) continue
    const child = entity.type === 'POLYLINE' ? 'VERTEX' : 'ATTRIB'
    while (i + 1 < flat.length && flat[i + 1]!.type === child) entity.children.push(flat[++i]!)
    if (i + 1 < flat.length && flat[i + 1]!.type === 'SEQEND') i++
  }
  return out
}

function readSections(groups: DxfGroup[]): Map<string, DxfGroup[]> {
  const sections = new Map<string, DxfGroup[]>()
  let i = 0
  while (i < groups.length) {
    const g = groups[i]!
    if (g.code === 0 && g.value.toUpperCase() === 'EOF') break
    if (g.code === 0 && g.value.toUpperCase() === 'SECTION') {
      const nameGroup = groups[i + 1]
      const name = nameGroup?.code === 2 ? nameGroup.value.toUpperCase() : ''
      let j = i + 1
      while (
        j < groups.length &&
        !(groups[j]!.code === 0 && groups[j]!.value.toUpperCase() === 'ENDSEC')
      )
        j++
      if (name && !sections.has(name)) sections.set(name, groups.slice(i + 2, j))
      i = j + 1
    } else i++
  }
  return sections
}

function headerUnit(header: DxfGroup[] | undefined): [string, number] {
  if (!header) return UNITS[0]!
  for (let i = 0; i < header.length; i++) {
    const g = header[i]!
    if (g.code !== 9 || g.value.toUpperCase() !== '$INSUNITS') continue
    const value = header[i + 1]
    if (value?.code !== 70) break
    return UNITS[Number.parseInt(value.value, 10)] ?? UNITS[0]!
  }
  return UNITS[0]!
}

function readBlocks(groups: DxfGroup[] | undefined): Map<string, Block> {
  const blocks = new Map<string, Block>()
  if (!groups) return blocks
  let current: Block | null = null
  for (const entity of splitEntities(groups)) {
    if (entity.type === 'BLOCK') {
      current = {
        base: [groupNumber(entity, 10, 0), groupNumber(entity, 20, 0)],
        entities: [],
      }
      const name = (groupValue(entity, 2) ?? groupValue(entity, 3) ?? '').toUpperCase()
      if (name && !blocks.has(name)) blocks.set(name, current)
    } else if (entity.type === 'ENDBLK') current = null
    else if (current) current.entities.push(entity)
  }
  return blocks
}

// ---------------------------------------------------------------- entities

/** Flattened points of a polyline with bulges. vertices: [x, y, bulge][] */
function flattenBulges(vertices: [number, number, number][], closed: boolean): number[] {
  const points: number[] = []
  const count = vertices.length
  const segments = closed ? count : count - 1
  for (let k = 0; k < Math.max(segments, 0); k++) {
    const [x1, y1, bulge] = vertices[k]!
    const [x2, y2] = vertices[(k + 1) % count]!
    points.push(x1, y1)
    const chord = Math.hypot(x2 - x1, y2 - y1)
    if (bulge === 0 || chord === 0 || !Number.isFinite(bulge)) continue
    const sweep = 4 * Math.atan(bulge)
    const h = (chord * (1 - bulge * bulge)) / (4 * bulge)
    const cx = (x1 + x2) / 2 - ((y2 - y1) / chord) * h
    const cy = (y1 + y2) / 2 + ((x2 - x1) / chord) * h
    const r = Math.hypot(x1 - cx, y1 - cy)
    const start = Math.atan2(y1 - cy, x1 - cx)
    const n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / BULGE_SEGMENTS_PER_HALF_TURN)))
    for (let s = 1; s < n; s++) {
      const t = start + (sweep * s) / n
      points.push(cx + r * Math.cos(t), cy + r * Math.sin(t))
    }
  }
  if (!closed && count > 0) points.push(vertices[count - 1]![0], vertices[count - 1]![1])
  return points
}

function arcPoints(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number) {
  const full = sweepDeg >= 360
  const n = full ? CIRCLE_SEGMENTS : Math.max(8, Math.ceil((CIRCLE_SEGMENTS * sweepDeg) / 360))
  const points: number[] = []
  const last = full ? n - 1 : n
  for (let s = 0; s <= last; s++) {
    const t = ((startDeg + (sweepDeg * s) / n) * Math.PI) / 180
    points.push(cx + r * Math.cos(t), cy + r * Math.sin(t))
  }
  return points
}

/** True when every number the entity holds is finite (a saved document must not hold NaN). */
function isFiniteEntity(e: DrawingEntity): boolean {
  switch (e.kind) {
    case 'line':
      return [...e.a, ...e.b].every(Number.isFinite)
    case 'polyline':
      return e.points.every(Number.isFinite)
    case 'circle':
      return [...e.center, e.radius].every(Number.isFinite)
    case 'arc':
      return [...e.center, e.radius, e.startDeg, e.endDeg].every(Number.isFinite)
    case 'text':
      return [...e.at, e.height, e.rotationDeg].every(Number.isFinite)
  }
}

function mapPoints(m: Matrix, points: number[]): number[] {
  const out = new Array<number>(points.length)
  for (let i = 0; i < points.length; i += 2) {
    const [x, y] = apply(m, points[i]!, points[i + 1]!)
    out[i] = x
    out[i + 1] = y
  }
  return out
}

const ACI_BASE: Record<number, string> = {
  1: '#ff0000',
  2: '#ffff00',
  3: '#00ff00',
  4: '#00ffff',
  5: '#0000ff',
  6: '#ff00ff',
  7: '#ffffff',
  8: '#808080',
  9: '#c0c0c0',
}

const hex2 = (v: number): string =>
  Math.round(Math.max(0, Math.min(255, v)))
    .toString(16)
    .padStart(2, '0')

/**
 * The AutoCAD colour index (1-255) as #rrggbb; null for 0 (by block), 256 (by layer) and others.
 * 1-9 are the standard colours. 10-249 follow the index's pattern of 24 hues, each in five
 * brightness steps, full and half saturation, so the result is close to, not exactly, the
 * program's own palette. 250-255 are greys.
 */
export function aciToHex(index: number): string | null {
  if (!Number.isInteger(index) || index < 1 || index > 255) return null
  const base = ACI_BASE[index]
  if (base) return base
  if (index >= 250) {
    const g = 51 + (index - 250) * 40.8
    return `#${hex2(g)}${hex2(g)}${hex2(g)}`
  }
  const hue = Math.floor((index - 10) / 10) * 15
  const step = (index - 10) % 10
  const value = [1, 0.8, 0.6, 0.5, 0.3][Math.floor(step / 2)]!
  const saturation = step % 2 === 0 ? 1 : 0.5
  const c = value * saturation
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = value - c
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x]
  return `#${hex2((r + m) * 255)}${hex2((g + m) * 255)}${hex2((b + m) * 255)}`
}

/** Layer name (upper case) to its colour index, from the LAYER table. A switched-off layer has a negative index. */
function readLayerColours(tables: DxfGroup[] | undefined): Map<string, number> {
  const colours = new Map<string, number>()
  if (!tables) return colours
  let name: string | null = null
  let colour: number | null = null
  let inLayer = false
  const flush = (): void => {
    if (inLayer && name !== null && colour !== null)
      colours.set(name.toUpperCase(), Math.abs(colour))
    name = null
    colour = null
  }
  for (const g of tables) {
    if (g.code === 0) {
      flush()
      inLayer = g.value.toUpperCase() === 'LAYER'
    } else if (inLayer && g.code === 2) name = g.value
    else if (inLayer && g.code === 62) colour = parseNumber(g.value, 7)
  }
  flush()
  return colours
}

class Reader {
  readonly entities: DrawingEntity[] = []
  readonly skipped: Record<string, number> = {}
  private budget: number
  /** colour of the entity being read; children of a block insert inherit it when "by block" */
  private colour: string | null = null

  constructor(
    private readonly blocks: Map<string, Block>,
    private readonly maxEntities: number,
    private readonly layerColours: Map<string, number> = new Map(),
  ) {
    // Blocks that only insert other blocks emit nothing, so visits are capped as well.
    this.budget = maxEntities * 10 + 1000
  }

  skip(type: string): void {
    this.skipped[type] = (this.skipped[type] ?? 0) + 1
  }

  /** type is the DXF entity type, counted in skipped when the entity is dropped. */
  private emit(entity: DrawingEntity, type: string): void {
    if (!isFiniteEntity(entity)) {
      this.skip(type)
      return
    }
    this.entities.push(this.colour === null ? entity : { ...entity, color: this.colour })
    if (this.entities.length > this.maxEntities) throw new TooLarge()
  }

  private polyline(
    type: string,
    m: Matrix,
    points: number[],
    closed: boolean,
    layer: string,
  ): void {
    if (points.length < 4) return
    this.emit({ kind: 'polyline', points: mapPoints(m, points), closed, layer }, type)
  }

  private text(
    type: string,
    m: Matrix,
    x: number,
    y: number,
    h: number,
    deg: number,
    value: string,
    layer: string,
  ) {
    const turn = conformal(m)
    let rotationDeg: number
    let height: number
    if (turn && !turn.mirrored) {
      rotationDeg = mapAngle(turn, deg)
      height = h * turn.scale
    } else {
      const r = (deg * Math.PI) / 180
      const dir = apply([m[0], m[1], m[2], m[3], 0, 0], Math.cos(r), Math.sin(r))
      const up = apply([m[0], m[1], m[2], m[3], 0, 0], -Math.sin(r), Math.cos(r))
      rotationDeg = normalizeDeg((Math.atan2(dir[1], dir[0]) * 180) / Math.PI)
      height = h * Math.hypot(up[0], up[1])
    }
    this.emit({ kind: 'text', at: apply(m, x, y), height, rotationDeg, value, layer }, type)
  }

  /**
   * A linear or aligned DIMENSION that has no block of its own, drawn from its
   * points: the two extension lines (13/23, 14/24 up to the dimension line), the
   * dimension line through 10/20, and its text (group 1, "<>" or empty for the
   * measurement in group 42) over the middle of the line. Other kinds: false.
   */
  private dimensionWithoutBlock(entity: RawEntity, m: Matrix, layer: string): boolean {
    const type = groupNumber(entity, 70, 0) & 7
    if ((type !== 0 && type !== 1) || groupValue(entity, 13) === undefined) return false
    if (groupValue(entity, 14) === undefined) return false
    const num = (code: number): number => groupNumber(entity, code, 0)
    const p1: [number, number] = [num(13), num(23)]
    const p2: [number, number] = [num(14), num(24)]
    const d: [number, number] = [num(10), num(20)]
    let u: [number, number]
    if (type === 0) {
      const r = (num(50) * Math.PI) / 180
      u = [Math.cos(r), Math.sin(r)]
    } else {
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
      if (!(len > 0)) return false
      u = [(p2[0] - p1[0]) / len, (p2[1] - p1[1]) / len]
    }
    // the feet of the two points on the dimension line through d
    const foot = (p: [number, number]): [number, number] => {
      const t = (p[0] - d[0]) * u[0] + (p[1] - d[1]) * u[1]
      return [d[0] + u[0] * t, d[1] + u[1] * t]
    }
    const q1 = foot(p1)
    const q2 = foot(p2)
    const lineOf = (a: [number, number], b: [number, number]): void => {
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) return
      this.emit(
        { kind: 'line', a: apply(m, a[0], a[1]), b: apply(m, b[0], b[1]), layer },
        'DIMENSION',
      )
    }
    lineOf(p1, q1)
    lineOf(p2, q2)
    lineOf(q1, q2)
    const span = Math.hypot(q2[0] - q1[0], q2[1] - q1[1])
    const measured = num(42)
    const shown = Number.isFinite(measured) ? String(Math.round(measured * 100) / 100) : ''
    const raw = decodeSpecials(stripMtext(groupValue(entity, 1) ?? ''))
    const value = raw === '' ? shown : raw.replace('<>', shown)
    if (!value || !(span > 0)) return true
    // text reads left to right: turn a line that runs right to left around
    let dir = u
    if (dir[0] < -1e-9 || (Math.abs(dir[0]) <= 1e-9 && dir[1] < 0)) dir = [-dir[0], -dir[1]]
    const deg = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI
    const h = span * 0.06
    const width = h * 0.6 * value.length
    const mid: [number, number] = [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2]
    // up from the line by a fifth of the text height, centred along it
    const nrm: [number, number] = [-dir[1], dir[0]]
    const x = mid[0] - dir[0] * (width / 2) + nrm[0] * h * 0.2
    const y = mid[1] - dir[1] * (width / 2) + nrm[1] * h * 0.2
    this.text('DIMENSION', m, x, y, h, deg, value, layer)
    return true
  }

  private expand(name: string, m: Matrix, depth: number, layer: string, useBase: boolean): boolean {
    const block = this.blocks.get(name.toUpperCase())
    if (!block) return false
    if (depth + 1 > MAX_BLOCK_DEPTH) return true
    const local = useBase ? multiply(m, translate(-block.base[0], -block.base[1])) : m
    for (const child of block.entities) this.read(child, local, depth + 1, layer)
    return true
  }

  /** Reads one entity under map m. depth is how many blocks deep it sits. */
  read(entity: RawEntity, parent: Matrix, depth: number, inherited: string | null): void {
    if (--this.budget < 0) throw new TooLarge()
    const own = groupValue(entity, 8) ?? '0'
    const layer = own === '0' && inherited !== null ? inherited : own
    const outer = this.colour
    const index = groupNumber(entity, 62, 256)
    // an exact colour (420, AutoCAD 2004 and later) comes before the nearest numbered one
    const exact = groupNumber(entity, 420, -1)
    this.colour =
      exact >= 0 && exact <= 0xffffff
        ? `#${Math.floor(exact).toString(16).padStart(6, '0')}`
        : index === 0
          ? outer
          : index >= 1 && index <= 255
            ? aciToHex(index)
            : aciToHex(this.layerColours.get(layer.toUpperCase()) ?? 0)
    try {
      this.readEntity(entity, parent, depth, layer, inherited)
    } finally {
      this.colour = outer
    }
  }

  private readEntity(
    entity: RawEntity,
    parent: Matrix,
    depth: number,
    layer: string,
    inherited: string | null,
  ): void {
    const m =
      OCS_TYPES.has(entity.type) && groupNumber(entity, 230, 1) < 0
        ? multiply(parent, [-1, 0, 0, 1, 0, 0])
        : parent
    const num = (code: number, fallback = 0): number => groupNumber(entity, code, fallback)

    switch (entity.type) {
      case 'LINE':
        this.emit(
          { kind: 'line', a: apply(m, num(10), num(20)), b: apply(m, num(11), num(21)), layer },
          entity.type,
        )
        return
      case 'LWPOLYLINE': {
        const vertices: [number, number, number][] = []
        for (const g of entity.groups) {
          if (g.code === 10) vertices.push([parseNumber(g.value, 0), 0, 0])
          else if (g.code === 20 && vertices.length)
            vertices[vertices.length - 1]![1] = parseNumber(g.value, 0)
          else if (g.code === 42 && vertices.length)
            vertices[vertices.length - 1]![2] = parseNumber(g.value, 0)
        }
        const closed = (num(70) & 1) === 1
        this.polyline(entity.type, m, flattenBulges(vertices, closed), closed, layer)
        return
      }
      case 'POLYLINE': {
        const flags = num(70)
        if (flags & (16 | 64)) {
          this.skip('POLYLINE')
          return
        }
        const vertices: [number, number, number][] = entity.children
          .filter((v) => (groupNumber(v, 70, 0) & 16) === 0)
          .map((v) => [groupNumber(v, 10, 0), groupNumber(v, 20, 0), groupNumber(v, 42, 0)])
        const closed = (flags & 1) === 1
        this.polyline(entity.type, m, flattenBulges(vertices, closed), closed, layer)
        return
      }
      case 'CIRCLE':
      case 'ARC': {
        const cx = num(10)
        const cy = num(20)
        const r = num(40)
        const isArc = entity.type === 'ARC'
        const startDeg = isArc ? num(50) : 0
        const endDeg = isArc ? num(51, 360) : 360
        const turn = conformal(m)
        if (turn) {
          const center = apply(m, cx, cy)
          const radius = r * turn.scale
          if (!isArc) this.emit({ kind: 'circle', center, radius, layer }, entity.type)
          else {
            const a = mapAngle(turn, startDeg)
            const b = mapAngle(turn, endDeg)
            const [s, e] = turn.mirrored ? [b, a] : [a, b]
            this.emit({ kind: 'arc', center, radius, startDeg: s, endDeg: e, layer }, entity.type)
          }
          return
        }
        let sweep = isArc ? normalizeDeg(endDeg - startDeg) : 360
        if (sweep === 0) sweep = 360
        this.polyline(entity.type, m, arcPoints(cx, cy, r, startDeg, sweep), !isArc, layer)
        return
      }
      case 'ELLIPSE': {
        const cx = num(10)
        const cy = num(20)
        const mx = num(11)
        const my = num(21)
        const ratio = num(40, 1)
        const side = num(230, 1) < 0 ? -1 : 1
        const nx = -my * ratio * side
        const ny = mx * ratio * side
        const t0 = num(41, 0)
        const t1 = num(42, 2 * Math.PI)
        const turn = 2 * Math.PI
        // Reduce both ends first: for huge parameters t1 - t0 loses all precision.
        let span = ((((t1 % turn) - (t0 % turn)) % turn) + turn) % turn
        if (!Number.isFinite(span)) {
          this.skip('ELLIPSE')
          return
        }
        if (span <= 1e-12 || span >= turn - 1e-12) span = turn
        const full = span >= turn - 1e-9
        const n = full
          ? CIRCLE_SEGMENTS
          : Math.max(8, Math.ceil((CIRCLE_SEGMENTS * span) / (2 * Math.PI)))
        const points: number[] = []
        for (let s = 0; s <= (full ? n - 1 : n); s++) {
          const t = (t0 % turn) + (span * s) / n
          const cos = Math.cos(t)
          const sin = Math.sin(t)
          points.push(cx + cos * mx + sin * nx, cy + cos * my + sin * ny)
        }
        this.polyline(entity.type, m, points, full, layer)
        return
      }
      case 'SPLINE': {
        const control = pointList(entity, 10, 20)
        const points = control.length >= 4 ? control : pointList(entity, 11, 21)
        if (points.length < 4) {
          this.skip('SPLINE')
          return
        }
        this.polyline(entity.type, m, points, (num(70) & 1) === 1, layer)
        return
      }
      case 'TEXT':
      case 'ATTRIB': {
        if (entity.type === 'ATTRIB' && (num(70) & 1) === 1) return
        const aligned = (num(72) !== 0 || num(73) !== 0) && groupValue(entity, 11) !== undefined
        const x = aligned ? num(11) : num(10)
        const y = aligned ? num(21) : num(20)
        const value = decodeSpecials(groupValue(entity, 1) ?? '')
        this.text(entity.type, m, x, y, num(40), num(50), value, layer)
        return
      }
      case 'MTEXT': {
        let raw = ''
        for (const g of entity.groups) if (g.code === 3) raw += g.value
        raw += groupValue(entity, 1) ?? ''
        let deg = num(50)
        if (groupValue(entity, 50) === undefined && groupValue(entity, 11) !== undefined) {
          deg = (Math.atan2(num(21), num(11)) * 180) / Math.PI
        }
        const value = decodeSpecials(stripMtext(raw))
        this.text(entity.type, m, num(10), num(20), num(40), deg, value, layer)
        return
      }
      case 'INSERT': {
        const name = groupValue(entity, 2) ?? ''
        const sx = num(41, 1)
        const sy = num(42, 1)
        const rot = num(50)
        const cols = Math.max(1, Math.floor(num(70, 1)))
        const rows = Math.max(1, Math.floor(num(71, 1)))
        // Every array cell costs a visit, even when the block is empty or past the depth
        // limit, so a huge array ends as too-large instead of spinning.
        this.budget -= cols * rows - 1
        if (!(this.budget >= 0)) throw new TooLarge()
        const base = multiply(multiply(m, translate(num(10), num(20))), rotate(rot))
        let found = true
        for (let r = 0; r < rows && found; r++) {
          for (let c = 0; c < cols && found; c++) {
            const cell = multiply(multiply(base, translate(c * num(44), r * num(45))), [
              sx,
              0,
              0,
              sy,
              0,
              0,
            ])
            found = this.expand(name, cell, depth, layer, true)
          }
        }
        if (!found) this.skip('INSERT')
        // Attribute values are placed in drawing coordinates, not block coordinates.
        for (const attrib of entity.children) this.read(attrib, parent, depth, inherited)
        return
      }
      case 'DIMENSION': {
        const name = groupValue(entity, 2)
        if (name && this.expand(name, m, depth, layer, false)) return
        // no *D block (AutoCAD's dimensional constraints, some converted files): draw it ourselves
        if (!this.dimensionWithoutBlock(entity, m, layer)) this.skip('DIMENSION')
        return
      }
      case 'SEQEND':
        return
      default:
        this.skip(entity.type)
    }
  }
}

function boundsOf(
  entities: DrawingEntity[],
): { min: [number, number]; max: [number, number] } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const add = (x: number, y: number): void => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  for (const e of entities) {
    switch (e.kind) {
      case 'line':
        add(e.a[0], e.a[1])
        add(e.b[0], e.b[1])
        break
      case 'polyline':
        for (let i = 0; i < e.points.length; i += 2) add(e.points[i]!, e.points[i + 1]!)
        break
      case 'circle':
      case 'arc':
        add(e.center[0] - e.radius, e.center[1] - e.radius)
        add(e.center[0] + e.radius, e.center[1] + e.radius)
        break
      case 'text':
        add(e.at[0], e.at[1])
        break
    }
  }
  return minX <= maxX ? { min: [minX, minY], max: [maxX, maxY] } : null
}

/**
 * Reads a DXF drawing (text DXF, any version) into 2D entities in millimetres.
 * Blocks (INSERT) and dimensions (DIMENSION) are expanded into plain entities.
 */
export function readDxf(bytes: Uint8Array, options: DxfReadOptions = {}): DxfReadResult {
  const maxBytes = options.maxBytes ?? MAX_FILE_BYTES
  const maxEntities = options.maxEntities ?? MAX_DXF_ENTITIES
  if (bytes.length > maxBytes) return { status: 'too-large' }
  const text = decodeDxf(bytes)
  if (text.trim() === '') return { status: 'empty' }
  const groups = tokenizeDxf(text)
  if (!groups) return { status: 'broken' }

  const sections = readSections(groups)
  const [sourceUnit, factor] = headerUnit(sections.get('HEADER'))
  const blocks = readBlocks(sections.get('BLOCKS'))
  const all = splitEntities(sections.get('ENTITIES') ?? [])
  // Paper space (group 67 = 1) holds sheet layouts; read it only when model space is empty.
  const model = all.filter((e) => groupValue(e, 67) !== '1')
  const paperCount = all.length - model.length
  const top = model.length > 0 ? model : all

  const reader = new Reader(blocks, maxEntities, readLayerColours(sections.get('TABLES')))
  const unit: Matrix = [factor, 0, 0, factor, 0, 0]
  try {
    for (const entity of top) reader.read(entity, unit, 0, null)
  } catch (error) {
    if (error instanceof TooLarge) return { status: 'too-large' }
    throw error
  }
  if (top === model && paperCount > 0) reader.skipped['PAPER_SPACE'] = paperCount

  return {
    status: 'ok',
    entities: reader.entities,
    skipped: reader.skipped,
    unit: 'mm',
    sourceUnit,
    bounds: boundsOf(reader.entities),
  }
}
