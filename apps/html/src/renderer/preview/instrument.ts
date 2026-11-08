import type { ParseMap } from '../document/parse-map'

export const SID_ATTR = 'data-gx-sid'

interface StartAttribute {
  name: string
  start: number
  end: number
}

function startAttributes(tag: string): {
  prefixEnd: number
  closeStart: number
  attributes: StartAttribute[]
} {
  const prefix = /^<[A-Za-z][^\s/>]*/.exec(tag)
  const close = /\s*\/?>$/.exec(tag)
  const prefixEnd = prefix?.[0].length ?? 1
  const closeStart = close?.index ?? tag.length
  const attributes: StartAttribute[] = []
  let index = prefixEnd
  const whitespace = (at: number) => at < closeStart && /\s/.test(tag[at]!)
  while (index < closeStart) {
    while (whitespace(index)) index += 1
    if (index >= closeStart) break
    const start = index
    while (index < closeStart && !whitespace(index) && tag[index] !== '=' && tag[index] !== '>') {
      index += 1
    }
    if (index === start) {
      index += 1
      continue
    }
    const name = tag.slice(start, index)
    while (whitespace(index)) index += 1
    if (tag[index] === '=') {
      index += 1
      while (whitespace(index)) index += 1
      const quote = tag[index] === '"' || tag[index] === "'" ? tag[index] : ''
      if (quote) {
        const end = tag.indexOf(quote, index + 1)
        index = end >= 0 && end < closeStart ? end + 1 : closeStart
      } else {
        while (index < closeStart && !whitespace(index)) index += 1
      }
    }
    attributes.push({ name, start, end: index })
  }
  return { prefixEnd, closeStart, attributes }
}

function replaceAuthoredSid(tag: string, sid: number): string {
  const { prefixEnd, closeStart, attributes } = startAttributes(tag)
  const authored = attributes.filter((attribute) => attribute.name.toLowerCase() === SID_ATTR)
  let withoutAuthored = tag
  if (authored.length > 0) {
    const kept = attributes
      .filter((attribute) => !authored.includes(attribute))
      .map((attribute) => ` ${tag.slice(attribute.start, attribute.end)}`)
    withoutAuthored = tag.slice(0, prefixEnd) + kept.join('') + tag.slice(closeStart)
  }
  const close = /\s*\/?>$/.exec(withoutAuthored)
  const at = close?.index ?? withoutAuthored.length
  return `${withoutAuthored.slice(0, at)} ${SID_ATTR}="${sid}"${withoutAuthored.slice(at)}`
}

/**
 * The preview copy of the document: every element with a source location gets
 * a `data-gx-sid` so the inspector can map clicks straight back to the parse map,
 * and the inspector script is appended. The saved text never sees either.
 */
export function instrumentForPreview(
  text: string,
  map: ParseMap,
  inspectorSource: string,
  options: {
    /**
     * 받은 HTML 파일의 스크립트를 미리보기에서 끈다(사용자가 "스크립트 실행"을 누르기 전까지).
     * nonce가 붙은 검사기 스크립트만 도는 CSP를 문서 맨 앞에 넣는다.
     */
    blockScripts?: boolean
  } = {},
): string {
  const edits = map.elements
    .map((entry) => ({
      start: entry.startTag[0],
      end: entry.startTag[1],
      text: replaceAuthoredSid(text.slice(entry.startTag[0], entry.startTag[1]), entry.sid),
    }))
    .sort((a, b) => b.start - a.start)
  let out = text
  for (const edit of edits) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  const nonce = options.blockScripts ? previewNonce() : null
  // the frame reports this version with every message so the app can drop input from a stale reload
  const script = `<script data-gx-inspector${nonce ? ` nonce="${nonce}"` : ''}>${inspectorSource.replace('__GX_VERSION__', String(map.version))}</script>`
  const bodyClose = out.search(/<\/body\s*>/i)
  out = bodyClose >= 0 ? out.slice(0, bodyClose) + script + out.slice(bodyClose) : out + script
  if (!nonce) return out
  const policy = `<meta http-equiv="Content-Security-Policy" content="script-src 'nonce-${nonce}'">`
  // as early as the parser allows: right after <head>, else <html>, else the doctype
  const anchor =
    /<head(\s[^>]*)?>/i.exec(out) ?? /<html(\s[^>]*)?>/i.exec(out) ?? /<!doctype[^>]*>/i.exec(out)
  if (!anchor) return policy + out
  const at = anchor.index + anchor[0].length
  return out.slice(0, at) + policy + out.slice(at)
}

function previewNonce(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** 실행될 것이 있는 문서인지: <script>, on…= 속성, javascript: 링크 */
export function hasDocumentScripts(text: string): boolean {
  return (
    /<script[\s>]/i.test(text) ||
    /<[a-z][^>]*\son[a-z]+\s*=/i.test(text) ||
    /=\s*["']?\s*javascript:/i.test(text)
  )
}
