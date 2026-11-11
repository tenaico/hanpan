/**
 * Minimal WOFF2 reader for advance-width assertions on the bundled KR subsets.
 *
 * Only supports what those files use: CFF flavor (no glyf/loca transform),
 * untransformed hmtx, cmap formats 4/12. Avoids adding a woff2 dependency.
 */
import { readFileSync } from 'node:fs'
import { brotliDecompressSync } from 'node:zlib'

const KNOWN_TAGS = [
  'cmap',
  'head',
  'hhea',
  'hmtx',
  'maxp',
  'name',
  'OS/2',
  'post',
  'cvt ',
  'fpgm',
  'glyf',
  'loca',
  'prep',
  'CFF ',
  'VORG',
  'EBDT',
  'EBLC',
  'gasp',
  'hdmx',
  'kern',
  'LTSH',
  'PCLT',
  'VDMX',
  'vhea',
  'vmtx',
  'BASE',
  'GDEF',
  'GPOS',
  'GSUB',
  'EBSC',
  'JSTF',
  'MATH',
  'CBDT',
  'CBLC',
  'COLR',
  'CPAL',
  'SVG ',
  'sbix',
  'acnt',
  'avar',
  'bdat',
  'bloc',
  'bsln',
  'cvar',
  'fdsc',
  'feat',
  'fmtx',
  'fvar',
  'gvar',
  'hsty',
  'just',
  'lcar',
  'mort',
  'morx',
  'opbd',
  'prop',
  'trak',
  'Zapf',
  'Silf',
  'Glat',
  'Gloc',
  'Feat',
  'Sill',
]

function uintBase128(buf: Buffer, off: number): [number, number] {
  let v = 0
  for (let i = 0; i < 5; i++) {
    const b = buf[off++]
    v = v * 128 + (b & 0x7f)
    if (!(b & 0x80)) return [v, off]
  }
  throw new Error('bad UIntBase128')
}

interface Woff2Font {
  unitsPerEm: number
  tables: Map<string, Buffer>
  cmap: Map<number, number>
  advances: number[]
}

export function readWoff2(path: string): Woff2Font {
  const buf = readFileSync(path)
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not woff2')
  const numTables = buf.readUInt16BE(12)
  const totalCompressedSize = buf.readUInt32BE(20)
  let off = 48
  const entries: { tag: string; len: number }[] = []
  for (let i = 0; i < numTables; i++) {
    const flags = buf[off++]
    let tag: string
    if ((flags & 0x3f) === 0x3f) {
      tag = buf.toString('latin1', off, off + 4)
      off += 4
    } else {
      tag = KNOWN_TAGS[flags & 0x3f]
    }
    const transform = (flags >> 6) & 0x3
    let len: number
    ;[len, off] = uintBase128(buf, off)
    const transformed = tag === 'glyf' || tag === 'loca' ? transform !== 3 : transform !== 0
    if (transformed) throw new Error(`transformed table ${tag} unsupported`)
    entries.push({ tag, len })
  }
  const raw = brotliDecompressSync(buf.subarray(off, off + totalCompressedSize))
  const tables = new Map<string, Buffer>()
  let pos = 0
  for (const { tag, len } of entries) {
    tables.set(tag, raw.subarray(pos, pos + len))
    pos += len
  }
  const head = tables.get('head')!
  const hhea = tables.get('hhea')!
  const maxp = tables.get('maxp')!
  const hmtxBuf = tables.get('hmtx')!
  const numGlyphs = maxp.readUInt16BE(4)
  const numHMetrics = hhea.readUInt16BE(34)
  const advances: number[] = []
  for (let g = 0; g < numGlyphs; g++) {
    advances.push(
      g < numHMetrics ? hmtxBuf.readUInt16BE(g * 4) : hmtxBuf.readUInt16BE((numHMetrics - 1) * 4),
    )
  }
  return {
    unitsPerEm: head.readUInt16BE(18),
    tables,
    cmap: parseCmap(tables.get('cmap')!),
    advances,
  }
}

function parseCmap(cmap: Buffer): Map<number, number> {
  const n = cmap.readUInt16BE(2)
  let best = -1
  let bestScore = -1
  for (let i = 0; i < n; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8)
    const encoding = cmap.readUInt16BE(6 + i * 8)
    const offset = cmap.readUInt32BE(8 + i * 8)
    const format = cmap.readUInt16BE(offset)
    const score =
      platform === 3 && encoding === 10 && format === 12
        ? 3
        : platform === 3 && encoding === 1 && format === 4
          ? 2
          : format === 12 || format === 4
            ? 1
            : 0
    if (score > bestScore) {
      bestScore = score
      best = offset
    }
  }
  const out = new Map<number, number>()
  const format = cmap.readUInt16BE(best)
  if (format === 12) {
    const nGroups = cmap.readUInt32BE(best + 12)
    for (let i = 0; i < nGroups; i++) {
      const p = best + 16 + i * 12
      const start = cmap.readUInt32BE(p)
      const end = cmap.readUInt32BE(p + 4)
      const gid = cmap.readUInt32BE(p + 8)
      for (let c = start; c <= end; c++) out.set(c, gid + (c - start))
    }
  } else if (format === 4) {
    const segCountX2 = cmap.readUInt16BE(best + 6)
    const segCount = segCountX2 / 2
    const endP = best + 14
    const startP = endP + segCountX2 + 2
    const deltaP = startP + segCountX2
    const rangeP = deltaP + segCountX2
    for (let s = 0; s < segCount; s++) {
      const end = cmap.readUInt16BE(endP + s * 2)
      const start = cmap.readUInt16BE(startP + s * 2)
      const delta = cmap.readInt16BE(deltaP + s * 2)
      const rangeOff = cmap.readUInt16BE(rangeP + s * 2)
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let gid: number
        if (rangeOff === 0) {
          gid = (c + delta) & 0xffff
        } else {
          const gi = rangeP + s * 2 + rangeOff + (c - start) * 2
          gid = cmap.readUInt16BE(gi)
          if (gid !== 0) gid = (gid + delta) & 0xffff
        }
        if (gid !== 0) out.set(c, gid)
      }
    }
  } else {
    throw new Error(`cmap format ${format} unsupported`)
  }
  return out
}

/** advance of a codepoint in em (throws if unmapped) */
export function advanceEm(font: Woff2Font, cp: number): number {
  const gid = font.cmap.get(cp)
  if (gid === undefined) throw new Error(`U+${cp.toString(16)} not in cmap`)
  return font.advances[gid] / font.unitsPerEm
}

/** CFF INDEX at off: item buffers and the offset just past the INDEX */
function cffIndex(cff: Buffer, off: number): { items: Buffer[]; end: number } {
  const count = cff.readUInt16BE(off)
  if (count === 0) return { items: [], end: off + 2 }
  const offSize = cff[off + 2]
  const offsetAt = (i: number) => {
    let v = 0
    for (let b = 0; b < offSize; b++) v = v * 256 + cff[off + 3 + i * offSize + b]
    return v
  }
  const dataStart = off + 3 + (count + 1) * offSize - 1
  const items: Buffer[] = []
  for (let i = 0; i < count; i++) {
    items.push(cff.subarray(dataStart + offsetAt(i), dataStart + offsetAt(i + 1)))
  }
  return { items, end: dataStart + offsetAt(count) }
}

/** CFF DICT → operator key ('17', '12 36', …) → operands */
function cffDict(buf: Buffer): Map<string, number[]> {
  const out = new Map<string, number[]>()
  let ops: number[] = []
  let i = 0
  while (i < buf.length) {
    const b = buf[i]
    if (b <= 21) {
      const key = b === 12 ? `12 ${buf[++i]}` : String(b)
      out.set(key, ops)
      ops = []
      i++
    } else if (b === 28) {
      ops.push(buf.readInt16BE(i + 1))
      i += 3
    } else if (b === 29) {
      ops.push(buf.readInt32BE(i + 1))
      i += 5
    } else if (b === 30) {
      // real number: skip nibbles to the 0xf terminator (no width operand uses one)
      i++
      while ((buf[i] & 0x0f) !== 0x0f && buf[i] >> 4 !== 0x0f) i++
      i++
      ops.push(NaN)
    } else if (b <= 246) {
      ops.push(b - 139)
      i++
    } else if (b <= 250) {
      ops.push((b - 247) * 256 + buf[i + 1] + 108)
      i += 2
    } else {
      ops.push(-(b - 251) * 256 - buf[i + 1] - 108)
      i += 2
    }
  }
  return out
}

const subrBias = (n: number) => (n < 1240 ? 107 : n < 33900 ? 1131 : 32768)

/**
 * Advance width each glyph's Type 2 charstring encodes (nominalWidthX + the
 * optional leading operand, else defaultWidthX). Engines that lay out from the
 * charstring rather than hmtx (Chromium on Windows) use this value.
 */
export function cffCharstringWidths(font: Woff2Font): number[] {
  const cff = font.tables.get('CFF ')
  if (!cff) throw new Error('font has no CFF table')
  const names = cffIndex(cff, cff[2])
  const topDicts = cffIndex(cff, names.end)
  const strings = cffIndex(cff, topDicts.end)
  const gsubrs = cffIndex(cff, strings.end).items
  const top = cffDict(topDicts.items[0])
  const charStrings = cffIndex(cff, top.get('17')![0]).items
  interface Priv {
    nominal: number
    dflt: number
    subrs: Buffer[]
  }
  const readPrivate = ([size, off]: number[]): Priv => {
    const d = cffDict(cff.subarray(off, off + size))
    const subrsOff = d.get('19')?.[0]
    return {
      nominal: d.get('21')?.[0] ?? 0,
      dflt: d.get('20')?.[0] ?? 0,
      subrs: subrsOff === undefined ? [] : cffIndex(cff, off + subrsOff).items,
    }
  }
  let privFor: (gid: number) => Priv
  if (top.has('12 36')) {
    const fds = cffIndex(cff, top.get('12 36')![0]).items.map((fd) =>
      readPrivate(cffDict(fd).get('18')!),
    )
    const sel = top.get('12 37')![0]
    const fmt = cff[sel]
    const fdOf: number[] = []
    if (fmt === 0) {
      for (let g = 0; g < charStrings.length; g++) fdOf.push(cff[sel + 1 + g])
    } else if (fmt === 3) {
      const nRanges = cff.readUInt16BE(sel + 1)
      for (let r = 0; r < nRanges; r++) {
        const first = cff.readUInt16BE(sel + 3 + r * 3)
        const fd = cff[sel + 5 + r * 3]
        const next = cff.readUInt16BE(sel + 6 + r * 3)
        for (let g = first; g < next; g++) fdOf[g] = fd
      }
    } else {
      throw new Error(`FDSelect format ${fmt} unsupported`)
    }
    privFor = (gid) => fds[fdOf[gid]]
  } else {
    const priv = readPrivate(top.get('18')!)
    privFor = () => priv
  }

  const widthOf = (cs: Buffer, priv: Priv): number => {
    const stack: number[] = []
    // walks operands up to the first stack-clearing operator, following subroutine calls
    const run = (buf: Buffer): number | null | undefined => {
      let i = 0
      while (i < buf.length) {
        const b = buf[i]
        if (b === 28) {
          stack.push(buf.readInt16BE(i + 1))
          i += 3
        } else if (b === 255) {
          stack.push(buf.readInt32BE(i + 1) / 65536)
          i += 5
        } else if (b >= 32) {
          if (b <= 246) {
            stack.push(b - 139)
            i++
          } else if (b <= 250) {
            stack.push((b - 247) * 256 + buf[i + 1] + 108)
            i += 2
          } else {
            stack.push(-(b - 251) * 256 - buf[i + 1] - 108)
            i += 2
          }
        } else if (b === 10 || b === 29) {
          const subrs = b === 10 ? priv.subrs : gsubrs
          const idx = stack.pop()! + subrBias(subrs.length)
          const r = run(subrs[idx])
          if (r !== undefined) return r
          i++
        } else if (b === 11) {
          return undefined
        } else {
          const n = stack.length
          // hstem/vstem(hm), hintmask/cntrmask take pairs; moveto 2 or 1; endchar 0 or 4
          const extra =
            b === 1 || b === 3 || b === 18 || b === 23 || b === 19 || b === 20
              ? n % 2 === 1
              : b === 21
                ? n > 2
                : b === 4 || b === 22
                  ? n > 1
                  : b === 14
                    ? n === 1 || n === 5
                    : null
          if (extra === null) throw new Error(`unexpected first operator ${b}`)
          return extra ? stack[0] : null
        }
      }
      return undefined
    }
    const w = run(cs)
    return w === null || w === undefined ? priv.dflt : priv.nominal + w
  }
  return charStrings.map((cs, gid) => widthOf(cs, privFor(gid)))
}
