import { applyTransform, transformOf } from './geometry'
import { formatMm, partSize } from './measure'
import { meshBounds } from './mesh'
import type { CadDocument, DrawingEntity, DrawingPart, Mesh } from './model'
import { viewOutline } from './silhouette'
import type { SheetView } from './silhouette'

export interface SheetLabels {
  front: string
  top: string
  side: string
  title: string
  date: string
  scale: string
}

export interface SheetRow {
  name: string
  width: string
  depth: string
  height: string
}

export interface SheetResult {
  /** A4 landscape, millimetre units, black lines on white. */
  svg: string
  scale: string
  widthMm: 297
  heightMm: 210
  /** One row per visible top-level solid part that has a mesh. */
  rows: SheetRow[]
}

/** What makeSheet needs from each evaluated part (EvaluatedPart fits). */
export interface SheetInput {
  id: string
  mesh: Mesh | null
}

const SCALES: readonly { label: string; factor: number }[] = [
  { label: '10:1', factor: 10 },
  { label: '5:1', factor: 5 },
  { label: '2:1', factor: 2 },
  { label: '1:1', factor: 1 },
  { label: '1:2', factor: 1 / 2 },
  { label: '1:5', factor: 1 / 5 },
  { label: '1:10', factor: 1 / 10 },
  { label: '1:20', factor: 1 / 20 },
  { label: '1:50', factor: 1 / 50 },
  { label: '1:100', factor: 1 / 100 },
  { label: '1:200', factor: 1 / 200 },
  { label: '1:500', factor: 1 / 500 },
  { label: '1:1000', factor: 1 / 1000 },
]

/** The largest standard scale at which `sizeMm` fits in `roomMm`; 1:1000 when none does. */
export function chooseScale(sizeMm: number, roomMm: number): { label: string; factor: number } {
  for (const s of SCALES) if (sizeMm * s.factor <= roomMm) return s
  return SCALES[SCALES.length - 1]!
}

const PAGE_W = 297
const PAGE_H = 210
const MARGIN = 10
const TITLE_W = 90
const TITLE_ROW = 8
const TITLE_H = TITLE_ROW * 3
const AREA_X = MARGIN
const AREA_Y = MARGIN
const AREA_W = PAGE_W - 2 * MARGIN
const AREA_H = PAGE_H - 2 * MARGIN - TITLE_H - 4
/** Room kept around views for dimension lines and labels. */
const GAP = 20
const FONT = 3.5

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function num(value: number): string {
  const r = Math.round(value * 1000) / 1000
  return Object.is(r, -0) ? '0' : String(r)
}

class Svg {
  private parts: string[] = []

  line(x0: number, y0: number, x1: number, y1: number, width = 0.35): void {
    this.parts.push(
      `<line x1="${num(x0)}" y1="${num(y0)}" x2="${num(x1)}" y2="${num(y1)}" stroke-width="${width}"/>`,
    )
  }

  circle(cx: number, cy: number, r: number): void {
    this.parts.push(`<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" fill="none"/>`)
  }

  path(d: string): void {
    this.parts.push(`<path d="${d}" fill="none"/>`)
  }

  text(x: number, y: number, value: string, anchor = 'middle', size = FONT, rotate = 0): void {
    const turn = rotate ? ` transform="rotate(${num(rotate)} ${num(x)} ${num(y)})"` : ''
    this.parts.push(
      `<text x="${num(x)}" y="${num(y)}" font-size="${size}" text-anchor="${anchor}"${turn}>${esc(value)}</text>`,
    )
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.parts.push(
      `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" fill="none" stroke-width="0.5"/>`,
    )
  }

  done(): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}mm" height="${PAGE_H}mm" viewBox="0 0 ${PAGE_W} ${PAGE_H}">` +
      `<rect x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" fill="#ffffff"/>` +
      `<g stroke="#000000" fill="#000000" font-family="sans-serif" stroke-linecap="round">` +
      this.parts.join('') +
      '</g></svg>'
    )
  }
}

/** A horizontal or vertical dimension line with end ticks and the value in the middle. */
function dimension(
  svg: Svg,
  from: [number, number],
  to: [number, number],
  value: number,
  vertical: boolean,
): void {
  svg.line(from[0], from[1], to[0], to[1], 0.18)
  const tick = 1.2
  for (const [x, y] of [from, to]) svg.line(x - tick, y + tick, x + tick, y - tick, 0.25)
  const mx = (from[0] + to[0]) / 2
  const my = (from[1] + to[1]) / 2
  if (vertical) svg.text(mx - 1.5, my, formatMm(value), 'middle', FONT, -90)
  else svg.text(mx, my - 1.5, formatMm(value))
}

interface Extent {
  min: [number, number, number]
  max: [number, number, number]
}

function entityPoints(e: DrawingEntity): [number, number][] {
  switch (e.kind) {
    case 'line':
      return [e.a, e.b]
    case 'polyline': {
      const out: [number, number][] = []
      for (let i = 0; i + 1 < e.points.length; i += 2) out.push([e.points[i]!, e.points[i + 1]!])
      return out
    }
    case 'circle':
    case 'arc':
      return [
        [e.center[0] - e.radius, e.center[1] - e.radius],
        [e.center[0] + e.radius, e.center[1] + e.radius],
      ]
    case 'text':
      return [e.at]
  }
}

/** The drawing entities moved to where the part sits (only the turn about z is applied). */
function placedEntities(part: DrawingPart): DrawingEntity[] {
  const tr = transformOf(part.position, part.rotation)
  const at = (p: [number, number]): [number, number] => {
    const r = applyTransform(tr, [p[0], p[1], 0])
    return [r[0], r[1]]
  }
  const turn = part.rotation[2]
  return part.entities.map((e): DrawingEntity => {
    switch (e.kind) {
      case 'line':
        return { ...e, a: at(e.a), b: at(e.b) }
      case 'polyline': {
        const points: number[] = []
        for (let i = 0; i + 1 < e.points.length; i += 2)
          points.push(...at([e.points[i]!, e.points[i + 1]!]))
        return { ...e, points }
      }
      case 'circle':
        return { ...e, center: at(e.center) }
      case 'arc':
        return { ...e, center: at(e.center), startDeg: e.startDeg + turn, endDeg: e.endDeg + turn }
      case 'text':
        return { ...e, at: at(e.at), rotationDeg: e.rotationDeg + turn }
    }
  })
}

function drawEntity(
  svg: Svg,
  e: DrawingEntity,
  map: (x: number, y: number) => [number, number],
  f: number,
): void {
  switch (e.kind) {
    case 'line': {
      const [x0, y0] = map(e.a[0], e.a[1])
      const [x1, y1] = map(e.b[0], e.b[1])
      svg.line(x0, y0, x1, y1, 0.25)
      return
    }
    case 'polyline': {
      const pts: string[] = []
      for (let i = 0; i + 1 < e.points.length; i += 2) {
        const [x, y] = map(e.points[i]!, e.points[i + 1]!)
        pts.push(`${pts.length ? 'L' : 'M'}${num(x)} ${num(y)}`)
      }
      if (pts.length > 1) svg.path(pts.join(' ') + (e.closed ? ' Z' : ''))
      return
    }
    case 'circle': {
      const [cx, cy] = map(e.center[0], e.center[1])
      svg.circle(cx, cy, e.radius * f)
      return
    }
    case 'arc': {
      const rad = Math.PI / 180
      const end = (deg: number) =>
        map(
          e.center[0] + e.radius * Math.cos(deg * rad),
          e.center[1] + e.radius * Math.sin(deg * rad),
        )
      const [x0, y0] = end(e.startDeg)
      const [x1, y1] = end(e.endDeg)
      const sweep = (((e.endDeg - e.startDeg) % 360) + 360) % 360
      const r = num(e.radius * f)
      // paper y points down, so a counter-clockwise arc in the model is clockwise on paper
      svg.path(`M${num(x0)} ${num(y0)} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${num(x1)} ${num(y1)}`)
      return
    }
    case 'text': {
      const [x, y] = map(e.at[0], e.at[1])
      svg.text(
        x,
        y,
        e.value.split('\n')[0] ?? '',
        'start',
        Math.max(e.height * f, 1),
        -e.rotationDeg,
      )
      return
    }
  }
}

function titleBlock(svg: Svg, doc: CadDocument, labels: SheetLabels, scale: string): void {
  const x = PAGE_W - MARGIN - TITLE_W
  const y = PAGE_H - MARGIN - TITLE_H
  svg.rect(MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN)
  svg.rect(x, y, TITLE_W, TITLE_H)
  const rows: [string, string][] = [
    [labels.title, doc.title.name],
    [labels.date, doc.title.date],
    [labels.scale, scale],
  ]
  rows.forEach(([label, value], i) => {
    const top = y + i * TITLE_ROW
    if (i > 0) svg.line(x, top, x + TITLE_W, top, 0.25)
    svg.line(x + 24, top, x + 24, top + TITLE_ROW, 0.25)
    svg.text(x + 2, top + TITLE_ROW - 2.5, label, 'start', 3)
    if (value) svg.text(x + 26, top + TITLE_ROW - 2.5, value, 'start', 3)
  })
}

/**
 * A dimensioned A4 sheet. With solids: front view bottom left, top view above
 * it, side view to its right (third-angle layout), each with its overall
 * dimensions. With only 2D drawings: one view from above. The scale is the
 * largest standard one that fits.
 */
export function makeSheet(
  doc: CadDocument,
  evaluated: readonly SheetInput[],
  labels: SheetLabels,
): SheetResult {
  const svg = new Svg()
  const byId = new Map(doc.parts.map((p) => [p.id, p]))
  const visible = evaluated.filter((e) => {
    const part = byId.get(e.id)
    return part !== undefined && !part.hidden
  })
  const meshes = visible.flatMap((e) => (e.mesh ? [e.mesh] : []))
  const drawings = doc.parts
    .filter((p): p is DrawingPart => p.type === 'drawing' && !p.hidden)
    .flatMap(placedEntities)

  const rows: SheetRow[] = []
  for (const e of visible) {
    const part = byId.get(e.id)!
    const size = partSize(e)
    if (part.role !== 'solid' || !size) continue
    rows.push({
      name: part.name,
      width: formatMm(size.width),
      depth: formatMm(size.depth),
      height: formatMm(size.height),
    })
  }

  const ext: Extent = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  }
  for (const m of meshes) {
    const b = meshBounds(m)
    for (let k = 0; k < 3; k++) {
      ext.min[k] = Math.min(ext.min[k]!, b.min[k]!)
      ext.max[k] = Math.max(ext.max[k]!, b.max[k]!)
    }
  }
  for (const e of drawings) {
    for (const [x, y] of entityPoints(e)) {
      ext.min[0] = Math.min(ext.min[0], x)
      ext.min[1] = Math.min(ext.min[1], y)
      ext.max[0] = Math.max(ext.max[0], x)
      ext.max[1] = Math.max(ext.max[1], y)
    }
  }

  if (!meshes.length && !drawings.length) {
    titleBlock(svg, doc, labels, '1:1')
    return { svg: svg.done(), scale: '1:1', widthMm: PAGE_W, heightMm: PAGE_H, rows }
  }
  if (!meshes.length) {
    ext.min[2] = 0
    ext.max[2] = 0
  }
  const W = ext.max[0] - ext.min[0]
  const D = ext.max[1] - ext.min[1]
  const H = ext.max[2] - ext.min[2]

  let scale: { label: string; factor: number }
  if (meshes.length) {
    const a = chooseScale(W + D, AREA_W - 2 * GAP)
    const b = chooseScale(H + D, AREA_H - 2 * GAP)
    scale = a.factor < b.factor ? a : b
  } else {
    const a = chooseScale(W, AREA_W - 2 * GAP)
    const b = chooseScale(D, AREA_H - 2 * GAP)
    scale = a.factor < b.factor ? a : b
  }
  const f = scale.factor

  // paper origins: left edge of the front/top column and the bottom of the front view
  const left = AREA_X + GAP
  const frontBottom = AREA_Y + AREA_H - GAP / 2
  const topBottom = meshes.length ? frontBottom - H * f - GAP : frontBottom
  const sideLeft = left + W * f + GAP

  const place = (view: SheetView, ou: number, ov: number) => (u: number, v: number) => {
    const umin = view === 'side' ? ext.min[1] : ext.min[0]
    const vmin = view === 'top' ? ext.min[1] : ext.min[2]
    return [ou + (u - umin) * f, ov - (v - vmin) * f] as [number, number]
  }

  const drawView = (view: SheetView, ou: number, ov: number): void => {
    const map = place(view, ou, ov)
    for (const m of meshes) {
      for (const s of viewOutline(m, view)) {
        const [x0, y0] = map(s[0]!, s[1]!)
        const [x1, y1] = map(s[2]!, s[3]!)
        svg.line(x0, y0, x1, y1)
      }
    }
    if (view === 'top') for (const e of drawings) drawEntity(svg, e, map, f)
  }

  // top view, with depth on its left and (for drawings) width under it
  drawView('top', left, topBottom)
  svg.text(left + (W * f) / 2, topBottom - D * f - 4, labels.top)
  dimension(svg, [left - 6, topBottom], [left - 6, topBottom - D * f], D, true)
  if (meshes.length) {
    drawView('front', left, frontBottom)
    svg.text(left + (W * f) / 2, frontBottom + 7, labels.front)
    dimension(svg, [left, frontBottom + 3], [left + W * f, frontBottom + 3], W, false)
    dimension(svg, [left - 6, frontBottom], [left - 6, frontBottom - H * f], H, true)
    drawView('side', sideLeft, frontBottom)
    svg.text(sideLeft + (D * f) / 2, frontBottom + 7, labels.side)
  } else {
    dimension(svg, [left, topBottom + 4], [left + W * f, topBottom + 4], W, false)
  }

  titleBlock(svg, doc, labels, scale.label)
  return { svg: svg.done(), scale: scale.label, widthMm: PAGE_W, heightMm: PAGE_H, rows }
}
