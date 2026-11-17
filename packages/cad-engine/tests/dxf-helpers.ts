/** A DXF group: [group code, value]. */
export type Group = [number, string | number]

export interface DxfBlock {
  name: string
  base?: [number, number]
  entities: Group[][]
}

export interface DxfSections {
  /** Header variables as groups, e.g. [[9, '$INSUNITS'], [70, 1]]. */
  header?: Group[]
  blocks?: DxfBlock[]
  /** Each entity is a list of groups that starts with [0, '<TYPE>']. Omit for no ENTITIES section. */
  entities?: Group[][]
  eol?: '\n' | '\r\n'
  /** Right-align group codes in three columns, as some programs write them. */
  padCodes?: boolean
}

/** Writes DXF text from group code/value pairs, so tests never need files from other programs. */
export function dxf(sections: DxfSections): string {
  const groups: Group[] = []
  const section = (name: string, body: Group[]): void => {
    groups.push([0, 'SECTION'], [2, name], ...body, [0, 'ENDSEC'])
  }
  if (sections.header) section('HEADER', sections.header)
  if (sections.blocks) {
    const body: Group[] = []
    for (const block of sections.blocks) {
      const [bx, by] = block.base ?? [0, 0]
      body.push([0, 'BLOCK'], [8, '0'], [2, block.name], [70, 0], [10, bx], [20, by], [30, 0])
      body.push([3, block.name])
      for (const entity of block.entities) body.push(...entity)
      body.push([0, 'ENDBLK'], [8, '0'])
    }
    section('BLOCKS', body)
  }
  if (sections.entities) section('ENTITIES', sections.entities.flat())
  groups.push([0, 'EOF'])
  const eol = sections.eol ?? '\n'
  const lines: string[] = []
  for (const [code, value] of groups) {
    lines.push(sections.padCodes ? String(code).padStart(3, ' ') : String(code), String(value))
  }
  return lines.join(eol) + eol
}

export function bytesOf(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function line(x1: number, y1: number, x2: number, y2: number, layer = '0'): Group[] {
  return [
    [0, 'LINE'],
    [8, layer],
    [10, x1],
    [20, y1],
    [30, 0],
    [11, x2],
    [21, y2],
    [31, 0],
  ]
}

/** points: [x, y, bulge?][] */
export function lwpolyline(points: number[][], closed: boolean, layer = '0'): Group[] {
  const groups: Group[] = [
    [0, 'LWPOLYLINE'],
    [8, layer],
    [90, points.length],
    [70, closed ? 1 : 0],
  ]
  for (const [x, y, bulge] of points) {
    groups.push([10, x!], [20, y!])
    if (bulge !== undefined) groups.push([42, bulge])
  }
  return groups
}

export function circle(x: number, y: number, r: number, layer = '0'): Group[] {
  return [
    [0, 'CIRCLE'],
    [8, layer],
    [10, x],
    [20, y],
    [30, 0],
    [40, r],
  ]
}

export function text(x: number, y: number, height: number, value: string): Group[] {
  return [
    [0, 'TEXT'],
    [8, '0'],
    [10, x],
    [20, y],
    [30, 0],
    [40, height],
    [1, value],
  ]
}

export function insert(name: string, x: number, y: number, extra: Group[] = []): Group[] {
  return [[0, 'INSERT'], [8, '0'], [2, name], [10, x], [20, y], [30, 0], ...extra]
}
