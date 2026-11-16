/** One DXF group: an integer group code and its value line. */
export interface DxfGroup {
  code: number
  /** Trimmed, except text values (codes 1 and 3): MTEXT chunks may end in a space. */
  value: string
}

/** $DWGCODEPAGE values that old (pre-2007) DXF files write in their own code page. */
const CODE_PAGES: Record<string, string> = {
  ANSI_874: 'windows-874',
  ANSI_932: 'shift_jis',
  ANSI_936: 'gbk',
  ANSI_949: 'euc-kr',
  ANSI_950: 'big5',
  ANSI_1250: 'windows-1250',
  ANSI_1251: 'windows-1251',
  ANSI_1252: 'windows-1252',
  ANSI_1253: 'windows-1253',
  ANSI_1254: 'windows-1254',
  ANSI_1255: 'windows-1255',
  ANSI_1256: 'windows-1256',
  ANSI_1257: 'windows-1257',
  ANSI_1258: 'windows-1258',
}

function decodeWith(label: string, bytes: Uint8Array): string | null {
  try {
    return new TextDecoder(label, { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/**
 * Reads DXF bytes as text: UTF-8 first (DXF 2007 and later), then the code page the
 * header names in $DWGCODEPAGE, then Latin-1 (windows-1252), which never fails.
 */
export function decodeDxf(bytes: Uint8Array): string {
  const utf8 = decodeWith('utf-8', bytes)
  if (utf8 !== null) return utf8.charCodeAt(0) === 0xfeff ? utf8.slice(1) : utf8
  const latin1 = new TextDecoder('latin1').decode(bytes)
  const match = /\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n\s*(\S+)/i.exec(latin1.slice(0, 64 * 1024))
  const label = match ? CODE_PAGES[match[1]!.toUpperCase()] : undefined
  if (label && label !== 'windows-1252') {
    const decoded = decodeWith(label, bytes)
    if (decoded !== null) return decoded
  }
  return latin1
}

const CODE_LINE = /^\s*-?\d+\s*$/

/**
 * Splits DXF text into code/value groups. Accepts LF or CRLF line ends and spaces around
 * group codes. Returns null when the text is not code/value pairs.
 */
export function tokenizeDxf(text: string): DxfGroup[] | null {
  const lines = text.split('\n')
  let end = lines.length
  while (end > 0 && lines[end - 1]!.trim() === '') end--
  // an empty last value line is still a value
  if (end % 2 === 1 && end < lines.length) end++
  const groups: DxfGroup[] = []
  for (let i = 0; i < end; i += 2) {
    const codeLine = lines[i]!
    if (!CODE_LINE.test(codeLine)) return null
    if (i + 1 >= end) return null
    const code = Number.parseInt(codeLine, 10)
    let value = lines[i + 1]!
    if (value.endsWith('\r')) value = value.slice(0, -1)
    if (code !== 1 && code !== 3) value = value.trim()
    groups.push({ code, value })
  }
  return groups
}
