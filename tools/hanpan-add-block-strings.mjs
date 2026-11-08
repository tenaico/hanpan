// Adds Hanpan string keys to a one-file dictionary whose languages are blocks
// (`  ko: {` ... `  },`), like apps/shell/src/renderer/src/strings.ts. A missing key
// goes right after `afterKey` in every block; Korean and English are written by
// hand, a language without a translation gets the English text, and that
// placeholder is replaced once the JSON carries the language. Each key is looked
// up inside its own block, so reruns replace placeholders and add nothing twice.
//
// usage: node tools/hanpan-add-block-strings.mjs <strings.ts> <afterKey> <strings.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  escapeRegExp,
  propertyPattern,
  quote,
  replacePlaceholders,
  valueFor,
} from './hanpan-strings-core.mjs'

const BLOCK_START = /^ {2}(?:'([a-zA-Z-]+)'|([a-zA-Z]+)): \{$/
const BLOCK_END = /^ {2}\},?$/
const INDENT = ' {4}'

/** where a block's missing keys go: after `afterKey` (both lines when wrapped), else at the end */
function insertionPoint(body, afterKey) {
  const found = propertyPattern(afterKey, INDENT).exec(body)
  if (found) return found.index + found[0].length
  const line = new RegExp(`^ {4}${escapeRegExp(afterKey)}:.*$`, 'm').exec(body)
  return line ? line.index + line[0].length : body.length
}

export function upsertBlockStrings(source, afterKey, entries) {
  const lines = source.split('\n')
  const out = []
  let added = 0
  let replaced = 0
  for (let i = 0; i < lines.length;) {
    const start = BLOCK_START.exec(lines[i])
    if (!start) {
      out.push(lines[i++])
      continue
    }
    const lang = start[1] ?? start[2]
    let end = i + 1
    while (end < lines.length && !BLOCK_END.test(lines[end])) end++
    const result = replacePlaceholders(lines.slice(i + 1, end).join('\n'), lang, entries, INDENT)
    let body = result.text
    if (result.missing.length > 0) {
      const at = insertionPoint(body, afterKey)
      const insert = result.missing
        .map((key) => `    ${key}: ${quote(valueFor(entries[key], lang))},`)
        .join('\n')
      body = at === 0 ? `${insert}\n${body}` : `${body.slice(0, at)}\n${insert}${body.slice(at)}`
      added += result.missing.length
    }
    replaced += result.replaced
    out.push(lines[i], ...(body === '' ? [] : body.split('\n')))
    if (end < lines.length) out.push(lines[end])
    i = end + 1
  }
  return { text: out.join('\n'), added, replaced }
}

function main() {
  const [file, afterKey, stringsPath] = process.argv.slice(2)
  if (!file || !afterKey || !stringsPath) {
    console.error(
      'usage: node tools/hanpan-add-block-strings.mjs <strings.ts> <afterKey> <strings.json>',
    )
    process.exit(2)
  }
  const strings = JSON.parse(readFileSync(stringsPath, 'utf8'))
  const result = upsertBlockStrings(readFileSync(file, 'utf8'), afterKey, strings)
  writeFileSync(file, result.text)
  console.log(`+${result.added} ~${result.replaced}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
